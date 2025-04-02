# Stow Kiosk Application

## Overview

The Stow Kiosk Application is a specialized digital signage solution designed to streamline workflows. It provides associates with real-time, visually intuitive station status information that helps improve operational efficiency and promote safety awareness.

### Key Features

- **Dual-Side Display System**: Optimized for "Side A" and "Side B"
- **Station Status Visualization**: Color-coded displays (blue for Active Queue, orange for Problem Solver)
- **End Indicators**: "Hi" (↑) and "Lo" (↓) indicators for each station
- **Real-time Updates**: Automatic 60-second refresh with countdown timer
- **Safety Message Rotation**: Dynamic safety messaging that rotates every 10 seconds
- **Slack Integration**: Update station statuses through Slack commands and interactive modals
- **Admin Dashboard**: Web-based admin interface for station and safety message management
- **Responsive Design**: Optimized for kiosk displays with high visibility from distance

### Technology Stack

- **Frontend**: HTML5, CSS3, JavaScript (Vanilla)
- **Backend**: Node.js with Express.js framework
- **Database**: SQLite (with upgrade path to PostgreSQL)
- **Communication**: WebSockets for real-time updates
- **Integration**: Slack API for interactive messaging
- **Scheduling**: Node-cron for timed operations and reminders

## Prerequisites

Before installing the Stow Kiosk Application, ensure your environment meets the following requirements:

### System Requirements

- **Node.js**: Version 14.x or higher
- **npm**: Version 6.x or higher
- **Disk Space**: At least 100MB of free disk space
- **Memory**: Minimum 512MB RAM (1GB recommended)
- **Operating System**: Linux, macOS, or Windows with proper terminal access

### External Services

- **Slack Workspace**: With permissions to:
  - Create a bot
  - Install app to workspace
  - Use interactive components
  - Post messages to channels
  - Create and use slash commands

### Security Requirements

- **HTTPS**: For secure communication (required for Slack integration)
- **Environment Variables**: For configuration and secrets management
- **User Authentication**: For admin dashboard access

### Required Environment Variables

The following environment variables must be configured:

| Variable | Description | Example |
|----------|-------------|---------|
| `PORT` | Port for the web server | `3000` |
| `JWT_SECRET` | Secret for JWT token generation | `your_jwt_secret` |
| `SLACK_BOT_TOKEN` | Token for Slack Bot API access | `xoxb-your-token` |
| `SLACK_SIGNING_SECRET` | Secret for verifying Slack requests | `your_signing_secret` |
| `SLACK_REMINDER_CHANNEL` | Slack channel ID for reminders | `C1234567890` |

> Note: Refer to the `.env.example` file for all required environment variables.

## Installation

### Backend Setup

Follow these steps to set up the backend server for the Stow Kiosk application:

1. **Clone the Repository**

   ```bash
   git clone https://github.com/xMetalWorkerx/stow-kiosk-app.git
   cd stow-kiosk-app
   ```

2. **Install Dependencies**

   ```bash
   npm install
   ```

   Alternatively, if you use Yarn:

   ```bash
   yarn install
   ```

3. **Configure Environment Variables**

   Create a `.env` file in the root directory:

   ```bash
   cp .env.example .env
   ```

   Edit the `.env` file and fill in your specific configuration values:
   
   ```
   PORT=3000
   JWT_SECRET=your_secure_random_string
   SLACK_BOT_TOKEN=xoxb-your-slack-bot-token
   SLACK_SIGNING_SECRET=your-slack-signing-secret
   SLACK_REMINDER_CHANNEL=C1234567890
   ```

4. **Initialize the Database**

   Run the database setup script to create the SQLite database schema:

   ```bash
   npm run setup
   ```

   This will:
   - Create the database directory if it doesn't exist
   - Initialize the SQLite database with the schema defined in `server/database/schema.sql`

5. **Seed Initial Data**

   Populate the database with initial data:

   ```bash
   npm run seed
   ```

   This populates the database with:
   - Default station configurations
   - Initial safety messages
   - Admin user account (default username: `admin`, password: `admin123`)

6. **Verify Backend Setup**

   Start the server in development mode with:

   ```bash
   npm run dev
   ```

   The server should start on the configured port (default: 3000) with output similar to:
   ```
   Server running on port 3000
   ```

   If you configured Slack integration, you should also see:
   ```
   Scheduled reminders for channel: CXXXXXXXX
   ```

### Frontend Setup

The Stow Kiosk application uses vanilla JavaScript with no build step required. The frontend is served directly by the Express.js backend.

