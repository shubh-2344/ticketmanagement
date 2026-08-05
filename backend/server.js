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

// Helper to validate UUID strings
const isValidUUID = (str) => typeof str === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str);

// Enable express proxy trust for rate limiting behind reverse proxies
app.set('trust proxy', 1);

// Security Headers (SonarQube Remediation)
app.use(helmet({
    contentSecurityPolicy: false
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

// Rate limiting for auth routes
const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 500,
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

        await pool.query(`
            ALTER TABLE users ADD COLUMN IF NOT EXISTS password_hash VARCHAR(255) DEFAULT '';
        `);

        // System Settings Table (Admin Global Layout & Ticket View Configuration)
        await pool.query(`
            CREATE TABLE IF NOT EXISTS system_settings (
                key VARCHAR(50) PRIMARY KEY,
                value TEXT NOT NULL
            )
        `);

        await pool.query(`
            INSERT INTO system_settings (key, value)
            VALUES ('ticket_view_mode', 'grid')
            ON CONFLICT (key) DO NOTHING
        `);

        // Inventory Table
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
                type VARCHAR(100),
                category VARCHAR(100),
                priority VARCHAR(50) DEFAULT 'medium',
                status VARCHAR(100) DEFAULT 'pending_manager_approval',
                requester_id VARCHAR(50) REFERENCES users(id) ON DELETE CASCADE,
                requester_name VARCHAR(100),
                requester_email VARCHAR(100),
                manager_id VARCHAR(50),
                manager_name VARCHAR(100),
                inventory_id UUID REFERENCES inventory(id) ON DELETE SET NULL,
                approver_id VARCHAR(50),
                approver_name VARCHAR(100),
                approval_date TIMESTAMP,
                approval_comment TEXT,
                assigned_device_name VARCHAR(150),
                assignment_description TEXT,
                assigned_at TIMESTAMP,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);

        // Migrations
        await pool.query(`ALTER TABLE tickets ADD COLUMN IF NOT EXISTS manager_id VARCHAR(50);`);
        await pool.query(`ALTER TABLE tickets ADD COLUMN IF NOT EXISTS manager_name VARCHAR(100);`);
        await pool.query(`ALTER TABLE tickets ADD COLUMN IF NOT EXISTS inventory_id UUID;`);
        await pool.query(`ALTER TABLE tickets ADD COLUMN IF NOT EXISTS assigned_device_name VARCHAR(150);`);
        await pool.query(`ALTER TABLE tickets ADD COLUMN IF NOT EXISTS assignment_description TEXT;`);
        await pool.query(`ALTER TABLE tickets ADD COLUMN IF NOT EXISTS assigned_at TIMESTAMP;`);

        await pool.query(`ALTER TABLE tickets ADD COLUMN IF NOT EXISTS target_resolution_date TIMESTAMP;`);
        await pool.query(`ALTER TABLE tickets ADD COLUMN IF NOT EXISTS sla_hours INT DEFAULT 48;`);
        await pool.query(`ALTER TABLE tickets ADD COLUMN IF NOT EXISTS expected_return_date TIMESTAMP;`);
        await pool.query(`ALTER TABLE tickets ADD COLUMN IF NOT EXISTS reservation_duration VARCHAR(50);`);
        await pool.query(`ALTER TABLE tickets ADD COLUMN IF NOT EXISTS returned_at TIMESTAMP;`);

        await pool.query(`ALTER TABLE tickets ALTER COLUMN status TYPE VARCHAR(100);`);
        await pool.query(`ALTER TABLE tickets ALTER COLUMN priority TYPE VARCHAR(50);`);
        await pool.query(`ALTER TABLE tickets ALTER COLUMN type TYPE VARCHAR(100);`);
        await pool.query(`ALTER TABLE tickets ALTER COLUMN category TYPE VARCHAR(100);`);

        // Default Seed Users
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

        console.log("Database initialized successfully.");
    } catch (err) {
        console.error("Database initialization error:", err.message);
    }
}

initializeDB();

// Authentication Middleware
function authenticateToken(req, res, next) {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

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

// System Settings Endpoints (Global Ticket View Settings for All Users)
app.get('/api/settings', authenticateToken, async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM system_settings');
        const settings = {};
        result.rows.forEach(row => {
            settings[row.key] = row.value;
        });
        res.json(settings);
    } catch (err) {
        console.error('Get settings error:', err);
        res.status(500).json({ error: err.message || 'Failed to fetch settings' });
    }
});

