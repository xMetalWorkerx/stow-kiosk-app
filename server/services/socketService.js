/*
 * WebSocket Service
 * Manages WebSocket connections and broadcasts
 */

const WebSocket = require('ws');

// Set to store all connected clients
const clients = new Set();

// Initialize WebSocket server
function init(server) {
    const wss = new WebSocket.Server({ server });
    
    wss.on('connection', (ws) => {
        console.log('WebSocket client connected');
        clients.add(ws);
        
        // Send welcome message
        ws.send(JSON.stringify({ type: 'info', message: 'Connected to WebSocket' }));
        
        ws.on('close', () => {
            console.log('WebSocket client disconnected');
            clients.delete(ws);
        });
        
        ws.on('error', (error) => {
            console.error('WebSocket error:', error);
            clients.delete(ws);
        });
    });
    
    return wss;
}

// Broadcast function to send data to all connected clients
function broadcast(event) {
    console.log(`Broadcasting ${event.type} event to ${clients.size} clients`);
    const data = JSON.stringify(event);
    clients.forEach(client => {
        if (client.readyState === WebSocket.OPEN) {
            client.send(data);
        }
    });
}

module.exports = {
    init,
    broadcast
}; 