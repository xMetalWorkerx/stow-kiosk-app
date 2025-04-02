const axios = require('axios');
const slackService = require('./slackService');
const Station = require('../models/Station');

// Mock dependencies
jest.mock('axios');
jest.mock('../models/Station');

describe('SlackService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Mock the station data
    Station.findBySide.mockResolvedValue([
      { 
        id: 123, 
        side: 'A', 
        level: 1, 
        station_number: 101, 
        status: 'AQ', 
        end_indicator: 'Hi' 
      },
      { 
        id: 124, 
        side: 'A', 
        level: 1, 
        station_number: 102, 
        status: 'PS', 
        end_indicator: 'Lo' 
      }
    ]);
    
    Station.update.mockImplementation(async (id, updates) => {
      return { 
        id, 
        side: 'A', 
        level: 1, 
        station_number: 101, 
        ...updates 
      };
    });
    
    axios.post.mockResolvedValue({ data: { ok: true } });
  });
  
  describe('Helper methods', () => {
    test('getStatusEmoji returns correct emoji for each status', () => {
      expect(slackService.getStatusEmoji('AQ')).toBe('🔵');
      expect(slackService.getStatusEmoji('PS')).toBe('🟠');
      expect(slackService.getStatusEmoji('Inactive')).toBe('⚫');
      expect(slackService.getStatusEmoji('Unknown')).toBe('⚫');
    });
    
    test('getStatusDisplay returns correct display text for each status', () => {
      expect(slackService.getStatusDisplay('AQ')).toBe('AQ');
      expect(slackService.getStatusDisplay('PS')).toBe('PS');
      expect(slackService.getStatusDisplay('Inactive')).toBe('IA');
      expect(slackService.getStatusDisplay('Unknown')).toBe('IA');
    });
    
    test('getNextStatus correctly cycles through statuses', () => {
      expect(slackService.getNextStatus('AQ')).toBe('PS');
      expect(slackService.getNextStatus('PS')).toBe('Inactive');
      expect(slackService.getNextStatus('Inactive')).toBe('AQ');
      expect(slackService.getNextStatus('Unknown')).toBe('Inactive');
    });
    
    test('getEndIndicatorEmoji returns correct emoji for each indicator', () => {
      expect(slackService.getEndIndicatorEmoji('Hi')).toBe('⬆️');
      expect(slackService.getEndIndicatorEmoji('Lo')).toBe('⬇️');
    });
    
    test('toggleEndIndicator correctly toggles between Hi and Lo', () => {
      expect(slackService.toggleEndIndicator('Hi')).toBe('Lo');
      expect(slackService.toggleEndIndicator('Lo')).toBe('Hi');
    });
  });
  
  describe('createStationUpdateMessage', () => {
    test('creates a message with correct block structure', async () => {
      const message = await slackService.createStationUpdateMessage('A');
      
      // Verify header block
      expect(message.blocks[0].type).toBe('header');
      expect(message.blocks[0].text.text).toBe('Station Management – Side A');
      
      // Verify level section
      expect(message.blocks[1].type).toBe('section');
      expect(message.blocks[1].text.text).toBe('*Level 1*');
      
      // Verify station blocks
      expect(message.blocks[2].type).toBe('actions');
      expect(message.blocks[2].elements).toHaveLength(3);
      
      // Verify station button content
      const statusButton = message.blocks[2].elements[1];
      expect(statusButton.text.text).toContain('🔵');
      expect(statusButton.action_id).toBe('cycle_status');
      
      const endButton = message.blocks[2].elements[2];
      expect(endButton.text.text).toContain('⬆️');
      expect(endButton.action_id).toBe('toggle_end_indicator');
    });
  });
  
  describe('handleStationUpdate', () => {
    test('correctly handles cycle_status action', async () => {
      const payload = {
        actions: [{
          action_id: 'cycle_status',
          value: JSON.stringify({
            station_id: 123,
            current_status: 'AQ'
          })
        }],
        response_url: 'https://hooks.slack.com/actions/test'
      };
      
      await slackService.handleStationUpdate(payload);
      
      // Check that station was updated with correct new status
      expect(Station.update).toHaveBeenCalledWith(123, { status: 'PS' });
      
      // Check that response was sent back to Slack
      expect(axios.post).toHaveBeenCalled();
    });
    
    test('correctly handles toggle_end_indicator action', async () => {
      const payload = {
        actions: [{
          action_id: 'toggle_end_indicator',
          value: JSON.stringify({
            station_id: 123,
            current_end: 'Hi'
          })
        }],
        response_url: 'https://hooks.slack.com/actions/test'
      };
      
      await slackService.handleStationUpdate(payload);
      
      // Check that station was updated with correct new end indicator
      expect(Station.update).toHaveBeenCalledWith(123, { endIndicator: 'Lo' });
      
      // Check that response was sent back to Slack
      expect(axios.post).toHaveBeenCalled();
    });
    
    test('handles legacy station_update action for backward compatibility', async () => {
      const payload = {
        actions: [{
          action_id: 'station_update',
          value: JSON.stringify({
            station_id: 123,
            status: 'PS',
            end_indicator: 'Hi'
          })
        }]
      };
      
      const response = await slackService.handleStationUpdate(payload);
      
      // Check that station was updated with provided values
      expect(Station.update).toHaveBeenCalledWith(123, { 
        status: 'PS', 
        endIndicator: 'Hi' 
      });
      
      // Check for correct response text
      expect(response.text).toContain('updated to PS');
    });
    
    test('handles update_side_a action', async () => {
      const payload = {
        actions: [{
          action_id: 'update_side_a'
        }]
      };
      
      await slackService.handleStationUpdate(payload);
      
      // Check that it fetched stations for Side A
      expect(Station.findBySide).toHaveBeenCalledWith('A');
    });
    
    test('handles update_side_b action', async () => {
      const payload = {
        actions: [{
          action_id: 'update_side_b'
        }]
      };
      
      await slackService.handleStationUpdate(payload);
      
      // Check that it fetched stations for Side B
      expect(Station.findBySide).toHaveBeenCalledWith('B');
    });
  });
}); 