const Station = require('../models/Station');
const socketService = require('../services/socketService');

// Get all stations for a specific side
exports.getStationsBySide = async (req, res, next) => {
  try {
    const { side } = req.params;
    
    if (!['a', 'b'].includes(side.toLowerCase())) {
      return res.status(400).json({ error: 'Invalid side parameter' });
    }
    
    const stations = await Station.findBySide(side.toUpperCase());
    
    // Transform the data to match expected format by the frontend
    // This ensures consistency between Slack and the kiosk display
    const transformedStations = stations.map(station => {
      // Clone the station to avoid modifying the original
      const transformedStation = { ...station };
      
      // Debug log - Added to help diagnose issues
      console.log(`Processing station ${station.id}: Level ${station.level}, Number ${station.station_number}, Status ${station.status}, End ${station.end_indicator}`);
      
      // Standardize status formats - ensure the frontend and Slack use the same status codes
      // This is a key part of ensuring consistency across interfaces
      if (transformedStation.status === 'Inactive') {
        transformedStation.status = 'Inactive';
      } else if (transformedStation.status === 'PS+AQ' || transformedStation.status === 'AQ+PS') {
        // For stations with both statuses, standardize the format
        transformedStation.status = 'AQ'; // Primary status
        transformedStation.secondary_status = 'PS'; // Additional status
      }
      
      return transformedStation;
    });
    
    console.log(`Returning ${transformedStations.length} stations for side ${side.toUpperCase()}`);
    res.json(transformedStations);
  } catch (error) {
    console.error('Error in getStationsBySide:', error);
    next(error);
  }
};

// Update a station's status and end indicator
exports.updateStation = async (req, res, next) => {
  try {
    const { id } = req.params;
    
    if (!/^\d+$/.test(id)) {
      return res.status(400).json({ error: 'Station ID must be a positive integer' });
    }
    
    const { status, endIndicator } = req.body;
    
    // Create an updates object with only the fields that need to be updated
    const updates = {};
    
    // Validate status if provided
    if (status !== undefined) {
      if (!['AQ', 'PS', 'Inactive'].includes(status)) {
        return res.status(400).json({ error: 'Invalid status. Must be AQ, PS, or Inactive.' });
      }
      updates.status = status;
    }
    
    // Validate endIndicator if provided
    if (endIndicator !== undefined) {
      if (endIndicator !== null && !['Hi', 'Lo'].includes(endIndicator)) {
        return res.status(400).json({ error: 'Invalid end indicator. Must be Hi or Lo.' });
      }
      updates.endIndicator = endIndicator;
    }
    
    // If no updates are provided, return an error
    if (Object.keys(updates).length === 0) {
      return res.status(400).json({ error: 'No updates provided' });
    }
    
    console.log(`Updating station ${id} with:`, updates);
    const success = await Station.update(id, updates);
    
    if (!success) {
      return res.status(404).json({ error: 'Station not found' });
    }
    
    // Fetch the updated station data to return and broadcast
    const updatedStation = await Station.findById(id);
    
    // Broadcast the updated station data to all connected clients
    socketService.broadcast({ type: 'stationUpdate', data: updatedStation });
    
    console.log(`Station ${id} updated:`, updatedStation);
    res.json(updatedStation);
  } catch (error) {
    console.error('Error in updateStation:', error);
    next(error);
  }
};

// Get all stations
exports.getAllStations = async (req, res, next) => {
  try {
    const stations = await Station.findAll();
    
    // Transform the data to match expected format
    const transformedStations = stations.map(station => {
      const transformedStation = { ...station };
      
      // Apply the same standardization we use in getStationsBySide
      if (transformedStation.status === 'Inactive') {
        transformedStation.status = 'Inactive';
      } else if (transformedStation.status === 'PS+AQ' || transformedStation.status === 'AQ+PS') {
        transformedStation.status = 'AQ';
        transformedStation.secondary_status = 'PS';
      }
      
      return transformedStation;
    });
    
    res.json(transformedStations);
  } catch (error) {
    console.error('Error in getAllStations:', error);
    next(error);
  }
};
