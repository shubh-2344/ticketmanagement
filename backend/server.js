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
const emailService = require('./services/emailService');

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
            VALUES 
                ('ticket_view_mode', 'grid'),
                ('global_theme', ''),
                ('branding_primary_color', ''),
                ('branding_secondary_color', ''),
                ('branding_logo_url', ''),
                ('branding_favicon_url', ''),
                ('branding_login_background_url', '')
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

        // Asset Lifecycle Table (Tracks hardware assignment & return flow linked by Lifecycle ID AST-YYYY-XXXX)
        await pool.query(`
            CREATE TABLE IF NOT EXISTS asset_lifecycle (
                lifecycle_id VARCHAR(50) PRIMARY KEY,
                request_ticket_id VARCHAR(100) UNIQUE NOT NULL,
                return_ticket_id VARCHAR(100),
                inventory_id UUID,
                asset_name VARCHAR(150) NOT NULL,
                serial_number VARCHAR(100),
                user_id VARCHAR(50) NOT NULL,
                user_name VARCHAR(100) NOT NULL,
                user_email VARCHAR(100),
                status VARCHAR(50) DEFAULT 'Assigned',
                assigned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                expected_return_date TIMESTAMP,
                returned_at TIMESTAMP,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);

        // Migrations
        try {
            await pool.query(`ALTER TABLE tickets ALTER COLUMN id TYPE VARCHAR(100) USING id::text;`);
        } catch (mErr) {
            // Ignore if already VARCHAR or permission restricted
        }
        await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS department VARCHAR(100) DEFAULT 'Engineering';`);
        await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS is_verified BOOLEAN DEFAULT FALSE;`);
        await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS otp_code VARCHAR(10);`);
        await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS otp_expires_at TIMESTAMP;`);
        await pool.query(`ALTER TABLE tickets ADD COLUMN IF NOT EXISTS department VARCHAR(100) DEFAULT 'Engineering';`);

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
        await pool.query(`ALTER TABLE tickets ADD COLUMN IF NOT EXISTS assigned_engineer VARCHAR(100);`);
        await pool.query(`ALTER TABLE tickets ADD COLUMN IF NOT EXISTS escalation_level VARCHAR(50) DEFAULT 'Engineer';`);
        await pool.query(`ALTER TABLE tickets ADD COLUMN IF NOT EXISTS serial_number VARCHAR(100);`);
        await pool.query(`ALTER TABLE tickets ADD COLUMN IF NOT EXISTS model_number VARCHAR(100);`);
        await pool.query(`ALTER TABLE tickets ADD COLUMN IF NOT EXISTS return_reason TEXT;`);
        await pool.query(`ALTER TABLE tickets ADD COLUMN IF NOT EXISTS parent_ticket_id VARCHAR(100);`);
        await pool.query(`ALTER TABLE tickets ADD COLUMN IF NOT EXISTS original_allocation_id VARCHAR(100);`);
        await pool.query(`ALTER TABLE tickets ADD COLUMN IF NOT EXISTS last_reminder_sent TIMESTAMP;`);

        await pool.query(`ALTER TABLE tickets ALTER COLUMN status TYPE VARCHAR(100);`);
        await pool.query(`ALTER TABLE tickets ALTER COLUMN priority TYPE VARCHAR(50);`);
        await pool.query(`ALTER TABLE tickets ALTER COLUMN type TYPE VARCHAR(100);`);
        await pool.query(`ALTER TABLE tickets ALTER COLUMN category TYPE VARCHAR(100);`);
        await pool.query(`ALTER TABLE inventory ADD COLUMN IF NOT EXISTS image_url TEXT;`);
        await pool.query(`ALTER TABLE tickets ADD COLUMN IF NOT EXISTS assigned_admin_id VARCHAR(50);`);
        await pool.query(`ALTER TABLE tickets ADD COLUMN IF NOT EXISTS assigned_admin_name VARCHAR(100);`);
        await pool.query(`ALTER TABLE tickets ADD COLUMN IF NOT EXISTS reassignment_comment TEXT;`);
        await pool.query(`ALTER TABLE tickets ADD COLUMN IF NOT EXISTS is_rejected BOOLEAN DEFAULT FALSE;`);
        await pool.query(`ALTER TABLE tickets ADD COLUMN IF NOT EXISTS rejection_comment TEXT;`);

        // Default Seed Users
        const defaultPasswordHash = await bcrypt.hash('Password123!', 10);

        const seedUsers = [
            ['user1', 'John Doe', 'john@company.com', defaultPasswordHash, 'employee', 'Engineering'],
            ['user2', 'Jane Smith', 'jane@company.com', defaultPasswordHash, 'manager', 'Product'],
            ['user3', 'Bob Wilson', 'bob@company.com', defaultPasswordHash, 'employee', 'Marketing'],
            ['mgr1', 'Manager One', 'manager@company.com', defaultPasswordHash, 'manager', 'Engineering'],
            ['admin1', 'System Admin', 'admin@company.com', defaultPasswordHash, 'admin', 'IT Operations']
        ];

        for (const [id, name, email, passHash, role, dept] of seedUsers) {
            await pool.query(`
                INSERT INTO users (id, name, email, password_hash, role, department, is_verified)
                VALUES ($1, $2, $3, $4, $5, $6, TRUE)
                ON CONFLICT (email) DO UPDATE 
                SET password_hash = $4, name = $2, role = $5, department = $6, is_verified = TRUE
            `, [id, name, email, passHash, role, dept]);
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

        // Retroactively migrate existing approved device-request tickets into asset_lifecycle if not present
        const unlinkedRequests = await pool.query(`
            SELECT t.* 
            FROM tickets t
            LEFT JOIN asset_lifecycle al ON t.id = al.request_ticket_id
            WHERE t.type = 'device-request' 
              AND t.assigned_device_name IS NOT NULL 
              AND t.assigned_device_name != ''
              AND al.lifecycle_id IS NULL
            ORDER BY t.created_at ASC
        `);

        for (const reqTicket of unlinkedRequests.rows) {
            const currentYear = new Date(reqTicket.created_at || Date.now()).getFullYear();
            const prefix = `AST-${currentYear}-`;
            const maxRes = await pool.query("SELECT lifecycle_id FROM asset_lifecycle WHERE lifecycle_id LIKE $1 ORDER BY lifecycle_id DESC LIMIT 1", [`${prefix}%`]);
            let nextNum = 1;
            if (maxRes.rows.length > 0) {
                const parts = maxRes.rows[0].lifecycle_id.split('-');
                if (parts.length === 3) {
                    const parsed = parseInt(parts[2], 10);
                    if (!isNaN(parsed)) nextNum = parsed + 1;
                }
            }
            const lifecycleId = `${prefix}${String(nextNum).padStart(4, '0')}`;

            const returnRes = await pool.query(`
                SELECT id, returned_at, status FROM tickets 
                WHERE (parent_ticket_id = $1 OR original_allocation_id = $1) 
                  AND type = 'device-return'
                LIMIT 1
            `, [reqTicket.id]);

            const linkedReturn = returnRes.rows[0];
            let lifecycleStatus = 'Assigned';
            let returnedAt = reqTicket.returned_at || null;

            if (linkedReturn) {
                if (linkedReturn.status === 'closed' || reqTicket.status === 'closed') {
                    lifecycleStatus = 'Returned';
                    returnedAt = returnedAt || linkedReturn.returned_at || new Date();
                } else if (linkedReturn.status === 'return_pending_verification' || reqTicket.status === 'return_pending_verification') {
                    lifecycleStatus = 'Return Pending';
                }
            } else if (reqTicket.status === 'closed' && reqTicket.returned_at) {
                lifecycleStatus = 'Returned';
            } else if (reqTicket.status === 'return_pending_verification') {
                lifecycleStatus = 'Return Pending';
            } else if (reqTicket.expected_return_date && new Date(reqTicket.expected_return_date).getTime() < Date.now()) {
                lifecycleStatus = 'Overdue';
            }

            await pool.query(`
                INSERT INTO asset_lifecycle (
                    lifecycle_id, request_ticket_id, return_ticket_id, inventory_id,
                    asset_name, serial_number, user_id, user_name, user_email,
                    status, assigned_at, expected_return_date, returned_at
                ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
                ON CONFLICT (request_ticket_id) DO NOTHING
            `, [
                lifecycleId,
                reqTicket.id,
                linkedReturn ? linkedReturn.id : null,
                reqTicket.inventory_id || null,
                reqTicket.assigned_device_name,
                reqTicket.serial_number || null,
                reqTicket.requester_id,
                reqTicket.requester_name || 'User',
                reqTicket.requester_email || '',
                lifecycleStatus,
                reqTicket.assigned_at || reqTicket.created_at,
                reqTicket.expected_return_date || null,
                returnedAt
            ]);
        }

        console.log("Database initialized successfully.");
    } catch (err) {
        console.error("Database initialization error:", err.message);
    }
}

// Helper to generate unique Lifecycle ID (AST-YYYY-XXXX)
async function generateLifecycleId() {
    try {
        const currentYear = new Date().getFullYear();
        const prefix = `AST-${currentYear}-`;
        const res = await pool.query(
            "SELECT lifecycle_id FROM asset_lifecycle WHERE lifecycle_id LIKE $1 ORDER BY lifecycle_id DESC LIMIT 1",
            [`${prefix}%`]
        );
        let nextNum = 1;
        if (res.rows.length > 0) {
            const lastId = res.rows[0].lifecycle_id;
            const parts = lastId.split('-');
            if (parts.length === 3) {
                const parsed = parseInt(parts[2], 10);
                if (!isNaN(parsed)) {
                    nextNum = parsed + 1;
                }
            }
        }
        return `${prefix}${String(nextNum).padStart(4, '0')}`;
    } catch (err) {
        console.error("Error generating lifecycle ID:", err);
        return `AST-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;
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
app.get('/api/settings', async (req, res) => {
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
    const { 
        ticket_view_mode, 
        global_theme,
        branding_primary_color,
        branding_secondary_color,
        branding_logo_url,
        branding_favicon_url,
        branding_login_background_url
    } = req.body;

    try {
        const client = await pool.connect();
        try {
            await client.query('BEGIN');
            
            if (ticket_view_mode) {
                if (['grid', 'table', 'compact'].includes(ticket_view_mode)) {
                    await client.query(`
                        INSERT INTO system_settings (key, value) VALUES ('ticket_view_mode', $1)
                        ON CONFLICT (key) DO UPDATE SET value = $1
                    `, [ticket_view_mode]);
                }
            }
            if (global_theme !== undefined) {
                await client.query(`
                    INSERT INTO system_settings (key, value) VALUES ('global_theme', $1)
                    ON CONFLICT (key) DO UPDATE SET value = $1
                `, [global_theme]);
            }
            if (branding_primary_color !== undefined) {
                await client.query(`
                    INSERT INTO system_settings (key, value) VALUES ('branding_primary_color', $1)
                    ON CONFLICT (key) DO UPDATE SET value = $1
                `, [branding_primary_color]);
            }
            if (branding_secondary_color !== undefined) {
                await client.query(`
                    INSERT INTO system_settings (key, value) VALUES ('branding_secondary_color', $1)
                    ON CONFLICT (key) DO UPDATE SET value = $1
                `, [branding_secondary_color]);
            }
            if (branding_logo_url !== undefined) {
                await client.query(`
                    INSERT INTO system_settings (key, value) VALUES ('branding_logo_url', $1)
                    ON CONFLICT (key) DO UPDATE SET value = $1
                `, [branding_logo_url]);
            }
            if (branding_favicon_url !== undefined) {
                await client.query(`
                    INSERT INTO system_settings (key, value) VALUES ('branding_favicon_url', $1)
                    ON CONFLICT (key) DO UPDATE SET value = $1
                `, [branding_favicon_url]);
            }
            if (branding_login_background_url !== undefined) {
                await client.query(`
                    INSERT INTO system_settings (key, value) VALUES ('branding_login_background_url', $1)
                    ON CONFLICT (key) DO UPDATE SET value = $1
                `, [branding_login_background_url]);
            }

            await client.query('COMMIT');
        } catch (err) {
            await client.query('ROLLBACK');
            throw err;
        } finally {
            client.release();
        }

        // Fetch and return the updated settings
        const result = await pool.query('SELECT * FROM system_settings');
        const settings = {};
        result.rows.forEach(row => {
            settings[row.key] = row.value;
        });
        res.json({ message: 'Global system settings updated successfully', settings });
    } catch (err) {
        console.error('Update settings error:', err);
        res.status(500).json({ error: err.message || 'Failed to update system settings' });
    }
});

// Signup Endpoint (Every new user automatically created with default role 'employee' / User)
app.post('/api/auth/signup', async (req, res) => {
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
        return res.status(400).json({ error: 'Name, email, and password are required' });
    }

    if (password.length < 6) {
        return res.status(400).json({ error: 'Password must be at least 6 characters long' });
    }

    // Every new user signup automatically receives the default role 'employee' (User)
    const assignedRole = 'employee';

    try {
        const existingUser = await pool.query('SELECT id, is_verified FROM users WHERE email = $1', [email.trim().toLowerCase()]);
        if (existingUser.rows.length > 0) {
            const user = existingUser.rows[0];
            if (user.is_verified) {
                return res.status(400).json({ error: 'User with this email already exists and is verified. Please log in.' });
            } else {
                // If account exists but is unverified, generate fresh OTP and resend
                const otp = Math.floor(100000 + Math.random() * 900000).toString();
                const otpExpiresAt = new Date(Date.now() + 15 * 60 * 1000);
                await pool.query('UPDATE users SET otp_code = $1, otp_expires_at = $2 WHERE id = $3', [otp, otpExpiresAt, user.id]);
                
                emailService.sendOtpEmail({ to: email.trim().toLowerCase(), name: name.trim(), otp });
                return res.status(200).json({
                    message: 'Account exists but is unverified. A new 6-digit OTP code has been sent to your email.',
                    requireOtp: true,
                    email: email.trim().toLowerCase()
                });
            }
        }

        const userId = 'usr_' + uuidv4().substring(0, 8);
        const hashedPassword = await bcrypt.hash(password, 10);
        const otp = Math.floor(100000 + Math.random() * 900000).toString();
        const otpExpiresAt = new Date(Date.now() + 15 * 60 * 1000);

        await pool.query(
            'INSERT INTO users(id, name, email, password_hash, role, is_verified, otp_code, otp_expires_at) VALUES($1, $2, $3, $4, $5, $6, $7, $8)',
            [userId, name.trim(), email.trim().toLowerCase(), hashedPassword, assignedRole, false, otp, otpExpiresAt]
        );

        // Send OTP verification email asynchronously
        emailService.sendOtpEmail({ to: email.trim().toLowerCase(), name: name.trim(), otp });

        res.status(201).json({
            message: 'Registration successful! Please enter the 6-digit OTP sent to your email to activate your account.',
            requireOtp: true,
            email: email.trim().toLowerCase()
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
            { id: user.id, name: user.name, email: user.email, role: user.role, department: user.department },
            JWT_SECRET,
            { expiresIn: '24h' }
        );

        res.json({
            message: 'Login successful',
            token,
            user: { id: user.id, name: user.name, email: user.email, role: user.role, department: user.department }
        });
    } catch (err) {
        console.error('Login error:', err);
        res.status(500).json({ error: err.message || 'Login failed.' });
    }
});

// Verify OTP Endpoint
app.post('/api/auth/verify-otp', async (req, res) => {
    const { email, otp } = req.body;

    if (!email || !otp) {
        return res.status(400).json({ error: 'Email and 6-digit OTP code are required' });
    }

    try {
        const result = await pool.query('SELECT * FROM users WHERE email = $1', [email.trim().toLowerCase()]);
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'User account not found' });
        }

        const user = result.rows[0];

        if (user.is_verified) {
            const token = jwt.sign(
                { id: user.id, name: user.name, email: user.email, role: user.role, department: user.department },
                JWT_SECRET,
                { expiresIn: '24h' }
            );
            return res.json({
                message: 'Account is already verified!',
                token,
                user: { id: user.id, name: user.name, email: user.email, role: user.role, department: user.department }
            });
        }

        if (user.otp_code !== otp.trim()) {
            return res.status(400).json({ error: 'Invalid OTP verification code. Please check your email and try again.' });
        }

        if (user.otp_expires_at && new Date(user.otp_expires_at).getTime() < Date.now()) {
            return res.status(400).json({ error: 'OTP code has expired. Please click "Resend OTP" to receive a new code.' });
        }

        // Activate user account
        await pool.query(
            'UPDATE users SET is_verified = TRUE, otp_code = NULL, otp_expires_at = NULL WHERE id = $1',
            [user.id]
        );

        const token = jwt.sign(
            { id: user.id, name: user.name, email: user.email, role: user.role, department: user.department },
            JWT_SECRET,
            { expiresIn: '24h' }
        );

        res.json({
            message: 'Email address verified successfully! Welcome to Ticket Management System.',
            token,
            user: { id: user.id, name: user.name, email: user.email, role: user.role, department: user.department }
        });
    } catch (err) {
        console.error('Verify OTP error:', err);
        res.status(500).json({ error: err.message || 'OTP verification failed' });
    }
});

