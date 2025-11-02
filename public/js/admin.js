// Global admin state management
let adminState = {
    stations: [],
    safetyMessages: [],
    activeSafetyMessage: null,
    user: null,
    // Add WebSocket connection state
    ws: null,
    isConnected: false
};

// Initialize admin dashboard
document.addEventListener('DOMContentLoaded', function() {
    // Initialize WebSocket connection
    initializeWebSocket();
    
    // Check if user is authenticated
    if (isAuthenticated()) {
        showAdminDashboard();
    } else {
        showLoginForm();
    }
    
    // Set up event listeners
    setupEventListeners();
});

// Set up all event listeners
function setupEventListeners() {
    // Login form
    const loginBtn = document.getElementById('login-btn');
    if (loginBtn) {
        loginBtn.addEventListener('click', handleLogin);
    }
    
    // Logout button
    const logoutBtn = document.getElementById('logout-btn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', handleLogout);
    }
    
    // Note: Dashboard-specific event listeners are now set up in setupDashboardEventListeners
    // which is called after the dashboard is made visible
}

// Handle login form submission
function handleLogin() {
    const username = document.getElementById('username').value;
    const password = document.getElementById('password').value;
    const errorElement = document.getElementById('login-error');
    
    // Validate inputs
    if (!username || !password) {
        errorElement.textContent = 'Please enter both username and password';
        return;
    }
    
    // Attempt login
    login(username, password)
        .then(response => {
            showAdminDashboard();
            document.getElementById('user-name').textContent = username;
        })
        .catch(error => {
            errorElement.textContent = error.message;
        });
}

// Handle logout
function handleLogout() {
    clearAuthToken();
    showLoginForm();
}

// Show login form and hide dashboard
function showLoginForm() {
    document.getElementById('login-container').style.display = 'block';
    document.getElementById('admin-dashboard').style.display = 'none';
    document.getElementById('logout-btn').style.display = 'none';
    document.getElementById('user-name').textContent = 'Not Logged In';
    
    // Add login credentials note with hacker-style formatting
    const loginContainer = document.getElementById('login-container');
    if (!document.getElementById('login-hint')) {
        const loginHint = document.createElement('div');
        loginHint.id = 'login-hint';
        loginHint.className = 'login-hint';
        loginHint.innerHTML = '<span class="blink">></span> Default access: <span class="credential">admin</span> / <span class="credential">admin123</span>';
        
        // Insert after the heading but before the form
        const heading = loginContainer.querySelector('h2');
        if (heading && heading.nextSibling) {
            loginContainer.insertBefore(loginHint, heading.nextSibling);
        } else {
            loginContainer.appendChild(loginHint);
        }
    }
}

// Show admin dashboard and hide login form
function showAdminDashboard() {
    document.getElementById('login-container').style.display = 'none';
    document.getElementById('admin-dashboard').style.display = 'block';
    document.getElementById('logout-btn').style.display = 'inline-block';
    
    // Load initial data
    loadStationsData('A');
    loadSafetyMessagesData();
    
    // Re-attach event listeners to ensure they're bound to visible elements
    setupDashboardEventListeners();
}

// Set up event listeners specifically for dashboard elements 
function setupDashboardEventListeners() {
    // Navigation tabs
    const navButtons = document.querySelectorAll('.nav-button');
    navButtons.forEach(button => {
        button.addEventListener('click', function() {
            const targetPanelId = this.getAttribute('data-target');
            switchPanel(targetPanelId);
        });
    });
    
    // Side selector buttons
    const sideButtons = document.querySelectorAll('.side-button');
    sideButtons.forEach(button => {
        button.addEventListener('click', function() {
            const side = this.getAttribute('data-side');
            switchSide(side);
        });
    });
    
    // Safety message form
    const addMessageBtn = document.getElementById('add-message-btn');
    if (addMessageBtn) {
        addMessageBtn.addEventListener('click', showAddMessageForm);
    }
    
    const saveMessageBtn = document.getElementById('save-message-btn');
    if (saveMessageBtn) {
        saveMessageBtn.addEventListener('click', handleSaveMessage);
    }
    
    const cancelMessageBtn = document.getElementById('cancel-message-btn');
    if (cancelMessageBtn) {
        cancelMessageBtn.addEventListener('click', hideAddMessageForm);
    }
}

