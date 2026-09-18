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
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Email Verification Code</title>
    </head>
    <body style="margin: 0; padding: 0; background-color: #0b1120; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #f8fafc;">
      <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: #0b1120; padding: 30px 15px;">
        <tr>
          <td align="center">
            <!-- Main Card -->
            <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0" style="max-width: 580px; background-color: #1e293b; border: 1px solid #334155; border-radius: 14px; overflow: hidden; box-shadow: 0 10px 30px rgba(0,0,0,0.5);">
              
              <!-- Brand Header Bar -->
              <tr>
                <td style="background: linear-gradient(135deg, #0284c7, #6366f1); background-color: #0284c7; padding: 4px 0;"></td>
              </tr>

              <!-- Header Content -->
              <tr>
                <td style="padding: 32px 32px 20px 32px; text-align: center; border-bottom: 1px solid #334155;">
                  <table role="presentation" border="0" cellspacing="0" cellpadding="0" style="margin: 0 auto;">
                    <tr>
                      <td style="background: rgba(56, 189, 248, 0.15); border: 1px solid rgba(56, 189, 248, 0.3); border-radius: 8px; padding: 8px 14px; color: #38bdf8; font-weight: 700; font-size: 13px; letter-spacing: 1px;">
                        TICKET &amp; ASSET MANAGEMENT PORTAL
                      </td>
                    </tr>
                  </table>
                  <h1 style="color: #ffffff; margin: 16px 0 6px 0; font-size: 24px; font-weight: 800; letter-spacing: -0.5px;">
                    Verify Your Email Address
                  </h1>
                  <p style="color: #94a3b8; font-size: 14px; margin: 0;">
                    Complete your registration to access your workspace
                  </p>
                </td>
              </tr>

              <!-- Body Content -->
              <tr>
                <td style="padding: 28px 32px;">
                  <p style="font-size: 16px; color: #e2e8f0; margin: 0 0 14px 0;">
                    Hello <strong style="color: #38bdf8;">${name || 'User'}</strong>,
                  </p>
                  <p style="font-size: 14px; color: #cbd5e1; line-height: 1.6; margin: 0 0 24px 0;">
                    Thank you for signing up with DevSecOps Ticket Management System. Please use the following 6-digit verification code to confirm your email and activate your account:
                  </p>

                  <!-- OTP Display Box -->
                  <table role="presentation" border="0" cellspacing="0" cellpadding="0" style="width: 100%; margin: 26px 0;">
                    <tr>
                      <td align="center">
                        <table role="presentation" border="0" cellspacing="0" cellpadding="0">
                          <tr>
                            <td style="background: linear-gradient(135deg, #0284c7, #4f46e5); background-color: #0284c7; padding: 16px 40px; border-radius: 12px; box-shadow: 0 6px 20px rgba(2, 132, 199, 0.4); text-align: center;">
                              <span style="font-family: 'Courier New', Courier, monospace; font-size: 38px; font-weight: 900; letter-spacing: 10px; color: #ffffff; display: block; text-shadow: 0 2px 4px rgba(0,0,0,0.3);">
                                ${otp}
                              </span>
                            </td>
                          </tr>
                        </table>
                      </td>
                    </tr>
                  </table>

                  <!-- Expiration & Security Notice -->
                  <table role="presentation" border="0" cellspacing="0" cellpadding="0" style="width: 100%; background: rgba(245, 158, 11, 0.08); border-left: 4px solid #f59e0b; border-radius: 6px; margin: 20px 0;">
                    <tr>
                      <td style="padding: 12px 16px;">
                        <p style="margin: 0; font-size: 13px; color: #f59e0b; font-weight: 600;">
                          ⏰ Code expires in 15 minutes
                        </p>
                        <p style="margin: 4px 0 0 0; font-size: 12px; color: #cbd5e1; line-height: 1.4;">
                          If you did not initiate this registration request, please disregard this message. Your email address remains secure.
                        </p>
                      </td>
                    </tr>
                  </table>

                  <p style="font-size: 13px; color: #94a3b8; line-height: 1.5; margin: 20px 0 0 0;">
                    Once verified, you will be able to submit device requests, track issue tickets, and collaborate with your team.
                  </p>
                </td>
              </tr>

              <!-- Footer -->
              <tr>
                <td style="padding: 20px 32px; background-color: #0f172a; border-top: 1px solid #334155; text-align: center;">
                  <p style="font-size: 12px; color: #64748b; margin: 0 0 4px 0;">
                    DevSecOps Ticket &amp; Asset Management Portal &bull; Automated Security Notification
                  </p>
                  <p style="font-size: 11px; color: #475569; margin: 0;">
                    This is an automated system email. Please do not reply directly to this message.
                  </p>
                </td>
              </tr>

            </table>
          </td>
        </tr>
      </table>
    </body>
    </html>
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
          <h2 style="color: #c084fc; margin: 0;">Device Assigned / Ticket Scheduled</h2>
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
          <h2 style="color: #10b981; margin: 0;">Ticket Resolved</h2>
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
          <h2 style="color: #94a3b8; margin: 0;">Ticket Closed</h2>
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

