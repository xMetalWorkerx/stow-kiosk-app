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
    
    // Sample stations for Side A
    const sideAStations = [];
    
    // Level 1
    [123, 149, 175, 203].forEach(num => {
        sideAStations.push({
            side: 'A',
            level: 1,
            station_number: num,
            status: 'Inactive',
            end_indicator: Math.random() > 0.5 ? 'Hi' : 'Lo'
        });
    });
    
    // Level 2
    [123, 149, 175, 203].forEach(num => {
        sideAStations.push({
            side: 'A',
            level: 2,
            station_number: num,
            status: 'Inactive',
            end_indicator: Math.random() > 0.5 ? 'Hi' : 'Lo'
        });
    });
    
    // Level 3
    [123, 149, 175, 203].forEach(num => {
        sideAStations.push({
            side: 'A',
            level: 3,
            station_number: num,
            status: 'Inactive',
            end_indicator: Math.random() > 0.5 ? 'Hi' : 'Lo'
        });
    });
    
    // Sample stations for Side B
    const sideBStations = [];
    
    // Level 1
    [123, 149, 175, 203].forEach(num => {
        sideBStations.push({
            side: 'B',
            level: 1,
            station_number: num,
            status: 'Inactive',
            end_indicator: Math.random() > 0.5 ? 'Hi' : 'Lo'
        });
    });
    
    // Level 2
    [123, 149, 175, 203].forEach(num => {
        sideBStations.push({
            side: 'B',
            level: 2,
            station_number: num,
            status: 'Inactive',
            end_indicator: Math.random() > 0.5 ? 'Hi' : 'Lo'
        });
    });
    
    // Level 3
    [123, 149, 175, 203].forEach(num => {
        sideBStations.push({
            side: 'B',
            level: 3,
            station_number: num,
            status: 'Inactive',
            end_indicator: Math.random() > 0.5 ? 'Hi' : 'Lo'
        });
    });
    
    // Combine all stations
    const allStations = [...sideAStations, ...sideBStations];
    
    // Insert stations into database
    const insertStation = db.prepare(
        'INSERT INTO stations (side, level, station_number, status, end_indicator) VALUES (?, ?, ?, ?, ?)'
    );
    
    allStations.forEach(station => {
        insertStation.run(
            station.side,
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
            text: 'REMINDER: Always wear proper PPE in work areas',
            priority: 'normal'
        },
        {
            text: 'SAFETY FIRST: Keep all aisles clear of obstructions',
            priority: 'normal'
        },
        {
            text: 'REPORT hazards immediately to your supervisor',
            priority: 'normal'
        },
        {
            text: 'LIFT with your legs, not your back',
            priority: 'normal'
        },
        {
            text: 'STAY HYDRATED during your shift',
            priority: 'normal'
        }
    ];
    
    // Insert messages into database
    const insertMessage = db.prepare(
        'INSERT INTO safety_messages (text, priority, is_active) VALUES (?, ?, 1)'
    );
    
    messages.forEach(message => {
        insertMessage.run(message.text, message.priority);
    });
    
    insertMessage.finalize();
    console.log(`${messages.length} safety messages inserted.`);
}

// Seed user data
function seedUsers() {
    console.log('Seeding user data...');
    
    // Hash password for admin user (in a real app, this would use environment variables)
    const adminPassword = 'admin123';
    const managerPassword = 'manager123';
    
    bcrypt.hash(adminPassword, 10, (err, adminHash) => {
        if (err) {
            console.error('Error hashing admin password:', err);
            return;
        }
        
        bcrypt.hash(managerPassword, 10, (err, managerHash) => {
            if (err) {
                console.error('Error hashing manager password:', err);
                return;
            }
            
            const users = [
                {
                    username: 'admin',
                    password: adminHash,
                    slack_user_id: 'U123456',
                    role: 'admin'
                },
                {
                    username: 'manager',
                    password: managerHash,
                    slack_user_id: 'U654321',
                    role: 'manager'
                }
            ];
            
            // Insert users into database
            const insertUser = db.prepare(
                'INSERT INTO users (username, password, slack_user_id, role) VALUES (?, ?, ?, ?)'
            );
            
            users.forEach(user => {
                insertUser.run(
                    user.username,
                    user.password,
                    user.slack_user_id,
                    user.role
                );
            });
            
            insertUser.finalize();
            console.log(`${users.length} users inserted.`);
            
            // Close the database connection
            db.close(err => {
                if (err) {
                    console.error('Error closing database:', err.message);
                    process.exit(1);
                }
                
                console.log('Database connection closed.');
            });
        });
    });
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
            process.exit(0);
        }
        
        // Seed the data
        seedStations();
        seedSafetyMessages();
        seedUsers();
    });
});
