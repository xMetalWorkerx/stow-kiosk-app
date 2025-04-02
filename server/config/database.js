const path = require('path');

module.exports = {
  database: process.env.NODE_ENV === 'production' 
    ? path.join('/data', 'database.db')
    : path.join(__dirname, '../../database.db'),
  options: {
    verbose: console.log
  }
};