app.put('/api/settings', authenticateToken, requireRole(['admin']), async (req, res) => {
    const { ticket_view_mode } = req.body;

    if (!ticket_view_mode || !['grid', 'table', 'compact'].includes(ticket_view_mode)) {
        return res.status(400).json({ error: 'Invalid view mode. Must be "grid", "table", or "compact"' });
    }

    try {
        await pool.query(`
            INSERT INTO system_settings (key, value)
            VALUES ('ticket_view_mode', $1)
            ON CONFLICT (key) DO UPDATE SET value = $1
        `, [ticket_view_mode]);

        res.json({ message: 'Global ticket view setting updated for all users', ticket_view_mode });
    } catch (err) {
        console.error('Update settings error:', err);
        res.status(500).json({ error: err.message || 'Failed to update settings' });
    }
});

// Signup Endpoint (Users can register as Employee or Manager)
app.post('/api/auth/signup', async (req, res) => {
    const { name, email, password, role } = req.body;

    if (!name || !email || !password) {
        return res.status(400).json({ error: 'Name, email, and password are required' });
    }

    if (password.length < 6) {
        return res.status(400).json({ error: 'Password must be at least 6 characters long' });
    }

    const validRoles = ['employee', 'manager'];
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
        res.status(500).json({ error: err.message || 'Failed to register user.' });
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
        res.status(500).json({ error: err.message || 'Login failed.' });
    }
});

// Change Password Endpoint (Authenticated user changes their own password)
app.put('/api/auth/change-password', authenticateToken, async (req, res) => {
    const { currentPassword, newPassword } = req.body;

    if (!newPassword || newPassword.length < 6) {
        return res.status(400).json({ error: 'New password must be at least 6 characters long' });
    }

    try {
        const userRes = await pool.query('SELECT * FROM users WHERE id = $1', [req.user.id]);
        if (userRes.rows.length === 0) {
            return res.status(404).json({ error: 'User not found' });
        }

        const user = userRes.rows[0];
        if (user.password_hash && user.password_hash.trim() !== '') {
            const isMatch = await bcrypt.compare(currentPassword, user.password_hash);
            if (!isMatch) {
                return res.status(401).json({ error: 'Current password is incorrect' });
            }
        }

        const hashed = await bcrypt.hash(newPassword, 10);
        await pool.query('UPDATE users SET password_hash = $1 WHERE id = $2', [hashed, req.user.id]);

        res.json({ message: 'Password updated successfully' });
    } catch (err) {
        console.error('Change password error:', err);
        res.status(500).json({ error: err.message || 'Failed to change password' });
    }
});

// ADMIN CREATE USER ACCOUNT (Admin can create accounts for Admin, Manager, or Employee)
app.post('/api/admin/users', authenticateToken, requireRole(['admin']), async (req, res) => {
    const { name, email, password, role } = req.body;

    if (!name || !email || !password || !role) {
        return res.status(400).json({ error: 'Name, email, password, and role are required' });
    }

    if (password.length < 6) {
        return res.status(400).json({ error: 'Password must be at least 6 characters long' });
    }

    const validRoles = ['employee', 'manager', 'admin'];
    if (!validRoles.includes(role)) {
        return res.status(400).json({ error: 'Invalid role specified' });
    }

    try {
        const check = await pool.query('SELECT id FROM users WHERE email = $1', [email.trim().toLowerCase()]);
        if (check.rows.length > 0) {
            return res.status(400).json({ error: 'A user with this email already exists' });
        }

        const userId = 'usr_' + uuidv4().substring(0, 8);
        const hashed = await bcrypt.hash(password, 10);

        await pool.query(
            'INSERT INTO users (id, name, email, password_hash, role) VALUES ($1, $2, $3, $4, $5)',
            [userId, name.trim(), email.trim().toLowerCase(), hashed, role]
        );

        res.status(201).json({
            message: `User ${name} (${role.toUpperCase()}) created successfully!`,
            userId
        });
    } catch (err) {
        console.error('Admin create user error:', err);
        res.status(500).json({ error: err.message || 'Failed to create user' });
    }
});

