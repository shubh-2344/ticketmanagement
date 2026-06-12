const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const cors = require('cors');
const bodyParser = require('body-parser');
const { v4: uuidv4 } = require('uuid');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(bodyParser.json());

// Database setup
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
    db.run(`
      CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        email TEXT UNIQUE NOT NULL,
        role TEXT DEFAULT 'employee',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

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

    // Insert sample users if they don't exist
    db.run(`
      INSERT OR IGNORE INTO users (id, name, email, role) VALUES
      ('user1', 'John Doe', 'john@company.com', 'employee'),
      ('user2', 'Jane Smith', 'jane@company.com', 'manager'),
      ('user3', 'Bob Wilson', 'bob@company.com', 'employee'),
      ('mgr1', 'Manager One', 'manager@company.com', 'manager')
    `);
  });
}

// Helper function to get user
function getUser(userId) {
  return new Promise((resolve, reject) => {
    db.get('SELECT * FROM users WHERE id = ?', [userId], (err, row) => {
      if (err) reject(err);
      else resolve(row);
    });
  });
}

// Routes

// Get all users
app.get('/api/users', (req, res) => {
  db.all('SELECT id, name, email, role FROM users', (err, rows) => {
    if (err) {
      res.status(500).json({ error: err.message });
    } else {
      res.json(rows);
    }
  });
});

// Get current user (mock)
app.get('/api/me', (req, res) => {
  const userId = req.query.userId || 'user1';
  db.get('SELECT id, name, email, role FROM users WHERE id = ?', [userId], (err, row) => {
    if (err) {
      res.status(500).json({ error: err.message });
    } else if (!row) {
      res.status(404).json({ error: 'User not found' });
    } else {
      res.json(row);
    }
  });
});

// Get all tickets
app.get('/api/tickets', (req, res) => {
  const query = `
    SELECT * FROM tickets ORDER BY created_at DESC
  `;
  
  db.all(query, (err, rows) => {
    if (err) {
      res.status(500).json({ error: err.message });
    } else {
      res.json(rows);
    }
  });
});

// Get tickets by user (requester)
app.get('/api/tickets/user/:userId', (req, res) => {
  const { userId } = req.params;
  
  const query = `
    SELECT * FROM tickets WHERE requester_id = ? ORDER BY created_at DESC
  `;
  
  db.all(query, [userId], (err, rows) => {
    if (err) {
      res.status(500).json({ error: err.message });
    } else {
      res.json(rows);
    }
  });
});

// Get pending approvals (for managers)
app.get('/api/tickets/pending/approvals', (req, res) => {
  const query = `
    SELECT * FROM tickets WHERE status = 'pending' ORDER BY created_at DESC
  `;
  
  db.all(query, (err, rows) => {
    if (err) {
      res.status(500).json({ error: err.message });
    } else {
      res.json(rows);
    }
  });
});

// Get single ticket
app.get('/api/tickets/:id', (req, res) => {
  const { id } = req.params;
  
  db.get('SELECT * FROM tickets WHERE id = ?', [id], (err, row) => {
    if (err) {
      res.status(500).json({ error: err.message });
    } else if (!row) {
      res.status(404).json({ error: 'Ticket not found' });
    } else {
      res.json(row);
    }
  });
});

// Create new ticket
app.post('/api/tickets', (req, res) => {
  const { title, description, type, category, priority, requester_id, requester_name, requester_email } = req.body;
  
  if (!title || !description || !type || !category || !requester_id) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  const ticketId = uuidv4();
  const query = `
    INSERT INTO tickets (id, title, description, type, category, priority, status, requester_id, requester_name, requester_email)
    VALUES (?, ?, ?, ?, ?, ?, 'pending', ?, ?, ?)
  `;

  db.run(query, [ticketId, title, description, type, category, priority || 'medium', requester_id, requester_name, requester_email], function(err) {
    if (err) {
      res.status(500).json({ error: err.message });
    } else {
      res.status(201).json({
        id: ticketId,
        title,
        description,
        type,
        category,
        priority: priority || 'medium',
        status: 'pending',
        requester_id,
        requester_name,
        requester_email,
        created_at: new Date().toISOString()
      });
    }
  });
});

// Approve ticket
app.put('/api/tickets/:id/approve', (req, res) => {
  const { id } = req.params;
  const { approver_id, approver_name, approval_comment } = req.body;

  if (!approver_id || !approver_name) {
    return res.status(400).json({ error: 'Missing approver information' });
  }

  const query = `
    UPDATE tickets 
    SET status = 'approved', approver_id = ?, approver_name = ?, approval_comment = ?, approval_date = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `;

  db.run(query, [approver_id, approver_name, approval_comment || '', id], function(err) {
    if (err) {
      res.status(500).json({ error: err.message });
    } else if (this.changes === 0) {
      res.status(404).json({ error: 'Ticket not found' });
    } else {
      res.json({ message: 'Ticket approved successfully' });
    }
  });
});

// Reject ticket
app.put('/api/tickets/:id/reject', (req, res) => {
  const { id } = req.params;
  const { approver_id, approver_name, approval_comment } = req.body;

  if (!approver_id || !approver_name) {
    return res.status(400).json({ error: 'Missing approver information' });
  }

  const query = `
    UPDATE tickets 
    SET status = 'rejected', approver_id = ?, approver_name = ?, approval_comment = ?, approval_date = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `;

  db.run(query, [approver_id, approver_name, approval_comment || '', id], function(err) {
    if (err) {
      res.status(500).json({ error: err.message });
    } else if (this.changes === 0) {
      res.status(404).json({ error: 'Ticket not found' });
    } else {
      res.json({ message: 'Ticket rejected successfully' });
    }
  });
});

// Close ticket
app.put('/api/tickets/:id/close', (req, res) => {
  const { id } = req.params;

  const query = `
    UPDATE tickets 
    SET status = 'closed', updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `;

  db.run(query, [id], function(err) {
    if (err) {
      res.status(500).json({ error: err.message });
    } else if (this.changes === 0) {
      res.status(404).json({ error: 'Ticket not found' });
    } else {
      res.json({ message: 'Ticket closed successfully' });
    }
  });
});

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

process.on('SIGINT', () => {
  db.close();
  process.exit();
});
