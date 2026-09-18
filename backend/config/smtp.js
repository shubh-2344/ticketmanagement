require('dotenv').config();
const nodemailer = require('nodemailer');

/**
 * DEDICATED SMTP CONFIGURATION MODULE
 * Optimized for Microsoft Office 365 / Exchange Online.
 * Enforces TLS 1.2, authMethod: LOGIN, connection pooling, and credential handling.
 */
const rawHost = (process.env.SMTP_HOST || 'smtp.office365.com').trim();
const rawPort = parseInt(process.env.SMTP_PORT || '587', 10);
const rawUser = (process.env.SMTP_USER || '').trim();
const rawPass = (process.env.SMTP_PASS || '').trim();
const rawFromName = (process.env.SMTP_FROM_NAME || 'DevSecOps Ticket System').replace(/^["']|["']$/g, '').trim();
const rawFromEmail = (process.env.SMTP_FROM_EMAIL || rawUser || 'helpdesk@securelayer7.net').replace(/^["']|["']$/g, '').trim();

// Try URL decoding if password contains percent-encoded characters like %54 -> 'T'
let decodedPass = rawPass;
try {
    decodedPass = decodeURIComponent(rawPass);
} catch (e) {
    decodedPass = rawPass;
}

const isOffice365 = rawHost.toLowerCase().includes('office365') || rawHost.toLowerCase().includes('outlook');

function buildSmtpConfig(host, pass) {
    return {
        host: host,
        port: rawPort,
        secure: process.env.SMTP_SECURE === 'true', // false for port 587 (STARTTLS)
        auth: {
            user: rawUser,
            pass: pass
        },
        authMethod: 'LOGIN',
        requireTLS: isOffice365 || rawPort === 587,
        tls: {
            minVersion: 'TLSv1.2',
            rejectUnauthorized: false
        },
        pool: true,
        maxConnections: 3,
        maxMessages: 100,
        rateDelta: 1000,
        rateLimit: 5
    };
}

let activeTransporter = nodemailer.createTransport(buildSmtpConfig(rawHost, rawPass));
let fallbackTransporter = decodedPass !== rawPass
    ? nodemailer.createTransport(buildSmtpConfig(rawHost, decodedPass))
    : nodemailer.createTransport(buildSmtpConfig('smtp-mail.outlook.com', rawPass));

/**
 * Sends email with automatic fallback retry on 535 auth errors
 */
async function sendMail(mailOptions) {
    try {
        return await activeTransporter.sendMail(mailOptions);
    } catch (err) {
        if (err && err.message && err.message.includes('535') && fallbackTransporter) {
            console.warn('[SMTP] Primary authentication failed (535); retrying with alternate credentials...');
            const info = await fallbackTransporter.sendMail(mailOptions);
            activeTransporter = fallbackTransporter; // cache working transporter
            return info;
        }
        throw err;
    }
}

const defaultSender = {
    name: rawFromName,
    email: rawFromEmail
};

async function verifySmtpConnection() {
    if (!rawHost || !rawUser) {
        return { success: false, reason: 'SMTP credentials missing in .env' };
    }
    try {
        await activeTransporter.verify();
        console.log(`[SMTP STATUS] Successfully connected to ${rawHost}:${rawPort} (${rawUser})`);
        return { success: true };
    } catch (err) {
        if (err && err.message && err.message.includes('535') && fallbackTransporter) {
            try {
                await fallbackTransporter.verify();
                activeTransporter = fallbackTransporter;
                console.log(`[SMTP STATUS] Successfully connected using alternate credentials.`);
                return { success: true };
            } catch (fallbackErr) {
                console.error(`[SMTP STATUS ERROR]:`, fallbackErr.message);
                return { success: false, error: fallbackErr.message };
            }
        }
        console.error(`[SMTP STATUS ERROR]:`, err.message);
        return { success: false, error: err.message };
    }
}

module.exports = {
    transporter: {
        sendMail: (options) => sendMail(options),
        verify: () => verifySmtpConnection()
    },
    defaultSender,
    verifySmtpConnection
};


