import React from 'react';
import './TicketList.css';

function TicketList({ tickets, currentUser, onViewTicket }) {
  const getStatusColor = (status) => {
    const colors = {
      pending: '#ffc107',
      approved: '#28a745',
      rejected: '#dc3545',
      closed: '#6c757d'
    };
    return colors[status] || '#667eea';
  };

  const getTypeColor = (type) => {
    const colors = {
      'device-request': '#667eea',
      'issue': '#e74c3c'
    };
    return colors[type] || '#667eea';
  };

  const getPriorityColor = (priority) => {
    const colors = {
      low: '#17a2b8',
      medium: '#ffc107',
      high: '#e74c3c'
    };
    return colors[priority] || '#667eea';
  };

  const formatDate = (dateString) => {
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
      <h2>All Tickets</h2>
      
      {tickets.length === 0 ? (
        <div className="empty-state">
          <p>No tickets found</p>
        </div>
      ) : (
        <div className="tickets-grid">
          {tickets.map((ticket) => (
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
                    className="badge status"
                    style={{ backgroundColor: getStatusColor(ticket.status) }}
                  >
                    {ticket.status.charAt(0).toUpperCase() + ticket.status.slice(1)}
                  </span>
                </div>
              </div>

              <p className="ticket-description">{ticket.description}</p>

              <div className="ticket-meta">
                <div className="meta-item">
                  <span className="label">Category:</span>
                  <span className="value">{ticket.category}</span>
                </div>
                <div className="meta-item">
                  <span className="label">Priority:</span>
                  <span
                    className="value"
                    style={{ color: getPriorityColor(ticket.priority) }}
                  >
                    {ticket.priority.charAt(0).toUpperCase() + ticket.priority.slice(1)}
                  </span>
                </div>
              </div>

              <div className="ticket-footer">
                <div className="requester">
                  <small>Requested by: {ticket.requester_name}</small>
                </div>
                <div className="date">
                  <small>{formatDate(ticket.created_at)}</small>
                </div>
              </div>

              {ticket.status !== 'pending' && ticket.approver_name && (
                <div className="ticket-approval">
                  <small>
                    <strong>{ticket.status === 'approved' ? '✓' : '✗'}</strong> by{' '}
                    {ticket.approver_name}
                  </small>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default TicketList;
