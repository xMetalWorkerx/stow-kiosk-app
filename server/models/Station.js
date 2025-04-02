const db = require('../database/db');

class Station {
  // Find all stations
  static async findAll() {
    const sql = `
      SELECT id, side, level, station_number, status, end_indicator, updated_at
      FROM stations
      ORDER BY side, level, station_number
    `;
    return await db.all(sql);
  }
  
  // Find stations by side
  static async findBySide(side) {
    const sql = `
      SELECT id, side, level, station_number, status, end_indicator, updated_at
      FROM stations
      WHERE side = ?
      ORDER BY level, station_number
    `;
    return await db.all(sql, [side]);
  }
  
  // Find a station by ID
  static async findById(id) {
    const sql = `
      SELECT id, side, level, station_number, status, end_indicator, updated_at
      FROM stations
      WHERE id = ?
    `;
    return await db.get(sql, [id]);
  }
  
  // Update a station, handling partial updates correctly
  static async update(id, updates) {
    // First get the existing station
    const station = await this.findById(id);
    
    if (!station) {
      return null;
    }
    
    // Build the SQL query dynamically based on provided updates
    const fields = [];
    const values = [];
    
    if (updates.status !== undefined) {
      fields.push('status = ?');
      values.push(updates.status);
    }
    
    if (updates.endIndicator !== undefined) {
      fields.push('end_indicator = ?');
      values.push(updates.endIndicator);
    }
    
    // If no fields to update, return the current station
    if (fields.length === 0) {
      return station;
    }
    
    // Construct and execute the SQL query
    const sql = `
      UPDATE stations
      SET ${fields.join(', ')}
      WHERE id = ?
    `;
    
    values.push(id);
    await db.run(sql, values);
    
    // Return the updated station
    return await this.findById(id);
  }
  
  // Create a station (for setup)
  static async create(stationData) {
    const { side, level, stationNumber, status = 'Inactive', endIndicator } = stationData;
    
    const sql = `
      INSERT INTO stations (side, level, station_number, status, end_indicator)
      VALUES (?, ?, ?, ?, ?)
    `;
    
    const result = await db.run(sql, [side, level, stationNumber, status, endIndicator]);
    return await this.findById(result.lastID);
  }
}

module.exports = Station;
