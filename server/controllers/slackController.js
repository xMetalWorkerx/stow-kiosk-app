const SlackService = require('../services/slackService');
const crypto = require('crypto');

// Initialize SlackService with the token from environment
const slackService = new SlackService(process.env.SLACK_BOT_TOKEN);

// Verify that the request came from Slack
const verifySlackRequest = (req) => {
  console.log("Starting Slack request verification...");
  const slackSignature = req.headers['x-slack-signature'];
  const timestamp = req.headers['x-slack-request-timestamp'];
  
  console.log("Signature:", slackSignature ? "Present" : "Missing");
  console.log("Timestamp:", timestamp ? "Present" : "Missing"); 
  console.log("RawBody:", req.rawBody ? "Present" : "Missing");
  console.log("Secret:", process.env.SLACK_SIGNING_SECRET ? "Present" : "Missing");
  
  if (!slackSignature || !timestamp || !req.rawBody) {
    console.log("Missing required verification components");
    return false;
  }
  
  // Prevent replay attacks
  const now = Math.floor(Date.now() / 1000);
  if (Math.abs(now - timestamp) > 300) {
    console.log("Timestamp too old, possible replay attack");
    return false;
  }
  
  if (!process.env.SLACK_SIGNING_SECRET) {
    console.error('SLACK_SIGNING_SECRET not configured');
    return false;
  }
  
  const sigBasestring = `v0:${timestamp}:${req.rawBody}`;
  const mySignature = 'v0=' + 
    crypto
      .createHmac('sha256', process.env.SLACK_SIGNING_SECRET)
      .update(sigBasestring, 'utf8')
      .digest('hex');
  
  console.log("Generated signature:", mySignature);
  console.log("Received signature:", slackSignature);
  
  try {
    // Compare signatures with constant-time algorithm to prevent timing attacks
    return crypto.timingSafeEqual(
      Buffer.from(mySignature, 'utf8'),
      Buffer.from(slackSignature, 'utf8')
    );
  } catch (e) {
    console.error('Error verifying Slack signature:', e.message);
    return false;
  }
};

