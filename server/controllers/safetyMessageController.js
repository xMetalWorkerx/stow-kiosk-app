const SafetyMessage = require('../models/SafetyMessage');

// Get all active safety messages
exports.getActiveMessages = async (req, res, next) => {
  try {
    const messages = await SafetyMessage.findActive();
    res.json(messages);
  } catch (error) {
    next(error);
  }
};

// Create a new safety message
exports.createMessage = async (req, res, next) => {
  try {
    const { text, priority = 'normal' } = req.body;
    
    if (!text || text.trim() === '') {
      return res.status(400).json({ error: 'Safety message text is required' });
    }
    
    if (!['normal', 'urgent'].includes(priority)) {
      return res.status(400).json({ error: 'Priority must be normal or urgent' });
    }
    
    const message = await SafetyMessage.create({ text, priority });
    res.status(201).json(message);
  } catch (error) {
    next(error);
  }
};

// Update a safety message
exports.updateMessage = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { text, priority, isActive } = req.body;
    
    const updates = {};
    if (text) updates.text = text;
    if (priority) {
      if (!['normal', 'urgent'].includes(priority)) {
        return res.status(400).json({ error: 'Priority must be normal or urgent' });
      }
      updates.priority = priority;
    }
    if (isActive !== undefined) updates.isActive = isActive;
    
    const message = await SafetyMessage.update(id, updates);
    
    if (!message) {
      return res.status(404).json({ error: 'Safety message not found' });
    }
    
    res.json(message);
  } catch (error) {
    next(error);
  }
};

// Delete a safety message
exports.deleteMessage = async (req, res, next) => {
  try {
    const { id } = req.params;
    const deleted = await SafetyMessage.delete(id);
    
    if (!deleted) {
      return res.status(404).json({ error: 'Safety message not found' });
    }
    
    res.json({ message: 'Safety message deleted successfully' });
  } catch (error) {
    next(error);
  }
};