// Resend OTP Endpoint
app.post('/api/auth/resend-otp', async (req, res) => {
    const { email } = req.body;

    if (!email) {
        return res.status(400).json({ error: 'Email address is required' });
    }

    try {
        const result = await pool.query('SELECT * FROM users WHERE email = $1', [email.trim().toLowerCase()]);
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'User account not found' });
        }

        const user = result.rows[0];
        if (user.is_verified) {
            return res.status(400).json({ error: 'This email account is already verified. Please log in.' });
        }

        const otp = Math.floor(100000 + Math.random() * 900000).toString();
        const otpExpiresAt = new Date(Date.now() + 15 * 60 * 1000);

        await pool.query('UPDATE users SET otp_code = $1, otp_expires_at = $2 WHERE id = $3', [otp, otpExpiresAt, user.id]);

        emailService.sendOtpEmail({ to: user.email, name: user.name, otp });

        res.json({ message: 'A new 6-digit OTP code has been sent to your email.' });
    } catch (err) {
        console.error('Resend OTP error:', err);
        res.status(500).json({ error: err.message || 'Failed to resend OTP' });
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

// Get logged-in user's active allocated assets / fulfilled tickets for asset return selection
app.get('/api/user/assigned-assets', authenticateToken, async (req, res) => {
    try {
        const result = await pool.query(`
            SELECT 
                t.id as ticket_id, 
                t.title, 
                t.assigned_device_name, 
                t.inventory_id, 
                t.serial_number, 
                t.model_number, 
                t.assigned_at, 
                t.expected_return_date, 
                t.type, 
                t.status,
                i.name as inventory_name,
                i.category as inventory_category
            FROM tickets t
            LEFT JOIN inventory i ON t.inventory_id = i.id
            WHERE t.requester_id = $1 
              AND t.assigned_device_name IS NOT NULL 
              AND t.assigned_device_name != ''
            ORDER BY COALESCE(t.assigned_at, t.updated_at, t.created_at) DESC
        `, [req.user.id]);
        res.json(result.rows);
    } catch (err) {
        console.error('Get user assigned assets error:', err);
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
        } else if (req.user.role === 'manager') {
            query += ` WHERE (manager_id = $1 OR approver_id = $1 OR requester_id = $1 OR department IN (SELECT department FROM users WHERE id = $1 AND department IS NOT NULL AND department != '')) ORDER BY created_at DESC`;
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

// LIVE DASHBOARD ANALYTICS ENDPOINT
app.get('/api/analytics/dashboard', authenticateToken, async (req, res) => {
    try {
        const { granularity = 'Day', dateRange = 'all', department = 'all', priority = 'all', status = 'all' } = req.query;

        // Fetch tickets based on user role and scope
        let query = 'SELECT * FROM tickets';
        let params = [];

        if (req.user.role === 'employee') {
            query += ' WHERE requester_id = $1';
            params.push(req.user.id);
        } else if (req.user.role === 'manager') {
            query += ` WHERE (manager_id = $1 OR approver_id = $1 OR requester_id = $1 OR department IN (SELECT department FROM users WHERE id = $1 AND department IS NOT NULL AND department != ''))`;
            params.push(req.user.id);
        } else {
            query += ' WHERE 1=1';
        }

        const result = await pool.query(query + ' ORDER BY created_at DESC', params);
        let tickets = result.rows;

        // Apply additional request query filters if provided
        const now = Date.now();
        tickets = tickets.filter(t => {
            if (dateRange !== 'all') {
                const ticketTime = new Date(t.created_at).getTime();
                if (dateRange === '7days' && now - ticketTime > 7 * 24 * 60 * 60 * 1000) return false;
                if (dateRange === '30days' && now - ticketTime > 30 * 24 * 60 * 60 * 1000) return false;
            }
            if (department !== 'all' && (t.department || 'Engineering').toLowerCase() !== department.toLowerCase()) return false;
            if (priority !== 'all' && (t.priority || '').toLowerCase() !== priority.toLowerCase()) return false;
            if (status !== 'all') {
                const st = (t.status || '').toLowerCase();
                if (status === 'open' && (st === 'closed' || st === 'resolved')) return false;
                if (status === 'closed' && st !== 'closed' && st !== 'resolved') return false;
                if (status === 'in_progress' && st !== 'approved' && st !== 'pending_admin_assignment') return false;
            }
            return true;
        });

        // Compute live metrics
        const total = tickets.length;
        const open = tickets.filter(t => t.status !== 'closed' && t.status !== 'resolved').length;
        const closed = tickets.filter(t => t.status === 'closed' || t.status === 'resolved').length;
        const inProgress = tickets.filter(t => t.status === 'approved' || t.status === 'pending_admin_assignment').length;
        const pending = tickets.filter(t => t.status === 'pending_manager_approval' || t.status === 'pending').length;

        // SLA calculation
        let slaBreached = 0;
        let slaAtRisk = 0;
        let slaMetCount = 0;
        let totalResolutionHours = 0;
        let resolvedCountWithHours = 0;

        tickets.forEach(t => {
            const isClosed = t.status === 'closed' || t.status === 'resolved';
            const created = new Date(t.created_at).getTime();
            const target = t.target_resolution_date
                ? new Date(t.target_resolution_date).getTime()
                : created + (t.priority === 'high' || t.priority === 'urgent' ? 24 : t.priority === 'low' ? 72 : 48) * 3600000;

            if (!isClosed) {
                const diff = target - now;
                if (diff <= 0) slaBreached++;
                else if (diff <= 12 * 3600000) slaAtRisk++;
            } else {
                const returned = t.returned_at ? new Date(t.returned_at).getTime() : new Date(t.updated_at || t.created_at).getTime();
                if (returned <= target) slaMetCount++;
                const hours = (returned - created) / (1000 * 3600);
                if (hours >= 0) {
                    totalResolutionHours += hours;
                    resolvedCountWithHours++;
                }
            }
        });

        const slaCompliance = closed > 0 ? Math.round((slaMetCount / closed) * 100) : 100;
        const avgResolutionHours = resolvedCountWithHours > 0 ? Math.round((totalResolutionHours / resolvedCountWithHours) * 10) / 10 : 0;

        // Fleet utilization from database inventory table
        const invRes = await pool.query('SELECT COUNT(*) FROM inventory');
        const totalDevices = parseInt(invRes.rows[0].count, 10) || 0;
        const assignedDevices = tickets.filter(t => t.assigned_device_name && t.status !== 'closed').length;
        const utilization = totalDevices > 0 ? Math.min(100, Math.round((assignedDevices / totalDevices) * 100)) : 0;

        // Priority breakdown
        const priorityCounts = { critical: 0, high: 0, medium: 0, low: 0 };
        tickets.forEach(t => {
            const p = (t.priority || 'medium').toLowerCase();
            if (p === 'urgent' || p === 'critical') priorityCounts.critical++;
            else if (p === 'high') priorityCounts.high++;
            else if (p === 'low') priorityCounts.low++;
            else priorityCounts.medium++;
        });

        const priorityData = [
            { key: 'critical', label: 'Critical', count: priorityCounts.critical, color: '#ef4444' },
            { key: 'high', label: 'High', count: priorityCounts.high, color: '#f97316' },
            { key: 'medium', label: 'Medium', count: priorityCounts.medium, color: '#f59e0b' },
            { key: 'low', label: 'Low', count: priorityCounts.low, color: '#38bdf8' }
        ];

        // Category breakdown
        const byCategory = {
            'Hardware': 0, 'Software': 0, 'Network': 0, 'Security': 0,
            'Access Request': 0, 'Incident': 0, 'Asset Request': 0, 'Others': 0
        };
        tickets.forEach(t => {
            const cat = (t.category || '').toLowerCase();
            const type = (t.type || '').toLowerCase();
            if (type === 'device-request') byCategory['Asset Request']++;
            else if (cat.includes('hard') || cat.includes('laptop') || cat.includes('desktop') || cat.includes('monitor')) byCategory['Hardware']++;
            else if (cat.includes('soft') || cat.includes('app') || cat.includes('bug')) byCategory['Software']++;
            else if (cat.includes('net') || cat.includes('wifi') || cat.includes('vpn')) byCategory['Network']++;
            else if (cat.includes('sec') || cat.includes('auth')) byCategory['Security']++;
            else if (cat.includes('access') || cat.includes('perm')) byCategory['Access Request']++;
            else if (type === 'issue') byCategory['Incident']++;
            else byCategory['Others']++;
        });

        // Dynamic Time-Series Ticket Volume Trend (Capped at Current Date)
        const currentDateObj = new Date(); // Current server time
        let lineTrendData = [];

        if (granularity === 'Day') {
            for (let i = 6; i >= 0; i--) {
                const d = new Date(currentDateObj);
                d.setDate(currentDateObj.getDate() - i);
                const label = d.toLocaleDateString('en-US', { month: 'short', day: '2-digit' });
                const dateStr = d.toISOString().split('T')[0];

                const dayTickets = tickets.filter(t => t.created_at && new Date(t.created_at).toISOString().split('T')[0] === dateStr);
                const dayTotal = dayTickets.length;
                const dayOpen = dayTickets.filter(t => t.status !== 'closed' && t.status !== 'resolved').length;
                const dayResolved = dayTickets.filter(t => t.status === 'closed' || t.status === 'resolved').length;

                lineTrendData.push({
                    label,
                    dateStr,
                    total: dayTotal,
                    open: dayOpen,
                    resolved: dayResolved
                });
            }
        } else if (granularity === 'Week') {
            for (let i = 4; i >= 0; i--) {
                const weekEnd = new Date(currentDateObj);
                weekEnd.setDate(currentDateObj.getDate() - (i * 7));
                const weekStart = new Date(weekEnd);
                weekStart.setDate(weekEnd.getDate() - 6);

                const label = `${weekStart.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${weekEnd.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`;
                
                const weekTickets = tickets.filter(t => {
                    const tTime = new Date(t.created_at).getTime();
                    return tTime >= weekStart.getTime() && tTime <= weekEnd.getTime();
                });

                lineTrendData.push({
                    label,
                    dateStr: label,
                    total: weekTickets.length,
                    open: weekTickets.filter(t => t.status !== 'closed' && t.status !== 'resolved').length,
                    resolved: weekTickets.filter(t => t.status === 'closed' || t.status === 'resolved').length
                });
            }
        } else { // Month View
            for (let i = 5; i >= 0; i--) {
                const m = new Date(currentDateObj.getFullYear(), currentDateObj.getMonth() - i, 1);
                const label = m.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });

                const monthTickets = tickets.filter(t => {
                    const d = new Date(t.created_at);
                    return d.getFullYear() === m.getFullYear() && d.getMonth() === m.getMonth();
                });

                lineTrendData.push({
                    label,
                    dateStr: label,
                    total: monthTickets.length,
                    open: monthTickets.filter(t => t.status !== 'closed' && t.status !== 'resolved').length,
                    resolved: monthTickets.filter(t => t.status === 'closed' || t.status === 'resolved').length
                });
            }
        }

        // Live Feed (Top 5)
        const feed = tickets.slice(0, 5).map(t => ({
            id: t.id,
            time: new Date(t.created_at).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' }),
            title: t.title,
            user: t.requester_name,
            desc: `${t.requester_name} raised a ${t.priority.toUpperCase()} ticket for ${t.category || 'general'}`
        }));

        res.json({
            total,
            open,
            closed,
            inProgress,
            pending,
            slaBreached,
            slaAtRisk,
            slaCompliance,
            avgResolutionHours,
            totalDevices,
            assignedDevices,
            utilization,
            priorityData,
            byCategory,
            lineTrendData,
            feed
        });
    } catch (err) {
        console.error('Dashboard analytics error:', err);
        res.status(500).json({ error: err.message || 'Failed to compute dashboard analytics' });
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
        if (req.user.role === 'manager' && ticket.manager_id !== req.user.id && ticket.approver_id !== req.user.id && ticket.requester_id !== req.user.id) {
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
    const { 
        title, description, type, category, priority, inventory_id, 
        manager_id, manager_name, expected_return_date, reservation_duration,
        serial_number, model_number, return_reason, assigned_device_name
    } = req.body;

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

        // Data Integrity: For Return Tickets, verify that the initiating user is either the original requester or an Admin
        if (type === 'device-return' && req.body.parent_ticket_id) {
            const parentRes = await pool.query('SELECT requester_id FROM tickets WHERE id = $1', [req.body.parent_ticket_id]);
            if (parentRes.rows.length > 0) {
                const origRequesterId = parentRes.rows[0].requester_id;
                if (req.user.role !== 'admin' && origRequesterId !== req.user.id) {
                    return res.status(403).json({ error: 'Forbidden: Only the user assigned to this asset (or an Administrator) can create a return ticket.' });
                }
            }
        }

        const id = uuidv4();
        
        // If it is an issue, device-return, or created by a Manager/Admin, bypass manager review and send directly to Admin.
        const isManagerOrAdmin = req.user.role === 'manager' || req.user.role === 'admin';
        const isDirectToAdmin = type === 'issue' || type === 'device-return' || isManagerOrAdmin;
        const initialStatus = type === 'device-return' ? 'return_pending_verification' : (isDirectToAdmin ? 'pending_admin_assignment' : 'pending_manager_approval');

        const safeInventoryId = isValidUUID(inventory_id) ? inventory_id : null;
        // Direct-to-admin tickets don't need a manager assignment
        const safeManagerId = (!isDirectToAdmin && manager_id && manager_id !== 'undefined') ? manager_id : null;
        const safeManagerName = isDirectToAdmin ? null : (manager_name || 'Assigned Manager');

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
                expected_return_date, reservation_duration,
                serial_number, model_number, return_reason, assigned_device_name,
                parent_ticket_id, original_allocation_id
            )
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23)
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
            reservation_duration || null,
            serial_number ? serial_number.trim() : null,
            model_number ? model_number.trim() : null,
            return_reason ? return_reason.trim() : null,
            assigned_device_name ? assigned_device_name.trim() : null,
            req.body.parent_ticket_id || null,
            req.body.original_allocation_id || req.body.parent_ticket_id || null
        ]);

        // Auto-sync asset_lifecycle for return tickets
        if (type === 'device-return') {
            try {
                const parentId = req.body.parent_ticket_id || req.body.original_allocation_id;
                const deviceName = assigned_device_name ? assigned_device_name.trim() : null;
                
                let lcRes = null;
                if (parentId) {
                    lcRes = await pool.query('SELECT lifecycle_id FROM asset_lifecycle WHERE request_ticket_id = $1 LIMIT 1', [parentId]);
                }
                if ((!lcRes || lcRes.rows.length === 0) && deviceName) {
                    lcRes = await pool.query('SELECT lifecycle_id FROM asset_lifecycle WHERE user_id = $1 AND asset_name = $2 AND status IN (\'Assigned\', \'Overdue\', \'Return Pending\') LIMIT 1', [req.user.id, deviceName]);
                }

                if (lcRes && lcRes.rows.length > 0) {
                    await pool.query(`
                        UPDATE asset_lifecycle
                        SET return_ticket_id = $1,
                            status = 'Return Pending',
                            updated_at = CURRENT_TIMESTAMP
                        WHERE lifecycle_id = $2
                    `, [id, lcRes.rows[0].lifecycle_id]);
                }
            } catch (lcSyncErr) {
                console.error("Error auto-syncing asset lifecycle on return ticket creation:", lcSyncErr);
            }
        }

        res.status(201).json({
            message: type === 'device-return'
                ? 'Asset Return request submitted successfully to Admin for verification'
                : (type === 'issue' 
                    ? 'Ticket created successfully and sent to Admin for review' 
                    : 'Ticket created successfully and sent to manager for approval'),
            id,
            title,
            status: initialStatus
        });

        // Dispatch Email Notification to Assigned Manager / Admin (Async non-blocking)
        (async () => {
            try {
                let recipientEmail = null;
                let recipientName = safeManagerName || 'Manager';

                if (safeManagerId) {
                    const mgrRes = await pool.query('SELECT name, email FROM users WHERE id = $1', [safeManagerId]);
                    if (mgrRes.rows.length > 0) {
                        recipientEmail = mgrRes.rows[0].email;
                        recipientName = mgrRes.rows[0].name;
                    }
                }

                if (!recipientEmail) {
                    const anyRes = await pool.query("SELECT email, name FROM users WHERE role = 'manager' OR role = 'admin' LIMIT 1");
                    if (anyRes.rows.length > 0) {
                        recipientEmail = anyRes.rows[0].email;
                        recipientName = anyRes.rows[0].name;
                    }
                }

                if (recipientEmail) {
                    await emailService.sendTicketCreatedEmail({
                        to: recipientEmail,
                        managerName: recipientName,
                        ticket: {
                            id,
                            title: title.trim(),
                            description: description.trim(),
                            type,
                            category,
                            priority: ticketPriority,
                            requester_name: req.user.name,
                            requester_email: req.user.email
                        }
                    });
                }
            } catch (mailErr) {
                console.error('Ticket creation email notification error:', mailErr);
            }
        })();
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

// ESCALATE TICKET API (Escalate ticket through Engineer -> Team Lead -> Manager -> Admin)
app.put('/api/tickets/:id/escalate', authenticateToken, async (req, res) => {
    const { id } = req.params;
    const { escalation_level, assigned_engineer } = req.body;

    if (!escalation_level) {
        return res.status(400).json({ error: 'Escalation level is required' });
    }

    try {
        const result = await pool.query(`
            UPDATE tickets
            SET escalation_level = $1,
                assigned_engineer = COALESCE($2, assigned_engineer),
                updated_at = CURRENT_TIMESTAMP
            WHERE id = $3
            RETURNING *
        `, [escalation_level, assigned_engineer || null, id]);

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Ticket not found' });
        }

        res.json({
            message: `Ticket escalated to ${escalation_level} level successfully`,
            ticket: result.rows[0]
        });

        // Dispatch Email Notification (Escalation / Resolution Alert)
        (async () => {
            try {
                if (result.rows[0].requester_email) {
                    await emailService.sendTicketResolvedEmail({
                        to: result.rows[0].requester_email,
                        userName: result.rows[0].requester_name,
                        ticket: result.rows[0]
                    });
                }
            } catch (mailErr) {
                console.error('Escalation email notification error:', mailErr);
            }
        })();
    } catch (err) {
        console.error('Escalate ticket error:', err);
        res.status(500).json({ error: err.message || 'Failed to escalate ticket' });
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
    const { action, approval_comment, manager_comment } = req.body;
    const comment = approval_comment || manager_comment || '';

    if (!action || !['approve', 'reject'].includes(action)) {
        return res.status(400).json({ error: 'Action must be "approve" or "reject"' });
    }

    try {
        const nextStatus = action === 'approve' ? 'pending_admin_assignment' : 'closed';
        const isRejected = action === 'reject';

        const result = await pool.query(`
            UPDATE tickets
            SET status = $1,
                is_rejected = $2,
                approver_id = $3,
                approver_name = $4,
                approval_comment = $5,
                rejection_comment = CASE WHEN $2 = TRUE THEN $5 ELSE rejection_comment END,
                reassignment_comment = CASE WHEN $2 = TRUE THEN NULL ELSE reassignment_comment END,
                approval_date = CURRENT_TIMESTAMP,
                updated_at = CURRENT_TIMESTAMP
            WHERE id = $6
            RETURNING *
        `, [nextStatus, isRejected, req.user.id, req.user.name, comment || null, id]);

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Ticket not found' });
        }

        res.json({
            message: action === 'approve'
                ? 'Ticket approved by manager and sent to Admin for device assignment'
                : 'Ticket denied by manager',
            ticket: result.rows[0]
        });

        // Dispatch Email Notification to Admin if Approved
        if (action === 'approve') {
            (async () => {
                try {
                    const adminRes = await pool.query("SELECT email, name FROM users WHERE role = 'admin' AND LOWER(email) != 'admin@company.com'");
                    const adminEmails = adminRes.rows.map(r => r.email).filter(e => e && e.toLowerCase() !== 'admin@company.com');
                    if (adminEmails.length > 0) {
                        await emailService.sendTicketApprovedEmail({
                            to: adminEmails,
                            adminName: 'Administrator',
                            ticket: result.rows[0]
                        });
                    }
                } catch (mailErr) {
                    console.error('Manager approval email notification error:', mailErr);
                }
            })();
        }
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

        const ticketCheck = await pool.query('SELECT type FROM tickets WHERE id = $1', [id]);
        const isIssue = ticketCheck.rows[0]?.type === 'issue';
        // Active device allocations stay in 'approved' status (ASSIGNED). Issues are resolved and 'closed'.
        const targetStatus = isIssue ? 'closed' : 'approved';

        const result = await pool.query(`
            UPDATE tickets
            SET status = $5,
                inventory_id = COALESCE($1, inventory_id),
                assigned_device_name = $2,
                assignment_description = $3,
                assigned_at = CURRENT_TIMESTAMP,
                updated_at = CURRENT_TIMESTAMP
            WHERE id = $4
            RETURNING *
        `, [safeInventoryId, assigned_device_name.trim(), assignment_description || '', id, targetStatus]);

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Ticket not found' });
        }

        const updatedTicket = result.rows[0];

        // Track hardware asset lifecycle with unique AST-YYYY-XXXX Lifecycle ID for asset requests
        if (!isIssue) {
            try {
                const lcCheck = await pool.query('SELECT lifecycle_id FROM asset_lifecycle WHERE request_ticket_id = $1', [id]);
                if (lcCheck.rows.length === 0) {
                    const lifecycleId = await generateLifecycleId();
                    await pool.query(`
                        INSERT INTO asset_lifecycle (
                            lifecycle_id, request_ticket_id, inventory_id, asset_name,
                            user_id, user_name, user_email, status, assigned_at, expected_return_date
                        ) VALUES ($1, $2, $3, $4, $5, $6, $7, 'Assigned', CURRENT_TIMESTAMP, $8)
                    `, [
                        lifecycleId,
                        id,
                        safeInventoryId,
                        assigned_device_name.trim(),
                        updatedTicket.requester_id,
                        updatedTicket.requester_name || 'User',
                        updatedTicket.requester_email || '',
                        updatedTicket.expected_return_date || null
                    ]);
                } else {
                    await pool.query(`
                        UPDATE asset_lifecycle
                        SET inventory_id = COALESCE($1, inventory_id),
                            asset_name = $2,
                            status = 'Assigned',
                            updated_at = CURRENT_TIMESTAMP
                        WHERE request_ticket_id = $3
                    `, [safeInventoryId, assigned_device_name.trim(), id]);
                }
            } catch (lcErr) {
                console.error("Error managing asset lifecycle during assignment:", lcErr);
            }
        }

        res.json({
            message: 'Device successfully assigned and ticket fulfilled by Admin',
            ticket: updatedTicket
        });

        // Dispatch Email Notification (Admin Device Assigned -> User / Specialist)
        (async () => {
            try {
                if (result.rows[0].requester_email) {
                    await emailService.sendTicketAssignedEmail({
                        to: result.rows[0].requester_email,
                        engineerName: result.rows[0].requester_name,
                        ticket: result.rows[0]
                    });
                }
            } catch (mailErr) {
                console.error('Admin device assign email notification error:', mailErr);
            }
        })();
    } catch (err) {
        console.error('Admin assign error:', err);
        res.status(500).json({ error: err.message || 'Device assignment failed' });
    }
});

