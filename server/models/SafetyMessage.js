const db = require('../database/db');

class SafetyMessage {
  // Find all active safety messages
  static async findActive() {
    const sql = `
      SELECT id, text, priority, is_active, updated_at
      FROM safety_messages
      WHERE is_active = 1
      ORDER BY 
        CASE WHEN priority = 'urgent' THEN 0 ELSE 1 END,
        updated_at DESC
    `;
    return await db.all(sql);
  }
  
  // Find a safety message by ID
  static async findById(id) {
    const sql = `
      SELECT id, text, priority, is_active, updated_at
      FROM safety_messages
      WHERE id = ?
    `;
    return await db.get(sql, [id]);
  }
  
  // Create a new safety message
  static async create(messageData) {
    const { text, priority = 'normal', isActive = 1 } = messageData;
    
    const sql = `
      INSERT INTO safety_messages (text, priority, is_active)
      VALUES (?, ?, ?)
    `;
    
    const result = await db.run(sql, [text, priority, isActive]);
    return await this.findById(result.lastID);
  }
  
  // Update a safety message
  static async update(id, updates) {
    const { text, priority, isActive } = updates;
    
    // Build the SQL query dynamically based on provided updates
    let fields = [];
    let params = [];
    
    if (text !== undefined) {
      fields.push('text = ?');
      params.push(text);
    }
    
    if (priority !== undefined) {
      fields.push('priority = ?');
      params.push(priority);
    }
    
    if (isActive !== undefined) {
      fields.push('is_active = ?');
      params.push(isActive ? 1 : 0);
    }
    
    if (fields.length === 0) {
      return await this.findById(id);
    }
    
    const sql = `
      UPDATE safety_messages
      SET ${fields.join(', ')}
      WHERE id = ?
    `;
    
    params.push(id);
    await db.run(sql, params);
    return await this.findById(id);
  }
  
  // Delete a safety message
  static async delete(id) {
    const message = await this.findById(id);
    
    if (!message) {
      return null;
    }
    
    const sql = `DELETE FROM safety_messages WHERE id = ?`;
    await db.run(sql, [id]);
    
    return { id };
  }
}

module.exports = SafetyMessage;
