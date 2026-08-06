/**
 * REUSABLE HTML EMAIL TEMPLATES FOR TICKET MANAGEMENT SYSTEM
 * Provides responsive, clean HTML templates for OTP verification and ticket notifications.
 */

const baseStyle = `
  font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
  background-color: #0f172a;
  color: #f8fafc;
  margin: 0;
  padding: 24px;
`;

const cardStyle = `
  max-width: 600px;
  margin: 0 auto;
  background: #1e293b;
  border: 1px solid #334155;
  border-radius: 12px;
  padding: 32px;
  box-shadow: 0 10px 25px rgba(0, 0, 0, 0.4);
`;

const headerStyle = `
  text-align: center;
  border-bottom: 1px solid #334155;
  padding-bottom: 20px;
  margin-bottom: 24px;
`;

const footerStyle = `
  margin-top: 32px;
  padding-top: 20px;
  border-top: 1px solid #334155;
  font-size: 12px;
  color: #94a3b8;
  text-align: center;
`;

/**
 * 1. OTP Email Verification Template
 */
function otpTemplate({ name, otp }) {
    return `
    <div style="${baseStyle}">
      <div style="${cardStyle}">
        <div style="${headerStyle}">
          <h2 style="color: #38bdf8; margin: 0; font-size: 22px;">🔑 Verify Your Email Address</h2>
          <p style="color: #94a3b8; font-size: 13px; margin-top: 4px;">DevSecOps Ticket Management Portal</p>
        </div>
        <p style="font-size: 15px; color: #e2e8f0;">Hello <strong>${name}</strong>,</p>
        <p style="font-size: 14px; color: #cbd5e1; line-height: 1.6;">
          Thank you for signing up! Please use the following 6-digit One-Time Password (OTP) to complete your email verification and activate your account.
        </p>

        <div style="text-align: center; margin: 30px 0;">
          <div style="display: inline-block; background: linear-gradient(135deg, #0284c7, #6366f1); color: #ffffff; font-size: 36px; font-weight: 800; letter-spacing: 8px; padding: 16px 36px; border-radius: 10px; box-shadow: 0 4px 15px rgba(56, 189, 248, 0.3);">
            ${otp}
          </div>
        </div>

        <p style="font-size: 13px; color: #f59e0b; background: rgba(245, 158, 11, 0.1); border-left: 3px solid #f59e0b; padding: 10px 14px; border-radius: 4px;">
          ⏱️ This OTP code is valid for <strong>15 minutes</strong>. If you did not request this account, please ignore this email.
        </p>

        <div style="${footerStyle}">
          DevSecOps Ticket System • Secure Automated Notification
        </div>
      </div>
    </div>
  `;
}

/**
 * 2. Ticket Created Notification (Sent to Manager)
 */
function ticketCreatedTemplate({ managerName, ticket }) {
    return `
    <div style="${baseStyle}">
      <div style="${cardStyle}">
        <div style="${headerStyle}">
          <h2 style="color: #38bdf8; margin: 0;">🎫 New Ticket Awaiting Approval</h2>
          <p style="color: #94a3b8; font-size: 13px; margin-top: 4px;">Action Required by Manager</p>
        </div>
        <p style="font-size: 15px; color: #e2e8f0;">Hello <strong>${managerName || 'Manager'}</strong>,</p>
        <p style="font-size: 14px; color: #cbd5e1;">A new ticket has been submitted and is assigned to your team queue for review:</p>

        <table style="width: 100%; border-collapse: collapse; margin: 20px 0; background: #0f172a; border-radius: 8px; overflow: hidden; font-size: 13px;">
          <tr>
            <td style="padding: 10px 14px; color: #94a3b8; width: 30%;">Title:</td>
            <td style="padding: 10px 14px; color: #f8fafc; font-weight: 600;">${ticket.title}</td>
          </tr>
          <tr>
            <td style="padding: 10px 14px; color: #94a3b8;">Requester:</td>
            <td style="padding: 10px 14px; color: #f8fafc;">${ticket.requester_name} (${ticket.requester_email})</td>
          </tr>
          <tr>
            <td style="padding: 10px 14px; color: #94a3b8;">Category / Type:</td>
            <td style="padding: 10px 14px; color: #f8fafc;">${ticket.category || 'General'} / ${ticket.type || 'Request'}</td>
          </tr>
          <tr>
            <td style="padding: 10px 14px; color: #94a3b8;">Priority:</td>
            <td style="padding: 10px 14px; color: #38bdf8; font-weight: 700; text-transform: uppercase;">${ticket.priority}</td>
          </tr>
          <tr>
            <td style="padding: 10px 14px; color: #94a3b8;">Description:</td>
            <td style="padding: 10px 14px; color: #cbd5e1;">${ticket.description}</td>
          </tr>
        </table>

        <p style="font-size: 13px; color: #94a3b8;">Please log in to the Ticket Management Portal to approve or reject this request.</p>

        <div style="${footerStyle}">
          DevSecOps Ticket System Notification Service
        </div>
      </div>
    </div>
  `;
}

/**
 * 3. Ticket Approved Notification (Sent to Admin)
 */