// ADMIN UPDATE USER DETAILS (Admin can update name, email, and role for any user)
app.put('/api/admin/users/:id', authenticateToken, requireRole(['admin']), async (req, res) => {
    const { id } = req.params;
    const { name, email, role } = req.body;

    if (!name || !email || !role) {
        return res.status(400).json({ error: 'Name, email, and role are required' });
    }

    const validRoles = ['employee', 'manager', 'admin'];
    if (!validRoles.includes(role)) {
        return res.status(400).json({ error: 'Invalid role specified' });
    }

    try {
        const check = await pool.query('SELECT id FROM users WHERE email = $1 AND id != $2', [email.trim().toLowerCase(), id]);
        if (check.rows.length > 0) {
            return res.status(400).json({ error: 'Another user with this email already exists' });
        }

        const result = await pool.query(
            'UPDATE users SET name = $1, email = $2, role = $3 WHERE id = $4 RETURNING id, name, email, role',
            [name.trim(), email.trim().toLowerCase(), role, id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'User not found' });
        }

        res.json({
            message: `User ${result.rows[0].name} updated successfully`,
            user: result.rows[0]
        });
    } catch (err) {
        console.error('Admin update user error:', err);
        res.status(500).json({ error: err.message || 'Failed to update user' });
    }
});

// ADMIN RESET USER PASSWORD (Admin resets password for any user)
app.put('/api/admin/users/:id/reset-password', authenticateToken, requireRole(['admin']), async (req, res) => {
    const { id } = req.params;
    const { newPassword } = req.body;

    if (!newPassword || newPassword.length < 6) {
        return res.status(400).json({ error: 'New password must be at least 6 characters long' });
    }

    try {
        const hashed = await bcrypt.hash(newPassword, 10);
        const result = await pool.query(
            'UPDATE users SET password_hash = $1 WHERE id = $2 RETURNING id, name, email',
            [hashed, id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'User not found' });
        }

        res.json({ message: `Password reset successfully for ${result.rows[0].name}` });
    } catch (err) {
        console.error('Admin reset password error:', err);
        res.status(500).json({ error: err.message || 'Failed to reset password' });
    }
});

// ADMIN DELETE USER (Admin can delete a user account)
app.delete('/api/admin/users/:id', authenticateToken, requireRole(['admin']), async (req, res) => {
    const { id } = req.params;

    if (id === req.user.id) {
        return res.status(400).json({ error: 'You cannot delete your own admin account while logged in' });
    }

    try {
        const result = await pool.query('DELETE FROM users WHERE id = $1 RETURNING id, name', [id]);
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'User not found' });
        }

        res.json({ message: `User ${result.rows[0].name} deleted successfully` });
    } catch (err) {
        console.error('Admin delete user error:', err);
        res.status(500).json({ error: err.message || 'Failed to delete user' });
    }
});

// ADMIN EXPORT SYSTEM DATA (Export tickets, inventory & users as JSON)
app.get('/api/admin/export-data', authenticateToken, requireRole(['admin']), async (req, res) => {
    try {
        const ticketsRes = await pool.query('SELECT * FROM tickets ORDER BY created_at DESC');
        const inventoryRes = await pool.query('SELECT * FROM inventory ORDER BY created_at DESC');
        const usersRes = await pool.query('SELECT id, name, email, role, created_at FROM users ORDER BY name ASC');

        res.json({
            exportDate: new Date(),
            system: "Ticket Management System",
            usersCount: usersRes.rows.length,
            ticketsCount: ticketsRes.rows.length,
            inventoryCount: inventoryRes.rows.length,
            users: usersRes.rows,
            tickets: ticketsRes.rows,
            inventory: inventoryRes.rows
        });
    } catch (err) {
        console.error('Admin export data error:', err);
        res.status(500).json({ error: err.message || 'Failed to export data' });
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
        res.status(500).json({ error: err.message || 'Internal server error' });
    }
});

// Get Managers Endpoint
app.get('/api/managers', authenticateToken, async (req, res) => {
    try {
        const result = await pool.query("SELECT id, name, email, role FROM users WHERE role = 'manager' OR role = 'admin' ORDER BY name ASC");
        res.json(result.rows);
    } catch (err) {
        console.error('Get managers error:', err);
        res.status(500).json({ error: err.message || 'Internal server error' });
    }
});

// User List Endpoint
app.get('/api/users', authenticateToken, requireRole(['admin', 'manager']), async (req, res) => {
    try {
        const result = await pool.query('SELECT id, name, email, role, created_at FROM users ORDER BY name ASC');
        res.json(result.rows);
    } catch (err) {
        console.error('Get users error:', err);
        res.status(500).json({ error: err.message || 'Internal server error' });
    }
});

// ADMIN UPDATE USER ROLE (Admin can change any user's role to employee or manager or admin)
app.put('/api/users/:id/role', authenticateToken, requireRole(['admin']), async (req, res) => {
    const { id } = req.params;
    const { role } = req.body;

    if (!role || !['employee', 'manager', 'admin'].includes(role)) {
        return res.status(400).json({ error: 'Role must be "employee", "manager", or "admin"' });
    }

    try {
        const result = await pool.query(
            'UPDATE users SET role = $1 WHERE id = $2 RETURNING id, name, email, role',
            [role, id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'User not found' });
        }

        res.json({
            message: `User role successfully updated to ${role.toUpperCase()}`,
            user: result.rows[0]
        });
    } catch (err) {
        console.error('Update user role error:', err);
        res.status(500).json({ error: err.message || 'Failed to update user role' });
    }
});

