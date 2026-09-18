require('dotenv').config();
const nodemailer = require('nodemailer');

/**
 * SMTP CONFIGURATION — Microsoft Office 365 / Exchange Online
 * Uses TLS 1.2 + authMethod LOGIN as required by smtp.office365.com:587
 */
const SMTP_HOST     = (process.env.SMTP_HOST     || 'smtp.office365.com').trim();
const SMTP_PORT     = parseInt(process.env.SMTP_PORT || '587', 10);
const SMTP_USER     = (process.env.SMTP_USER     || '').trim();
const SMTP_PASS     = (process.env.SMTP_PASS     || '').trim();
const FROM_NAME     = (process.env.SMTP_FROM_NAME  || 'DevSecOps Ticket System').replace(/^["']|["']$/g, '').trim();
const FROM_EMAIL    = (process.env.SMTP_FROM_EMAIL || SMTP_USER).replace(/^["']|["']$/g, '').trim();

const transporter = nodemailer.createTransport({
    host: SMTP_HOST,
    port: SMTP_PORT,
    secure: false,          // false → STARTTLS on port 587
    requireTLS: true,       // enforce STARTTLS
    auth: {
        user: SMTP_USER,
        pass: SMTP_PASS
    },
    authMethod: 'LOGIN',    // required for Exchange Online / Office 365
    tls: {
        minVersion: 'TLSv1.2',
        rejectUnauthorized: false
    }
});

const defaultSender = { name: FROM_NAME, email: FROM_EMAIL };

async function verifySmtpConnection() {
    if (!SMTP_HOST || !SMTP_USER || !SMTP_PASS) {
        console.warn('[SMTP] Credentials not fully configured in .env — skipping verification.');
        return { success: false, reason: 'SMTP credentials missing' };
    }
    try {
        await transporter.verify();
        console.log(`[SMTP OK] Connected to ${SMTP_HOST}:${SMTP_PORT} as ${SMTP_USER}`);
        return { success: true };
    } catch (err) {
        console.error(`[SMTP ERROR] ${SMTP_HOST}:${SMTP_PORT} — ${err.message}`);
        if (err.message.includes('535')) {
            console.error('[SMTP HINT] 535 = authentication rejected by server.');
            console.error('  → Ensure "Authenticated SMTP" is enabled for this mailbox in M365 Admin Center.');
            console.error('  → Users > Active Users > <mailbox> > Mail tab > Manage email apps > Authenticated SMTP ✔');
        }
        return { success: false, error: err.message };
    }
}

module.exports = { transporter, defaultSender, verifySmtpConnection };



