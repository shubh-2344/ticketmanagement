require('dotenv').config();

const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const { Pool } = require('pg');

const app = express();

// Enable express proxy trust for rate limiting behind reverse proxies
app.set('trust proxy', 1);

// Security Headers (SonarQube Remediation)
app.use(helmet({
    contentSecurityPolicy: false // Allow cross-origin script execution in development
}));

// Enable CORS securely for all origins
app.use(cors({
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(bodyParser.json());

const PORT = process.env.PORT || 5000;
const JWT_SECRET = process.env.JWT_SECRET || 'super_secret_jwt_key_ticket_management_2026';

// Rate limiting for auth routes (Generous limit to avoid blocking legitimate testing)
const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 500, // 500 requests per 15 minutes
    message: { error: 'Too many requests from this IP, please try again later.' }
});

app.use('/api/auth/', authLimiter);

const pool = new Pool({
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 5432,
    user: process.env.DB_USER || 'ticketuser',
    password: process.env.DB_PASSWORD || 'ticketpass',
    database: process.env.DB_NAME || 'ticketdb'
});

// Database Initialization & Schema Definition
async function initializeDB() {
    try {
        // Users Table
        await pool.query(`
            CREATE TABLE IF NOT EXISTS users (
                id VARCHAR(50) PRIMARY KEY,
                name VARCHAR(100) NOT NULL,
                email VARCHAR(100) UNIQUE NOT NULL,
                password_hash VARCHAR(255) NOT NULL,
                role VARCHAR(50) DEFAULT 'employee',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);

        // Migration: Ensure password_hash column exists if table existed previously
        await pool.query(`
            ALTER TABLE users ADD COLUMN IF NOT EXISTS password_hash VARCHAR(255) DEFAULT '';
        `);

        // Inventory Table (Admin Managed Feature)
        await pool.query(`
            CREATE TABLE IF NOT EXISTS inventory (
                id UUID PRIMARY KEY,
                name VARCHAR(100) NOT NULL,
                category VARCHAR(50) NOT NULL,
                quantity INT DEFAULT 0,
                status VARCHAR(50) DEFAULT 'Available',
                description TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);

        // Tickets Table
        await pool.query(`
            CREATE TABLE IF NOT EXISTS tickets (
                id UUID PRIMARY KEY,
                title TEXT NOT NULL,
                description TEXT NOT NULL,
                type VARCHAR(50),
                category VARCHAR(50),
                priority VARCHAR(20) DEFAULT 'medium',
                status VARCHAR(20) DEFAULT 'pending',
                requester_id VARCHAR(50) REFERENCES users(id) ON DELETE CASCADE,
                requester_name VARCHAR(100),
                requester_email VARCHAR(100),
                inventory_id UUID REFERENCES inventory(id) ON DELETE SET NULL,
                approver_id VARCHAR(50),
                approver_name VARCHAR(100),
                approval_date TIMESTAMP,
                approval_comment TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);

        // Migration: Ensure inventory_id column exists if table existed
        await pool.query(`
            ALTER TABLE tickets ADD COLUMN IF NOT EXISTS inventory_id UUID;
        `);

        // Default Seed Users (Password: Password123!)
        const defaultPasswordHash = await bcrypt.hash('Password123!', 10);

        const seedUsers = [
            ['user1', 'John Doe', 'john@company.com', defaultPasswordHash, 'employee'],
            ['user2', 'Jane Smith', 'jane@company.com', defaultPasswordHash, 'manager'],
            ['user3', 'Bob Wilson', 'bob@company.com', defaultPasswordHash, 'employee'],
            ['mgr1', 'Manager One', 'manager@company.com', defaultPasswordHash, 'manager'],
            ['admin1', 'System Admin', 'admin@company.com', defaultPasswordHash, 'admin']
        ];

        for (const [id, name, email, passHash, role] of seedUsers) {
            await pool.query(`
                INSERT INTO users (id, name, email, password_hash, role)
                VALUES ($1, $2, $3, $4, $5)
                ON CONFLICT (email) DO UPDATE 
                SET password_hash = $4, name = $2, role = $5
            `, [id, name, email, passHash, role]);
        }

        // Seed Sample Inventory Items if empty
        const invCheck = await pool.query('SELECT COUNT(*) FROM inventory');
        if (parseInt(invCheck.rows[0].count, 10) === 0) {
            await pool.query(`
                INSERT INTO inventory(id, name, category, quantity, status, description)
                VALUES
                ($1, 'MacBook Pro 16"', 'Laptop', 10, 'Available', 'M3 Pro, 36GB RAM, 1TB SSD'),
                ($2, 'Dell XPS 15', 'Laptop', 5, 'Available', 'Intel i9, 32GB RAM, 1TB SSD'),
                ($3, 'Dell UltraSharp 27" Monitor', 'Monitor', 15, 'Available', '4K UHD USB-C Monitor'),
                ($4, 'Logitech MX Master 3S', 'Keyboard & Mouse', 20, 'Available', 'Wireless Ergonomic Mouse'),
                ($5, 'Bose QC45 Headphones', 'Headphones', 0, 'Out of Stock', 'Noise-canceling Bluetooth headphones')
            `, [uuidv4(), uuidv4(), uuidv4(), uuidv4(), uuidv4()]);
        }

        console.log("Database initialized successfully with secure auth and inventory tables.");
    } catch (err) {
        console.error("Database initialization error:", err.message);
    }
}

initializeDB();

// Authentication Middleware
function authenticateToken(req, res, next) {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

    if (!token) {
        return res.status(401).json({ error: 'Access token required' });
    }

    jwt.verify(token, JWT_SECRET, (err, user) => {
        if (err) {
            return res.status(403).json({ error: 'Invalid or expired token' });
        }
        req.user = user;
        next();
    });
}

// Role-Based Authorization Middleware (RBAC)
function requireRole(allowedRoles) {
    return (req, res, next) => {
        if (!req.user || !allowedRoles.includes(req.user.role)) {
            return res.status(403).json({ error: 'Forbidden: Insufficient privileges' });
        }
        next();
    };
}

// Health check endpoint
app.get('/health', (req, res) => {
    res.json({ status: "ok" });
});

// Auth Routes

// Signup Endpoint
app.post('/api/auth/signup', async (req, res) => {
    const { name, email, password, role } = req.body;

    if (!name || !email || !password) {
        return res.status(400).json({ error: 'Name, email, and password are required' });
    }

    if (password.length < 6) {
        return res.status(400).json({ error: 'Password must be at least 6 characters long' });
    }

    // Role assignment logic (only default to employee if not specified, validate role)
    const validRoles = ['employee', 'manager', 'admin'];
    const assignedRole = validRoles.includes(role) ? role : 'employee';

    try {
        const existingUser = await pool.query('SELECT id FROM users WHERE email = $1', [email.trim().toLowerCase()]);
        if (existingUser.rows.length > 0) {
            return res.status(400).json({ error: 'User with this email already exists' });
        }

        const userId = 'usr_' + uuidv4().substring(0, 8);
        const hashedPassword = await bcrypt.hash(password, 10);

        await pool.query(
            'INSERT INTO users(id, name, email, password_hash, role) VALUES($1, $2, $3, $4, $5)',
            [userId, name.trim(), email.trim().toLowerCase(), hashedPassword, assignedRole]
        );

        const token = jwt.sign(
            { id: userId, name: name.trim(), email: email.trim().toLowerCase(), role: assignedRole },
            JWT_SECRET,
            { expiresIn: '24h' }
        );

        res.status(201).json({
            message: 'User registered successfully',
            token,
            user: { id: userId, name: name.trim(), email: email.trim().toLowerCase(), role: assignedRole }
        });
    } catch (err) {
        console.error('Signup error:', err);
        res.status(500).json({ error: 'Failed to register user. Internal server error.' });
    }
});

// Login Endpoint
app.post('/api/auth/login', async (req, res) => {
    const { email, password } = req.body;

    if (!email || !password) {
        return res.status(400).json({ error: 'Email and password are required' });
    }

    try {
        const result = await pool.query('SELECT * FROM users WHERE email = $1', [email.trim().toLowerCase()]);
        if (result.rows.length === 0) {
            return res.status(401).json({ error: 'Invalid email or password' });
        }

        const user = result.rows[0];
        const isMatch = await bcrypt.compare(password, user.password_hash);
        if (!isMatch) {
            return res.status(401).json({ error: 'Invalid email or password' });
        }

        const token = jwt.sign(
            { id: user.id, name: user.name, email: user.email, role: user.role },
            JWT_SECRET,
            { expiresIn: '24h' }
        );

        res.json({
            message: 'Login successful',
            token,
            user: { id: user.id, name: user.name, email: user.email, role: user.role }
        });
    } catch (err) {
        console.error('Login error:', err);
        res.status(500).json({ error: 'Login failed. Internal server error.' });
    }
});

// Current User Info Endpoint
app.get('/api/auth/me', authenticateToken, async (req, res) => {
    try {
        const result = await pool.query('SELECT id, name, email, role, created_at FROM users WHERE id = $1', [req.user.id]);
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'User not found' });
        }
        res.json(result.rows[0]);
    } catch (err) {
        console.error('Get user profile error:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// User List Endpoint (Admin & Manager access)
app.get('/api/users', authenticateToken, requireRole(['admin', 'manager']), async (req, res) => {
    try {
        const result = await pool.query('SELECT id, name, email, role, created_at FROM users ORDER BY name ASC');
        res.json(result.rows);
    } catch (err) {
        console.error('Get users error:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Ticket Endpoints with Data Isolation

// GET tickets: Employees see only their own tickets; Managers & Admins see all tickets
app.get('/api/tickets', authenticateToken, async (req, res) => {
    try {
        let query = 'SELECT * FROM tickets';
        let params = [];

        if (req.user.role === 'employee') {
            query += ' WHERE requester_id = $1 ORDER BY created_at DESC';
            params.push(req.user.id);
        } else {
            query += ' ORDER BY created_at DESC';
        }

        const result = await pool.query(query, params);
        res.json(result.rows);
    } catch (err) {
        console.error('Get tickets error:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// GET single ticket
app.get('/api/tickets/:id', authenticateToken, async (req, res) => {
    try {
        const { id } = req.params;
        const result = await pool.query('SELECT * FROM tickets WHERE id = $1', [id]);
        
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Ticket not found' });
        }

        const ticket = result.rows[0];
        // Enforce user isolation: Employees can only view their own ticket
        if (req.user.role === 'employee' && ticket.requester_id !== req.user.id) {
            return res.status(403).json({ error: 'Forbidden: You do not have access to this ticket' });
        }

        res.json(ticket);
    } catch (err) {
        console.error('Get ticket detail error:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// CREATE new ticket
app.post('/api/tickets', authenticateToken, async (req, res) => {
    const { title, description, type, category, priority, inventory_id } = req.body;

    if (!title || !description || !type || !category) {
        return res.status(400).json({ error: 'Missing required fields (title, description, type, category)' });
    }

    try {
        const id = uuidv4();

        await pool.query(`
            INSERT INTO tickets (
                id, title, description, type, category, priority, status,
                requester_id, requester_name, requester_email, inventory_id
            )
            VALUES ($1, $2, $3, $4, $5, $6, 'pending', $7, $8, $9, $10)
        `, [
            id,
            title.trim(),
            description.trim(),
            type,
            category,
            priority || 'medium',
            req.user.id,
            req.user.name,
            req.user.email,
            inventory_id || null
        ]);

        res.status(201).json({
            message: 'Ticket created successfully',
            id,
            title,
            status: 'pending'
        });
    } catch (err) {
        console.error('Create ticket error:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// APPROVE ticket (Manager or Admin)
app.put('/api/tickets/:id/approve', authenticateToken, requireRole(['manager', 'admin']), async (req, res) => {
    const { id } = req.params;
    const { approval_comment } = req.body;

    try {
        const result = await pool.query(`
            UPDATE tickets
            SET status = 'approved',
                approver_id = $1,
                approver_name = $2,
                approval_comment = $3,
                approval_date = CURRENT_TIMESTAMP,
                updated_at = CURRENT_TIMESTAMP
            WHERE id = $4
            RETURNING *
        `, [req.user.id, req.user.name, approval_comment || '', id]);

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Ticket not found' });
        }

        res.json({ message: 'Ticket approved successfully', ticket: result.rows[0] });
    } catch (err) {
        console.error('Approve ticket error:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// REJECT ticket (Manager or Admin)
app.put('/api/tickets/:id/reject', authenticateToken, requireRole(['manager', 'admin']), async (req, res) => {
    const { id } = req.params;
    const { approval_comment } = req.body;

    try {
        const result = await pool.query(`
            UPDATE tickets
            SET status = 'rejected',
                approver_id = $1,
                approver_name = $2,
                approval_comment = $3,
                approval_date = CURRENT_TIMESTAMP,
                updated_at = CURRENT_TIMESTAMP
            WHERE id = $4
            RETURNING *
        `, [req.user.id, req.user.name, approval_comment || '', id]);

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Ticket not found' });
        }

        res.json({ message: 'Ticket rejected successfully', ticket: result.rows[0] });
    } catch (err) {
        console.error('Reject ticket error:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// CLOSE ticket (Requester or Admin)
app.put('/api/tickets/:id/close', authenticateToken, async (req, res) => {
    const { id } = req.params;

    try {
        const ticketResult = await pool.query('SELECT requester_id FROM tickets WHERE id = $1', [id]);
        if (ticketResult.rows.length === 0) {
            return res.status(404).json({ error: 'Ticket not found' });
        }

        if (req.user.role === 'employee' && ticketResult.rows[0].requester_id !== req.user.id) {
            return res.status(403).json({ error: 'Forbidden: You can only close your own tickets' });
        }

        await pool.query(`
            UPDATE tickets
            SET status = 'closed', updated_at = CURRENT_TIMESTAMP
            WHERE id = $1
        `, [id]);

        res.json({ message: 'Ticket closed successfully' });
    } catch (err) {
        console.error('Close ticket error:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// INVENTORY MANAGEMENT ENDPOINTS (Admin Feature)

// GET all inventory items (Authenticated users can view to request devices)
app.get('/api/inventory', authenticateToken, async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM inventory ORDER BY created_at DESC');
        res.json(result.rows);
    } catch (err) {
        console.error('Get inventory error:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// POST add inventory item (Admin only)
app.post('/api/inventory', authenticateToken, requireRole(['admin']), async (req, res) => {
    const { name, category, quantity, status, description } = req.body;

    if (!name || !category) {
        return res.status(400).json({ error: 'Item name and category are required' });
    }

    try {
        const id = uuidv4();
        const qty = parseInt(quantity, 10) || 0;
        const itemStatus = status || (qty > 0 ? 'Available' : 'Out of Stock');

        const result = await pool.query(`
            INSERT INTO inventory (id, name, category, quantity, status, description)
            VALUES ($1, $2, $3, $4, $5, $6)
            RETURNING *
        `, [id, name.trim(), category, qty, itemStatus, description || '']);

        res.status(201).json({
            message: 'Inventory item added successfully',
            item: result.rows[0]
        });
    } catch (err) {
        console.error('Add inventory error:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// PUT update inventory item (Admin only)
app.put('/api/inventory/:id', authenticateToken, requireRole(['admin']), async (req, res) => {
    const { id } = req.params;
    const { name, category, quantity, status, description } = req.body;

    try {
        const qty = parseInt(quantity, 10) || 0;
        const itemStatus = status || (qty > 0 ? 'Available' : 'Out of Stock');

        const result = await pool.query(`
            UPDATE inventory
            SET name = $1,
                category = $2,
                quantity = $3,
                status = $4,
                description = $5,
                updated_at = CURRENT_TIMESTAMP
            WHERE id = $6
            RETURNING *
        `, [name.trim(), category, qty, itemStatus, description || '', id]);

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Inventory item not found' });
        }

        res.json({ message: 'Inventory item updated successfully', item: result.rows[0] });
    } catch (err) {
        console.error('Update inventory error:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// DELETE inventory item (Admin only)
app.delete('/api/inventory/:id', authenticateToken, requireRole(['admin']), async (req, res) => {
    const { id } = req.params;

    try {
        const result = await pool.query('DELETE FROM inventory WHERE id = $1 RETURNING *', [id]);
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Inventory item not found' });
        }

        res.json({ message: 'Inventory item deleted successfully' });
    } catch (err) {
        console.error('Delete inventory error:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

app.listen(PORT, '0.0.0.0', () => {
    console.log(`Ticket Management Server running securely on port ${PORT}`);
});
