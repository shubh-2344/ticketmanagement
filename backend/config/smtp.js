require('dotenv').config();
const nodemailer = require('nodemailer');

/**
 * DEDICATED SMTP CONFIGURATION MODULE
 * Reads all SMTP settings exclusively from environment variables (.env file).
 * Do not hardcode any credentials or server hosts in this file.
 */
const smtpConfig = {
    host: process.env.SMTP_HOST || '',
    port: parseInt(process.env.SMTP_PORT || '587', 10),
    secure: process.env.SMTP_SECURE === 'true', // true for port 465, false for 587 / 25
    auth: {
        user: process.env.SMTP_USER || '',
        pass: process.env.SMTP_PASS || ''
    },
    tls: {
        rejectUnauthorized: process.env.SMTP_TLS_REJECT_UNAUTHORIZED !== 'false'
    }
};

const defaultSender = {
    name: process.env.SMTP_FROM_NAME || 'DevSecOps Ticket System',
    email: process.env.SMTP_FROM_EMAIL || process.env.SMTP_USER || 'noreply@ticketmanagement.com'
};

// Create reusable Nodemailer Transporter instance
const transporter = nodemailer.createTransport(smtpConfig);

module.exports = {
    transporter,
    defaultSender,
    smtpConfig
};