// Ticket Endpoints with Multi-Stage Flow

// GET tickets
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
        res.status(500).json({ error: err.message || 'Internal server error' });
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
        if (req.user.role === 'employee' && ticket.requester_id !== req.user.id) {
            return res.status(403).json({ error: 'Forbidden: You do not have access to this ticket' });
        }

        res.json(ticket);
    } catch (err) {
        console.error('Get ticket detail error:', err);
        res.status(500).json({ error: err.message || 'Internal server error' });
    }
});

// CREATE new ticket
app.post('/api/tickets', authenticateToken, async (req, res) => {
    const { title, description, type, category, priority, inventory_id, manager_id, manager_name, expected_return_date, reservation_duration } = req.body;

    if (!title || !description || !type || !category) {
        return res.status(400).json({ error: 'Missing required fields (title, description, type, category)' });
    }

    try {
        const userCheck = await pool.query('SELECT id FROM users WHERE id = $1', [req.user.id]);
        if (userCheck.rows.length === 0) {
            await pool.query(
                `INSERT INTO users (id, name, email, password_hash, role) 
                 VALUES ($1, $2, $3, $4, $5) 
                 ON CONFLICT (email) DO NOTHING`,
                 [req.user.id, req.user.name || 'User', req.user.email || 'user@company.com', '', req.user.role || 'employee']
            );
        }

        const id = uuidv4();
        
        // If it is an issue, bypass manager review and send directly to Admin.
        const initialStatus = type === 'issue' ? 'pending_admin_assignment' : 'pending_manager_approval';

        const safeInventoryId = isValidUUID(inventory_id) ? inventory_id : null;
        // Issues don't need a manager assignment
        const safeManagerId = (type !== 'issue' && manager_id && manager_id !== 'undefined') ? manager_id : null;
        const safeManagerName = type === 'issue' ? null : (manager_name || 'Assigned Manager');

        // Calculate SLA hours and target resolution date based on priority
        const ticketPriority = priority || 'medium';
        const slaHours = ticketPriority === 'high' ? 24 : (ticketPriority === 'low' ? 72 : 48);
        const targetResolutionDate = new Date();
        targetResolutionDate.setHours(targetResolutionDate.getHours() + slaHours);

        await pool.query(`
            INSERT INTO tickets (
                id, title, description, type, category, priority, status,
                requester_id, requester_name, requester_email,
                manager_id, manager_name, inventory_id,
                sla_hours, target_resolution_date,
                expected_return_date, reservation_duration
            )
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17)
        `, [
            id,
            title.trim(),
            description.trim(),
            type,
            category,
            ticketPriority,
            initialStatus,
            req.user.id,
            req.user.name,
            req.user.email,
            safeManagerId,
            safeManagerName,
            safeInventoryId,
            slaHours,
            targetResolutionDate,
            expected_return_date ? new Date(expected_return_date) : null,
            reservation_duration || null
        ]);

        res.status(201).json({
            message: type === 'issue' 
                ? 'Ticket created successfully and sent to Admin for review' 
                : 'Ticket created successfully and sent to manager for approval',
            id,
            title,
            status: initialStatus
        });
    } catch (err) {
        console.error('Create ticket error:', err);
        res.status(500).json({ error: err.message || 'Failed to create ticket' });
    }
});