// CLOSE ticket
app.put('/api/tickets/:id/close', authenticateToken, async (req, res) => {
    const { id } = req.params;

    try {
        const ticketResult = await pool.query('SELECT * FROM tickets WHERE id = $1', [id]);
        if (ticketResult.rows.length === 0) {
            return res.status(404).json({ error: 'Ticket not found' });
        }

        const targetTicket = ticketResult.rows[0];

        if (req.user.role === 'employee' && targetTicket.requester_id !== req.user.id) {
            return res.status(403).json({ error: 'Forbidden: You can only close your own tickets' });
        }

        await pool.query(`
            UPDATE tickets
            SET status = 'closed', updated_at = CURRENT_TIMESTAMP
            WHERE id = $1
        `, [id]);

        res.json({ message: 'Ticket closed successfully' });

        // Dispatch Email Notification (Ticket Closed -> User)
        (async () => {
            try {
                if (targetTicket.requester_email) {
                    await emailService.sendTicketClosedEmail({
                        to: targetTicket.requester_email,
                        userName: targetTicket.requester_name,
                        ticket: targetTicket
                    });
                }
            } catch (mailErr) {
                console.error('Ticket close email notification error:', mailErr);
            }
        })();
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
    const { name, category, quantity, status, description, image_url } = req.body;

    if (!name || !category) {
        return res.status(400).json({ error: 'Item name and category are required' });
    }

    try {
        const id = uuidv4();
        const qty = parseInt(quantity, 10) || 0;
        const itemStatus = status || (qty > 0 ? 'Available' : 'Out of Stock');

        const result = await pool.query(`
            INSERT INTO inventory (id, name, category, quantity, status, description, image_url)
            VALUES ($1, $2, $3, $4, $5, $6, $7)
            RETURNING *
        `, [id, name.trim(), category, qty, itemStatus, description || '', image_url || null]);

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
    const { name, category, quantity, status, description, image_url } = req.body;

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
                image_url = $6,
                updated_at = CURRENT_TIMESTAMP
            WHERE id = $7
            RETURNING *
        `, [name.trim(), category, qty, itemStatus, description || '', image_url || null, id]);

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

// Transfer / Reassign Ticket to another Admin or Engineer
app.put('/api/tickets/:id/reassign-admin', authenticateToken, requireRole(['admin', 'manager']), async (req, res) => {
    const { id } = req.params;
    const { target_admin_id, target_admin_name, comment } = req.body;

    if (!target_admin_name || !target_admin_name.trim()) {
        return res.status(400).json({ error: 'Target Admin / Engineer name is required' });
    }

    if (!comment || !comment.trim()) {
        return res.status(400).json({ error: 'Comments/reasons for transferring ticket are required' });
    }

    try {
        const result = await pool.query(`
            UPDATE tickets
            SET assigned_admin_id = $1,
                assigned_admin_name = $2,
                assigned_engineer = $2,
                reassignment_comment = $3,
                updated_at = CURRENT_TIMESTAMP
            WHERE id = $4
            RETURNING *
        `, [target_admin_id || null, target_admin_name.trim(), comment.trim(), id]);

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Ticket not found' });
        }

        res.json({
            message: `Ticket successfully transferred to ${target_admin_name.trim()}`,
            ticket: result.rows[0]
        });
    } catch (err) {
        console.error('Reassign ticket error:', err);
        res.status(500).json({ error: err.message || 'Failed to reassign ticket' });
    }
});

// Admin / Manager Reject Ticket (Incidents & Asset Requests)
app.put('/api/tickets/:id/admin-reject', authenticateToken, requireRole(['admin', 'manager']), async (req, res) => {
    const { id } = req.params;
    const { rejection_comment } = req.body;

    if (!rejection_comment || !rejection_comment.trim()) {
        return res.status(400).json({ error: 'Rejection reason/comment is required.' });
    }

    try {
        const result = await pool.query(`
            UPDATE tickets
            SET status = 'closed',
                is_rejected = TRUE,
                rejection_comment = $1,
                approval_comment = $1,
                reassignment_comment = NULL,
                updated_at = CURRENT_TIMESTAMP
            WHERE id = $2
            RETURNING *
        `, [rejection_comment.trim(), id]);

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Ticket not found' });
        }

        res.json({
            message: 'Ticket request has been rejected successfully.',
            ticket: result.rows[0]
        });
    } catch (err) {
        console.error('Admin reject ticket error:', err);
        res.status(500).json({ error: err.message || 'Failed to reject ticket' });
    }
});

// STAGE 4: DEVICE RETURN WORKFLOW & TRACKING APIs

// Requester marks assigned device as returned
app.put('/api/tickets/:id/return-device', authenticateToken, async (req, res) => {
    const { id } = req.params;

    try {
        const ticketResult = await pool.query('SELECT requester_id, requester_name, requester_email, status, assigned_device_name, inventory_id FROM tickets WHERE id = $1', [id]);
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

        // Validate that an active asset_lifecycle record exists for this device assignment
        const lcCheck = await pool.query(`
            SELECT lifecycle_id 
            FROM asset_lifecycle 
            WHERE request_ticket_id = $1 
               OR (user_id = $2 AND asset_name = $3 AND status IN ('Assigned', 'Overdue', 'Return Pending'))
        `, [id, req.user.id || ticket.requester_id, ticket.assigned_device_name]);

        if (lcCheck.rows.length === 0) {
            return res.status(400).json({ error: 'Cannot initiate return: No active assigned asset lifecycle found for this device. Untracked returns are not permitted.' });
        }
        const activeLifecycleId = lcCheck.rows[0].lifecycle_id;

        // Generate a new linked Return Request Ticket (RET-XXXXXX)
        const returnTicketId = `RET-${Math.floor(100000 + Math.random() * 900000)}`;

        // Calculate Return Ticket SLA (e.g., 48 hours for return verification)
        const slaHours = 48;
        const targetResolutionDate = new Date();
        targetResolutionDate.setHours(targetResolutionDate.getHours() + slaHours);

        await pool.query(`
            INSERT INTO tickets (
                id, title, description, type, category, priority, status,
                requester_id, requester_name, requester_email,
                assigned_device_name, parent_ticket_id, original_allocation_id, inventory_id,
                sla_hours, target_resolution_date, created_at
            )
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, CURRENT_TIMESTAMP)
        `, [
            returnTicketId,
            `Return Request for ${ticket.assigned_device_name}`,
            `Initiated hardware return for ${ticket.assigned_device_name} (Linked Original Assignment: ${id})`,
            'device-return',
            'hardware',
            'medium',
            'return_pending_verification',
            req.user.id || ticket.requester_id,
            req.user.name || ticket.requester_name,
            req.user.email || ticket.requester_email,
            ticket.assigned_device_name,
            id,
            id,
            ticket.inventory_id,
            slaHours,
            targetResolutionDate
        ]);

        // Update original allocation ticket status to return_pending_verification
        const result = await pool.query(`
            UPDATE tickets
            SET status = 'return_pending_verification',
                updated_at = CURRENT_TIMESTAMP
            WHERE id = $1
            RETURNING *
        `, [id]);

        // Update asset_lifecycle table with return_ticket_id and status
        await pool.query(`
            UPDATE asset_lifecycle
            SET return_ticket_id = $1,
                status = 'Return Pending',
                updated_at = CURRENT_TIMESTAMP
            WHERE lifecycle_id = $2
        `, [returnTicketId, activeLifecycleId]);

        // Trigger email notification to user & admin
        if (typeof sendHtmlEmail === 'function') {
            const subject = `[Return Request Submitted] ${returnTicketId} for ${ticket.assigned_device_name}`;
            const html = `
                <div style="font-family: Arial, sans-serif; padding: 20px; color: #1e293b;">
                    <h2 style="color: #38bdf8;">Return Request Created (${returnTicketId})</h2>
                    <p>Hello <strong>${ticket.requester_name}</strong>,</p>
                    <p>Your return request for device <strong>${ticket.assigned_device_name}</strong> has been logged under Return Ticket <strong>${returnTicketId}</strong> (Linked Lifecycle ID: <strong>${activeLifecycleId}</strong>).</p>
                    <p>An Administrator will inspect and complete the physical return verification shortly.</p>
                    <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 20px 0;" />
                    <small style="color: #64748b;">DevSecOps IT Asset Management System</small>
                </div>
            `;
            sendHtmlEmail(ticket.requester_email, subject, html);
        }

        res.json({
            message: `Return request ticket ${returnTicketId} generated successfully. Awaiting Administrator verification.`,
            ticket: result.rows[0],
            return_ticket_id: returnTicketId,
            lifecycle_id: activeLifecycleId
        });
    } catch (err) {
        console.error('Return device error:', err);
        res.status(500).json({ error: err.message || 'Failed to request device return' });
    }
});

// Admin verifies physical return of device & restocks inventory
app.put('/api/tickets/:id/verify-return', authenticateToken, requireRole(['admin']), async (req, res) => {
    const { id } = req.params;

    try {
        const ticketResult = await pool.query('SELECT inventory_id, status, assigned_device_name, requester_name, requester_email, parent_ticket_id FROM tickets WHERE id = $1', [id]);
        if (ticketResult.rows.length === 0) {
            return res.status(404).json({ error: 'Ticket not found' });
        }

        const ticket = ticketResult.rows[0];

        if (ticket.status !== 'return_pending_verification') {
            return res.status(400).json({ error: 'Ticket is not awaiting return verification' });
        }

        // Complete return on targeted ticket
        const result = await pool.query(`
            UPDATE tickets
            SET status = 'closed',
                returned_at = CURRENT_TIMESTAMP,
                updated_at = CURRENT_TIMESTAMP
            WHERE id = $1
            RETURNING *
        `, [id]);

        // If ticket has parent_ticket_id or child return tickets, update them to closed as well
        if (ticket.parent_ticket_id) {
            await pool.query(`
                UPDATE tickets
                SET status = 'closed', returned_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
                WHERE id = $1
            `, [ticket.parent_ticket_id]);
        }
        await pool.query(`
            UPDATE tickets
            SET status = 'closed', returned_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
            WHERE parent_ticket_id = $1
        `, [id]);

        // Update asset_lifecycle status to Returned
        await pool.query(`
            UPDATE asset_lifecycle
            SET status = 'Returned',
                returned_at = CURRENT_TIMESTAMP,
                updated_at = CURRENT_TIMESTAMP
            WHERE request_ticket_id = $1 OR return_ticket_id = $1 OR (return_ticket_id IS NOT NULL AND return_ticket_id = $2)
        `, [id, ticket.parent_ticket_id || id]);

        // Restock inventory item
        if (ticket.inventory_id) {
            await pool.query(`
                UPDATE inventory
                SET quantity = quantity + 1,
                    status = 'Available'
                WHERE id = $1
            `, [ticket.inventory_id]);
        }

        // Trigger verification email notification
        if (typeof sendHtmlEmail === 'function' && ticket.requester_email) {
            const subject = `[Return Verified] Asset Restocked: ${ticket.assigned_device_name} (${id})`;
            const html = `
                <div style="font-family: Arial, sans-serif; padding: 20px; color: #1e293b;">
                    <h2 style="color: #10b981;">Return Verified & Completed</h2>
                    <p>Hello <strong>${ticket.requester_name}</strong>,</p>
                    <p>Physical return of device <strong>${ticket.assigned_device_name}</strong> (Ticket ID: <strong>${id}</strong>) has been verified by Administrator and restocked to available inventory.</p>
                    <p>Your hardware assignment for this device is now officially closed.</p>
                    <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 20px 0;" />
                    <small style="color: #64748b;">DevSecOps IT Asset Management System</small>
                </div>
            `;
            sendHtmlEmail(ticket.requester_email, subject, html);
        }

        res.json({
            message: 'Device return verified successfully. Asset inventory restocked to AVAILABLE.',
            ticket: result.rows[0]
        });
    } catch (err) {
        console.error('Verify return error:', err);
        res.status(500).json({ error: err.message || 'Verification of device return failed' });
    }
});

// GET /api/admin/asset-lifecycles (Full Admin & Manager Lifecycle Tracking List & KPI Metrics)
app.get('/api/admin/asset-lifecycles', authenticateToken, requireRole(['admin', 'manager']), async (req, res) => {
    try {
        const lifecyclesRes = await pool.query(`
            SELECT 
                al.lifecycle_id,
                al.request_ticket_id,
                al.return_ticket_id,
                al.inventory_id,
                al.asset_name,
                al.serial_number,
                al.user_id,
                al.user_name,
                al.user_email,
                al.status as lifecycle_status,
                al.assigned_at,
                al.expected_return_date,
                al.returned_at,
                al.created_at,
                req_t.title as request_title,
                req_t.status as request_status,
                req_t.type as request_type,
                req_t.created_at as request_created_at,
                req_t.target_resolution_date as request_target_date,
                req_t.sla_hours as request_sla_hours,
                ret_t.id as return_ticket_id_val,
                ret_t.title as return_title,
                ret_t.status as return_status,
                ret_t.created_at as return_created_at,
                ret_t.target_resolution_date as return_target_date,
                ret_t.sla_hours as return_sla_hours,
                i.name as inventory_name,
                i.category as inventory_category
            FROM asset_lifecycle al
            LEFT JOIN tickets req_t ON al.request_ticket_id = req_t.id
            LEFT JOIN tickets ret_t ON al.return_ticket_id = ret_t.id
            LEFT JOIN inventory i ON al.inventory_id = i.id
            ORDER BY al.created_at DESC
        `);

        const lifecycles = lifecyclesRes.rows;
        const now = Date.now();

        let assetsInUse = 0;
        let pendingReturns = 0;
        let overdueReturns = 0;

        lifecycles.forEach(lc => {
            const isReturned = lc.lifecycle_status === 'Returned';
            const isPendingReturn = lc.lifecycle_status === 'Return Pending' || lc.return_status === 'return_pending_verification';
            const isOverdue = !isReturned && lc.expected_return_date && new Date(lc.expected_return_date).getTime() < now;

            if (isOverdue) {
                overdueReturns++;
            }
            if (isPendingReturn) {
                pendingReturns++;
            }
            if (!isReturned && !isPendingReturn) {
                assetsInUse++;
            }
        });

        res.json({
            metrics: {
                totalLifecycles: lifecycles.length,
                assetsInUse,
                pendingReturns,
                overdueReturns
            },
            lifecycles
        });
    } catch (err) {
        console.error('Get asset lifecycles error:', err);
        res.status(500).json({ error: err.message || 'Failed to fetch asset lifecycles' });
    }
});

// GET /api/asset-lifecycles/ticket/:ticketId (Fetch Vertical Flow Data for specific ticket)
app.get('/api/asset-lifecycles/ticket/:ticketId', authenticateToken, async (req, res) => {
    try {
        const { ticketId } = req.params;
        const resLc = await pool.query(`
            SELECT 
                al.lifecycle_id,
                al.request_ticket_id,
                al.return_ticket_id,
                al.inventory_id,
                al.asset_name,
                al.serial_number,
                al.user_id,
                al.user_name,
                al.user_email,
                al.status as lifecycle_status,
                al.assigned_at,
                al.expected_return_date,
                al.returned_at,
                al.created_at,
                req_t.title as request_title,
                req_t.status as request_status,
                req_t.type as request_type,
                req_t.created_at as request_created_at,
                req_t.target_resolution_date as request_target_date,
                req_t.sla_hours as request_sla_hours,
                ret_t.id as return_ticket_id_val,
                ret_t.title as return_title,
                ret_t.status as return_status,
                ret_t.created_at as return_created_at,
                ret_t.target_resolution_date as return_target_date,
                ret_t.sla_hours as return_sla_hours,
                i.name as inventory_name,
                i.category as inventory_category
            FROM asset_lifecycle al
            LEFT JOIN tickets req_t ON al.request_ticket_id = req_t.id
            LEFT JOIN tickets ret_t ON al.return_ticket_id = ret_t.id
            LEFT JOIN inventory i ON al.inventory_id = i.id
            WHERE al.request_ticket_id = $1 OR al.return_ticket_id = $1 OR al.lifecycle_id = $1
            LIMIT 1
        `, [ticketId]);

        if (resLc.rows.length > 0) {
            return res.json(resLc.rows[0]);
        }

        // If no active lifecycle found yet, fallback to active ticket record if ticket exists
        const ticketRes = await pool.query(`
            SELECT 
                id, title, description, type, category, priority, status,
                requester_id, requester_name, requester_email,
                assigned_device_name, expected_return_date, created_at, target_resolution_date, sla_hours,
                parent_ticket_id
            FROM tickets
            WHERE id = $1
        `, [ticketId]);

        if (ticketRes.rows.length === 0) {
            return res.status(404).json({ error: 'No active ticket or lifecycle found' });
        }

        const t = ticketRes.rows[0];

        // Format a fallback pending lifecycle object
        const fallbackLc = {
            lifecycle_id: 'AST-PENDING',
            request_ticket_id: t.type === 'device-request' ? t.id : (t.parent_ticket_id || t.id),
            return_ticket_id: t.type === 'device-return' ? t.id : null,
            inventory_id: null,
            asset_name: t.assigned_device_name || 'Awaiting Allocation',
            serial_number: null,
            user_id: t.requester_id,
            user_name: t.requester_name,
            user_email: t.requester_email,
            lifecycle_status: t.status === 'approved' ? 'Assigned' : 'Pending Assignment',
            assigned_at: t.status === 'approved' ? t.created_at : null,
            expected_return_date: t.expected_return_date,
            returned_at: null,
            created_at: t.created_at,
            request_title: t.type === 'device-request' ? t.title : 'Device Allocation Request',
            request_status: t.type === 'device-request' ? t.status : 'approved',
            request_type: t.type,
            request_created_at: t.created_at,
            request_target_date: t.target_resolution_date,
            request_sla_hours: t.sla_hours,
            return_ticket_id_val: t.type === 'device-return' ? t.id : null,
            return_title: t.type === 'device-return' ? t.title : null,
            return_status: t.type === 'device-return' ? t.status : null,
            return_created_at: t.type === 'device-return' ? t.created_at : null,
            return_target_date: t.type === 'device-return' ? t.target_resolution_date : null,
            return_sla_hours: t.type === 'device-return' ? t.sla_hours : null,
            inventory_name: t.assigned_device_name || 'Hardware Device',
            inventory_category: t.category || 'Hardware'
        };

        return res.json(fallbackLc);
    } catch (err) {
        console.error('Get lifecycle for ticket error:', err);
        res.status(500).json({ error: err.message || 'Failed to fetch lifecycle details' });
    }
});

// Admin & Manager: Device Assignment & Return Tracking
app.get('/api/admin/device-tracking', authenticateToken, requireRole(['admin', 'manager']), async (req, res) => {
    try {
        const result = await pool.query(`
            SELECT 
                t.id as ticket_id,
                t.title as ticket_title,
                t.type as ticket_type,
                t.requester_name,
                t.requester_email,
                t.assigned_device_name,
                t.assigned_at,
                t.expected_return_date,
                t.status as ticket_status,
                t.parent_ticket_id,
                t.original_allocation_id,
                i.name as inventory_name,
                i.category as inventory_category,
                i.status as inventory_status
            FROM tickets t
            LEFT JOIN inventory i ON t.inventory_id = i.id
            WHERE t.assigned_device_name IS NOT NULL
              AND t.assigned_device_name != ''
              AND t.status IN ('approved', 'return_pending_verification', 'closed')
            ORDER BY COALESCE(t.assigned_at, t.updated_at, t.created_at) DESC
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

// Admin Only: AI Copilot Dashboard Diagnostics
app.get('/api/ai/analyze-tickets', authenticateToken, requireRole(['admin']), async (req, res) => {
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