// Switch between admin panels
function switchPanel(panelId) {
    // Update active button
    document.querySelectorAll('.nav-button').forEach(button => {
        button.classList.remove('active');
        if (button.getAttribute('data-target') === panelId) {
            button.classList.add('active');
        }
    });
    
    // Show the target panel and hide others
    document.querySelectorAll('.panel').forEach(panel => {
        panel.classList.remove('active');
        panel.style.display = 'none'; // Explicitly hide panels
    });
    
    const targetPanel = document.getElementById(panelId);
    targetPanel.classList.add('active');
    targetPanel.style.display = 'block'; // Explicitly show the target panel
    
    // Refresh data if needed when switching to a panel
    if (panelId === 'safety-messages-panel') {
        loadSafetyMessagesData();
    } else if (panelId === 'stations-panel') {
        // Get the active side
        const activeSideButton = document.querySelector('.side-button.active');
        const side = activeSideButton ? activeSideButton.getAttribute('data-side') : 'A';
        loadStationsData(side);
    }
}

// Switch between sides for station management
function switchSide(side) {
    // Update active button with better visual feedback
    document.querySelectorAll('.side-button').forEach(button => {
        button.classList.remove('active');
        // Reset background color 
        button.style.backgroundColor = 'var(--light-grey)';
        button.style.color = 'var(--dark-grey)';
        
        if (button.getAttribute('data-side') === side) {
            button.classList.add('active');
            // Explicitly set active button colors
            button.style.backgroundColor = 'var(--amazon-blue)';
            button.style.color = 'white';
        }
    });
    
    // Show loading indicator with clear user feedback
    const stationsContainer = document.getElementById('stations-container');
    stationsContainer.innerHTML = '<div class="loading">Accessing station data for Side ' + side + '...</div>';
    
    // Load stations for the selected side
    loadStationsData(side);
}

// Load stations data for the specified side
function loadStationsData(side) {
    const stationsContainer = document.getElementById('stations-container');
    stationsContainer.innerHTML = '<div class="loading">Loading stations...</div>';
    
    console.log(`Admin: Loading stations data for side ${side}`);
    
    fetchStations(side)
        .then(stations => {
            // Debug: Log received stations
            console.log(`Admin: Received ${stations.length} stations for side ${side}`);
            stations.forEach(station => {
                console.log(`Admin: Station ${station.id}: Level ${station.level}, Side ${station.side}, Number ${station.station_number}, Status: ${station.status}`);
            });
            
            // Group stations by level
            const stationsByLevel = groupStationsByLevel(stations);
            
            // Clear the container
            stationsContainer.innerHTML = '';
            
            // Check if we have stations
            if (Object.keys(stationsByLevel).length === 0) {
                stationsContainer.innerHTML = '<div class="loading">No stations found for this side.</div>';
                return;
            }
            
            // Create level elements
            Object.keys(stationsByLevel).sort((a, b) => Number(a) - Number(b)).forEach(level => {
                const levelStations = stationsByLevel[level];
                
                // Create level group
                const levelGroup = document.createElement('div');
                levelGroup.className = 'level-group';
                
                // Check if this level has any active stations
                const hasActiveStations = levelStations.some(station => station.status === 'AQ' || station.status === 'PS');
                if (hasActiveStations) {
                    levelGroup.setAttribute('data-active-stations', 'true');
                }
                
                // Set dominant status for level color bar
                const aqCount = levelStations.filter(station => station.status === 'AQ').length;
                const psCount = levelStations.filter(station => station.status === 'PS').length;
                const inactiveCount = levelStations.filter(station => station.status === 'Inactive').length;
                
                // Determine dominant status
                if (aqCount >= psCount && aqCount >= inactiveCount) {
                    levelGroup.setAttribute('data-status', 'AQ');
                } else if (psCount >= aqCount && psCount >= inactiveCount) {
                    levelGroup.setAttribute('data-status', 'PS');
                } else {
                    levelGroup.setAttribute('data-status', 'Inactive');
                }
                
                // Add level title with station count
                const levelTitle = document.createElement('h3');
                levelTitle.className = 'level-title';
                levelTitle.textContent = `Level ${level}`;
                levelTitle.setAttribute('data-count', levelStations.length); // Add station count
                levelGroup.appendChild(levelTitle);
                
                // Create level content container
                const levelContent = document.createElement('div');
                levelContent.className = 'level-content';
                
                // Add each station to level content with animation index
                levelStations.forEach((station, index) => {
                    const stationCard = createStationCard(station);
                    // Add index for staggered animation with small additional offset per level
                    stationCard.style.setProperty('--index', index + 1); // Ensure index starts at 1 for better timing
                    levelContent.appendChild(stationCard);
                });
                
                // Add level content to group
                levelGroup.appendChild(levelContent);
                stationsContainer.appendChild(levelGroup);
            });
            
            // Add event listeners to station controls
            addStationControlListeners();
        })
        .catch(error => {
            console.error('Admin: Error loading stations:', error);
            stationsContainer.innerHTML = `
                <div class="loading">
                    Error loading stations: ${error.message}
                </div>
            `;
        });
}

