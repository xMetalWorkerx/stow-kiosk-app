const express = require('express');
const router = express.Router();
const slackController = require('../controllers/slackController');
const captureRawBody = require('../middleware/slackMiddleware');

// Apply raw body capture middleware to all Slack routes
router.use(captureRawBody);

// Routes for Slack interactions
router.post('/command', slackController.handleSlashCommand);
router.post('/interactive', slackController.handleInteractive);

module.exports = router;
