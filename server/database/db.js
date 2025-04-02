const sqlite3 = require('sqlite3').verbose();
const { database } = require('../config/database');
const path = require('path');
const fs = require('fs');

// Ensure directory exists
const dbDir = path.dirname(database);
if (!fs.existsSync(dbDir)) {
  console.log(`Creating database directory: ${dbDir}`);
  try {
    fs.mkdirSync(dbDir, { recursive: true });
    console.log(`Created database directory: ${dbDir}`);
  } catch (err) {
    console.error(`Error creating database directory: ${err.message}`);
    // If we can't create the directory, try to continue anyway - might be permissions issue in production
  }
}

console.log(`Using database at path: ${database}`);

// Check if we need to migrate from old database location in production
const migrateFromOldLocation = () => {
  if (process.env.NODE_ENV === 'production') {
    const oldDbPath = path.join(process.cwd(), 'database.db');
    
    if (fs.existsSync(oldDbPath) && !fs.existsSync(database)) {
      console.log(`Found database at old location: ${oldDbPath}`);
      console.log(`Migrating to new location: ${database}`);
      
      try {
        // Copy the old database to the new location
        fs.copyFileSync(oldDbPath, database);
        console.log('Database migration successful!');
        
        // Optionally backup the old file instead of deleting it
        const backupPath = `${oldDbPath}.backup`;
        fs.copyFileSync(oldDbPath, backupPath);
        console.log(`Created backup at: ${backupPath}`);
        
        // Be cautious about deleting the old file in production
        // fs.unlinkSync(oldDbPath);
        // console.log(`Removed old database file: ${oldDbPath}`);
      } catch (err) {
        console.error(`Error migrating database: ${err.message}`);
      }
    }
  }
};

// Call the migration function before creating the connection
migrateFromOldLocation();

// Create a database connection
const db = new sqlite3.Database(database, (err) => {
  if (err) {
    console.error('Error connecting to database:', err.message);
  } else {
    console.log('Connected to SQLite database');
    
    // Initialize the database
    dbInit(db).then(() => {
      console.log('Database initialized successfully');
    }).catch(err => {
      console.error('Database initialization failed:', err);
    });
  }
});

// Promise wrapper for database operations
const dbAsync = {
  run: (sql, params = []) => {
    return new Promise((resolve, reject) => {
      db.run(sql, params, function(err) {
        if (err) {
          reject(err);
          return;
        }
        resolve({ lastID: this.lastID, changes: this.changes });
      });
    });
  },
  
  get: (sql, params = []) => {
    return new Promise((resolve, reject) => {
      db.get(sql, params, (err, row) => {
        if (err) {
          reject(err);
          return;
        }
        resolve(row);
      });
    });
  },
  
  all: (sql, params = []) => {
    return new Promise((resolve, reject) => {
      db.all(sql, params, (err, rows) => {
        if (err) {
          reject(err);
          return;
        }
        resolve(rows);
      });
    });
  },
  
  exec: (sql) => {
    return new Promise((resolve, reject) => {
      db.exec(sql, (err) => {
        if (err) {
          reject(err);
          return;
        }
        resolve();
      });
    });
  },
  
  close: () => {
    return new Promise((resolve, reject) => {
      db.close((err) => {
        if (err) {
          reject(err);
          return;
        }
        resolve();
      });
    });
  }
};

// If the file doesn't exist, start with the database empty
const dbInit = (db) => {
  // Add better debugging and logging
  console.log('Initializing database at path:', database);
  
  if (!fs.existsSync(database)) {
    console.log('Database file does not exist, will create new database');
  } else {
    console.log('Database file already exists, checking tables');
  }
  
  // Check if the stations table exists
  return new Promise((resolve, reject) => {
    db.get("SELECT name FROM sqlite_master WHERE type='table' AND name='stations'", (err, row) => {
      if (err) {
        console.error('Error checking database tables:', err);
        return reject(err);
      }
      
      if (!row) {
        console.log('Stations table does not exist, initializing schema');
        // Read and execute the schema file
        const schemaPath = path.join(__dirname, 'schema.sql');
        try {
          const schema = fs.readFileSync(schemaPath, 'utf8');
          
          db.exec(schema, (err) => {
            if (err) {
              console.error('Error initializing database schema:', err);
              return reject(err);
            }
            console.log('Database schema initialized successfully');
            
            // Run seed data directly here instead of requiring the seed script
            // This avoids issues with requiring scripts in production environments
            console.log('Seeding initial data...');
            seedInitialData(db).then(() => {
              console.log('Initial data seeded successfully');
              resolve(db);
            }).catch(err => {
              console.error('Failed to seed initial data:', err);
              reject(err);
            });
          });
        } catch (err) {
          console.error('Error reading schema file:', err);
          reject(err);
        }
      } else {
        console.log('Database schema already exists');
        resolve(db);
      }
    });
  });
};

// Function to seed initial data directly
const seedInitialData = (db) => {
  console.log('Seeding stations data...');
  
  return new Promise((resolve, reject) => {
    // Sample stations for Side A
    const sideAStations = [];
    
    // Level 1
    [123, 149, 175, 215].forEach(num => {
      sideAStations.push({
        side: 'A',
        level: 1,
        station_number: num,
        status: 'Inactive',
        end_indicator: Math.random() > 0.5 ? 'Hi' : 'Lo'
      });
    });
    
    // Level 2
    [123, 149, 175, 215].forEach(num => {
      sideAStations.push({
        side: 'A',
        level: 2,
        station_number: num,
        status: 'Inactive',
        end_indicator: Math.random() > 0.5 ? 'Hi' : 'Lo'
      });
    });
    
    // Level 3
    [123, 149, 175, 215].forEach(num => {
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
    
    // Create a prepared statement for inserting stations
    const insertStmt = db.prepare(
      'INSERT INTO stations (side, level, station_number, status, end_indicator) VALUES (?, ?, ?, ?, ?)'
    );
    
    // Insert each station
    let completed = 0;
    let hasError = false;
    
    allStations.forEach(station => {
      insertStmt.run(
        station.side,
        station.level,
        station.station_number,
        station.status,
        station.end_indicator,
        function(err) {
          if (err && !hasError) {
            hasError = true;
            insertStmt.finalize();
            reject(err);
            return;
          }
          
          completed++;
          if (completed === allStations.length) {
            insertStmt.finalize();
            console.log(`${allStations.length} stations inserted`);
            
            // Now create a default admin user
            const adminPassword = 'admin123';
            const adminUserSQL = 'INSERT INTO users (username, password, role) VALUES (?, ?, ?)';
            
            // In a real app, we would hash the password but for this demo we'll insert it directly
            db.run(adminUserSQL, ['admin', adminPassword, 'admin'], function(err) {
              if (err) {
                console.error('Error creating admin user:', err);
                reject(err);
                return;
              }
              
              console.log('Default admin user created');
              resolve();
            });
          }
        }
      );
    });
  });
};

module.exports = dbAsync;
