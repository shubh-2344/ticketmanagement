require('dotenv').config();
const nodemailer = require('nodemailer');

/**
 * DEDICATED SMTP CONFIGURATION MODULE
 * Reads all SMTP settings from environment variables (.env file).
 * Includes optimizations for Office 365 / Exchange Online and STARTTLS.
 */
const rawHost = (process.env.SMTP_HOST || '').trim();
const rawPort = parseInt(process.env.SMTP_PORT || '587', 10);
const rawUser = (process.env.SMTP_USER || '').trim();
const rawPass = (process.env.SMTP_PASS || '').trim();
const rawFromName = (process.env.SMTP_FROM_NAME || 'DevSecOps Ticket System').replace(/^["']|["']$/g, '').trim();
const rawFromEmail = (process.env.SMTP_FROM_EMAIL || rawUser || 'noreply@ticketmanagement.com').replace(/^["']|["']$/g, '').trim();

const isOffice365 = rawHost.toLowerCase().includes('office365') || rawHost.toLowerCase().includes('outlook');

const smtpConfig = {
    host: rawHost,
    port: rawPort,
    secure: process.env.SMTP_SECURE === 'true', // false for 587 (STARTTLS), true for 465
    auth: {
        user: rawUser,
        pass: rawPass
    },
    // Force STARTTLS for port 587 / Office 365
    requireTLS: isOffice365 || rawPort === 587,
    tls: {
        // Office 365 cipher compatibility in modern Node.js
        ciphers: 'SSLv3',
        rejectUnauthorized: process.env.SMTP_TLS_REJECT_UNAUTHORIZED === 'true'
    }
};

const defaultSender = {
    name: rawFromName,
    email: rawFromEmail
};

// Create reusable Nodemailer Transporter instance
const transporter = nodemailer.createTransport(smtpConfig);

/**
 * Test & verify SMTP connection
 */
async function verifySmtpConnection() {
    if (!rawHost || !rawUser) {
        console.log('[SMTP STATUS] SMTP is not configured in .env. Email delivery will run in mock/log mode.');
        return { success: false, reason: 'SMTP credentials missing in .env' };
    }
    try {
        await transporter.verify();
        console.log(`[SMTP STATUS] Successfully connected & verified with SMTP server: ${rawHost}:${rawPort} (${rawUser})`);
        return { success: true };
    } catch (err) {
        console.error(`[SMTP STATUS ERROR] SMTP connection verification failed for ${rawHost}:${rawPort} -`, err.message);
        if (isOffice365) {
            console.error('[SMTP ADVICE for Office 365 / Exchange Online]:');
            console.error('  1. Verify "Authenticated SMTP" is enabled for helpdesk@securelayer7.net in Microsoft 365 Admin Center.');
            console.error('  2. If Security Defaults / MFA is enabled on the tenant, use an App Password or SMTP Relay.');
        }
        return { success: false, error: err.message };
    }
}

module.exports = {
    transporter,
    defaultSender,
    smtpConfig,
    verifySmtpConnection
};

