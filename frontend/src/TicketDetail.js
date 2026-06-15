import React, { useState } from 'react';
import './TicketDetail.css';

function TicketDetail({ ticket, currentUser, onApprove, onReject, onClose, onBack }) {
  const [comment, setComment] = useState('');
  const [showApprovalForm, setShowApprovalForm] = useState(false);

  const handleApprove = () => {
    if (!comment.trim()) {
      alert('Please add a comment before approving');
      return;
    }
    onApprove(ticket.id, comment);
  };

  const handleReject = () => {
    if (!comment.trim()) {
      alert('Please add a reason before rejecting');
      return;
    }
    onReject(ticket.id, comment);
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getStatusColor = (status) => {
    const colors = {
      pending: '#ffc107',
      approved: '#28a745',
      rejected: '#dc3545',
      closed: '#6c757d'
    };
    return colors[status] || '#667eea';
  };

  const isManager = currentUser.role === 'manager';
  const isRequester = currentUser.id === ticket.requester_id;
  const canApprove = isManager && ticket.status === 'pending';
  const canClose = isRequester && ticket.status === 'approved';

  return (
    <div className="ticket-detail">
      <button className="btn-back" onClick={onBack}>
        ← Back to List
      </button>

      <div className="detail-header">
        <div>
          <h1>{ticket.title}</h1>
          <p className="ticket-id">Ticket ID: {ticket.id}</p>
        </div>
        <span
          className="status-badge"
          style={{ backgroundColor: getStatusColor(ticket.status) }}
        >
          {ticket.status.charAt(0).toUpperCase() + ticket.status.slice(1)}
        </span>
      </div>

      <div className="detail-container">
        <div className="main-panel">
          <section className="section">
            <h2>Description</h2>
            <p className="description">{ticket.description}</p>
          </section>

          <section className="section">
            <h2>Details</h2>
            <div className="details-grid">
              <div className="detail-item">
                <span className="label">Type:</span>
                <span className="value">
                  {ticket.type === 'device-request' ? '🖥️ Device Request' : '🐛 Issue Report'}
                </span>
              </div>
              <div className="detail-item">
                <span className="label">Category:</span>
                <span className="value">{ticket.category}</span>
              </div>
              <div className="detail-item">
                <span className="label">Priority:</span>
                <span className="value" style={{
                  color: ticket.priority === 'high' ? '#e74c3c' : ticket.priority === 'medium' ? '#ffc107' : '#17a2b8'
                }}>
                  {ticket.priority.charAt(0).toUpperCase() + ticket.priority.slice(1)}
                </span>
              </div>
              <div className="detail-item">
                <span className="label">Created:</span>
                <span className="value">{formatDate(ticket.created_at)}</span>
              </div>
            </div>
          </section>

          <section className="section">
            <h2>Requestor Information</h2>
            <div className="details-grid">
              <div className="detail-item">
                <span className="label">Name:</span>
                <span className="value">{ticket.requester_name}</span>
              </div>
              <div className="detail-item">
                <span className="label">Email:</span>
                <span className="value">{ticket.requester_email}</span>
              </div>
            </div>
          </section>

          {ticket.approver_name && (
            <section className="section approval-info">
              <h2>Approval Information</h2>
              <div className="details-grid">
                <div className="detail-item">
                  <span className="label">Approved by:</span>
                  <span className="value">{ticket.approver_name}</span>
                </div>
                <div className="detail-item">
                  <span className="label">Date:</span>
                  <span className="value">{formatDate(ticket.approval_date)}</span>
                </div>
              </div>
              {ticket.approval_comment && (
                <div className="approval-comment">
                  <p><strong>Comment:</strong></p>
                  <p>{ticket.approval_comment}</p>
                </div>
              )}
            </section>
          )}
        </div>

        <div className="sidebar">
          {canApprove && (
            <div className="action-panel">
              <h3>Review & Approve</h3>
              
              {!showApprovalForm ? (
                <div className="action-buttons">
                  <button
                    className="btn btn-approve"
                    onClick={() => setShowApprovalForm(true)}
                  >
                    ✓ Approve
                  </button>
                  <button
                    className="btn btn-reject"
                    onClick={() => setShowApprovalForm(true)}
                  >
                    ✗ Reject
                  </button>
                </div>
              ) : (
                <div className="approval-form">
                  <textarea
                    value={comment}
                    onChange={(e) => setComment(e.target.value)}
                    placeholder="Add approval comment or reason for rejection..."
                    rows={4}
                  />
                  <div className="form-buttons">
                    <button
                      className="btn btn-approve"
                      onClick={handleApprove}
                    >
                      ✓ Approve
                    </button>
                    <button
                      className="btn btn-reject"
                      onClick={handleReject}
                    >
                      ✗ Reject
                    </button>
                    <button
                      className="btn btn-cancel"
                      onClick={() => {
                        setShowApprovalForm(false);
                        setComment('');
                      }}
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {canClose && (
            <div className="action-panel">
              <button
                className="btn btn-close"
                onClick={() => onClose(ticket.id)}
              >
                ✓ Close Ticket
              </button>
            </div>
          )}

          {!canApprove && !canClose && (
            <div className="info-panel">
              <p>
                {isRequester && ticket.status === 'pending' && 'Waiting for manager approval...'}
                {isRequester && ticket.status === 'approved' && 'Your request has been approved. Click "Close Ticket" when done.'}
                {isRequester && ticket.status === 'rejected' && 'Your request was rejected. You can create a new ticket.'}
                {isRequester && ticket.status === 'closed' && 'This ticket is closed.'}
                {!isRequester && ticket.status === 'pending' && 'Pending manager review.'}
                {!isRequester && (ticket.status === 'approved' || ticket.status === 'rejected' || ticket.status === 'closed') && 'This ticket has been processed.'}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default TicketDetail;
