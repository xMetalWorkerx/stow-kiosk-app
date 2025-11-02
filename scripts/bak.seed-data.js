const sqlite3 = require('sqlite3').verbose();
const dbConfig = require('../server/config/database');
const path = require('path');
const bcrypt = require('bcrypt');

// Create a new database connection
const db = new sqlite3.Database(dbConfig.database);

// Enable foreign keys
db.run('PRAGMA foreign_keys = ON');

// Seed stations data
function seedStations() {
    console.log('Seeding stations data...');
    
    // Define station parameters including floors
    const sides = ['A', 'B'];
    const floors = [1, 2, 3, 4, 5, 6, 7, 8]; // Added floors
    const levels = [1, 2, 3, 4, 5]; // Kept original levels
    // Using a consistent set of station numbers per level/floor/side for this example
    const stationNumbers = [142, 144, 146, 148, 150, 152, 154, 156]; 

    const allStations = [];

    // Loop through sides, floors, levels, and numbers
    for (const side of sides) {
      for (const floor of floors) { // Added floor loop
        for (const level of levels) {
          for (const number of stationNumbers) {
            allStations.push({
              side: side,
              floor: floor, // Added floor property
              level: level,
              station_number: number,
              status: 'Inactive', // Default status
              end_indicator: Math.random() > 0.5 ? 'Hi' : 'Lo' // Random indicator for variety
            });
          }
        }
      }
    }
    
    // Prepare the SQL statement WITH the floor column
    const insertStation = db.prepare(
        'INSERT OR IGNORE INTO stations (side, floor, level, station_number, status, end_indicator) VALUES (?, ?, ?, ?, ?, ?)' // Added floor
    );
    
    // Insert each station, including the floor
    allStations.forEach(station => {
        insertStation.run(
            station.side,
            station.floor, // Added floor value
            station.level,
            station.station_number,
            station.status,
            station.end_indicator
        );
    });
    
    insertStation.finalize();
    console.log(`${allStations.length} stations inserted.`);
}

// Seed safety messages
function seedSafetyMessages() {
    console.log('Seeding safety messages...');
    
    const messages = [
        {
            message: 'REMINDER: Always wear proper PPE in work areas',
            priority: 'normal'
        },
        {
            message: 'SAFETY FIRST: Keep all aisles clear of obstructions',
            priority: 'normal'
        },
        {
            message: 'REPORT hazards immediately to your supervisor',
            priority: 'normal'
        },
        {
            message: 'LIFT with your legs, not your back',
            priority: 'normal'
        },
        {
            message: 'STAY HYDRATED during your shift',
            priority: 'normal'
        }
    ];
    
    // Insert messages into database
    const insertMessage = db.prepare(
        'INSERT INTO safety_messages (message, priority, is_active) VALUES (?, ?, 1)'
    );
    
    messages.forEach(message => {
        insertMessage.run(message.message, message.priority);
    });
    
    insertMessage.finalize();
    console.log(`${messages.length} safety messages inserted.`);
}

// Seed user data
function seedUsers() {
    console.log('Seeding user data...');
    
    // Hash password for admin user
    const adminPassword = 'admin123';
    // Removed manager password as only admin is seeded in the updated schema
    
    bcrypt.hash(adminPassword, 10, (err, adminHash) => {
        if (err) {
            console.error('Error hashing admin password:', err);
            // Close DB connection on error here, as the outer serialize won't handle this async callback error properly
            db.close(closeErr => {
              if(closeErr) console.error("Error closing DB after hash error:", closeErr);
              process.exit(1);
            });
            return; 
        }
        
        // Updated user data array - only admin user, no role
        const users = [
            {
                username: 'admin',
                password: adminHash,
                slack_user_id: null // Or specify a default Slack ID if needed
                // role property removed
            }
            // Manager user removed
        ];
            
        // Update insert statement to match schema (no role)
        const insertUser = db.prepare(
            'INSERT OR IGNORE INTO users (username, password, slack_user_id) VALUES (?, ?, ?)' // Removed role
        );
            
        users.forEach(user => {
            insertUser.run(
                user.username,
                user.password,
                user.slack_user_id
                // role value removed
            );
        });
            
        insertUser.finalize((finalizeErr) => { // Added callback for finalize
           if (finalizeErr) {
               console.error("Error finalizing user insert:", finalizeErr);
               db.close(closeErr => {
                 if(closeErr) console.error("Error closing DB after finalize error:", closeErr);
                 process.exit(1);
               });
               return;
           }
           console.log(`${users.length} users inserted.`);
           
           // IMPORTANT: Close the database connection HERE inside the final callback
           // Because bcrypt.hash is asynchronous, the db.serialize block might finish before this does.
           db.close(err => {
               if (err) {
                   console.error('Error closing database:', err.message);
                   process.exit(1); // Exit on error
               } 
               console.log('Database connection closed by seedUsers.'); // Log specific close
               // Do not exit here normally, let the serialize block finish if it hasn't.
           });
        });
    });
    // Removed outer bcrypt hash for manager
}

// Run the seed functions
db.serialize(() => {
    // Check if database is empty before seeding
    db.get('SELECT count(*) as count FROM stations', (err, row) => {
        if (err) {
            console.error('Error checking database:', err.message);
            process.exit(1);
        }
        
        if (row && row.count > 0) {
            console.log('Database already contains data. Skipping seed.');
             // Need to close DB connection if skipping
            db.close(err => {
               if (err) {
                   console.error('Error closing database:', err.message);
                   process.exit(1); // Exit on error
               }
               console.log('Database connection closed after skipping seed.');
               process.exit(0);
            });
            return; // Explicit return
        }
        
        // Seed the data
        seedStations();
        seedSafetyMessages();
        seedUsers();
        // NOTE: The db.close() is now primarily handled inside the async callback of seedUsers.
        // The serialize block might finish before seedUsers, so we close it there.
    });
});
