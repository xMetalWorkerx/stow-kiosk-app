/*
 * Relative Path: Stow Kiosk/server/models/Station.js
 *
 * Implementation Instructions:
 * 1. Replace the existing `server/models/Station.js` with this file.
 * 2. Ensure the database schema (`server/database/schema.sql`) includes the `floor` column.
 * 3. The `findByFloor` method is used by the WebSocket server to broadcast station updates for specific floors.
 * 4. No additional setup is required; this file works with the updated schema and seed data.
 * 5. Verify by accessing the carousel or available space screens, which rely on floor-based station data.
 *
 * Data model for interacting with the `stations` table in the database.
 * Provides methods for CRUD operations (Create, Read, Update, Delete) on stations.
 * Includes the `findByFloor` method to support new floor-based views.
 */

const db = require('../database/db');

class Station {
  static async create({ side, floor, level, station_number, status = 'Inactive', end_indicator = 'Hi' }) {
    const query = `
      INSERT INTO stations (side, floor, level, station_number, status, end_indicator)
      VALUES (?, ?, ?, ?, ?, ?)
    `;
    try {
      const result = await db.run(query, [side, floor, level, station_number, status, end_indicator]);
      return result.lastID;
    } catch (error) {
      throw new Error(`Error creating station: ${error.message}`);
    }
  }

  // Find all stations, ordered for consistency
  static async findAll() {
    const query = 'SELECT * FROM stations ORDER BY floor, level, station_number';
    try {
      return await db.all(query);
    } catch (error) {
      throw new Error(`Error fetching stations: ${error.message}`);
    }
  }

  // Find stations for a specific side (A or B)
  static async findBySide(side) {
    const query = 'SELECT * FROM stations WHERE side = ? ORDER BY level, station_number';
    try {
      return await db.all(query, [side]);
    } catch (error) {
      throw new Error(`Error fetching stations by side: ${error.message}`);
    }
  }

  // Find stations for a specific floor (New method for floor-based views)
  static async findByFloor(floor) {
    const query = 'SELECT * FROM stations WHERE floor = ? ORDER BY level, station_number';
    try {
      return await db.all(query, [floor]);
    } catch (error) {
      throw new Error(`Error fetching stations by floor: ${error.message}`);
    }
  }

  // Find a single station by its unique ID
  static async findById(id) {
    const query = 'SELECT * FROM stations WHERE id = ?';
    try {
      return await db.get(query, [id]);
    } catch (error) {
      throw new Error(`Error fetching station by ID: ${error.message}`);
    }
  }

  // Update a station's status and/or end indicator
  static async update(id, updates) {
    // Dynamically build the SET clause and parameters
    const fieldsToUpdate = [];
    const params = [];

    if (updates.status !== undefined) {
      fieldsToUpdate.push('status = ?');
      params.push(updates.status);
    }
    if (updates.endIndicator !== undefined) {
      // Rename endIndicator to end_indicator to match the database column name
      fieldsToUpdate.push('end_indicator = ?');
      params.push(updates.endIndicator);
    }

    // If no valid fields were provided, return false or throw an error
    if (fieldsToUpdate.length === 0) {
      // Or throw new Error('No valid fields provided for update');
      console.warn(`No valid fields provided for update on station ID ${id}`);
      return false; 
    }

    fieldsToUpdate.push('updated_at = CURRENT_TIMESTAMP');
    params.push(id); // Add the ID for the WHERE clause

    const query = `
      UPDATE stations
      SET ${fieldsToUpdate.join(', ')}
      WHERE id = ?
    `;

    try {
      const result = await db.run(query, params);
      return result.changes > 0;
    } catch (error) {
      // Log the query and params for easier debugging
      console.error(`Error updating station ID ${id}: ${error.message}`);
      console.error('Query:', query);
      console.error('Params:', params);
      throw new Error(`Error updating station: ${error.message}`);
    }
  }

  // Delete a station by its unique ID
  static async delete(id) {
    const query = 'DELETE FROM stations WHERE id = ?';
    try {
      const result = await db.run(query, [id]);
      return result.changes > 0;
    } catch (error) {
      throw new Error(`Error deleting station: ${error.message}`);
    }
  }
}

module.exports = Station;