// ADMIN OVERRIDE & MODIFY TICKET API (Admin can modify any ticket for all users)
app.put('/api/tickets/:id', authenticateToken, requireRole(['admin']), async (req, res) => {
    const { id } = req.params;
    const {
        title,
        description,
        type,
        category,
        priority,
        status,
        manager_id,
        manager_name,
        assigned_device_name,
        assignment_description,
        approval_comment
    } = req.body;

    try {
        const safeManagerId = (manager_id && manager_id !== 'undefined') ? manager_id : null;

        const result = await pool.query(`
            UPDATE tickets
            SET title = COALESCE($1, title),
                description = COALESCE($2, description),
                type = COALESCE($3, type),
                category = COALESCE($4, category),
                priority = COALESCE($5, priority),
                status = COALESCE($6, status),
                manager_id = COALESCE($7, manager_id),
                manager_name = COALESCE($8, manager_name),
                assigned_device_name = COALESCE($9, assigned_device_name),
                assignment_description = COALESCE($10, assignment_description),
                approval_comment = COALESCE($11, approval_comment),
                updated_at = CURRENT_TIMESTAMP
            WHERE id = $12
            RETURNING *
        `, [
            title ? title.trim() : null,
            description ? description.trim() : null,
            type || null,
            category || null,
            priority || null,
            status || null,
            safeManagerId,
            manager_name || null,
            assigned_device_name ? assigned_device_name.trim() : null,
            assignment_description ? assignment_description.trim() : null,
            approval_comment ? approval_comment.trim() : null,
            id
        ]);

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Ticket not found' });
        }

        res.json({
            message: 'Ticket modified successfully by Admin',
            ticket: result.rows[0]
        });
    } catch (err) {
        console.error('Admin modify ticket error:', err);
        res.status(500).json({ error: err.message || 'Failed to modify ticket' });
    }
});

// ADMIN EXTEND TICKET SLA / RESOLVE TIME
app.put('/api/tickets/:id/extend-sla', authenticateToken, requireRole(['admin']), async (req, res) => {
    const { id } = req.params;
    const { target_resolution_date, sla_hours, extension_reason } = req.body;

    if (!target_resolution_date) {
        return res.status(400).json({ error: 'Target resolution date is required for extension' });
    }

    try {
        const result = await pool.query(`
            UPDATE tickets
            SET target_resolution_date = $1,
                sla_hours = COALESCE($2, sla_hours),
                assignment_description = CASE 
                    WHEN $3::text IS NOT NULL AND $3::text != '' 
                    THEN COALESCE(assignment_description, '') || CHR(10) || '[SLA Extended] ' || $3::text
                    ELSE assignment_description
                END,
                updated_at = CURRENT_TIMESTAMP
            WHERE id = $4
            RETURNING *
        `, [target_resolution_date, sla_hours ? parseInt(sla_hours, 10) : null, extension_reason || '', id]);

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Ticket not found' });
        }

        res.json({
            message: 'Ticket SLA / Resolve time extended successfully by Admin',
            ticket: result.rows[0]
        });
    } catch (err) {
        console.error('Extend SLA error:', err);
        res.status(500).json({ error: err.message || 'Failed to extend SLA' });
    }
});

// ADMIN DELETE TICKET API (Admin can delete any ticket)
app.delete('/api/tickets/:id', authenticateToken, requireRole(['admin']), async (req, res) => {
    const { id } = req.params;

    try {
        const result = await pool.query('DELETE FROM tickets WHERE id = $1 RETURNING *', [id]);
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Ticket not found' });
        }

        res.json({ message: 'Ticket deleted successfully by Admin' });
    } catch (err) {
        console.error('Admin delete ticket error:', err);
        res.status(500).json({ error: err.message || 'Failed to delete ticket' });
    }
});

// STAGE 2: MANAGER APPROVAL / DENIAL
app.put('/api/tickets/:id/manager-review', authenticateToken, requireRole(['manager', 'admin']), async (req, res) => {
    const { id } = req.params;
    const { action, approval_comment } = req.body;

    if (!action || !['approve', 'reject'].includes(action)) {
        return res.status(400).json({ error: 'Action must be "approve" or "reject"' });
    }

    try {
        const nextStatus = action === 'approve' ? 'pending_admin_assignment' : 'rejected';

        const result = await pool.query(`
            UPDATE tickets
            SET status = $1,
                approver_id = $2,
                approver_name = $3,
                approval_comment = $4,
                approval_date = CURRENT_TIMESTAMP,
                updated_at = CURRENT_TIMESTAMP
            WHERE id = $5
            RETURNING *
        `, [nextStatus, req.user.id, req.user.name, approval_comment || '', id]);

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Ticket not found' });
        }

        res.json({
            message: action === 'approve'
                ? 'Ticket approved by manager and sent to Admin for device assignment'
                : 'Ticket denied by manager',
            ticket: result.rows[0]
        });
    } catch (err) {
        console.error('Manager review error:', err);
        res.status(500).json({ error: err.message || 'Failed to review ticket' });
    }
});

