const cron = require('node-cron');
const SlackService = require('./slackService');

class SchedulerService {
  constructor() {
    this.jobs = {};
    this.reminderChannels = new Map();
    // Initialize SlackService with the token from environment
    this.slackService = new SlackService(process.env.SLACK_BOT_TOKEN);
    
    console.log('SchedulerService initialized');
  }
  
  // Start the hourly reminder job
  startHourlyReminders(channel) {
    console.log(`Setting up hourly reminders for channel ${channel}`);
    // Default hourly schedule (every hour at minute 0)
    this.startReminders(channel, '0 * * * *');
  }
  
  // Start reminders with custom schedule
  startReminders(channel, schedule) {
    // Stop existing job if it exists
    this.stopReminders(channel);
    
    console.log(`Creating new reminder job for channel ${channel} with schedule: ${schedule}`);
    
    // Create and start new job
    const job = cron.schedule(schedule, async () => {
      try {
        await this.slackService.sendScheduledReminder(channel);
        console.log(`Sent reminder to channel ${channel}`);
      } catch (error) {
        // FIX #13: Unhandled API Errors in SlackService
        console.error(`Error sending reminder to ${channel}:`, error);
        // Add more robust error handling - e.g., notify admins through a separate channel
        this.logReminderFailure(channel, error);
      }
    });
    
    // Store the job reference
    this.jobs[channel] = job;
    this.reminderChannels.set(channel, schedule);
    
    console.log(`Started reminders for channel ${channel} with schedule: ${schedule}`);
    return true;
  }
  
  // Log reminder failures for monitoring
  logReminderFailure(channel, error) {
    // In a real system, this might send an alert through 
    // a different notification mechanism or log to a monitoring system
    console.error(`ALERT: Reminder to ${channel} failed: ${error.message}`);
    
    // Could also implement a retry mechanism here
  }
  
  // Stop reminders for a channel
  stopReminders(channel) {
    if (this.jobs[channel]) {
      this.jobs[channel].stop();
      delete this.jobs[channel];
      this.reminderChannels.delete(channel);
      console.log(`Stopped reminders for channel ${channel}`);
      return true;
    }
    return false;
  }
  
  // Get all active reminder channels
  getActiveReminders() {
    return Array.from(this.reminderChannels.keys());
  }
  
  // Set enhanced schedule for peak hours
  setPeakHoursSchedule(channel, peakSchedule) {
    return this.startReminders(channel, peakSchedule);
  }
  
  // Revert to normal schedule
  setNormalSchedule(channel) {
    return this.startReminders(channel, '0 * * * *');
  }
}

module.exports = SchedulerService; 