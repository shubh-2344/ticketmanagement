import React from 'react';
import './TicketList.css';

function TicketList({ tickets, currentUser, onViewTicket, viewMode = 'grid' }) {
  const getStatusBadge = (status, type) => {
    switch (status) {
      case 'pending_manager_approval':
        return { text: '🟡 Manager Review', bg: 'rgba(245, 158, 11, 0.2)', border: '1px solid rgba(245, 158, 11, 0.4)', color: '#fbbf24' };
      case 'pending_admin_assignment':
        return { text: type === 'issue' ? '🟣 Pending Admin Action' : '🟣 Admin Device Assignment', bg: 'rgba(139, 92, 246, 0.2)', border: '1px solid rgba(139, 92, 246, 0.4)', color: '#c084fc' };
      case 'approved':
        return { text: type === 'issue' ? '🟢 Resolved' : '🟢 Device Assigned', bg: 'rgba(34, 197, 94, 0.2)', border: '1px solid rgba(34, 197, 94, 0.4)', color: '#4ade80' };
      case 'rejected':
        return { text: '🔴 Denied by Manager', bg: 'rgba(239, 68, 68, 0.2)', border: '1px solid rgba(239, 68, 68, 0.4)', color: '#fca5a5' };
      case 'closed':
        return { text: '⚪ Closed', bg: 'rgba(100, 116, 139, 0.2)', border: '1px solid rgba(100, 116, 139, 0.4)', color: '#cbd5e1' };
      default:
        return { text: status.toUpperCase(), bg: 'rgba(56, 189, 248, 0.2)', border: '1px solid rgba(56, 189, 248, 0.4)', color: '#38bdf8' };
    }
  };

  const getTypeColor = (type) => {
    return type === 'device-request' ? '#38bdf8' : '#e2e8f0';
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
      <div className="list-title-bar">
        <h2>{currentUser.role === 'employee' ? 'My Submitted Tickets' : 'All System Tickets'}</h2>
        <span className="layout-indicator-tag">Layout: {viewMode.toUpperCase()}</span>
      </div>

      {tickets.length === 0 ? (
        <div className="empty-state">
          <p>No tickets found. Click "Create Ticket" to get started!</p>
        </div>
      ) : viewMode === 'table' ? (
        /* TABLE VIEW LAYOUT */
        <div className="table-responsive-container">
          <table className="tickets-table-view">
            <thead>
              <tr>
                <th>Title & Type</th>
                <th>Requester</th>
                <th>Assigned Manager</th>
                <th>Priority</th>
                <th>Status</th>
                <th>Assigned Device</th>
                <th>Date</th>
              </tr>
            </thead>
            <tbody>
              {tickets.map((t) => {
                const statusInfo = getStatusBadge(t.status, t.type);
                return (
                  <tr key={t.id} onClick={() => onViewTicket(t)} className="clickable-row">
                    <td>
                      <div className="table-title-cell">
                        <strong>{t.title}</strong>
                        <span className="mini-type-tag">{t.type === 'device-request' ? '🖥️ Device' : '🔧 Issue'}</span>
                      </div>
                    </td>
                    <td>{t.requester_name}</td>
                    <td>{t.type === 'issue' ? 'N/A - Admin' : (t.manager_name || 'Manager')}</td>
                    <td><span className={`priority-text ${t.priority}`}>{t.priority.toUpperCase()}</span></td>
                    <td>
                      <span className="status-pill-table" style={{ color: statusInfo.color }}>
                        {statusInfo.text}
                      </span>
                    </td>
                    <td>{t.assigned_device_name || '-'}</td>
                    <td><small>{formatDate(t.created_at)}</small></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : viewMode === 'compact' ? (
        /* COMPACT LIST VIEW LAYOUT */
        <div className="compact-list-container">
          {tickets.map((ticket) => {
            const statusInfo = getStatusBadge(ticket.status, ticket.type);
            return (
              <div key={ticket.id} className="compact-row" onClick={() => onViewTicket(ticket)}>
                <div className="compact-left">
                  <span className="compact-type">{ticket.type === 'device-request' ? '🖥️' : '🔧'}</span>
                  <div className="compact-title-group">
                    <h4>{ticket.title}</h4>
                    <small>By {ticket.requester_name}{ticket.type !== 'issue' && ` • Manager: ${ticket.manager_name || 'Manager'}`}</small>
                  </div>
                </div>
                <div className="compact-right">
                  <span className="badge status-pill" style={{ background: statusInfo.bg, border: statusInfo.border, color: statusInfo.color }}>
                    {statusInfo.text}
                  </span>
                  <small className="compact-date">{formatDate(ticket.created_at)}</small>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* DEFAULT GRID CARDS VIEW LAYOUT */
        <div className="tickets-grid">
          {tickets.map((ticket) => {
            const statusInfo = getStatusBadge(ticket.status, ticket.type);

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
                      {ticket.type === 'device-request' ? '🖥️ Device' : '🔧 Issue'}
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
                    <span className="label">{ticket.type === 'issue' ? 'Workflow:' : 'Assigned Manager:'}</span>
                    <span className="value">{ticket.type === 'issue' ? 'Direct Admin Approval' : (ticket.manager_name || 'Manager')}</span>
                  </div>
                  <div className="meta-item">
                    <span className="label">Priority:</span>
                    <span className="value uppercase">{ticket.priority}</span>
                  </div>
                </div>

                {ticket.assigned_device_name && (
                  <div className="device-assigned-preview">
                    <span>{ticket.type === 'issue' ? '🔧 Resolution' : '💻 Assigned Device'}: <strong>{ticket.assigned_device_name}</strong></span>
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
