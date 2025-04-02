// Fetch stations from the API
function fetchStations(side) {
    console.log(`[DEBUG] fetchStations: Starting fetch for side ${side}`);
    
    return fetch(`/api/stations/side/${side.toLowerCase()}`)
        .then(response => {
            if (!response.ok) {
                // Enhanced error handling
                console.error(`Error fetching stations: ${response.status} ${response.statusText}`);
                return response.json().then(data => {
                    throw new Error(data.error || `Failed to fetch stations: ${response.status}`);
                }).catch(err => {
                    // If we can't parse JSON, just throw the original response status
                    if (err instanceof SyntaxError) {
                        throw new Error(`Failed to fetch stations: ${response.status}`);
                    }
                    throw err;
                });
            }
            return response.json();
        })
        .then(stations => {
            // Log stations data for debugging with more detail
            console.log(`[DEBUG] fetchStations: Received ${stations.length} stations for side ${side}`);
            
            // Special debugging for A side stations
            if (side.toUpperCase() === 'A') {
                console.log('[DEBUG] A-SIDE STATIONS:');
                
                // Group by level
                const byLevel = {};
                stations.forEach(station => {
                    if (!byLevel[station.level]) {
                        byLevel[station.level] = [];
                    }
                    byLevel[station.level].push(station);
                });
                
                // Log each level
                Object.keys(byLevel).sort().forEach(level => {
                    console.log(`[DEBUG] LEVEL ${level}:`);
                    byLevel[level].forEach(station => {
                        console.log(`[DEBUG]   - Station ID:${station.id}, ${station.level}-${station.side}-${station.station_number}, Status:${station.status}`);
                    });
                });
            }
            
            return stations;
        });
}

// Update a station's status
function updateStation(stationId, status, endIndicator) {
    // FIX #2: Station Update Validation Mismatch
    // Only send properties that are actually changing
    const updateData = {};
    
    if (status !== null && status !== undefined) {
        updateData.status = status;
    }
    
    if (endIndicator !== null && endIndicator !== undefined) {
        updateData.endIndicator = endIndicator;
    }
    
    console.log(`Updating station ${stationId} with:`, updateData);
    
    return fetch(`/api/stations/${stationId}`, {
        method: 'PUT',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${getAuthToken()}`
        },
        body: JSON.stringify(updateData)
    })
    .then(response => {
        if (!response.ok) {
            return response.json().then(data => {
                console.error(`Error updating station: ${data.error || response.statusText}`);
                throw new Error(data.error || 'Failed to update station');
            }).catch(err => {
                // If we can't parse JSON, just throw the original response status
                if (err instanceof SyntaxError) {
                    throw new Error(`Failed to update station: ${response.status}`);
                }
                throw err;
            });
        }
        return response.json();
    })
    .then(updatedStation => {
        console.log(`Station ${stationId} updated successfully:`, updatedStation);
        return updatedStation;
    });
}

// Group stations by level
function groupStationsByLevel(stations) {
    const grouped = {};
    
    stations.forEach(station => {
        if (!grouped[station.level]) {
            grouped[station.level] = [];
        }
        
        grouped[station.level].push(station);
    });
    
    // Sort stations by number within each level
    Object.keys(grouped).forEach(level => {
        grouped[level].sort((a, b) => a.station_number - b.station_number);
    });
    
    return grouped;
}

// For admin: Fetch all stations
function fetchAllStations() {
    console.log('Fetching all stations');
    return fetch('/api/stations', {
        headers: {
            'Authorization': `Bearer ${getAuthToken()}`
        }
    })
    .then(response => {
        if (!response.ok) {
            console.error(`Error fetching all stations: ${response.status} ${response.statusText}`);
            return response.json().then(data => {
                throw new Error(data.error || `Failed to fetch all stations: ${response.status}`);
            }).catch(err => {
                if (err instanceof SyntaxError) {
                    throw new Error(`Failed to fetch all stations: ${response.status}`);
                }
                throw err;
            });
        }
        return response.json();
    })
    .then(stations => {
        console.log(`Received ${stations.length} total stations`);
        return stations;
    });
}

// Toggle station status in admin panel
function toggleStationStatus(stationId, currentStatus) {
    // Cycle through statuses: AQ -> PS -> Inactive -> AQ
    let newStatus;
    
    switch (currentStatus) {
        case 'AQ':
            newStatus = 'PS';
            break;
        case 'PS':
            newStatus = 'Inactive';
            break;
        default:
            newStatus = 'AQ';
    }
    
    console.log(`Toggling station ${stationId} status from ${currentStatus} to ${newStatus}`);
    return updateStation(stationId, newStatus, null);
}

// Toggle station end indicator in admin panel
function toggleStationEndIndicator(stationId, currentIndicator) {
    // Toggle between Hi and Lo
    const newIndicator = currentIndicator === 'Hi' ? 'Lo' : 'Hi';
    
    console.log(`Toggling station ${stationId} end indicator from ${currentIndicator} to ${newIndicator}`);
    return updateStation(stationId, null, newIndicator);
}