// Create a station card for the admin panel
function createStationCard(station) {
    const card = document.createElement('div');
    card.className = 'station-card';
    card.dataset.id = station.id;
    card.dataset.station = station.station_number;
    card.dataset.status = station.status;
    card.dataset.indicator = station.end_indicator;
    
    // Station info section with improved layout
    const info = document.createElement('div');
    info.className = 'station-info';
    
    // Make sure to use the station_number from the database
    const stationNumber = document.createElement('span');
    stationNumber.className = 'station-number';
    stationNumber.textContent = `${station.level}-${station.side}-${station.station_number}`;
    console.log(`Creating card for station ${station.id}: ${station.level}-${station.side}-${station.station_number}`);
    
    const statusClass = station.status === 'AQ' ? 'aq' : 
                        station.status === 'PS' ? 'ps' : 'inactive';
    
    const stationStatus = document.createElement('span');
    stationStatus.className = `station-status ${statusClass}`;
    // Use IA instead of Inactive for display text
    stationStatus.textContent = station.status === 'Inactive' ? 'IA' : station.status;
    
    // Add full status name as tooltip
    const statusTooltip = station.status === 'AQ' ? 'Active Queue' : 
                         station.status === 'PS' ? 'Problem Solver' : 'Inactive';
    stationStatus.title = statusTooltip;
    
    const indicatorText = station.end_indicator === 'Hi' ? '↑' : '↓';
    const stationIndicator = document.createElement('span');
    stationIndicator.className = 'station-indicator';
    stationIndicator.textContent = ` ${indicatorText}`;
    stationIndicator.title = `Indicator: ${station.end_indicator}`;
    
    info.appendChild(stationNumber);
    info.appendChild(stationStatus);
    info.appendChild(stationIndicator);
    
    // Station controls section with more compact buttons
    const controls = document.createElement('div');
    controls.className = 'station-controls';
    
    const statusToggleBtn = document.createElement('button');
    statusToggleBtn.className = 'status-toggle-btn';
    statusToggleBtn.textContent = 'Status';
    statusToggleBtn.title = 'Change Station Status';
    statusToggleBtn.dataset.id = station.id;
    statusToggleBtn.dataset.currentStatus = station.status;
    
    // Show next status on hover
    const nextStatus = station.status === 'AQ' ? 'PS' : 
                       station.status === 'PS' ? 'Inactive' : 'AQ';
    statusToggleBtn.setAttribute('data-next', nextStatus);
    statusToggleBtn.title = `Change status: ${station.status} → ${nextStatus}`;
    
    const indicatorToggleBtn = document.createElement('button');
    indicatorToggleBtn.className = 'indicator-toggle-btn';
    indicatorToggleBtn.textContent = 'Hi/Lo';
    indicatorToggleBtn.title = 'Toggle Hi/Lo Indicator';
    indicatorToggleBtn.dataset.id = station.id;
    indicatorToggleBtn.dataset.currentIndicator = station.end_indicator;
    
    // Show next indicator on hover
    const nextIndicator = station.end_indicator === 'Hi' ? 'Lo' : 'Hi';
    indicatorToggleBtn.setAttribute('data-next', nextIndicator);
    indicatorToggleBtn.title = `Change indicator: ${station.end_indicator} → ${nextIndicator}`;
    
    controls.appendChild(statusToggleBtn);
    controls.appendChild(indicatorToggleBtn);
    
    // Add everything to the card
    card.appendChild(info);
    card.appendChild(controls);
    
    return card;
}

