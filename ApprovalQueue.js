import React from 'react';
import './ApprovalQueue.css';

function ApprovalQueue({ tickets, onViewTicket }) {
  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getPriorityColor = (priority) => {
    const colors = {
      low: '#17a2b8',
      medium: '#ffc107',
      high: '#e74c3c'
    };
    return colors[priority] || '#667eea';
  };

  return (
    <div className="approval-queue">
      <h2>📋 Pending Approvals</h2>
      
      {tickets.length === 0 ? (
        <div className="empty-state">
          <p>🎉 No pending tickets! All requests have been reviewed.</p>
        </div>
      ) : (
        <div className="queue-container">
          <div className="queue-stats">
            <div className="stat-card">
              <div className="stat-number">{tickets.length}</div>
              <div className="stat-label">Pending</div>
            </div>
            <div className="stat-card">
              <div className="stat-number">
                {tickets.filter(t => t.priority === 'high').length}
              </div>
              <div className="stat-label">High Priority</div>
            </div>
          </div>

          <div className="queue-list">
            {tickets.map((ticket) => (
              <div
                key={ticket.id}
                className="queue-item"
                onClick={() => onViewTicket(ticket)}
              >
                <div className="queue-header">
                  <div className="queue-title-section">
                    <h3>{ticket.title}</h3>
                    <span className="ticket-type">
                      {ticket.type === 'device-request' ? '🖥️' : '🐛'}
                    </span>
                  </div>
                  <div className="queue-priority">
                    <span
                      className="priority-badge"
                      style={{ backgroundColor: getPriorityColor(ticket.priority) }}
                    >
                      {ticket.priority.charAt(0).toUpperCase()}
                    </span>
                  </div>
                </div>

                <p className="queue-description">{ticket.description}</p>

                <div className="queue-meta">
                  <div className="meta-group">
                    <span className="meta-label">From:</span>
                    <span className="meta-value">{ticket.requester_name}</span>
                  </div>
                  <div className="meta-group">
                    <span className="meta-label">Category:</span>
                    <span className="meta-value">{ticket.category}</span>
                  </div>
                  <div className="meta-group">
                    <span className="meta-label">Requested:</span>
                    <span className="meta-value">{formatDate(ticket.created_at)}</span>
                  </div>
                </div>

                <div className="queue-action">
                  <span className="action-hint">Click to review & approve</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default ApprovalQueue;
