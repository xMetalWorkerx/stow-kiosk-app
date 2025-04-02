// Global variables for safety messages
let safetyMessages = [];
let currentMessageIndex = 0;
let messageRotationInterval = null;

// Initialize safety message rotation
function initializeSafetyMessages() {
    // Load initial messages
    loadSafetyMessages();
    
    // Set up the rotation interval (every 10 seconds)
    messageRotationInterval = setInterval(() => {
        rotateSafetyMessage();
    }, 10000);
}

// Load safety messages from the API
function loadSafetyMessages() {
    return fetch('/api/safety-messages')
        .then(response => {
            if (!response.ok) {
                throw new Error('Failed to fetch safety messages');
            }
            return response.json();
        })
        .then(messages => {
            safetyMessages = messages;
            
            // Display first message if available
            if (safetyMessages.length > 0) {
                displaySafetyMessage(safetyMessages[0]);
                currentMessageIndex = 0;
            } else {
                // Show default message if no messages are available
                document.getElementById('safety-message').textContent = 'No safety messages available';
            }
            
            return messages;
        })
        .catch(error => {
            console.error('Error loading safety messages:', error);
            document.getElementById('safety-message').textContent = 'Error loading safety messages';
        });
}

// Display a safety message
function displaySafetyMessage(message) {
    const messageElement = document.getElementById('safety-message');
    
    // Fade out current message
    messageElement.style.opacity = 0;
    
    // After fade out, update text and fade in
    setTimeout(() => {
        // Check if message is urgent and apply special styling if needed
        if (message.priority === 'urgent') {
            messageElement.style.color = 'var(--alert-red)';
            messageElement.style.fontWeight = 'bold';
        } else {
            messageElement.style.color = 'var(--light-grey)';
            messageElement.style.fontWeight = 'normal';
        }
        
        messageElement.textContent = message.text;
        messageElement.style.opacity = 1;
    }, 500);
}

// Rotate to the next safety message
function rotateSafetyMessage() {
    // Skip rotation if no messages or only one message
    if (safetyMessages.length <= 1) return;
    
    // Move to the next message
    currentMessageIndex = (currentMessageIndex + 1) % safetyMessages.length;
    
    // Check if there's an urgent message - always prioritize it
    const urgentIndex = safetyMessages.findIndex(msg => msg.priority === 'urgent');
    if (urgentIndex !== -1) {
        // Only show urgent messages until they are removed
        currentMessageIndex = urgentIndex;
    }
    
    // Display the message
    displaySafetyMessage(safetyMessages[currentMessageIndex]);
}

// For admin: Fetch all safety messages
function fetchAllSafetyMessages() {
    return fetch('/api/safety-messages')
        .then(response => {
            if (!response.ok) {
                throw new Error('Failed to fetch safety messages');
            }
            return response.json();
        });
}

// For admin: Create a new safety message
function createSafetyMessage(text, priority = 'normal') {
    return fetch('/api/safety-messages', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${getAuthToken()}`
        },
        body: JSON.stringify({
            text,
            priority
        })
    })
    .then(response => {
        if (!response.ok) {
            throw new Error('Failed to create safety message');
        }
        return response.json();
    });
}

// For admin: Update a safety message
function updateSafetyMessage(id, updates) {
    return fetch(`/api/safety-messages/${id}`, {
        method: 'PUT',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${getAuthToken()}`
        },
        body: JSON.stringify(updates)
    })
    .then(response => {
        if (!response.ok) {
            throw new Error('Failed to update safety message');
        }
        return response.json();
    });
}

// For admin: Delete a safety message
function deleteSafetyMessage(id) {
    return fetch(`/api/safety-messages/${id}`, {
        method: 'DELETE',
        headers: {
            'Authorization': `Bearer ${getAuthToken()}`
        }
    })
    .then(response => {
        if (!response.ok) {
            throw new Error('Failed to delete safety message');
        }
        return response.json();
    });
}
