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

function formatTicketIdHelper(id, type) {
  if (!id && id !== 0) return 'TKT-000000';
  const strId = String(id).trim();
  if (/^(INC|REQ|TKT)-\d+$/i.test(strId)) return strId.toUpperCase();
  const prefix = (type === 'issue') ? 'INC' : (type === 'device-request' ? 'REQ' : 'TKT');
  if (/^\d+$/.test(strId)) return `${prefix}-${strId.padStart(6, '0')}`;
  let num = 0;
  for (let i = 0; i < strId.length; i++) {
    num = (num * 31 + strId.charCodeAt(i)) % 999999;
  }
  const cleanNum = (Math.abs(num) % 999999) + 1;
  return `${prefix}-${String(cleanNum).padStart(6, '0')}`;
}

/**
 * 2. Ticket Created Notification (Sent to Manager)
 */
function ticketCreatedTemplate({ managerName, ticket }) {
    const formattedId = formatTicketIdHelper(ticket.id, ticket.type);
    return `
    <div style="${baseStyle}">
      <div style="${cardStyle}">
        <div style="${headerStyle}">
          <h2 style="color: #38bdf8; margin: 0;">New Ticket Awaiting Approval</h2>
          <p style="color: #94a3b8; font-size: 13px; margin-top: 4px;">Action Required by Manager</p>
        </div>
        <p style="font-size: 15px; color: #e2e8f0;">Hello <strong>${managerName || 'Manager'}</strong>,</p>
        <p style="font-size: 14px; color: #cbd5e1;">A new ticket has been submitted and is assigned to your team queue for review:</p>

        <table style="width: 100%; border-collapse: collapse; margin: 20px 0; background: #0f172a; border-radius: 8px; overflow: hidden; font-size: 13px;">
          <tr>
            <td style="padding: 10px 14px; color: #94a3b8; width: 30%;">Ticket ID:</td>
            <td style="padding: 10px 14px; color: #38bdf8; font-weight: 700; font-family: monospace;">${formattedId}</td>
          </tr>
          <tr>
            <td style="padding: 10px 14px; color: #94a3b8;">Title:</td>
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
    const formattedId = formatTicketIdHelper(ticket.id, ticket.type);
    const approvalComment = (ticket.approval_comment && ticket.approval_comment.trim())
        ? ticket.approval_comment.trim()
        : 'No comments provided.';
    const approvalDateStr = ticket.approval_date 
        ? new Date(ticket.approval_date).toLocaleString('en-US', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
        : new Date().toLocaleString('en-US', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });

    return `
    <div style="font-family: Arial, Helvetica, sans-serif; background-color: #f4f6f9; color: #1e293b; margin: 0; padding: 30px 15px;">
      <div style="max-width: 650px; margin: 0 auto; background: #ffffff; border: 1px solid #e2e8f0; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.05);">
        
        <!-- Header -->
        <div style="background-color: #0f172a; padding: 24px 32px; border-bottom: 3px solid #2563eb;">
          <h1 style="color: #ffffff; margin: 0; font-size: 20px; font-weight: 700; letter-spacing: -0.2px;">Manager Approval Notification</h1>
          <p style="color: #94a3b8; font-size: 13px; margin: 4px 0 0 0;">IT Service Management System</p>
        </div>

        <!-- Content Body -->
        <div style="padding: 32px;">
          <p style="font-size: 15px; color: #334155; margin-top: 0;">Dear ${adminName || 'Administrator'},</p>
          <p style="font-size: 14px; color: #475569; line-height: 1.5;">
            The following ticket has been approved by the manager and is pending administrator action/fulfillment.
          </p>

          <!-- Ticket Summary Table -->
          <table style="width: 100%; border-collapse: collapse; margin: 24px 0; border: 1px solid #e2e8f0; font-size: 13px;">
            <tbody>
              <tr style="background-color: #f8fafc; border-bottom: 1px solid #e2e8f0;">
                <td style="padding: 10px 14px; font-weight: 700; color: #475569; width: 32%;">Ticket ID:</td>
                <td style="padding: 10px 14px; color: #0f172a; font-family: monospace; font-weight: 700;">${formattedId}</td>
              </tr>
              <tr style="border-bottom: 1px solid #e2e8f0;">
                <td style="padding: 10px 14px; font-weight: 700; color: #475569;">Title:</td>
                <td style="padding: 10px 14px; color: #0f172a; font-weight: 600;">${ticket.title}</td>
              </tr>
              <tr style="background-color: #f8fafc; border-bottom: 1px solid #e2e8f0;">
                <td style="padding: 10px 14px; font-weight: 700; color: #475569;">Requester:</td>
                <td style="padding: 10px 14px; color: #0f172a;">${ticket.requester_name} &lt;${ticket.requester_email || 'N/A'}&gt;</td>
              </tr>
              <tr>
                <td style="padding: 10px 14px; font-weight: 700; color: #475569;">Manager:</td>
                <td style="padding: 10px 14px; color: #0f172a;">${ticket.approver_name || ticket.manager_name || 'Assigned Manager'}</td>
              </tr>
            </tbody>
          </table>

          <p style="font-size: 13px; color: #64748b; line-height: 1.5;">
            Please access the IT Management Portal to complete hardware allocation or resolution tasks associated with this ticket.
          </p>
        </div>

        <!-- Footer -->
        <div style="background-color: #f8fafc; border-top: 1px solid #e2e8f0; padding: 16px 32px; font-size: 12px; color: #64748b; text-align: center;">
          This is an automated notification from the Enterprise Ticket Management System.
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