// STAGE 3: ADMIN DEVICE ASSIGNMENT & FULFILLMENT
app.put('/api/tickets/:id/admin-assign', authenticateToken, requireRole(['admin']), async (req, res) => {
    const { id } = req.params;
    const { inventory_id, assigned_device_name, assignment_description } = req.body;

    if (!assigned_device_name) {
        return res.status(400).json({ error: 'Device name/details are required for assignment' });
    }

    try {
        const safeInventoryId = isValidUUID(inventory_id) ? inventory_id : null;

        if (safeInventoryId) {
            await pool.query(`
                UPDATE inventory
                SET quantity = GREATEST(0, quantity - 1),
                    status = CASE WHEN quantity - 1 <= 0 THEN 'Out of Stock' ELSE status END
                WHERE id = $1
            `, [safeInventoryId]);
        }

        const result = await pool.query(`
            UPDATE tickets
            SET status = 'approved',
                inventory_id = COALESCE($1, inventory_id),
                assigned_device_name = $2,
                assignment_description = $3,
                assigned_at = CURRENT_TIMESTAMP,
                updated_at = CURRENT_TIMESTAMP
            WHERE id = $4
            RETURNING *
        `, [safeInventoryId, assigned_device_name.trim(), assignment_description || '', id]);

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Ticket not found' });
        }

        res.json({
            message: 'Device successfully assigned and ticket fulfilled by Admin',
            ticket: result.rows[0]
        });
    } catch (err) {
        console.error('Admin assign error:', err);
        res.status(500).json({ error: err.message || 'Device assignment failed' });
    }
});

// CLOSE ticket
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
        res.status(500).json({ error: err.message || 'Failed to close ticket' });
    }
});

// INVENTORY ENDPOINTS
app.get('/api/inventory', authenticateToken, async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM inventory ORDER BY created_at DESC');
        res.json(result.rows);
    } catch (err) {
        console.error('Get inventory error:', err);
        res.status(500).json({ error: err.message || 'Internal server error' });
    }
});

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
        res.status(500).json({ error: err.message || 'Failed to add inventory item' });
    }
});

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
        res.status(500).json({ error: err.message || 'Failed to update inventory item' });
    }
});

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
        res.status(500).json({ error: err.message || 'Failed to delete inventory item' });
    }
});

// STAGE 4: DEVICE RETURN WORKFLOW & TRACKING APIs

// Requester marks assigned device as returned
app.put('/api/tickets/:id/return-device', authenticateToken, async (req, res) => {
    const { id } = req.params;

    try {
        const ticketResult = await pool.query('SELECT requester_id, status, assigned_device_name FROM tickets WHERE id = $1', [id]);
        if (ticketResult.rows.length === 0) {
            return res.status(404).json({ error: 'Ticket not found' });
        }

        const ticket = ticketResult.rows[0];

        // Check if user is the requester or an admin
        if (req.user.role === 'employee' && ticket.requester_id !== req.user.id) {
            return res.status(403).json({ error: 'Forbidden: You can only return devices assigned to your own requests' });
        }

        if (!ticket.assigned_device_name) {
            return res.status(400).json({ error: 'No device has been assigned to this ticket' });
        }

        if (ticket.status !== 'approved') {
            return res.status(400).json({ error: 'Device can only be marked as returned for approved requests' });
        }

        const result = await pool.query(`
            UPDATE tickets
            SET status = 'return_pending_verification',
                updated_at = CURRENT_TIMESTAMP
            WHERE id = $1
            RETURNING *
        `, [id]);

        res.json({
            message: 'Device marked as returned. Awaiting Administrator verification.',
            ticket: result.rows[0]
        });
    } catch (err) {
        console.error('Return device error:', err);
        res.status(500).json({ error: err.message || 'Failed to request device return' });
    }
});

// Admin verifies physical return of device
app.put('/api/tickets/:id/verify-return', authenticateToken, requireRole(['admin']), async (req, res) => {
    const { id } = req.params;

    try {
        const ticketResult = await pool.query('SELECT inventory_id, status, assigned_device_name FROM tickets WHERE id = $1', [id]);
        if (ticketResult.rows.length === 0) {
            return res.status(404).json({ error: 'Ticket not found' });
        }

        const ticket = ticketResult.rows[0];

        if (ticket.status !== 'return_pending_verification') {
            return res.status(400).json({ error: 'Ticket is not awaiting return verification' });
        }

        // Complete return: update ticket status and return date
        const result = await pool.query(`
            UPDATE tickets
            SET status = 'closed',
                returned_at = CURRENT_TIMESTAMP,
                updated_at = CURRENT_TIMESTAMP
            WHERE id = $1
            RETURNING *
        `, [id]);

        // Restock inventory item
        if (ticket.inventory_id) {
            await pool.query(`
                UPDATE inventory
                SET quantity = quantity + 1,
                    status = 'Available'
                WHERE id = $1
            `, [ticket.inventory_id]);
        }

        res.json({
            message: 'Device return verified successfully. Asset inventory restocked.',
            ticket: result.rows[0]
        });
    } catch (err) {
        console.error('Verify return error:', err);
        res.status(500).json({ error: err.message || 'Verification of device return failed' });
    }
});

