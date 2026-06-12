const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');

const dbPath = path.join(__dirname, 'data', 'tickets.db');

// Ensure data directory exists
if (!fs.existsSync(path.join(__dirname, 'data'))) {
  fs.mkdirSync(path.join(__dirname, 'data'), { recursive: true });
}

const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('Error opening database:', err);
  } else {
    console.log('Connected to SQLite database');
    initializeDB();
  }
});

function initializeDB() {
  db.serialize(() => {
    // Users table
    db.run(`
      CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        email TEXT UNIQUE NOT NULL,
        role TEXT DEFAULT 'employee',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Tickets table
    db.run(`
      CREATE TABLE IF NOT EXISTS tickets (
        id TEXT PRIMARY KEY,
        title TEXT NOT NULL,
        description TEXT NOT NULL,
        type TEXT NOT NULL,
        category TEXT NOT NULL,
        priority TEXT DEFAULT 'medium',
        status TEXT DEFAULT 'open',
        requester_id TEXT NOT NULL,
        requester_name TEXT NOT NULL,
        requester_email TEXT NOT NULL,
        approver_id TEXT,
        approver_name TEXT,
        approval_date DATETIME,
        approval_comment TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (requester_id) REFERENCES users(id)
      )
    `);

    // Insert sample users
    db.run(`
      INSERT OR IGNORE INTO users (id, name, email, role) VALUES
      ('user1', 'John Doe', 'john@company.com', 'employee'),
      ('user2', 'Jane Smith', 'jane@company.com', 'manager'),
      ('user3', 'Bob Wilson', 'bob@company.com', 'employee'),
      ('mgr1', 'Manager One', 'manager@company.com', 'manager')
    `);

    console.log('Database initialized successfully');
  });

  db.close();
}
