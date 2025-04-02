require('dotenv').config();
const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const path = require('path');
const apiRoutes = require('./routes/api');
const errorHandler = require('./middleware/errorHandler');
const SchedulerService = require('./services/schedulerService');
const db = require('./database/db');
const SlackService = require('./services/slackService');
const slackRoutes = require('./routes/slack'); // Import slack routes directly

const app = express();
const PORT = process.env.PORT || 3000;

// Print environment configuration (without sensitive values)
console.log('Environment configuration:');
console.log('- NODE_ENV:', process.env.NODE_ENV);
console.log('- Port:', PORT);
console.log('- Slack Reminder Channel:', process.env.SLACK_REMINDER_CHANNEL ? 'Configured ✓' : 'Not set ✗');
console.log('- Slack Bot Token:', process.env.SLACK_BOT_TOKEN ? 'Configured ✓' : 'Not set ✗');
console.log('- Slack Signing Secret:', process.env.SLACK_SIGNING_SECRET ? 'Configured ✓' : 'Not set ✗');

// Enable CORS for all routes
app.use(cors());

// Configure body parsers for regular routes (not Slack routes)
// These parsers will run for all routes except the Slack routes (which we handle separately)
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

// Handle Slack routes with their specific middleware
app.use('/api/slack', slackRoutes);

// Handle all other API routes
app.use('/api', apiRoutes);

// Static files
app.use(express.static(path.join(__dirname, '../public')));

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

// Admin page
app.get('/admin', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/admin.html'));
});

// Error handler middleware
app.use(errorHandler);

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

// Initialize scheduler if SLACK_REMINDER_CHANNEL is valid
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

const server = app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Local URL: http://localhost:${PORT}`);
});

// Gracefully close database connection on application shutdown
process.on('SIGTERM', async () => {
  console.log('SIGTERM received, shutting down...');
  
  // Stop the scheduler if it's running
  if (schedulerService) {
    console.log('Stopping schedulerService...');
    for (const channel of schedulerService.getActiveReminders()) {
      schedulerService.stopReminders(channel);
    }
  }
  
  server.close(async () => {
    await db.close();
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
  
  server.close(async () => {
    await db.close();
    console.log('Database connection closed');
    process.exit(0);
  });
}); 