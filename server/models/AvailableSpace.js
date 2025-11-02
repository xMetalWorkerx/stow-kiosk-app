/*
 * AvailableSpace Model
 * Handles data operations for storage bin available space management
 */

const db = require('../database/db');

class AvailableSpace {
  // Create a new bin space record
  static async create({ aisle, section, position, type, percent }) {
    const query = `
      INSERT INTO available_spaces (aisle, section, position, type, percent)
      VALUES (?, ?, ?, ?, ?)
    `;
    try {
      const result = await db.run(query, [aisle, section, position, type, percent]);
      return result.lastID;
    } catch (error) {
      throw new Error(`Error creating available space record: ${error.message}`);
    }
  }
  
  // Find all available space records
  static async findAll() {
    const query = 'SELECT * FROM available_spaces ORDER BY aisle, section, position';
    try {
      return await db.all(query);
    } catch (error) {
      throw new Error(`Error fetching available spaces: ${error.message}`);
    }
  }
  
  // Find bin by ID
  static async findById(id) {
    const query = 'SELECT * FROM available_spaces WHERE id = ?';
    try {
      return await db.get(query, [id]);
    } catch (error) {
      throw new Error(`Error fetching available space by ID: ${error.message}`);
    }
  }
  
  // Update bin's available space percentage
  static async update(id, { percent }) {
    if (percent === undefined || percent < 0 || percent > 100) {
      return false;
    }
    
    const query = `
      UPDATE available_spaces
      SET percent = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `;
    
    try {
      const result = await db.run(query, [percent, id]);
      return result.changes > 0;
    } catch (error) {
      throw new Error(`Error updating available space: ${error.message}`);
    }
  }
  
  // Delete a bin space record
  static async delete(id) {
    const query = 'DELETE FROM available_spaces WHERE id = ?';
    try {
      const result = await db.run(query, [id]);
      return result.changes > 0;
    } catch (error) {
      throw new Error(`Error deleting available space: ${error.message}`);
    }
  }
  
  // Find bins by type
  static async findByType(type) {
    const query = 'SELECT * FROM available_spaces WHERE type = ? ORDER BY aisle, section, position';
    try {
      return await db.all(query, [type]);
    } catch (error) {
      throw new Error(`Error fetching available spaces by type: ${error.message}`);
    }
  }
  
  // Find bins by available space range
  static async findByAvailabilityRange(min, max) {
    const query = 'SELECT * FROM available_spaces WHERE percent BETWEEN ? AND ? ORDER BY percent DESC';
    try {
      return await db.all(query, [min, max]);
    } catch (error) {
      throw new Error(`Error fetching available spaces by range: ${error.message}`);
    }
  }
}

module.exports = AvailableSpace; 