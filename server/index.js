/*
 * Main entry point for the Stow Kiosk backend server.
 * Initializes Express, sets up middleware, defines routes, establishes WebSocket connections,
 * and manages application lifecycle (startup, shutdown).
 */

require('dotenv').config(); // Load environment variables first
const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const path = require('path');
const http = require('http');
const apiRoutes = require('./routes/api');
const errorHandler = require('./middleware/errorHandler');
const SchedulerService = require('./services/schedulerService');
const db = require('./database/db');
const SlackService = require('./services/slackService');
const slackRoutes = require('./routes/slack');
const Station = require('./models/Station');
const socketService = require('./services/socketService');

const app = express();
const PORT = process.env.PORT || 3000;

// Print environment configuration (without sensitive values)
console.log('Environment configuration:');
console.log('- NODE_ENV:', process.env.NODE_ENV);
console.log('- Port:', PORT);
console.log('- Slack Reminder Channel:', process.env.SLACK_REMINDER_CHANNEL ? 'Configured ✓' : 'Not set ✗');
console.log('- Slack Bot Token:', process.env.SLACK_BOT_TOKEN ? 'Configured ✓' : 'Not set ✗');
console.log('- Slack Signing Secret:', process.env.SLACK_SIGNING_SECRET ? 'Configured ✓' : 'Not set ✗');

// Middleware setup
app.use(cors()); // Enable Cross-Origin Resource Sharing

// Selective body parsing: Skip for Slack routes which need raw body for verification
app.use((req, res, next) => {
  // Skip body parsing for Slack routes, they'll use their own middleware
  if (req.path.startsWith('/api/slack')) {
    return next();
  }
  
  // For non-Slack routes, use the standard parsers
  bodyParser.json()(req, res, (err) => {
    if (err) {
      console.error('JSON body parse error:', err);
      return res.status(400).json({ error: 'Invalid JSON' });
    }
    next();
  });
});

app.use((req, res, next) => {
  // Skip body parsing for Slack routes
  if (req.path.startsWith('/api/slack')) {
    return next();
  }
  
  // For non-Slack routes, use the standard parsers
  bodyParser.urlencoded({ extended: true })(req, res, (err) => {
    if (err) {
      console.error('URL-encoded body parse error:', err);
      return res.status(400).json({ error: 'Invalid form data' });
    }
    next();
  });
});

// Route handlers
// Handle Slack routes with their specific middleware (for signature verification)
app.use('/api/slack', slackRoutes);
// Handle all other API routes
app.use('/api', apiRoutes);

// Static file serving for the frontend
app.use(express.static(path.join(__dirname, '../public')));

// Use the 25-aisle dummy data generator matching the frontend fallback/rendering logic
const generateSpaceData = (floor) => {
  const numAisles = 25;
  const aisles = Array.from({ length: numAisles }, (_, i) => ({
    id: i + 1, // Keep internal ID as 1-25 for now, headers are separate
    sections: {
      100: { top: { type: 'Library', availability: Math.floor(Math.random() * 100) },
             middle: { type: 'Library Deep', availability: Math.floor(Math.random() * 100) },
             bottom: { type: 'Library', availability: Math.floor(Math.random() * 100) } },
      200: { top: { type: 'Library Deep', availability: Math.floor(Math.random() * 100) },
             middle: { type: 'Library', availability: Math.floor(Math.random() * 100) },
             bottom: { type: 'Library Deep', availability: Math.floor(Math.random() * 100) } },
      300: { top: { type: 'Library', availability: Math.floor(Math.random() * 100) },
             middle: { type: 'Library Deep', availability: Math.floor(Math.random() * 100) },
             bottom: { type: 'Library', availability: Math.floor(Math.random() * 100) } },
      400: { top: { type: 'Library Deep', availability: Math.floor(Math.random() * 100) },
             middle: { type: 'Library', availability: Math.floor(Math.random() * 100) },
             bottom: { type: 'Library Deep', availability: Math.floor(Math.random() * 100) } },
      500: { top: { type: 'Library', availability: Math.floor(Math.random() * 100) },
             middle: { type: 'Library Deep', availability: Math.floor(Math.random() * 100) },
             bottom: { type: 'Library', availability: Math.floor(Math.random() * 100) } },
      600: { top: { type: 'Library Deep', availability: Math.floor(Math.random() * 100) },
             middle: { type: 'Library', availability: Math.floor(Math.random() * 100) },
             bottom: { type: 'Library Deep', availability: Math.floor(Math.random() * 100) } },
      700: { top: { type: 'Library', availability: Math.floor(Math.random() * 100) },
             middle: { type: 'Library Deep', availability: Math.floor(Math.random() * 100) },
             bottom: { type: 'Library', availability: Math.floor(Math.random() * 100) } },
      800: { top: { type: 'Library Deep', availability: Math.floor(Math.random() * 100) },
             middle: { type: 'Library', availability: Math.floor(Math.random() * 100) },
             bottom: { type: 'Library Deep', availability: Math.floor(Math.random() * 100) } },
    }
  }));

  const emptyBins = [];
  aisles.forEach(aisle => {
    Object.entries(aisle.sections).forEach(([section, bins]) => {
      ['top', 'middle', 'bottom'].forEach(position => {
        if (bins[position].availability === 100) {
          emptyBins.push({ aisle: aisle.id, section, position, type: bins[position].type });
        }
      });
    });
  });

  const bestSections = {
    Library: { aisle: 1, section: '100', availability: 0 },
    'Library Deep': { aisle: 1, section: '100', availability: 0 }
  };
  aisles.forEach(aisle => {
    Object.entries(aisle.sections).forEach(([section, bins]) => {
      ['top', 'middle', 'bottom'].forEach(position => {
        const bin = bins[position];
        if (bestSections[bin.type] && bin.availability > bestSections[bin.type].availability) {
          bestSections[bin.type] = { aisle: aisle.id, section, availability: bin.availability };
        }
      });
    });
  });

  return { aisles, emptyBins, bestSections };
};

