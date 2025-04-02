const express = require('express');
const router = express.Router();
const stationController = require('../controllers/stationController');
const authenticate = require('../middleware/auth');

// Public routes
router.get('/side/:side', stationController.getStationsBySide);

// Protected routes (require authentication)
router.get('/', authenticate, stationController.getAllStations);
router.put('/:id', authenticate, stationController.updateStation);

module.exports = router;