// Handle slash commands
exports.handleSlashCommand = async (req, res, next) => {
  try {
    console.log("🔶 Slash command received");
    console.log("🔶 Headers:", JSON.stringify(req.headers, null, 2));
    console.log("🔶 Body:", JSON.stringify(req.body, null, 2));
    console.log("🔶 Command:", req.body.command);
    console.log("🔶 Text:", req.body.text);
    
    // Verify request is from Slack
    if (!verifySlackRequest(req)) {
      console.log("❌ Slack verification failed");
      // In development, you might want to bypass this for testing
      if (process.env.NODE_ENV !== 'production') {
        console.log("⚠️ Development mode - bypassing Slack verification");
      } else {
        return res.status(401).json({ error: 'Unauthorized' });
      }
    } else {
      console.log("✅ Slack verification succeeded");
    }
    
    const { command, text, user_id } = req.body;
    
    // Handle different commands
    switch (command) {
      case '/station-update':
        try {
          // Get side parameter if provided, default to A
          const side = text.trim().toUpperCase() === 'B' ? 'B' : 'A';
          const message = await slackService.createStationUpdateMessage(side);
          return res.json(message);
        } catch (error) {
          console.error("❌ Error processing station update command:", error);
          return res.json({ text: "An error occurred processing your station update command. Please try again." });
        }
        
      case '/safety-message':
        console.log("📣 Safety message command received");
        console.log("📣 Text:", JSON.stringify(text));

        try {
          // If no text provided, return help text
          if (!text || text.trim() === '') {
            return res.json({ 
              text: "*Safety Message Commands:*\n" +
                    "• `/safety-message add Your message here` - Add a new safety message\n" +
                    "• `/safety-message list` - List all active safety messages" 
            });
          }
          
          // Simple parsing of the input
          const parts = text.trim().split(/\s+/);
          const subCommand = parts[0].toLowerCase();
          
          // Handle list command - use service for this
          if (subCommand === 'list') {
            console.log("📋 Handling LIST command");
            const SafetyMessage = require('../models/SafetyMessage');
            
            try {
              const messages = await SafetyMessage.findActive();
              
              if (messages.length === 0) {
                return res.json({ text: 'No active safety messages found.' });
              }
              
              const messageList = messages.map(msg => {
                const priority = msg.priority === 'urgent' ? '🔴 [URGENT] ' : '🔵 ';
                return `${msg.id}: ${priority}${msg.text}`;
              }).join('\n');
              
              return res.json({ text: `*Active Safety Messages:*\n${messageList}` });
            } catch (error) {
              console.error('❌ Error listing safety messages:', error);
              return res.json({ text: `❌ Error listing messages: ${error.message}` });
            }
          }
          
          // Handle add command directly in controller
          if (subCommand === 'add') {
            console.log("➕ Handling ADD command");
            
            // Extract message content (everything after the first word)
            const messageContent = parts.slice(1).join(' ').trim();
            console.log("📝 Message to add:", messageContent);
            
            if (!messageContent) {
              return res.json({ 
                text: "Please provide a message to add.\n" +
                      "Example: `/safety-message add Equipment issue in aisle 5`" 
              });
            }
            
            // Create message directly
            try {
              const SafetyMessage = require('../models/SafetyMessage');
              const message = await SafetyMessage.create({ text: messageContent });
              console.log('✅ Message added to database:', message);
              return res.json({ text: `✅ Safety message added: "${message.text}"` });
            } catch (error) {
              console.error('❌ Error creating safety message:', error);
              return res.json({ text: `❌ Error adding safety message: ${error.message}` });
            }
          }
          
          // Unknown subcommand
          return res.json({
            text: "I didn't understand that command. Try:\n" +
                  "• `/safety-message add Your message here` - Add a new safety message\n" +
                  "• `/safety-message list` - List all active safety messages"
          });
        } catch (error) {
          console.error("❌ Error processing safety message command:", error);
          return res.json({ text: "An error occurred processing your command. Please try again." });
        }
        
      default:
        return res.json({ text: 'Unknown command' });
    }
  } catch (error) {
    console.error('❌ Slack command error:', error);
    res.json({ text: 'An error occurred processing your command' });
  }
};

// Handle interactive components
exports.handleInteractive = async (req, res, next) => {
  try {
    console.log("Interactive request received");
    console.log("Headers:", JSON.stringify(req.headers));
    console.log("Raw Body Length:", req.rawBody ? req.rawBody.length : 'Missing');
    
    // Verify request is from Slack
    if (!verifySlackRequest(req)) {
      console.log("Slack verification failed for interactive request");
      // In development, you might want to bypass this for testing
      if (process.env.NODE_ENV !== 'production') {
        console.log("Development mode - bypassing Slack verification");
      } else {
        return res.status(401).json({ error: 'Unauthorized' });
      }
    } else {
      console.log("Slack verification succeeded for interactive request");
    }
    
    // Parse the payload from the request body
    let payload;
    try {
      payload = JSON.parse(req.body.payload);
      console.log("Parsed payload type:", payload.type);
    } catch (e) {
      console.error('Error parsing Slack payload:', e.message);
      return res.status(400).json({ text: 'Invalid payload format' });
    }
    
    switch (payload.type) {
      case 'block_actions':
        console.log("Action ID:", payload.actions[0].action_id);
        // Handle all action types using the updated slackService.handleStationUpdate
        if (['cycle_status', 'toggle_end_indicator', 'station_update', 
             'update_side_a', 'update_side_b'].includes(payload.actions[0].action_id)) {
          const response = await slackService.handleStationUpdate(payload);
          return res.json(response);
        }
        
        return res.json({ text: 'Action not recognized' });
        
      default:
        return res.json({ text: 'Interaction type not supported' });
    }
  } catch (error) {
    console.error('Slack interactive error:', error);
    res.json({ text: 'An error occurred processing your interaction' });
  }
};