// API endpoint to get space data
app.get('/api/space', (req, res) => {
  const floor = req.query.floor || '1'; // Get floor from query param
  console.log(`API Request: /api/space?floor=${floor}`); // Log the request
  try {
      const spaceData = generateSpaceData(floor);
      res.json(spaceData); // Send the generated data
  } catch (error) {
      console.error("Error generating space data:", error);
      res.status(500).json({ error: 'Failed to generate space data' });
  }
});

// Frontend Routes
// Serve index page for root path
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/index.html'));
});

// Serve side-specific pages
app.get('/side/:side', (req, res) => {
  const side = req.params.side.toLowerCase();
  if (side === 'a' || side === 'b') {
    res.sendFile(path.join(__dirname, `../public/side-${side}.html`));
  } else {
    res.status(404).send('Side not found');
  }
});

// New screen routes
app.get('/carousel/:floor', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/carousel.html'));
});

app.get('/available-space/:floor', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/available-space.html'));
});

app.get('/stow-tip', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/stow-tip.html'));
});

app.get('/admin', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/admin.html'));
});

// Global error handler
app.use(errorHandler);

// Service Initialization
// Initialize the SlackService if token is available
let slackService = null;
if (process.env.SLACK_BOT_TOKEN) {
  try {
    slackService = new SlackService(process.env.SLACK_BOT_TOKEN);
    console.log('SlackService initialized successfully');
  } catch (error) {
    console.error('Failed to initialize SlackService:', error);
  }
} else {
  console.warn('SLACK_BOT_TOKEN not set; SlackService not initialized');
}

// Initialize scheduler if SLACK_REMINDER_CHANNEL is valid and SlackService is up
let schedulerService = null;
if (slackService && process.env.SLACK_REMINDER_CHANNEL && /^C[0-9A-Z]{8,}$/.test(process.env.SLACK_REMINDER_CHANNEL)) {
  try {
    schedulerService = new SchedulerService();
    schedulerService.startHourlyReminders(process.env.SLACK_REMINDER_CHANNEL);
    console.log(`Scheduled reminders for Slack channel: ${process.env.SLACK_REMINDER_CHANNEL}`);
  } catch (error) {
    console.error('Failed to start scheduler:', error);
  }
} else if (process.env.SLACK_REMINDER_CHANNEL) {
  console.warn('SLACK_REMINDER_CHANNEL is invalid or SlackService not initialized; scheduler not started.');
} else {
  console.log('SLACK_REMINDER_CHANNEL not set; scheduler not started.');
}

// Start the HTTP server
const server = http.createServer(app);

// Initialize WebSocket server using socketService
const wss = socketService.init(server);

// Start the server
server.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Local URL: http://localhost:${PORT}`);
});

// Graceful Shutdown Handling
process.on('SIGTERM', async () => {
  console.log('SIGTERM received, shutting down...');
  
  // Stop the scheduler if it's running
  if (schedulerService) {
    console.log('Stopping schedulerService...');
    for (const channel of schedulerService.getActiveReminders()) {
      schedulerService.stopReminders(channel);
    }
  }
  wss.close(); // Close WebSocket server
  server.close(async () => { // Close HTTP server
    await db.close(); // Close database connection
    console.log('Database connection closed');
    process.exit(0);
  });
});

process.on('SIGINT', async () => {
  console.log('SIGINT received, shutting down...');
  
  // Stop the scheduler if it's running
  if (schedulerService) {
    console.log('Stopping schedulerService...');
    for (const channel of schedulerService.getActiveReminders()) {
      schedulerService.stopReminders(channel);
    }
  }
  wss.close(); // Close WebSocket server
  server.close(async () => { // Close HTTP server
    await db.close(); // Close database connection
    console.log('Database connection closed');
    process.exit(0);
  });
}); 