// Admin: Device Assignment & Return Tracking
app.get('/api/admin/device-tracking', authenticateToken, requireRole(['admin']), async (req, res) => {
    try {
        const result = await pool.query(`
            SELECT 
                t.id as ticket_id,
                t.title as ticket_title,
                t.requester_name,
                t.requester_email,
                t.assigned_device_name,
                t.assigned_at,
                t.expected_return_date,
                t.status as ticket_status,
                i.name as inventory_name,
                i.category as inventory_category,
                i.status as inventory_status
            FROM tickets t
            LEFT JOIN inventory i ON t.inventory_id = i.id
            WHERE t.assigned_device_name IS NOT NULL
              AND t.status IN ('approved', 'return_pending_verification')
            ORDER BY t.expected_return_date ASC
        `);
        res.json(result.rows);
    } catch (err) {
        console.error('Device tracking query error:', err);
        res.status(500).json({ error: err.message || 'Failed to fetch device tracking lists' });
    }
});

// Admin: Enterprise Asset Lifecycle Metrics
app.get('/api/admin/asset-lifecycle', authenticateToken, requireRole(['admin']), async (req, res) => {
    try {
        const statsResult = await pool.query(`
            SELECT 
                status, 
                COUNT(*) as count,
                COALESCE(SUM(quantity), 0) as sum_qty
            FROM inventory
            GROUP BY status
        `);

        // Counts of assigned/reserved/maintenance/available devices in tickets/inventory
        const activeAssignments = await pool.query(`
            SELECT COUNT(*) FROM tickets 
            WHERE assigned_device_name IS NOT NULL 
              AND status IN ('approved', 'return_pending_verification')
        `);

        // Overdue device returns
        const overdueAssignments = await pool.query(`
            SELECT COUNT(*) FROM tickets 
            WHERE assigned_device_name IS NOT NULL 
              AND status IN ('approved', 'return_pending_verification')
              AND expected_return_date < CURRENT_TIMESTAMP
        `);

        // Upcoming device returns (next 7 days)
        const upcomingAssignments = await pool.query(`
            SELECT COUNT(*) FROM tickets 
            WHERE assigned_device_name IS NOT NULL 
              AND status IN ('approved', 'return_pending_verification')
              AND expected_return_date >= CURRENT_TIMESTAMP
              AND expected_return_date <= CURRENT_TIMESTAMP + INTERVAL '7 days'
        `);

        const statusCounts = {
            Available: 0,
            Assigned: parseInt(activeAssignments.rows[0].count, 10),
            Reserved: 0,
            Maintenance: 0
        };

        statsResult.rows.forEach(row => {
            const rawStatus = row.status || 'Available';
            if (rawStatus === 'Available') statusCounts.Available += parseInt(row.sum_qty, 10);
            else if (rawStatus === 'Reserved') statusCounts.Reserved += parseInt(row.sum_qty, 10);
            else if (rawStatus === 'Maintenance') statusCounts.Maintenance += parseInt(row.sum_qty, 10);
        });

        const totalInventory = statusCounts.Available + statusCounts.Assigned + statusCounts.Reserved + statusCounts.Maintenance;
        const utilizationRate = totalInventory > 0 
            ? Math.round(((statusCounts.Assigned + statusCounts.Reserved) / totalInventory) * 100) 
            : 0;

        res.json({
            totalInventory,
            statusCounts,
            overdueReturns: parseInt(overdueAssignments.rows[0].count, 10),
            upcomingReturns: parseInt(upcomingAssignments.rows[0].count, 10),
            utilizationRate
        });
    } catch (err) {
        console.error('Asset lifecycle stats error:', err);
        res.status(500).json({ error: err.message || 'Failed to fetch asset metrics' });
    }
});

