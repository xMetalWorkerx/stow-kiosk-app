const express = require('express');
const router = express.Router();
const stationRoutes = require('./stations');
const safetyMessageRoutes = require('./safetyMessages');
const authRoutes = require('./auth');
const slackRoutes = require('./slack');
const availableSpaceRoutes = require('./availableSpaces');

// API Routes
router.use('/stations', stationRoutes);
router.use('/safety-messages', safetyMessageRoutes);
router.use('/auth', authRoutes);
router.use('/slack', slackRoutes);
router.use('/available-spaces', availableSpaceRoutes);

module.exports = router;