function ticketApprovedTemplate({ adminName, ticket }) {
    return `
    <div style="${baseStyle}">
      <div style="${cardStyle}">
        <div style="${headerStyle}">
          <h2 style="color: #10b981; margin: 0;">✅ Ticket Approved by Manager</h2>
          <p style="color: #94a3b8; font-size: 13px; margin-top: 4px;">Pending Administrator Assignment</p>
        </div>
        <p style="font-size: 15px; color: #e2e8f0;">Hello <strong>${adminName || 'Administrator'}</strong>,</p>
        <p style="font-size: 14px; color: #cbd5e1;">The following ticket was approved by manager <strong>${ticket.approver_name || ticket.manager_name}</strong> and is ready for device fulfillment/assignment:</p>

        <table style="width: 100%; border-collapse: collapse; margin: 20px 0; background: #0f172a; border-radius: 8px; overflow: hidden; font-size: 13px;">
          <tr>
            <td style="padding: 10px 14px; color: #94a3b8; width: 30%;">Title:</td>
            <td style="padding: 10px 14px; color: #f8fafc; font-weight: 600;">${ticket.title}</td>
          </tr>
          <tr>
            <td style="padding: 10px 14px; color: #94a3b8;">Requester:</td>
            <td style="padding: 10px 14px; color: #f8fafc;">${ticket.requester_name} (${ticket.requester_email})</td>
          </tr>
          <tr>
            <td style="padding: 10px 14px; color: #94a3b8;">Manager Note:</td>
            <td style="padding: 10px 14px; color: #cbd5e1;">${ticket.approval_comment || 'Approved without additional notes'}</td>
          </tr>
        </table>

        <div style="${footerStyle}">
          DevSecOps Ticket System Notification Service
        </div>
      </div>
    </div>
  `;
}

/**
 * 4. Ticket Assigned Notification (Sent to Engineer / Specialist)
 */
function ticketAssignedTemplate({ engineerName, ticket }) {
    return `
    <div style="${baseStyle}">
      <div style="${cardStyle}">
        <div style="${headerStyle}">
          <h2 style="color: #c084fc; margin: 0;">🚀 Device Assigned / Ticket Scheduled</h2>
          <p style="color: #94a3b8; font-size: 13px; margin-top: 4px;">Fulfillment Notification</p>
        </div>
        <p style="font-size: 15px; color: #e2e8f0;">Hello <strong>${engineerName || ticket.requester_name}</strong>,</p>
        <p style="font-size: 14px; color: #cbd5e1;">A device/resource has been assigned to ticket <strong>"${ticket.title}"</strong>:</p>

        <table style="width: 100%; border-collapse: collapse; margin: 20px 0; background: #0f172a; border-radius: 8px; overflow: hidden; font-size: 13px;">
          <tr>
            <td style="padding: 10px 14px; color: #94a3b8; width: 35%;">Assigned Asset:</td>
            <td style="padding: 10px 14px; color: #38bdf8; font-weight: 700;">${ticket.assigned_device_name}</td>
          </tr>
          <tr>
            <td style="padding: 10px 14px; color: #94a3b8;">Assignment Details:</td>
            <td style="padding: 10px 14px; color: #cbd5e1;">${ticket.assignment_description || 'Standard deployment'}</td>
          </tr>
          <tr>
            <td style="padding: 10px 14px; color: #94a3b8;">Status:</td>
            <td style="padding: 10px 14px; color: #10b981; font-weight: 700;">${ticket.status.toUpperCase()}</td>
          </tr>
        </table>

        <div style="${footerStyle}">
          DevSecOps Ticket System Notification Service
        </div>
      </div>
    </div>
  `;
}

/**
 * 5. Ticket Resolved Notification (Sent to User)
 */
function ticketResolvedTemplate({ userName, ticket }) {
    return `
    <div style="${baseStyle}">
      <div style="${cardStyle}">
        <div style="${headerStyle}">
          <h2 style="color: #10b981; margin: 0;">✨ Ticket Resolved</h2>
          <p style="color: #94a3b8; font-size: 13px; margin-top: 4px;">Issue Resolution Update</p>
        </div>
        <p style="font-size: 15px; color: #e2e8f0;">Hello <strong>${userName || 'User'}</strong>,</p>
        <p style="font-size: 14px; color: #cbd5e1;">Your ticket <strong>"${ticket.title}"</strong> has been successfully processed and resolved by our IT operations team.</p>

        <div style="${footerStyle}">
          DevSecOps Ticket System Notification Service
        </div>
      </div>
    </div>
  `;
}

/**
 * 6. Ticket Closed Confirmation (Sent to User)
 */
function ticketClosedTemplate({ userName, ticket }) {
    return `
    <div style="${baseStyle}">
      <div style="${cardStyle}">
        <div style="${headerStyle}">
          <h2 style="color: #94a3b8; margin: 0;">🔒 Ticket Closed</h2>
          <p style="color: #94a3b8; font-size: 13px; margin-top: 4px;">Case Confirmation</p>
        </div>
        <p style="font-size: 15px; color: #e2e8f0;">Hello <strong>${userName || 'User'}</strong>,</p>
        <p style="font-size: 14px; color: #cbd5e1;">Your ticket <strong>"${ticket.title}"</strong> has been closed.</p>
        <p style="font-size: 13px; color: #94a3b8;">If you experience further issues or require additional assistance, please open a new ticket from your dashboard portal.</p>

        <div style="${footerStyle}">
          DevSecOps Ticket System Notification Service
        </div>
      </div>
    </div>
  `;
}

module.exports = {
    otpTemplate,
    ticketCreatedTemplate,
    ticketApprovedTemplate,
    ticketAssignedTemplate,
    ticketResolvedTemplate,
    ticketClosedTemplate
};
