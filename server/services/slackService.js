const axios = require('axios');
const Station = require('../models/Station');
const SafetyMessage = require('../models/SafetyMessage');

class SlackService {
  constructor(token) {
    this.token = token;
    this.apiUrl = 'https://slack.com/api';
    this.client = axios.create({
      baseURL: this.apiUrl,
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
        'Authorization': `Bearer ${this.token}`
      }
    });
  }
  
  // Helper methods for status display and manipulation
  getStatusEmoji(status) {
    switch(status) {
      case 'AQ': return '🔵';
      case 'PS': return '🟠';
      case 'Inactive': return '⚫';
      default: return '⚫';
    }
  }
  
  getStatusDisplay(status) {
    switch(status) {
      case 'AQ': return 'AQ';
      case 'PS': return 'PS';
      case 'Inactive': return 'IA';
      default: return 'IA';
    }
  }
  
  getNextStatus(currentStatus) {
    const statusCycle = {
      'AQ': 'PS',
      'PS': 'Inactive',
      'Inactive': 'AQ'
    };
    return statusCycle[currentStatus] || 'Inactive';
  }
  
  getEndIndicatorEmoji(indicator) {
    return indicator === 'Hi' ? '⬆️' : '⬇️';
  }
  
  toggleEndIndicator(currentIndicator) {
    return currentIndicator === 'Hi' ? 'Lo' : 'Hi';
  }
  
  // Main block builder method for individual station
  buildStationBlock(station) {
    console.log(`Building station block for ${station.level}-${station.side}-${station.station_number}, Status: ${station.status}, End: ${station.end_indicator}`);
    
    return {
      type: "actions",
      elements: [
        {
          type: "button",
          text: {
            type: "plain_text",
            text: `${station.level}-${station.side}-${station.station_number}`
          }
        },
        {
          type: "button",
          text: {
            type: "plain_text",
            text: `${this.getStatusEmoji(station.status)} ${this.getStatusDisplay(station.status)}`
          },
          value: JSON.stringify({
            station_id: station.id,
            current_status: station.status
          }),
          action_id: "cycle_status"
        },
        {
          type: "button",
          text: {
            type: "plain_text",
            text: `${this.getEndIndicatorEmoji(station.end_indicator)} ${station.end_indicator}`
          },
          value: JSON.stringify({
            station_id: station.id,
            current_end: station.end_indicator
          }),
          action_id: "toggle_end_indicator"
        }
      ]
    };
  }
  
  // Handle station update commands from Slack
  async handleStationUpdate(payload) {
    try {
      const action = payload.actions[0];
      
      if (action.action_id === 'cycle_status') {
        return await this.handleCycleStatus(action, payload.response_url);
      } else if (action.action_id === 'toggle_end_indicator') {
        return await this.handleToggleEndIndicator(action, payload.response_url);
      } else if (action.action_id === 'station_update') {
        // Handle legacy station_update action for backward compatibility
        const { station_id, status, end_indicator } = JSON.parse(action.value);
        
        // Update the station
        const station = await Station.update(station_id, { 
          status, 
          endIndicator: end_indicator 
        });
        
        return {
          text: `Station ${station.side}-${station.level}-${station.station_number} updated to ${status} ${end_indicator === 'Hi' ? '↑' : '↓'}`
        };
      } else if (action.action_id === 'update_side_a') {
        return await this.createStationUpdateMessage('A');
      } else if (action.action_id === 'update_side_b') {
        return await this.createStationUpdateMessage('B');
      }
      
      return { text: 'Unknown action' };
    } catch (error) {
      console.error('Error handling station update:', error);
      return {
        text: 'Error updating station. Please try again.'
      };
    }
  }
  
  // Handle cycling through status values
  async handleCycleStatus(action, responseUrl) {
    try {
      const { station_id, current_status } = JSON.parse(action.value);
      const newStatus = this.getNextStatus(current_status);
      
      console.log(`Cycling status for station ${station_id} from ${current_status} to ${newStatus}`);
      
      // Update the station
      const station = await Station.update(station_id, { status: newStatus });
      
      // Update the Slack UI using response_url
      const updatedBlocks = await this.refreshStationBlocks(station.side);
      await this.sendResponseUpdate(responseUrl, updatedBlocks);
      
      return { text: `Station updated to ${newStatus}` };
    } catch (error) {
      console.error('Error handling status cycle:', error);
      return { text: 'Error updating status. Please try again.' };
    }
  }
  
  // Handle toggling end indicators (Hi/Lo)
  async handleToggleEndIndicator(action, responseUrl) {
    try {
      const { station_id, current_end } = JSON.parse(action.value);
      const newEndIndicator = this.toggleEndIndicator(current_end);
      
      console.log(`Toggling end indicator for station ${station_id} from ${current_end} to ${newEndIndicator}`);
      
      // Update the station
      const station = await Station.update(station_id, { endIndicator: newEndIndicator });
      
      // Update the Slack UI using response_url
      const updatedBlocks = await this.refreshStationBlocks(station.side);
      await this.sendResponseUpdate(responseUrl, updatedBlocks);
      
      return { text: `End indicator updated to ${newEndIndicator}` };
    } catch (error) {
      console.error('Error handling end indicator toggle:', error);
      return { text: 'Error updating end indicator. Please try again.' };
    }
  }
  
  // Helper to send updated UI using Slack's response_url
  async sendResponseUpdate(responseUrl, blocks) {
    try {
      await axios.post(responseUrl, {
        replace_original: true,
        blocks: blocks.blocks
      });
      return true;
    } catch (error) {
      console.error('Error updating Slack message:', error);
      return false;
    }
  }
  
  // Helper to refresh blocks after update
  async refreshStationBlocks(side) {
    // Force refetch of the latest data 
    console.log(`Refreshing station blocks for side ${side}`);
    return await this.createStationUpdateMessage(side);
  }
  
  // Create a Slack message with buttons for station update
  async createStationUpdateMessage(side) {
    try {
      console.log(`Creating station update message for side ${side}`);
      // Explicitly clear the database connection cache to ensure fresh data
      const stations = await Station.findBySide(side);
      
      console.log(`Retrieved ${stations.length} stations for side ${side}`);
      stations.forEach(station => {
        console.log(`Station ${side}-${station.level}-${station.station_number}: Status=${station.status}, End=${station.end_indicator}`);
      });
      
      const blocks = [
        {
          type: 'header',
          text: {
            type: 'plain_text',
            text: `Station Management – Side ${side}`
          }
        }
      ];
      
      // Group stations by level
      const stationsByLevel = {};
      stations.forEach(station => {
        if (!stationsByLevel[station.level]) {
          stationsByLevel[station.level] = [];
        }
        stationsByLevel[station.level].push(station);
      });
      
      // Create blocks for each level
      Object.keys(stationsByLevel).sort().forEach(level => {
        blocks.push({
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: `*Level ${level}*`
          }
        });
        
        const levelStations = stationsByLevel[level];
        levelStations.sort((a, b) => a.station_number - b.station_number);
        
        levelStations.forEach(station => {
          blocks.push(this.buildStationBlock(station));
        });
      });
      
      return { blocks };
    } catch (error) {
      console.error('Error creating station update message:', error);
      return {
        text: 'Error creating station update message. Please try again.'
      };
    }
  }
  
  // Handle safety message commands from Slack
  async handleSafetyMessageCommand(text) {
    console.log(`🔷 Safety message handler called with text: "${text}"`);
    
    // If no text provided, return help text
    if (!text || text.trim() === '') {
      return { 
        text: "*Safety Message Commands:*\n" +
              "• `/safety-message add Your message here` - Add a new safety message\n" +
              "• `/safety-message list` - List all active safety messages" 
      };
    }
    
    // Basic command parsing - split into command and content
    const trimmedText = text.trim();
    const parts = trimmedText.split(/\s+/);
    const command = parts[0].toLowerCase();
    const content = parts.slice(1).join(' ');
    
    console.log(`🔷 Command: "${command}", Content: "${content}"`);
    
    // Handle "list" command
    if (command === 'list') {
      console.log('📋 Executing LIST command');
      try {
        const messages = await SafetyMessage.findActive();
        
        if (messages.length === 0) {
          return { text: 'No active safety messages found.' };
        }
        
        const messageList = messages.map(msg => {
          const priority = msg.priority === 'urgent' ? '🔴 [URGENT] ' : '🔵 ';
          return `${msg.id}: ${priority}${msg.text}`;
        }).join('\n');
        
        return { text: `*Active Safety Messages:*\n${messageList}` };
      } catch (error) {
        console.error('❌ Error fetching safety messages:', error);
        return { text: `❌ Error fetching messages: ${error.message}` };
      }
    }
    
    // Handle "add" command
    if (command === 'add') {
      console.log('➕ Executing ADD command');
      
      // Use the content directly from our parts splitting above
      const messageText = content;
      console.log(`📝 Message to add: "${messageText}"`);
      
      if (!messageText) {
        return { 
          text: "Please provide a message to add.\n" +
                "Example: `/safety-message add Equipment issue in aisle 5`" 
        };
      }
      
      try {
        const message = await SafetyMessage.create({ text: messageText });
        console.log('✅ Message added to database:', message);
        return { text: `✅ Safety message added: "${message.text}"` };
      } catch (error) {
        console.error('❌ Error creating safety message:', error);
        return { text: `❌ Error adding safety message: ${error.message}` };
      }
    }
    
    // If we get here, it's an unknown command
    console.log('❓ Unknown command:', command);
    return {
      text: "I didn't understand that command. Try:\n" +
            "• `/safety-message add Your message here` - Add a new safety message\n" +
            "• `/safety-message list` - List all active safety messages"
    };
  }
  
  // Send scheduled reminder to Slack channel
  async sendScheduledReminder(channel) {
    try {
      // Create the reminder message
      const message = {
        channel,
        blocks: [
          {
            type: 'section',
            text: {
              type: 'mrkdwn',
              text: '*Hourly Station Update Reminder*\n⏰ Time to update your station statuses!'
            }
          },
          {
            type: 'actions',
            elements: [
              {
                type: 'button',
                text: {
                  type: 'plain_text',
                  text: 'Update Side A'
                },
                value: 'A',
                action_id: 'update_side_a'
              },
              {
                type: 'button',
                text: {
                  type: 'plain_text',
                  text: 'Update Side B'
                },
                value: 'B',
                action_id: 'update_side_b'
              }
            ]
          }
        ]
      };
      
      // Send the message to the Slack channel
      const response = await this.client.post('/chat.postMessage', message);
      
      return response.data;
    } catch (error) {
      console.error('Error sending scheduled reminder:', error);
      return { error: 'Failed to send reminder' };
    }
  }
}

module.exports = SlackService;
