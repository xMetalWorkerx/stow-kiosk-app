// Global variables
let currentSide = 'A';
let refreshInterval = null;
let countdownInterval = null;
let countdownValue = 60;
// Add a new variable to store previous station states
let stationStates = {};
// WebSocket connection
let ws = null;
// Connection status
let isConnected = false;

// Initialize the kiosk with the specified side
function initializeKiosk(side) {
    currentSide = side;
    
    // Update the side title in the header
    const sideTitle = document.getElementById('side-title');
    sideTitle.textContent = `${side} Side`;
    
    // Set up the fixed grid layout
    setupFixedGridLayout();
    
    // Load the initial data
    loadStations();
    
    // Set up safety message rotation
    initializeSafetyMessages();
    
    // Set up countdown timer
    startCountdown();
    
    // Update the timestamp
    updateTimestamp();
    
    // Add click event handler for stations
    setupStationClickHandlers();
    
    // Initialize WebSocket connection
    initializeWebSocket();
}

// Initialize WebSocket connection
function initializeWebSocket() {
    // Close existing connection if any
    if (ws) {
        ws.close();
    }
    
    // Create a new WebSocket connection
    ws = new WebSocket((location.protocol === 'https:' ? 'wss://' : 'ws://') + location.host);
    
    // Connection opened
    ws.addEventListener('open', (event) => {
        console.log('WebSocket connection established');
        isConnected = true;
        updateConnectionStatus(true);
    });
    
    // Listen for messages
    ws.addEventListener('message', (event) => {
        console.log('WebSocket message received:', event.data);
        try {
            const message = JSON.parse(event.data);
            handleWebSocketMessage(message);
        } catch (error) {
            console.error('Error parsing WebSocket message:', error);
        }
    });
    
    // Connection closed
    ws.addEventListener('close', (event) => {
        console.log('WebSocket connection closed');
        isConnected = false;
        updateConnectionStatus(false);
        
        // Try to reconnect after a delay
        setTimeout(initializeWebSocket, 5000);
    });
    
    // Connection error
    ws.addEventListener('error', (event) => {
        console.error('WebSocket error:', event);
        isConnected = false;
        updateConnectionStatus(false);
    });
}

// Handle WebSocket messages
function handleWebSocketMessage(message) {
    if (message.type === 'stationUpdate') {
        updateStationUI(message.data);
    } else if (message.type === 'info') {
        console.log('WebSocket info:', message.message);
    }
}

// Update station UI from WebSocket data
function updateStationUI(data) {
    // Check if the station is on the current side
    if (data.side !== currentSide) {
        return;
    }
    
    const stationId = `${data.level}-${data.station_number}`;
    const stationElement = document.getElementById(stationId);
    
    if (stationElement) {
        console.log(`Updating station ${stationId} via WebSocket with status: ${data.status}, end: ${data.end_indicator}`);
        
        // Remove existing classes
        stationElement.classList.remove('station-active-queue', 'station-problem-solver', 'station-both', 'station-inactive');
        
        // Determine new state to apply
        let newState = null;
        let status = data.status;
        
        // Normalize status format for display
        if (status === 'AQ+PS' || (status === 'AQ' && data.secondary_status === 'PS')) {
            newState = 'station-both';
        } else if (status === 'AQ') {
            newState = 'station-active-queue';
        } else if (status === 'PS') {
            newState = 'station-problem-solver';
        } else {
            newState = 'station-inactive';
        }
        
        // Apply the new state
        stationElement.classList.add(newState);
        
        // Update the end indicator if applicable
        const stationNumber = stationElement.querySelector('.station-number');
        if (stationNumber) {
            // Clear any existing content
            while (stationNumber.firstChild) {
                stationNumber.removeChild(stationNumber.firstChild);
            }
            
            // Add back just the number
            const number = data.station_number;
            stationNumber.textContent = number;
            
            // Add end indicator if station is active
            if (newState !== 'station-inactive') {
                const arrow = document.createElement('span');
                arrow.className = 'end-indicator';
                arrow.textContent = data.end_indicator === 'Hi' ? '↑' : '↓';
                stationNumber.appendChild(arrow);
            }
        }
        
        // Update the stored state
        stationStates[stationId] = newState;
        
        // Highlight the station as recently updated
        stationElement.classList.add('updated');
        setTimeout(() => {
            stationElement.classList.remove('updated');
        }, 2000);
    }
}

// Update connection status indicator
function updateConnectionStatus(connected) {
    const statusDot = document.querySelector('.status-dot');
    if (statusDot) {
        statusDot.style.backgroundColor = connected ? 'var(--success-green)' : 'var(--error-red)';
        statusDot.title = connected ? 'Connected' : 'Disconnected - Attempting to reconnect...';
    }
}

// Add click handlers for stations
function setupStationClickHandlers() {
    document.addEventListener('click', function(event) {
        // Check if a station was clicked
        let stationElement = event.target.closest('.station');
        
        if (stationElement) {
            // Only add the clicked class if it's an active station
            if (stationElement.classList.contains('station-active-queue') || 
                stationElement.classList.contains('station-problem-solver') || 
                stationElement.classList.contains('station-both')) {
                
                // Add the clicked class for animation
                stationElement.classList.add('clicked');
                
                // Remove the clicked class after animation completes
                setTimeout(() => {
                    stationElement.classList.remove('clicked');
                }, 500);
                
                // Optional: You could add functionality here to show details about the station
                const stationId = stationElement.id;
                const [level, number] = stationId.split('-');
                console.log(`Station ${number} on level ${level} clicked`);
            }
        }
    });
}

