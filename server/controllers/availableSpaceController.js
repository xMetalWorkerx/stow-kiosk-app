/*
 * Available Space Controller
 * Handles API routes for managing bin available space data
 * Includes real-time WebSocket broadcasts on updates
 */

const AvailableSpace = require('../models/AvailableSpace');
const socketService = require('../services/socketService');

// Get all available space records
exports.getAllSpaces = async (req, res, next) => {
  try {
    const spaces = await AvailableSpace.findAll();
    res.json(spaces);
  } catch (error) {
    console.error('Error in getAllSpaces:', error);
    next(error);
  }
};

// Get available space by ID
exports.getSpaceById = async (req, res, next) => {
  try {
    const { id } = req.params;
    
    if (!/^\d+$/.test(id)) {
      return res.status(400).json({ error: 'Space ID must be a positive integer' });
    }
    
    const space = await AvailableSpace.findById(id);
    
    if (!space) {
      return res.status(404).json({ error: 'Available space record not found' });
    }
    
    res.json(space);
  } catch (error) {
    console.error('Error in getSpaceById:', error);
    next(error);
  }
};

// Update an available space record
exports.updateSpace = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { percent } = req.body;
    
    if (!/^\d+$/.test(id)) {
      return res.status(400).json({ error: 'Space ID must be a positive integer' });
    }
    
    if (percent === undefined) {
      return res.status(400).json({ error: 'Percent value is required' });
    }
    
    if (isNaN(percent) || percent < 0 || percent > 100) {
      return res.status(400).json({ error: 'Percent must be a number between 0 and 100' });
    }
    
    const success = await AvailableSpace.update(id, { percent });
    
    if (!success) {
      return res.status(404).json({ error: 'Bin not found or update failed' });
    }
    
    // Fetch the updated space data to return and broadcast
    const updated = await AvailableSpace.findById(id);
    
    // Broadcast the update to all connected clients
    socketService.broadcast({ type: 'availableSpaceUpdate', data: updated });
    
    res.json(updated);
  } catch (error) {
    console.error('Error in updateSpace:', error);
    next(error);
  }
};

// Create a new available space record
exports.createSpace = async (req, res, next) => {
  try {
    const { aisle, section, position, type, percent } = req.body;
    
    // Validate required fields
    if (!aisle || !section || !position || !type) {
      return res.status(400).json({ error: 'Missing required fields' });
    }
    
    // Validate percent
    if (isNaN(percent) || percent < 0 || percent > 100) {
      return res.status(400).json({ error: 'Percent must be a number between 0 and 100' });
    }
    
    const id = await AvailableSpace.create({ aisle, section, position, type, percent });
    const newSpace = await AvailableSpace.findById(id);
    
    // Broadcast the new space to all connected clients
    socketService.broadcast({ type: 'availableSpaceUpdate', data: newSpace });
    
    res.status(201).json(newSpace);
  } catch (error) {
    console.error('Error in createSpace:', error);
    next(error);
  }
};

// Get spaces by type
exports.getSpacesByType = async (req, res, next) => {
  try {
    const { type } = req.params;
    
    if (!type) {
      return res.status(400).json({ error: 'Type parameter is required' });
    }
    
    const spaces = await AvailableSpace.findByType(type);
    res.json(spaces);
  } catch (error) {
    console.error('Error in getSpacesByType:', error);
    next(error);
  }
};

// Get spaces by availability range
exports.getSpacesByRange = async (req, res, next) => {
  try {
    const { min, max } = req.query;
    const minPercent = parseInt(min) || 0;
    const maxPercent = parseInt(max) || 100;
    
    if (minPercent < 0 || maxPercent > 100 || minPercent > maxPercent) {
      return res.status(400).json({ error: 'Invalid range parameters' });
    }
    
    const spaces = await AvailableSpace.findByAvailabilityRange(minPercent, maxPercent);
    res.json(spaces);
  } catch (error) {
    console.error('Error in getSpacesByRange:', error);
    next(error);
  }
}; 