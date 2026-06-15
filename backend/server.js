require('dotenv').config();

const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const { v4: uuidv4 } = require('uuid');
const { Pool } = require('pg');

const app = express();

app.use(cors());
app.use(bodyParser.json());

const PORT = process.env.PORT || 5000;

const pool = new Pool({
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME
});

async function initializeDB() {

    await pool.query(`
        CREATE TABLE IF NOT EXISTS users(
            id VARCHAR(50) PRIMARY KEY,
            name VARCHAR(100),
            email VARCHAR(100) UNIQUE,
            role VARCHAR(50),
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    `);

    await pool.query(`
        CREATE TABLE IF NOT EXISTS tickets(
            id UUID PRIMARY KEY,
            title TEXT NOT NULL,
            description TEXT NOT NULL,
            type VARCHAR(50),
            category VARCHAR(50),
            priority VARCHAR(20) DEFAULT 'medium',
            status VARCHAR(20) DEFAULT 'pending',
            requester_id VARCHAR(50),
            requester_name VARCHAR(100),
            requester_email VARCHAR(100),
            approver_id VARCHAR(50),
            approver_name VARCHAR(100),
            approval_date TIMESTAMP,
            approval_comment TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    `);

    await pool.query(`
    INSERT INTO users(id,name,email,role)
    VALUES
    ('user1','John Doe','john@company.com','employee'),
    ('user2','Jane Smith','jane@company.com','manager'),
    ('user3','Bob Wilson','bob@company.com','employee'),
    ('mgr1','Manager One','manager@company.com','manager')
    ON CONFLICT (id) DO NOTHING
    `);

    console.log("Database initialized");
}

initializeDB();

app.get('/health', (req, res) => {
    res.json({
        status: "ok"
    });
});

app.get('/api/users', async (req, res) => {
    try {
        const result = await pool.query(
            'SELECT id,name,email,role FROM users'
        );

        res.json(result.rows);

    } catch (err) {

        res.status(500).json({
            error: err.message
        });
    }
});

app.get('/api/me', async (req, res) => {

    const userId = req.query.userId || 'user1';

    try {

        const result = await pool.query(
            'SELECT * FROM users WHERE id=$1',
            [userId]
        );

        if (result.rows.length === 0)
            return res.status(404).json({
                error: 'User not found'
            });

        res.json(result.rows[0]);

    } catch (err) {

        res.status(500).json({
            error: err.message
        });
    }
});

app.get('/api/tickets', async (req, res) => {

    try {

        const result = await pool.query(
            'SELECT * FROM tickets ORDER BY created_at DESC'
        );

        res.json(result.rows);

    } catch (err) {

        res.status(500).json({
            error: err.message
        });
    }
});

app.post('/api/tickets', async (req, res) => {

    try {

        const {
            title,
            description,
            type,
            category,
            priority,
            requester_id,
            requester_name,
            requester_email
        } = req.body;

        const id = uuidv4();

        await pool.query(`
        INSERT INTO tickets(
        id,title,description,type,category,
        priority,status,
        requester_id,requester_name,requester_email
        )
        VALUES($1,$2,$3,$4,$5,$6,'pending',$7,$8,$9)
        `, [
            id,
            title,
            description,
            type,
            category,
            priority || 'medium',
            requester_id,
            requester_name,
            requester_email
        ]);

        res.status(201).json({
            message: "Ticket created",
            id
        });

    } catch (err) {

        res.status(500).json({
            error: err.message
        });
    }
});

app.put('/api/tickets/:id/approve', async (req, res) => {

    const { id } = req.params;
    const { approver_id, approver_name, approval_comment } = req.body;

    try {

        await pool.query(`
        UPDATE tickets
        SET
        status='approved',
        approver_id=$1,
        approver_name=$2,
        approval_comment=$3,
        approval_date=CURRENT_TIMESTAMP,
        updated_at=CURRENT_TIMESTAMP
        WHERE id=$4
        `,
            [
                approver_id,
                approver_name,
                approval_comment,
                id
            ]
        );

        res.json({
            message: "Ticket approved"
        });

    } catch (err) {

        res.status(500).json({
            error: err.message
        });
    }
});

app.listen(PORT, '0.0.0.0', () => {

    console.log(`Server running on ${PORT}`);

});
