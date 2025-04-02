// Format date and time to a readable string
function formatDateTime(date) {
    const hours = date.getHours();
    const minutes = date.getMinutes();
    const seconds = date.getSeconds();
    const ampm = hours >= 12 ? 'PM' : 'AM';
    
    // Convert hours to 12-hour format
    const displayHours = hours % 12 || 12;
    
    // Add leading zeros to minutes and seconds
    const displayMinutes = minutes < 10 ? '0' + minutes : minutes;
    const displaySeconds = seconds < 10 ? '0' + seconds : seconds;
    
    return `${displayHours}:${displayMinutes}:${displaySeconds} ${ampm}`;
}

// Store authentication token in localStorage
function setAuthToken(token) {
    localStorage.setItem('auth_token', token);
}

// Retrieve authentication token from localStorage
function getAuthToken() {
    return localStorage.getItem('auth_token');
}

// Clear authentication token
function clearAuthToken() {
    localStorage.removeItem('auth_token');
}

// Check if user is authenticated
function isAuthenticated() {
    return !!getAuthToken();
}

// Perform login request
function login(username, password) {
    return fetch('/api/auth/login', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ username, password })
    })
    .then(response => {
        if (!response.ok) {
            return response.json().then(data => {
                throw new Error(data.error || 'Login failed');
            });
        }
        return response.json();
    })
    .then(data => {
        setAuthToken(data.token);
        return { 
            success: true, 
            user: data.user
        };
    });
}

// Handle API errors consistently
function handleApiError(error, defaultMessage = 'An error occurred') {
    console.error(error);
    return {
        success: false,
        message: error.message || defaultMessage
    };
}

// Show a notification message
function showNotification(message, type = 'info', duration = 3000) {
    // Check if notification container exists, create if not
    let notificationContainer = document.querySelector('.notification-container');
    
    if (!notificationContainer) {
        notificationContainer = document.createElement('div');
        notificationContainer.className = 'notification-container';
        document.body.appendChild(notificationContainer);
        
        // Add styles for notification container
        const style = document.createElement('style');
        style.textContent = `
            .notification-container {
                position: fixed;
                top: 20px;
                right: 20px;
                z-index: 9999;
            }
            
            .notification {
                background-color: #333;
                color: white;
                padding: 12px 20px;
                margin-bottom: 10px;
                border-radius: 4px;
                box-shadow: 0 4px 8px rgba(0, 0, 0, 0.2);
                opacity: 0;
                transform: translateX(50px);
                transition: opacity 0.3s, transform 0.3s;
            }
            
            .notification.show {
                opacity: 1;
                transform: translateX(0);
            }
            
            .notification.info {
                background-color: #2196F3;
            }
            
            .notification.success {
                background-color: #4CAF50;
            }
            
            .notification.warning {
                background-color: #FF9800;
            }
            
            .notification.error {
                background-color: #F44336;
            }
        `;
        document.head.appendChild(style);
    }
    
    // Create notification element
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.textContent = message;
    
    // Add to container
    notificationContainer.appendChild(notification);
    
    // Trigger animation
    setTimeout(() => {
        notification.classList.add('show');
    }, 10);
    
    // Remove after duration
    setTimeout(() => {
        notification.classList.remove('show');
        
        // Remove from DOM after animation
        setTimeout(() => {
            notificationContainer.removeChild(notification);
        }, 300);
    }, duration);
}
