/*
 * Available Spaces API Routes
 * Defines endpoints for managing bin available space data
 */

const express = require('express');
const router = express.Router();
const availableSpaceController = require('../controllers/availableSpaceController');
const authenticate = require('../middleware/auth');

// Public routes (no authentication required)
// Get all available spaces
router.get('/', availableSpaceController.getAllSpaces);

// Get available space by ID
router.get('/:id', availableSpaceController.getSpaceById);

// Get spaces by type
router.get('/type/:type', availableSpaceController.getSpacesByType);

// Get spaces by availability range
router.get('/range', availableSpaceController.getSpacesByRange);

// Protected routes (require authentication)
// Create a new available space record
router.post('/', authenticate, availableSpaceController.createSpace);

// Update an available space
router.put('/:id', authenticate, availableSpaceController.updateSpace);

module.exports = router; 