// Add event listeners to station control buttons
function addStationControlListeners() {
    // Status toggle buttons
    document.querySelectorAll('.status-toggle-btn').forEach(button => {
        button.addEventListener('click', function() {
            const stationId = this.dataset.id;
            const currentStatus = this.dataset.currentStatus;
            
            // Determine next status
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
            
            // Update station
            updateStation(stationId, newStatus, null)
                .then(updatedStation => {
                    // Update the button's dataset
                    this.dataset.currentStatus = updatedStation.status;
                    
                    // Update the status display
                    const statusElement = this.closest('.station-card').querySelector('.station-status');
                    statusElement.textContent = updatedStation.status;
                    statusElement.className = `station-status ${updatedStation.status === 'AQ' ? 'aq' : 
                                               updatedStation.status === 'PS' ? 'ps' : 'inactive'}`;
                    
                    showNotification(`Station ${updatedStation.station_number} updated to ${updatedStation.status}`, 'success');
                })
                .catch(error => {
                    showNotification(`Error updating station: ${error.message}`, 'error');
                });
        });
    });
    
    // Indicator toggle buttons
    document.querySelectorAll('.indicator-toggle-btn').forEach(button => {
        button.addEventListener('click', function() {
            const stationId = this.dataset.id;
            const currentIndicator = this.dataset.currentIndicator;
            
            // Toggle indicator
            const newIndicator = currentIndicator === 'Hi' ? 'Lo' : 'Hi';
            
            // Update station
            updateStation(stationId, null, newIndicator)
                .then(updatedStation => {
                    // Update the button's dataset
                    this.dataset.currentIndicator = updatedStation.end_indicator;
                    
                    // Update the indicator display
                    const indicatorElement = this.closest('.station-card').querySelector('.station-indicator');
                    indicatorElement.textContent = ` ${updatedStation.end_indicator === 'Hi' ? '↑' : '↓'}`;
                    
                    showNotification(`Station ${updatedStation.station_number} indicator updated to ${updatedStation.end_indicator}`, 'success');
                })
                .catch(error => {
                    showNotification(`Error updating station: ${error.message}`, 'error');
                });
        });
    });
}

// Load safety messages data
function loadSafetyMessagesData() {
    const messagesContainer = document.getElementById('messages-container');
    messagesContainer.innerHTML = '<div class="loading">Loading safety messages...</div>';
    
    fetchAllSafetyMessages()
        .then(messages => {
            // Clear the container
            messagesContainer.innerHTML = '';
            
            // Check if we have messages
            if (messages.length === 0) {
                messagesContainer.innerHTML = '<div class="loading">No safety messages found.</div>';
                return;
            }
            
            // Create message cards with animation indices
            messages.forEach((message, index) => {
                const messageCard = createMessageCard(message);
                // Add animation index
                messageCard.style.setProperty('--index', index + 1);
                messagesContainer.appendChild(messageCard);
            });
            
            // Add event listeners to message controls
            addMessageControlListeners();
        })
        .catch(error => {
            messagesContainer.innerHTML = `
                <div class="loading">
                    Error loading messages: ${error.message}
                </div>
            `;
        });
}

// Create a message card for the admin panel
function createMessageCard(message) {
    const card = document.createElement('div');
    card.className = 'message-card';
    card.dataset.id = message.id;
    card.dataset.priority = message.priority;
    
    // Add urgent class for urgent messages
    if (message.priority === 'urgent') {
        card.classList.add('urgent');
    }
    
    // Message info section
    const info = document.createElement('div');
    info.className = 'message-info';
    
    const messageText = document.createElement('div');
    messageText.className = 'message-text';
    messageText.textContent = message.text;
    
    const messagePriority = document.createElement('span');
    messagePriority.className = `message-priority ${message.priority}`;
    messagePriority.textContent = message.priority.toUpperCase();
    
    info.appendChild(messageText);
    info.appendChild(messagePriority);
    
    // Message controls section
    const controls = document.createElement('div');
    controls.className = 'message-controls';
    
    const togglePriorityBtn = document.createElement('button');
    togglePriorityBtn.className = 'toggle-priority-btn';
    togglePriorityBtn.textContent = message.priority === 'urgent' ? 'Make Normal' : 'Make Urgent';
    togglePriorityBtn.dataset.id = message.id;
    togglePriorityBtn.dataset.currentPriority = message.priority;
    togglePriorityBtn.title = `Change priority: ${message.priority} → ${message.priority === 'urgent' ? 'normal' : 'urgent'}`;
    
    const deleteBtn = document.createElement('button');
    deleteBtn.className = 'delete-btn';
    deleteBtn.textContent = 'Delete';
    deleteBtn.dataset.id = message.id;
    deleteBtn.title = 'Delete this message';
    
    controls.appendChild(togglePriorityBtn);
    controls.appendChild(deleteBtn);
    
    // Add everything to the card
    card.appendChild(info);
    card.appendChild(controls);
    
    return card;
}

