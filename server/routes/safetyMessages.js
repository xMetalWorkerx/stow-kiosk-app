const express = require('express');
const router = express.Router();
const safetyMessageController = require('../controllers/safetyMessageController');
const authenticate = require('../middleware/auth');

// Public routes
router.get('/', safetyMessageController.getActiveMessages);

// Protected routes (require authentication)
router.post('/', authenticate, safetyMessageController.createMessage);
router.put('/:id', authenticate, safetyMessageController.updateMessage);
router.delete('/:id', authenticate, safetyMessageController.deleteMessage);

module.exports = router;