/**
 * 7. SLA Warning Alert Template (Sent when ticket is expiring soon or breached)
 */
function slaWarningTemplate({ recipientName, ticket, isBreached, timeRemainingStr }) {
    const isBreach = !!isBreached;
    const accentColor = isBreach ? '#ef4444' : '#f59e0b';
    const headerTitle = isBreach ? 'CRITICAL SLA BREACH ALERT' : 'URGENT SLA EXPIRING WARNING';
    const subTitle = isBreach ? 'Resolution SLA Breached' : 'Resolution Target Expiring Soon';

    return `
    <div style="${baseStyle}">
      <div style="${cardStyle}">
        <div style="${headerStyle}">
          <h2 style="color: ${accentColor}; margin: 0; font-size: 20px; font-weight: 800;">${headerTitle}</h2>
          <p style="color: #94a3b8; font-size: 13px; margin-top: 4px;">${subTitle}</p>
        </div>
        <p style="font-size: 15px; color: #e2e8f0;">Hello <strong>${recipientName || 'Team Member'}</strong>,</p>
        <p style="font-size: 14px; color: #cbd5e1;">
          ${isBreach 
            ? `Ticket <strong>"${ticket.title}"</strong> has <span style="color: #ef4444; font-weight: 800;">BREACHED its target resolution SLA</span>.` 
            : `Ticket <strong>"${ticket.title}"</strong> is <span style="color: #f59e0b; font-weight: 800;">ABOUT TO EXPIRE</span> (${timeRemainingStr}).`
          }
        </p>

        <div style="background: rgba(15, 23, 42, 0.6); border-left: 4px solid ${accentColor}; padding: 16px; border-radius: 6px; margin: 20px 0;">
          <table style="width: 100%; border-collapse: collapse; font-size: 13px; color: #cbd5e1;">
            <tr><td style="padding: 4px 0; color: #94a3b8;">Ticket Title:</td><td style="font-weight: 700; color: #f8fafc;">${ticket.title}</td></tr>
            <tr><td style="padding: 4px 0; color: #94a3b8;">Priority:</td><td style="font-weight: 700; color: ${accentColor};">${(ticket.priority || 'MEDIUM').toUpperCase()}</td></tr>
            <tr><td style="padding: 4px 0; color: #94a3b8;">Status / SLA:</td><td style="font-weight: 700; color: #f8fafc;">${isBreach ? 'BREACHED' : 'AT RISK'} (${timeRemainingStr})</td></tr>
            <tr><td style="padding: 4px 0; color: #94a3b8;">Assigned Engineer:</td><td style="color: #f8fafc;">${ticket.assigned_engineer || 'IT Operations Specialist'}</td></tr>
          </table>
        </div>

        <p style="font-size: 13px; color: #94a3b8;">Please log in to the Ticket Management Command Center to take immediate action or escalate this incident.</p>

        <div style="${footerStyle}">
          DevSecOps Ticket System SLA Warning Service
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
    ticketClosedTemplate,
    slaWarningTemplate
};