// Create the fixed grid layout with predefined station numbers
function setupFixedGridLayout() {
    const stationsContainer = document.getElementById('stations-container');
    stationsContainer.innerHTML = '';
    
    // Define the standard station numbers and levels
    const standardLevels = [3, 2, 1]; // Reversed order: highest floor (3) on top
    
    // Define different station numbers for each side
    const stationsBySide = {
        'A': ["123", "149", "175", "215"],
        'B': ["123", "149", "175", "203"]
    };
    
    // Use the appropriate station numbers based on current side
    const standardStations = stationsBySide[currentSide] || stationsBySide['A'];
    
    // Create the 3 level containers
    standardLevels.forEach(level => {
        const levelElement = document.createElement('div');
        levelElement.className = 'level';
        
        const levelTitle = document.createElement('h2');
        levelTitle.className = 'level-title';
        levelTitle.textContent = `LEVEL ${level}`;
        levelElement.appendChild(levelTitle);
        
        const stationsElement = document.createElement('div');
        stationsElement.className = 'stations';
        
        // Create 4 station elements per level
        standardStations.forEach(stationNumber => {
            const stationElement = document.createElement('div');
            stationElement.className = 'station';
            stationElement.id = `${level}-${stationNumber}`;
            
            const stationNumberElement = document.createElement('div');
            stationNumberElement.className = 'station-number';
            stationNumberElement.textContent = stationNumber;
            
            stationElement.appendChild(stationNumberElement);
            stationsElement.appendChild(stationElement);
        });
        
        levelElement.appendChild(stationsElement);
        stationsContainer.appendChild(levelElement);
    });
}

// Start the countdown timer for data refresh
function startCountdown() {
    // Clear any existing interval
    if (countdownInterval) {
        clearInterval(countdownInterval);
    }
    
    countdownValue = 60;
    document.getElementById('countdown').textContent = countdownValue;
    
    countdownInterval = setInterval(() => {
        countdownValue--;
        document.getElementById('countdown').textContent = countdownValue;
        
        if (countdownValue <= 0) {
            // Reset the countdown and refresh data
            countdownValue = 60;
            loadStations();
            updateTimestamp();
        }
    }, 1000);
}

// Update the timestamp display
function updateTimestamp() {
    const now = new Date();
    const hours = now.getHours();
    const minutes = now.getMinutes();
    const ampm = hours >= 12 ? 'PM' : 'AM';
    const formattedHours = hours % 12 || 12;
    const formattedMinutes = minutes < 10 ? '0' + minutes : minutes;
    document.getElementById('update-time').textContent = `${formattedHours}:${formattedMinutes} ${ampm}`;
}

// Load stations data for the current side and update the fixed grid
function loadStations() {
    // Set status dot to normal color
    updateConnectionStatus(isConnected);
    
    // Use the currentSide variable
    console.log('Loading stations for side:', currentSide);
    
    // Track previous state to detect changes
    const previousStates = {...stationStates};
    
    // Fetch and update stations
    fetchStations(currentSide)
        .then(stations => {
            console.log('Stations loaded:', stations);
            
            // Clear all station styles first but only after successful fetch
            document.querySelectorAll('.station').forEach(station => {
                station.classList.remove('station-active-queue', 'station-problem-solver', 'station-both');
                
                // Remove any arrow elements
                const stationNumber = station.querySelector('.station-number');
                if (stationNumber) {
                    while (stationNumber.firstChild) {
                        stationNumber.removeChild(stationNumber.firstChild);
                    }
                    
                    // Add back just the number
                    const id = station.id;
                    const number = id.split('-')[1];
                    stationNumber.textContent = number;
                }
            });
            
            // Update timestamp
            updateTimestamp();
            
            // Process and update station status in our fixed grid
            stations.forEach(station => {
                const stationId = `${station.level}-${station.station_number}`;
                const stationElement = document.getElementById(stationId);
                
                if (stationElement) {
                    // Determine new state to apply
                    let newState = null;
                    let status = station.status;
                    
                    // Debug - log station state for troubleshooting
                    console.log(`Rendering station ${stationId} with status: ${status}, end: ${station.end_indicator}`);
                    
                    // Normalize status format for display - handling both separate statuses and combined formats
                    if (status === 'AQ+PS' || (status === 'AQ' && station.secondary_status === 'PS')) {
                        newState = 'station-both';
                    } else if (status === 'AQ') {
                        newState = 'station-active-queue';
                    } else if (status === 'PS') {
                        newState = 'station-problem-solver';
                    } else {
                        newState = 'station-inactive';
                    }
                    
                    // Apply the new state class
                    stationElement.classList.add(newState);
                    
                    // Check if this is a change from previous state
                    const previousState = previousStates[stationId];
                    const hasChanged = previousState !== newState;
                    
                    // Update the stored state
                    stationStates[stationId] = newState;
                    
                    // Only active stations (non-inactive) should show end indicators
                    if (newState !== 'station-inactive') {
                        const stationNumber = stationElement.querySelector('.station-number');
                        if (stationNumber) {
                            // Add the arrow for the end indicator
                            const arrow = document.createElement('span');
                            arrow.className = 'end-indicator';
                            arrow.textContent = station.end_indicator === 'Hi' ? '↑' : '↓';
                            stationNumber.appendChild(arrow);
                        }
                        
                        // If state changed, add the 'updated' class for animation
                        if (hasChanged) {
                            stationElement.classList.add('updated');
                            setTimeout(() => {
                                stationElement.classList.remove('updated');
                            }, 2000);
                        }
                    }
                }
            });
        })
        .catch(error => {
            console.error('Error loading stations:', error);
            document.querySelector('.status-dot').style.backgroundColor = 'var(--error-red)';
        });
}