1. **Static Files Structure**

   The frontend files are organized in the `public` directory:
   
   ```
   public/
   ├── index.html          # Main entry point for application
   ├── side-a.html         # Side A display
   ├── side-b.html         # Side B display
   ├── admin.html          # Admin interface
   ├── css/                # Stylesheets
   │   ├── style.css       # Common styles
   │   ├── kiosk.css       # Kiosk-specific styles
   │   └── admin.css       # Admin interface styles
   ├── js/                 # JavaScript files
   │   ├── kiosk.js        # Kiosk display logic
   │   ├── admin.js        # Admin interface logic
   │   ├── stationManager.js # Station management
   │   ├── safetyMessage.js # Safety message handling
   │   └── utilities.js    # Utility functions
   └── images/             # Image assets
       ├── amazon-logo.png
       └── favicon.ico
   ```

2. **Accessing the Frontend**

   After starting the server, the application is accessible at:

   - Main Page: `http://localhost:3000/`
   - Side A Display: `http://localhost:3000/side/a`
   - Side B Display: `http://localhost:3000/side/b`
   - Admin Dashboard: `http://localhost:3000/admin`

3. **Browser Compatibility**

   The application is optimized for:
   - Chrome 80+
   - Firefox 75+
   - Edge 80+
   - Safari 13+

   For kiosk displays, Chrome or Edge in kiosk mode is recommended.

4. **Kiosk Display Setup**

   For optimal kiosk experience:
   
   - Use fullscreen mode (F11 in most browsers)
   - Set display resolution to 1080p or higher
   - Use "Side A" and "Side B" URLs on their respective displays
   - Configure browser to disable sleep/screensaver
   - Enable auto-refresh if needed (though the app refreshes automatically)

5. **Troubleshooting Frontend Issues**

   If facing display issues:
   
   - Clear browser cache
   - Verify the backend server is running
   - Check browser console for any JavaScript errors
   - Ensure all required API endpoints are accessible

## Configuration

The Stow Kiosk application offers various configuration options to customize its behavior and appearance according to your fulfillment center's specific needs.

### Environment Variables

The application uses environment variables stored in a `.env` file for configuration. The following variables are available:

| Variable | Description | Required | Default | Example |
|----------|-------------|:--------:|:-------:|---------|
| `PORT` | Port number for the web server | No | `3000` | `8080` |
| `NODE_ENV` | Environment mode (development/production) | No | `development` | `production` |
| `JWT_SECRET` | Secret key for JWT token generation | Yes | - | `your_secure_random_string` |
| `SLACK_BOT_TOKEN` | Slack Bot API access token | Yes* | - | `xoxb-your-slack-bot-token` |
| `SLACK_SIGNING_SECRET` | Secret for verifying Slack requests | Yes* | - | `your-slack-signing-secret` |
| `SLACK_REMINDER_CHANNEL` | Slack channel ID for reminders | Yes* | - | `C1234567890` |

*Required only if Slack integration is enabled

> **Note**: In production environments, it's recommended to set `NODE_ENV=production` to enable additional security features and disable debug information.

### Database Configuration

The application uses SQLite for data storage by default:

1. **Database Location**

   The database file is stored at the repository root as `database.db`. You can modify this location by editing `server/config/database.js`:

   ```javascript
   const path = require('path');

   module.exports = {
     database: path.join(__dirname, '../../database.db'),
     options: {
       verbose: console.log
     }
   };
   ```

2. **Database Schema**

   The database schema is defined in `server/database/schema.sql` and includes tables for:
   - `stations`: Store station information (side, level, number, status)
   - `safety_messages`: Store safety messages displayed in rotation
   - `users`: Store admin user credentials and permissions

3. **Database Initialization**

   The database is automatically initialized when running:
   ```bash
   npm run setup   # Create database schema
   npm run seed    # Populate with initial data
   ```

### Slack Integration

To enable Slack integration for station updates and reminders:

1. **Create a Slack App**

   Follow these steps to create a Slack Bot:
   - Go to [api.slack.com/apps](https://api.slack.com/apps) and click "Create New App"
   - Select "From scratch" and provide a name and workspace
   - Under "OAuth & Permissions", add the following scopes:
     - `chat:write`
     - `commands`
     - `users:read`
     - `channels:read`
   - Install the app to your workspace
   - Copy the "Bot User OAuth Token" to your `.env` file as `SLACK_BOT_TOKEN`

2. **Configure Slash Commands**

   Create a slash command for station updates:
   - Go to "Slash Commands" in your Slack App settings
   - Click "Create New Command"
   - Command: `/station-update`
   - Request URL: `https://your-server-url/api/slack/command`
   - Short Description: "Update station statuses"
   - Click "Save"

3. **Configure Interactivity**

   Enable interactive components:
   - Go to "Interactivity & Shortcuts"
   - Toggle "Interactivity" to On
   - Request URL: `https://your-server-url/api/slack/interact`
   - Click "Save Changes"

4. **Reminder Settings**

   The application sends scheduled reminders to update station statuses. By default, reminders are sent hourly. The `SLACK_REMINDER_CHANNEL` should be set to a valid Slack channel ID where reminders will be posted.

5. **Using the Station Update Interface**

   The updated Slack interface provides an intuitive button-based interaction system:
   
   - **Station Information**: Each station is displayed with its identifier (Level-Side-Number)
   - **Status Button**: Shows the current status with a visual indicator
     - 🔵 AQ: Active Queue
     - 🟠 PS: Problem Solver
     - ⚫ IA: Inactive
     - Click to cycle to the next status (AQ → PS → IA → AQ)
   - **End Indicator Button**: Shows the current end indicator
     - ⬆️ Hi: High-end indicator
     - ⬇️ Lo: Low-end indicator
     - Click to toggle between Hi and Lo
   
   The interface automatically updates in real-time when changes are made, and displays stations organized by level.

### Visual Customization

The application's appearance can be customized by modifying CSS variables:

1. **Core CSS Variables**

   The main color scheme is defined in `public/css/style.css`:

   ```css
   :root {
       --amazon-blue: #232F3E;
       --amazon-orange: #FF9900;
       --light-grey: #f5f5f5;
       --dark-grey: #333;
   }
   ```

2. **Kiosk Display Customization**

   Kiosk-specific styling variables in `public/css/kiosk.css`:

   ```css
   :root {
       --amazon-blue: #232F3E;
       --amazon-orange: #FF9900;
       --active-queue-blue: #1E90FF;
       --problem-solver-orange: #FF9900;
       --light-grey: #f5f5f5;
       --dark-grey: #333;
   }
   ```

3. **Admin Dashboard Customization**

   Admin interface styling variables in `public/css/admin.css`:

   ```css
   :root {
       --amazon-blue: #232F3E;
       --amazon-orange: #FF9900;
       --active-queue-blue: #1E90FF;
       --problem-solver-orange: #FF9900;
       --light-grey: #f5f5f5;
       --med-grey: #ddd;
       --dark-grey: #333;
       --success-green: #28a745;
       --danger-red: #dc3545;
   }
   ```

4. **Layout Adjustments**

   For different screen sizes or kiosk displays, adjust the layout properties in the respective CSS files.

### Runtime Configuration

Several aspects of the application can be configured through the Admin Dashboard:

1. **Station Management**
   - Add, edit, or remove stations
   - Change station statuses (Active Queue, Problem Solver, Inactive)
   - Toggle end indicators (Hi/Lo)

2. **Safety Messages**
   - Add new safety messages
   - Edit existing safety messages
   - Set message priority (Normal/Urgent)
   - Activate or deactivate messages

3. **User Management**
   - Create new admin users
   - Reset passwords
   - Link Slack user accounts for permissions

## Usage

The Stow Kiosk application provides multiple interfaces to streamline station management in fulfillment centers. This section covers how to start the application and interact with its various components.

### Starting the Application

#### Development Mode

For development and testing, start the application in development mode:

```bash
npm run dev
```

This uses nodemon to automatically restart the server when files change, which is ideal for development.

#### Production Mode

For production deployment, start the application using:

```bash
NODE_ENV=production npm start
```

Setting `NODE_ENV=production` optimizes performance, enables additional security features, and disables development-specific outputs.

You can also use process managers like PM2 for production environments:

```bash
# Install PM2 globally
npm install -g pm2

# Start the application with PM2
pm2 start server/index.js --name "stow-kiosk" -- NODE_ENV=production

# Monitor the application
pm2 monit

# View logs
pm2 logs stow-kiosk
```

### Accessing Kiosk Displays

Once the application is running, the following URLs are available:

| URL | Description |
|-----|-------------|
| `http://localhost:3000/` | Landing page with links to both sides |
| `http://localhost:3000/side/a` | Side A kiosk display |
| `http://localhost:3000/side/b` | Side B kiosk display |
| `http://localhost:3000/admin` | Admin dashboard |

Replace `localhost:3000` with your server's hostname and port if different.

### Kiosk Display Features

The kiosk displays (Side A and Side B) provide real-time visual information:

1. **Automatic Refresh**: 
   - Displays automatically refresh every 60 seconds
   - A countdown timer shows time until next refresh

2. **Station Status Visualization**:
   - Active Queue stations appear in blue
   - Problem Solver stations appear in orange
   - Inactive stations appear in gray (dim)

3. **End Indicators**:
   - "Hi" (↑) indicates a high-end station
   - "Lo" (↓) indicates a low-end station

4. **Safety Messages**:
   - Rotating safety messages appear at the bottom of the display
   - Messages automatically change every 10 seconds
   - Urgent messages are highlighted with priority display

### Admin Dashboard Usage

The admin dashboard provides an interface for managing all aspects of the kiosk system:

1. **Accessing the Dashboard**:
   - Navigate to `http://localhost:3000/admin`
   - Log in with your admin credentials (default: username `admin`, password `admin123`)

2. **Station Management**:
   - Switch between Side A and Side B using the toggle buttons
   - View all stations in a grid layout
   - Update station status by clicking the status toggle button
   - Toggle end indicators between "Hi" and "Lo"
   - Add new stations with the "Add Station" button

3. **Safety Message Management**:
   - View all active safety messages
   - Add new safety messages
   - Edit existing messages
   - Set message priority (Normal/Urgent)
   - Activate or deactivate messages

4. **User Account Management**:
   - For security reasons, user management is only available to administrators
   - Change your password from the user profile section
   - Create new admin users (if you have permissions)

### Slack Integration Usage

The Slack integration enables remote management of the kiosk system:

1. **Available Slash Commands**:

   - `/station-update [side]`: Opens an interactive dialog to update station statuses
     - Example: `/station-update A` (shows Side A stations)
     - If no side is specified, defaults to Side A

   - `/safety-message add [message]`: Adds a new safety message
     - Example: `/safety-message add Remember to wear safety gloves`

   - `/safety-message list`: Lists all active safety messages

2. **Interactive Components**:

   After using the `/station-update` command, an interactive message appears with buttons to:
   - Set a station to Active Queue
   - Set a station to Problem Solver
   - Set a station to Inactive
   - Toggle between "Hi" and "Lo" end indicators

3. **Scheduled Reminders**:

   The system automatically sends hourly reminders to the configured Slack channel (`SLACK_REMINDER_CHANNEL`):
   - Reminders prompt associates to update station statuses
   - Include a quick link to trigger the station update modal
   - Can be customized for peak hours using admin controls

4. **Custom Reminder Schedules**:

   Administrators can adjust reminder schedules:
   - Default schedule: Once per hour (0 * * * *)
   - Peak hours: Can be configured for more frequent reminders
   - Schedule follows cron syntax for flexible timing

### Mobile Access

The application is mobile-responsive and can be accessed from smartphones and tablets:

1. **Mobile Admin Access**:
   - Station managers can use the mobile interface to update statuses on-the-go
   - Responsive design adapts to different screen sizes
   - Full functionality available on mobile browsers

2. **Mobile Kiosk View**:
   - Simplified view for quick status checks from mobile devices
   - Optimized for portrait orientation on smartphones

### Browser Compatibility

For optimal experience, use one of these browsers:
- Chrome 80+ (recommended for kiosk displays)
- Firefox 75+
- Edge 80+
- Safari 13+

For kiosk displays, consider enabling kiosk mode in Chrome (F11 for fullscreen).

## Recent Updates

### March 2025: Fixed Status Inconsistency Between Slack and Kiosk

#### Problem
There was a discrepancy between station statuses displayed in the Slack interface and those shown on the kiosk display. This inconsistency created confusion for operators who would see different information depending on which interface they were using.

#### Solution
1. **Data Standardization**: Implemented consistent status transformations in both the API responses and the frontend display logic.
2. **Enhanced Initialization**: Improved database initialization and seeding process to ensure consistent data across environments.
3. **Service Management**: Updated the Slack and Scheduler services to properly instantiate and handle status changes.
4. **Status Mapping**: Standardized status representation to handle combined statuses consistently.
5. **Debugging**: Added extensive logging and error handling to help diagnose issues.

#### Technical Details
- Modified `stationController.js` to transform data consistently across all endpoints
- Updated `slackService.js` to export a class instead of an instance
- Enhanced `schedulerService.js` to properly handle its own instance of SlackService
- Fixed frontend rendering in `kiosk.js` to interpret station statuses correctly
- Added comprehensive error handling in API fetch functions
- Implemented proper database initialization with error recovery

#### Deployment Notes
When deploying the application:
1. Ensure the `.env` file contains valid `SLACK_BOT_TOKEN`, `SLACK_SIGNING_SECRET`, and `SLACK_REMINDER_CHANNEL`
2. Run migrations if upgrading from a previous version
3. Check that both Slack and kiosk displays show identical information for each station