// Admin/Manager: AI Copilot Dashboard Diagnostics
app.get('/api/ai/analyze-tickets', authenticateToken, requireRole(['admin', 'manager']), async (req, res) => {
    try {
        const ticketsResult = await pool.query('SELECT * FROM tickets ORDER BY created_at DESC');
        const allTickets = ticketsResult.rows;

        const analysis = allTickets.map(t => {
            const descLower = (t.description || '').toLowerCase();
            const titleLower = (t.title || '').toLowerCase();
            const textContent = `${titleLower} ${descLower}`;

            // Smart ticket categorization
            let aiCategory = t.category || 'Software';
            if (textContent.includes('login') || textContent.includes('password') || textContent.includes('auth') || textContent.includes('permission') || textContent.includes('account') || textContent.includes('sso')) {
                aiCategory = 'Access & Credentials';
            } else if (textContent.includes('wifi') || textContent.includes('internet') || textContent.includes('vpn') || textContent.includes('network') || textContent.includes('router') || textContent.includes('server')) {
                aiCategory = 'Network & Infrastructure';
            } else if (textContent.includes('macbook') || textContent.includes('dell') || textContent.includes('monitor') || textContent.includes('laptop') || textContent.includes('keyboard') || textContent.includes('mouse') || textContent.includes('hardware') || textContent.includes('screen') || textContent.includes('device')) {
                aiCategory = 'Hardware & Assets';
            } else if (textContent.includes('software') || textContent.includes('app') || textContent.includes('outlook') || textContent.includes('slack') || textContent.includes('license') || textContent.includes('install')) {
                aiCategory = 'Software & Applications';
            }

            // Auto-prioritization recommendation
            let aiPriority = t.priority || 'medium';
            if (textContent.includes('urgent') || textContent.includes('broken') || textContent.includes('critical') || textContent.includes('blocked') || textContent.includes('down') || textContent.includes('fails') || textContent.includes('cannot work') || textContent.includes('stop') || textContent.includes('crash')) {
                aiPriority = 'high';
            }

            // SLA breach risk prediction
            let slaRisk = 'low';
            if (t.status !== 'closed' && t.status !== 'resolved') {
                const now = new Date();
                const target = t.target_resolution_date ? new Date(t.target_resolution_date) : null;
                if (target) {
                    const diffHours = (target - now) / (1000 * 60 * 60);
                    if (diffHours < 0) slaRisk = 'breached';
                    else if (diffHours < 12) slaRisk = 'critical';
                    else if (diffHours < 24) slaRisk = 'medium';
                }
            }

            // Recommended engineer based on workload/category
            let recommendedEngineer = 'General Helpdesk Support';
            if (aiCategory === 'Hardware & Assets') {
                recommendedEngineer = 'Alice Vance (Hardware Specialist)';
            } else if (aiCategory === 'Network & Infrastructure') {
                recommendedEngineer = 'Charlie Devops (Network Architect)';
            } else if (aiCategory === 'Access & Credentials') {
                recommendedEngineer = 'Security Ops Team';
            } else {
                recommendedEngineer = 'Bob Miller (Senior Software Engineer)';
            }

            // AI Generated Summary
            const cleanedDesc = (t.description || '').trim();
            const firstSentence = cleanedDesc.split(/[.!?]/)[0] || '';
            const aiSummary = firstSentence.length > 100 
                ? `${firstSentence.substring(0, 100)}...` 
                : firstSentence || 'No description provided.';

            // Duplicate detection check
            const duplicates = allTickets.filter(other => 
                other.id !== t.id && 
                other.requester_id === t.requester_id && 
                other.status !== 'closed' &&
                other.title.toLowerCase().trim() === t.title.toLowerCase().trim()
            ).map(dup => dup.id);

            return {
                ticket_id: t.id,
                title: t.title,
                status: t.status,
                priority: t.priority,
                category: t.category,
                requester_name: t.requester_name,
                created_at: t.created_at,
                aiCategory,
                aiPriority,
                slaRisk,
                recommendedEngineer,
                aiSummary: `AI Summary: ${aiSummary}. Recommended Engineer: ${recommendedEngineer}. SLA Alert level: ${slaRisk.toUpperCase()}.`,
                isPotentialDuplicate: duplicates.length > 0,
                duplicateTicketIds: duplicates
            };
        });

        // Compute aggregate metrics
        const totalOpen = allTickets.filter(t => t.status !== 'closed').length;
        const totalHighRisk = analysis.filter(a => a.status !== 'closed' && a.slaRisk === 'critical').length;
        const totalBreached = analysis.filter(a => a.status !== 'closed' && a.slaRisk === 'breached').length;
        const totalDuplicates = analysis.filter(a => a.status !== 'closed' && a.isPotentialDuplicate).length;

        res.json({
            analysis,
            summary: {
                totalOpen,
                totalHighRisk,
                totalBreached,
                totalDuplicates
            }
        });
    } catch (err) {
        console.error('AI ticket analysis error:', err);
        res.status(500).json({ error: err.message || 'AI Ticket diagnostics failed' });
    }
});

app.listen(PORT, '0.0.0.0', () => {
    console.log(`Ticket Management Server running securely on port ${PORT}`);
});