// Add event listeners to message control buttons
function addMessageControlListeners() {
    // Toggle priority buttons
    document.querySelectorAll('.toggle-priority-btn').forEach(button => {
        button.addEventListener('click', function() {
            const messageId = this.dataset.id;
            const currentPriority = this.dataset.currentPriority;
            
            // Toggle priority
            const newPriority = currentPriority === 'urgent' ? 'normal' : 'urgent';
            
            // Update message
            updateSafetyMessage(messageId, { priority: newPriority })
                .then(updatedMessage => {
                    // Update the button's dataset and text
                    this.dataset.currentPriority = updatedMessage.priority;
                    this.textContent = updatedMessage.priority === 'urgent' ? 'Make Normal' : 'Make Urgent';
                    
                    // Update the priority display
                    const priorityElement = this.closest('.message-card').querySelector('.message-priority');
                    priorityElement.textContent = updatedMessage.priority.toUpperCase();
                    priorityElement.className = `message-priority ${updatedMessage.priority === 'urgent' ? 'urgent' : 'normal'}`;
                    
                    showNotification(`Message priority updated to ${updatedMessage.priority}`, 'success');
                })
                .catch(error => {
                    showNotification(`Error updating message: ${error.message}`, 'error');
                });
        });
    });
    
    // Delete buttons
    document.querySelectorAll('.delete-btn').forEach(button => {
        button.addEventListener('click', function() {
            const messageId = this.dataset.id;
            const messageCard = this.closest('.message-card');
            
            if (confirm('Are you sure you want to delete this safety message?')) {
                deleteSafetyMessage(messageId)
                    .then(result => {
                        // Remove the card from the DOM
                        messageCard.remove();
                        
                        showNotification('Safety message deleted successfully', 'success');
                        
                        // If no messages left, show empty state
                        const messagesContainer = document.getElementById('messages-container');
                        if (!messagesContainer.querySelector('.message-card')) {
                            messagesContainer.innerHTML = '<div class="loading">No safety messages found.</div>';
                        }
                    })
                    .catch(error => {
                        showNotification(`Error deleting message: ${error.message}`, 'error');
                    });
            }
        });
    });
}

// Handle saving a new safety message
function handleSaveMessage() {
    const messageText = document.getElementById('message-text').value;
    const messagePriority = document.getElementById('message-priority').value;
    
    if (!messageText) {
        showNotification('Please enter a message text', 'warning');
        return;
    }
    
    createSafetyMessage(messageText, messagePriority)
        .then(newMessage => {
            // Add the new message to the list
            const messagesContainer = document.getElementById('messages-container');
            
            // Clear "no messages" message if it exists
            if (messagesContainer.querySelector('.loading')) {
                messagesContainer.innerHTML = '';
            }
            
            const messageCard = createMessageCard(newMessage);
            // Add animation index 0 for instant appearance
            messageCard.style.setProperty('--index', '0');
            
            // Add highlight effect
            messageCard.style.animation = 'none'; // Remove regular animation
            messagesContainer.prepend(messageCard);
            
            // Force reflow
            void messageCard.offsetWidth; 
            
            // Apply highlight animation
            messageCard.style.animation = 'fadeInSlide 0.5s ease forwards, highlight 1.5s ease';
            messageCard.style.background = 'linear-gradient(to right, #f0f9ff 99%, var(--amazon-orange))';
            
            // Add event listeners to the new card
            addMessageControlListeners();
            
            // Hide the form
            hideAddMessageForm();
            
            showNotification('Safety message added successfully', 'success');
        })
        .catch(error => {
            showNotification(`Error adding message: ${error.message}`, 'error');
        });
}

// Show the add message form with animation
function showAddMessageForm() {
    const addMessageForm = document.getElementById('add-message-form');
    addMessageForm.style.display = 'block';
    addMessageForm.style.opacity = '0';
    addMessageForm.style.transform = 'translateY(-20px)';
    
    // Force reflow
    void addMessageForm.offsetWidth;
    
    // Animate in
    addMessageForm.style.transition = 'opacity 0.3s ease, transform 0.3s ease';
    addMessageForm.style.opacity = '1';
    addMessageForm.style.transform = 'translateY(0)';
    
    document.getElementById('message-text').focus();
}

