import React from 'react';
import './TicketList.css';

function TicketList({ tickets, currentUser, onViewTicket }) {
  const getStatusBadge = (status) => {
    switch (status) {
      case 'pending_manager_approval':
        return { text: '🟡 Manager Review', bg: 'rgba(245, 158, 11, 0.2)', border: '1px solid rgba(245, 158, 11, 0.4)', color: '#fbbf24' };
      case 'pending_admin_assignment':
        return { text: '🟣 Admin Device Assignment', bg: 'rgba(139, 92, 246, 0.2)', border: '1px solid rgba(139, 92, 246, 0.4)', color: '#c084fc' };
      case 'approved':
        return { text: '🟢 Device Assigned', bg: 'rgba(34, 197, 94, 0.2)', border: '1px solid rgba(34, 197, 94, 0.4)', color: '#4ade80' };
      case 'rejected':
        return { text: '🔴 Denied by Manager', bg: 'rgba(239, 68, 68, 0.2)', border: '1px solid rgba(239, 68, 68, 0.4)', color: '#fca5a5' };
      case 'closed':
        return { text: '⚪ Closed', bg: 'rgba(100, 116, 139, 0.2)', border: '1px solid rgba(100, 116, 139, 0.4)', color: '#cbd5e1' };
      default:
        return { text: status.toUpperCase(), bg: 'rgba(56, 189, 248, 0.2)', border: '1px solid rgba(56, 189, 248, 0.4)', color: '#38bdf8' };
    }
  };

  const getTypeColor = (type) => {
    return type === 'device-request' ? '#38bdf8' : '#ef4444';
  };

  const formatDate = (dateString) => {
    if (!dateString) return '';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="ticket-list">
      <h2>{currentUser.role === 'employee' ? 'My Submitted Tickets' : 'All System Tickets'}</h2>

      {tickets.length === 0 ? (
        <div className="empty-state">
          <p>No tickets found. Click "Create Ticket" to get started!</p>
        </div>
      ) : (
        <div className="tickets-grid">
          {tickets.map((ticket) => {
            const statusInfo = getStatusBadge(ticket.status);

            return (
              <div
                key={ticket.id}
                className="ticket-card"
                onClick={() => onViewTicket(ticket)}
              >
                <div className="ticket-header">
                  <h3>{ticket.title}</h3>
                  <div className="ticket-badges">
                    <span
                      className="badge"
                      style={{ backgroundColor: getTypeColor(ticket.type) }}
                    >
                      {ticket.type === 'device-request' ? '🖥️ Device' : '🐛 Issue'}
                    </span>
                    <span
                      className="badge status-pill"
                      style={{
                        background: statusInfo.bg,
                        border: statusInfo.border,
                        color: statusInfo.color
                      }}
                    >
                      {statusInfo.text}
                    </span>
                  </div>
                </div>

                <p className="ticket-description">{ticket.description}</p>

                <div className="ticket-meta">
                  <div className="meta-item">
                    <span className="label">Assigned Manager:</span>
                    <span className="value">{ticket.manager_name || 'Manager'}</span>
                  </div>
                  <div className="meta-item">
                    <span className="label">Priority:</span>
                    <span className="value uppercase">{ticket.priority}</span>
                  </div>
                </div>

                {ticket.assigned_device_name && (
                  <div className="device-assigned-preview">
                    <span>💻 Assigned Device: <strong>{ticket.assigned_device_name}</strong></span>
                  </div>
                )}

                <div className="ticket-footer">
                  <div className="requester">
                    <small>Requested by: {ticket.requester_name}</small>
                  </div>
                  <div className="date">
                    <small>{formatDate(ticket.created_at)}</small>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default TicketList;
