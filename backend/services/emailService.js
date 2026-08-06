const { transporter, defaultSender } = require('../config/smtp');
const templates = require('./emailTemplates');

/**
 * REUSABLE EMAIL SERVICE
 * Handles all application email notifications using a single centralized Nodemailer transport.
 * All email dispatch functions handle errors gracefully with detailed logging.
 */

async function sendMailHelper({ to, subject, html }) {
    if (!to) {
        console.warn('[EMAIL WARNING] No recipient address provided for subject:', subject);
        return { success: false, error: 'Recipient address missing' };
    }

    // Check if SMTP is configured
    if (!process.env.SMTP_HOST || !process.env.SMTP_USER) {
        console.warn(`[EMAIL NOTICE] SMTP credentials not set in .env. Skipping actual mail delivery for "${subject}" to <${to}>.`);
        return { success: false, error: 'SMTP credentials not configured in .env' };
    }

    try {
        const mailOptions = {
            from: `"${defaultSender.name}" <${defaultSender.email}>`,
            to: Array.isArray(to) ? to.join(', ') : to,
            subject: subject,
            html: html
        };

        const info = await transporter.sendMail(mailOptions);
        console.log(`[EMAIL SUCCESS] Sent "${subject}" to <${to}> | MessageId: ${info.messageId}`);
        return { success: true, messageId: info.messageId };
    } catch (error) {
        console.error(`[EMAIL ERROR] Failed to send "${subject}" to <${to}>:`, error.message);
        return { success: false, error: error.message };
    }
}

/**
 * 1. Send OTP Signup Verification Email
 */
async function sendOtpEmail({ to, name, otp }) {
    const subject = `🔑 Your 6-Digit Email Verification Code: ${otp}`;
    const html = templates.otpTemplate({ name, otp });
    return await sendMailHelper({ to, subject, html });
}

/**
 * 2. Send Ticket Created Notification to Manager
 */
async function sendTicketCreatedEmail({ to, managerName, ticket }) {
    const subject = `🎫 [Action Required] New Ticket Pending Approval: ${ticket.title}`;
    const html = templates.ticketCreatedTemplate({ managerName, ticket });
    return await sendMailHelper({ to, subject, html });
}

/**
 * 3. Send Ticket Approved Notification to Admin
 */
async function sendTicketApprovedEmail({ to, adminName, ticket }) {
    const subject = `✅ Ticket Approved by Manager: ${ticket.title}`;
    const html = templates.ticketApprovedTemplate({ adminName, ticket });
    return await sendMailHelper({ to, subject, html });
}

/**
 * 4. Send Ticket Assigned Notification to Engineer / User
 */
async function sendTicketAssignedEmail({ to, engineerName, ticket }) {
    const subject = `🚀 Device / Resource Assigned for Ticket: ${ticket.title}`;
    const html = templates.ticketAssignedTemplate({ engineerName, ticket });
    return await sendMailHelper({ to, subject, html });
}

/**
 * 5. Send Ticket Resolved Notification to User
 */
async function sendTicketResolvedEmail({ to, userName, ticket }) {
    const subject = `✨ Ticket Escalated / Resolved: ${ticket.title}`;
    const html = templates.ticketResolvedTemplate({ userName, ticket });
    return await sendMailHelper({ to, subject, html });
}

/**
 * 6. Send Ticket Closed Confirmation to User
 */
async function sendTicketClosedEmail({ to, userName, ticket }) {
    const subject = `🔒 Ticket Closed Confirmation: ${ticket.title}`;
    const html = templates.ticketClosedTemplate({ userName, ticket });
    return await sendMailHelper({ to, subject, html });
}

module.exports = {
    sendOtpEmail,
    sendTicketCreatedEmail,
    sendTicketApprovedEmail,
    sendTicketAssignedEmail,
    sendTicketResolvedEmail,
    sendTicketClosedEmail
};