// Hide the add message form
function hideAddMessageForm() {
    const addMessageForm = document.getElementById('add-message-form');
    
    // Animate out
    addMessageForm.style.opacity = '0';
    addMessageForm.style.transform = 'translateY(-20px)';
    
    // After animation, hide the form
    setTimeout(() => {
        addMessageForm.style.display = 'none';
        document.getElementById('message-text').value = '';
        document.getElementById('message-priority').value = 'normal';
    }, 300);
}

// WebSocket initialization
function initializeWebSocket() {
    // Close existing connection if any
    if (adminState.ws) {
        adminState.ws.close();
    }
    
    // Create new WebSocket connection
    adminState.ws = new WebSocket((location.protocol === 'https:' ? 'wss://' : 'ws://') + location.host);
    
    // Connection opened
    adminState.ws.addEventListener('open', (event) => {
        console.log('[WebSocket] Connection established');
        adminState.isConnected = true;
        updateConnectionStatusUI(true);
    });
    
    // Listen for messages
    adminState.ws.addEventListener('message', (event) => {
        try {
            const message = JSON.parse(event.data);
            handleWebSocketMessage(message);
        } catch (error) {
            console.error('[WebSocket] Error parsing message:', error);
        }
    });
    
    // Connection closed
    adminState.ws.addEventListener('close', (event) => {
        console.log('[WebSocket] Connection closed');
        adminState.isConnected = false;
        updateConnectionStatusUI(false);
        
        // Try to reconnect with exponential backoff
        setTimeout(initializeWebSocket, 5000);
    });
    
    // Connection error
    adminState.ws.addEventListener('error', (event) => {
        console.error('[WebSocket] Error:', event);
        adminState.isConnected = false;
        updateConnectionStatusUI(false);
    });
}

// Handle WebSocket messages
function handleWebSocketMessage(message) {
    // Log all messages for debugging
    console.log('[WebSocket] Message received:', message);
    
    // Update UI based on message type
    if (message.type === 'stationUpdate') {
        // Find and update the station in our local state
        const index = adminState.stations.findIndex(s => s.id === message.data.id);
        if (index !== -1) {
            adminState.stations[index] = message.data;
            updateStationRowUI(message.data);
        }
        
        // Show update notification
        showNotification('Station Updated', `Station ${message.data.station_number} has been updated to ${message.data.status}`, 'info');
    } else if (message.type === 'availableSpaceUpdate') {
        // Update available space if that view is active
        showNotification('Bin Space Updated', `Bin ${message.data.id} space updated to ${message.data.percent}%`, 'info');
    } else if (message.type === 'safetyMessageUpdate') {
        // Update safety messages if any
        loadSafetyMessages(); // Reload the whole list for now
        showNotification('Safety Message Updated', 'A safety message has been updated', 'info');
    } else if (message.type === 'info') {
        console.log('[WebSocket] Info:', message.message);
    }
}

// Update connection status in the UI
function updateConnectionStatusUI(connected) {
    const statusIndicator = document.querySelector('.connection-status');
    if (statusIndicator) {
        statusIndicator.classList.toggle('connected', connected);
        statusIndicator.classList.toggle('disconnected', !connected);
        statusIndicator.title = connected ? 'WebSocket Connected' : 'WebSocket Disconnected - Attempting to reconnect...';
    }
}

// Update a single station row in the UI
function updateStationRowUI(station) {
    const row = document.querySelector(`tr[data-station-id="${station.id}"]`);
    if (row) {
        // Update status cell
        const statusCell = row.querySelector('.status-cell');
        if (statusCell) {
            statusCell.textContent = station.status;
            statusCell.className = `status-cell ${station.status.toLowerCase()}`;
        }
        
        // Update end indicator cell
        const endIndicatorCell = row.querySelector('.end-indicator-cell');
        if (endIndicatorCell) {
            endIndicatorCell.textContent = station.end_indicator;
        }
        
        // Highlight the row briefly
        row.classList.add('updated');
        setTimeout(() => {
            row.classList.remove('updated');
        }, 2000);
    }
}

// Show a notification message
function showNotification(title, message, type = 'info') {
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.innerHTML = `
        <div class="notification-header">${title}</div>
        <div class="notification-body">${message}</div>
    `;
    
    const container = document.querySelector('.notification-container') || document.body;
    container.appendChild(notification);
    
    // Auto-remove after a delay
    setTimeout(() => {
        notification.classList.add('fade-out');
        setTimeout(() => {
            notification.remove();
        }, 500);
    }, 5000);
}
