// Global variables
let currentSide = 'A';
let refreshInterval = null;
let countdownInterval = null;
let countdownValue = 60;
// Add a new variable to store previous station states
let stationStates = {};

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
    document.querySelector('.status-dot').style.backgroundColor = 'var(--success-green)';
    
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
                        stationElement.classList.add('station-both');
                    } else if (status === 'AQ') {
                        newState = 'station-active-queue';
                        stationElement.classList.add('station-active-queue');
                    } else if (status === 'PS') {
                        newState = 'station-problem-solver';
                        stationElement.classList.add('station-problem-solver');
                    }
                    
                    // Store the current state in our global tracking object
                    stationStates[stationId] = {
                        status: status,
                        endIndicator: station.end_indicator,
                        state: newState
                    };
                    
                    // Check if state has changed and apply transition effect
                    const previousState = previousStates[stationId] || {};
                    const hasStateChanged = 
                        (newState !== previousState.state) || 
                        (station.end_indicator !== previousState.endIndicator);
                    
                    if (hasStateChanged && newState) {
                        // Reset animations by temporarily removing the class
                        stationElement.classList.remove(newState);
                        
                        // Apply a subtle highlight effect to draw attention
                        stationElement.style.transition = 'all 0.5s cubic-bezier(0.2, 0.8, 0.2, 1)';
                        
                        // Use setTimeout to ensure the browser notices the class removal
                        setTimeout(() => {
                            stationElement.classList.add(newState);
                            
                            // Create a flash effect for state change
                            const flashOverlay = document.createElement('div');
                            flashOverlay.className = 'state-change-flash';
                            flashOverlay.style.position = 'absolute';
                            flashOverlay.style.top = '0';
                            flashOverlay.style.left = '0';
                            flashOverlay.style.width = '100%';
                            flashOverlay.style.height = '100%';
                            flashOverlay.style.borderRadius = '8px';
                            flashOverlay.style.backgroundColor = 'rgba(255, 255, 255, 0.3)';
                            flashOverlay.style.opacity = '0';
                            flashOverlay.style.pointerEvents = 'none';
                            flashOverlay.style.zIndex = '5';
                            flashOverlay.style.animation = 'flashFade 0.7s ease-out forwards';
                            
                            stationElement.appendChild(flashOverlay);
                            
                            // Remove the flash overlay after animation completes
                            setTimeout(() => {
                                if (stationElement.contains(flashOverlay)) {
                                    stationElement.removeChild(flashOverlay);
                                }
                            }, 700);
                        }, 50);
                    }
                    
                    // Add trend arrows if available
                    if (newState) { // Only add arrows to active stations
                        const stationNumber = stationElement.querySelector('.station-number');
                        if (stationNumber && status !== 'Inactive') {
                            // Create number text node
                            const number = stationId.split('-')[1];
                            stationNumber.textContent = number;
                            
                            // Determine trend from end_indicator
                            const trend = station.end_indicator === 'Hi' ? 'up' : 'down';
                            
                            if (trend === 'up') {
                                const arrowSpan = document.createElement('span');
                                arrowSpan.className = 'station-arrow arrow-up';
                                stationNumber.appendChild(arrowSpan);
                            }
                            
                            if (trend === 'down') {
                                const arrowSpan = document.createElement('span');
                                arrowSpan.className = 'station-arrow arrow-down';
                                stationNumber.appendChild(arrowSpan);
                            }
                        }
                    }
                }
            });
        })
        .catch(error => {
            console.error('Error loading stations:', error);
            document.querySelector('.status-dot').style.backgroundColor = 'var(--alert-red)';
            
            // Use previously stored station states instead of clearing everything
            if (Object.keys(stationStates).length > 0) {
                console.log('Using cached station states due to error');
                document.querySelectorAll('.station').forEach(station => {
                    const id = station.id;
                    const cachedState = stationStates[id];
                    
                    if (cachedState && cachedState.state) {
                        // Apply the cached state class
                        station.classList.add(cachedState.state);
                        
                        // Add trend arrows if needed
                        const stationNumber = station.querySelector('.station-number');
                        if (stationNumber && cachedState.status !== 'Inactive') {
                            // First ensure the number is visible
                            const number = id.split('-')[1];
                            stationNumber.textContent = number;
                            
                            // Add appropriate arrow
                            if (cachedState.endIndicator === 'Hi') {
                                const arrowSpan = document.createElement('span');
                                arrowSpan.className = 'station-arrow arrow-up';
                                stationNumber.appendChild(arrowSpan);
                            } else if (cachedState.endIndicator === 'Lo') {
                                const arrowSpan = document.createElement('span');
                                arrowSpan.className = 'station-arrow arrow-down';
                                stationNumber.appendChild(arrowSpan);
                            }
                        }
                    }
                });
            }
            
            document.getElementById('safety-message').textContent = 
                `Error loading station data: ${error.message}. Retrying soon...`;
            
            setTimeout(loadStations, 5000); // Retry after delay
        });
    
    // FIX #7: Frontend Assumes Backend Availability
    if (!navigator.onLine) {
        document.querySelector('.status-dot').style.backgroundColor = 'var(--alert-red)';
        document.getElementById('safety-message').textContent = 'Network offline. Please check connection.';
    }
}
