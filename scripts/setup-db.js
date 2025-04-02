const fs = require('fs');
const path = require('path');
const sqlite3 = require('sqlite3').verbose();
const dbConfig = require('../server/config/database');

// Create database directory if it doesn't exist
const dbDir = path.dirname(dbConfig.database);
if (!fs.existsSync(dbDir)) {
    fs.mkdirSync(dbDir, { recursive: true });
}

// Create a new database connection
const db = new sqlite3.Database(dbConfig.database);

// Read the schema file
const schemaPath = path.join(__dirname, '../server/database/schema.sql');
const schema = fs.readFileSync(schemaPath, 'utf8');

// Execute the schema
db.exec(schema, err => {
    if (err) {
        console.error('Error setting up database schema:', err.message);
        process.exit(1);
    }
    
    console.log('Database schema set up successfully!');
    
    // Close the database connection
    db.close(err => {
        if (err) {
            console.error('Error closing database:', err.message);
            process.exit(1);
        }
        
        console.log('Database connection closed.');
    });
});
