-- Drop tables if they exist
DROP TABLE IF EXISTS stations;
DROP TABLE IF EXISTS safety_messages;
DROP TABLE IF EXISTS users;

-- Create stations table
CREATE TABLE stations (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  side TEXT NOT NULL CHECK(side IN ('A', 'B')),
  level INTEGER NOT NULL,
  station_number INTEGER NOT NULL,
  status TEXT NOT NULL CHECK(status IN ('AQ', 'PS', 'Inactive')),
  end_indicator TEXT NOT NULL CHECK(end_indicator IN ('Hi', 'Lo')),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(side, level, station_number)
);

-- Create safety messages table
CREATE TABLE safety_messages (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  text TEXT NOT NULL,
  priority TEXT NOT NULL CHECK(priority IN ('normal', 'urgent')),
  is_active INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create users table
CREATE TABLE users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  username TEXT UNIQUE NOT NULL,
  password TEXT NOT NULL,
  slack_user_id TEXT UNIQUE,
  role TEXT NOT NULL CHECK(role IN ('admin', 'manager')),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create triggers to update the updated_at timestamp
CREATE TRIGGER update_station_timestamp AFTER UPDATE ON stations
BEGIN
  UPDATE stations SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
END;

CREATE TRIGGER update_safety_message_timestamp AFTER UPDATE ON safety_messages
BEGIN
  UPDATE safety_messages SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
END;

CREATE TRIGGER update_user_timestamp AFTER UPDATE ON users
BEGIN
  UPDATE users SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
END;
