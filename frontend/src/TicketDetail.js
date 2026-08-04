import React, { useState } from 'react';
import './TicketDetail.css';

function TicketDetail({ ticket, currentUser, onApprove, onReject, onClose, onBack }) {
  const [comment, setComment] = useState('');
  const [showApprovalForm, setShowApprovalForm] = useState(false);

  const handleApprove = () => {
    onApprove(ticket.id, comment);
  };

  const handleReject = () => {
    if (!comment.trim()) {
      alert('Please add a reason before denying');
      return;
    }
    onReject(ticket.id, comment);
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'pending_manager_approval':
        return { text: '🟡 Pending Manager Review', bg: '#f59e0b' };
      case 'pending_admin_assignment':
        return { text: '🟣 Pending Admin Device Assignment', bg: '#8b5cf6' };
      case 'approved':
        return { text: '🟢 Device Assigned & Fulfilled', bg: '#10b981' };
      case 'rejected':
        return { text: '🔴 Denied by Manager', bg: '#ef4444' };
      case 'closed':
        return { text: '⚪ Closed', bg: '#64748b' };
      default:
        return { text: status.toUpperCase(), bg: '#3b82f6' };
    }
  };

  const statusInfo = getStatusBadge(ticket.status);
  const isManager = currentUser.role === 'manager';
  const isAdmin = currentUser.role === 'admin';
  const isRequester = currentUser.id === ticket.requester_id;

  const canManagerReview = (isManager || isAdmin) && (ticket.status === 'pending_manager_approval' || ticket.status === 'pending');
  const canClose = isRequester && (ticket.status === 'approved' || ticket.status === 'closed');

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
          style={{ backgroundColor: statusInfo.bg }}
        >
          {statusInfo.text}
        </span>
      </div>

      {/* Multi-Stage Workflow Timeline Indicator */}
      <div className="workflow-timeline">
        <div className={`timeline-step ${ticket.created_at ? 'completed' : ''}`}>
          <div className="step-num">1</div>
          <div className="step-label">Submitted</div>
        </div>
        <div className="step-connector"></div>
        <div className={`timeline-step ${ticket.approval_date ? (ticket.status === 'rejected' ? 'rejected' : 'completed') : 'active'}`}>
          <div className="step-num">2</div>
          <div className="step-label">Manager Review</div>
        </div>
        <div className="step-connector"></div>
        <div className={`timeline-step ${ticket.assigned_at ? 'completed' : (ticket.status === 'pending_admin_assignment' ? 'active' : '')}`}>
          <div className="step-num">3</div>
          <div className="step-label">Admin Fulfillment</div>
        </div>
      </div>

      <div className="detail-container">
        <div className="main-panel">
          <section className="section">
            <h2>Description</h2>
            <p className="description">{ticket.description}</p>
          </section>

          <section className="section">
            <h2>Ticket Metadata</h2>
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
                  color: ticket.priority === 'high' ? '#ef4444' : ticket.priority === 'medium' ? '#f59e0b' : '#38bdf8'
                }}>
                  {ticket.priority.toUpperCase()}
                </span>
              </div>
              <div className="detail-item">
                <span className="label">Created Date:</span>
                <span className="value">{formatDate(ticket.created_at)}</span>
              </div>
            </div>
          </section>

          <section className="section">
            <h2>Requester & Assigned Manager</h2>
            <div className="details-grid">
              <div className="detail-item">
                <span className="label">Requester Name:</span>
                <span className="value">{ticket.requester_name} ({ticket.requester_email})</span>
              </div>
              <div className="detail-item">
                <span className="label">Assigned Manager:</span>
                <span className="value">{ticket.manager_name || 'Assigned Manager'}</span>
              </div>
            </div>
          </section>

          {/* STAGE 2: Manager Review Details */}
          {ticket.approver_name && (
            <section className={`section ${ticket.status === 'rejected' ? 'rejection-info' : 'approval-info'}`}>
              <h2>STAGE 2: Manager Review Status</h2>
              <div className="details-grid">
                <div className="detail-item">
                  <span className="label">Reviewed by:</span>
                  <span className="value">{ticket.approver_name}</span>
                </div>
                <div className="detail-item">
                  <span className="label">Review Date:</span>
                  <span className="value">{formatDate(ticket.approval_date)}</span>
                </div>
              </div>
              {ticket.approval_comment && (
                <div className="approval-comment">
                  <p><strong>Manager Comment:</strong></p>
                  <p>{ticket.approval_comment}</p>
                </div>
              )}
            </section>
          )}

          {/* STAGE 3: Admin Device Assignment Details */}
          {(ticket.assigned_device_name || ticket.assigned_at) && (
            <section className="section admin-fulfilled-info">
              <h2>STAGE 3: Admin Device Assignment & Fulfillment</h2>
              <div className="details-grid">
                <div className="detail-item">
                  <span className="label">Assigned Hardware Device:</span>
                  <span className="value font-bold text-cyan">{ticket.assigned_device_name}</span>
                </div>
                <div className="detail-item">
                  <span className="label">Fulfillment Date:</span>
                  <span className="value">{formatDate(ticket.assigned_at)}</span>
                </div>
              </div>
              {ticket.assignment_description && (
                <div className="assignment-notes">
                  <p><strong>Admin Fulfillment Instructions:</strong></p>
                  <p>{ticket.assignment_description}</p>
                </div>
              )}
            </section>
          )}
        </div>

        <div className="sidebar">
          {canManagerReview && (
            <div className="action-panel">
              <h3>Manager Review Action</h3>
              
              {!showApprovalForm ? (
                <div className="action-buttons">
                  <button
                    className="btn btn-approve"
                    onClick={() => setShowApprovalForm(true)}
                  >
                    ✓ Approve & Pass to Admin
                  </button>
                  <button
                    className="btn btn-reject"
                    onClick={() => setShowApprovalForm(true)}
                  >
                    ✗ Deny Request
                  </button>
                </div>
              ) : (
                <div className="approval-form">
                  <textarea
                    value={comment}
                    onChange={(e) => setComment(e.target.value)}
                    placeholder="Add review comment or reason..."
                    rows={4}
                  />
                  <div className="form-buttons">
                    <button
                      className="btn btn-approve"
                      onClick={handleApprove}
                    >
                      ✓ Approve (Send to Admin)
                    </button>
                    <button
                      className="btn btn-reject"
                      onClick={handleReject}
                    >
                      ✗ Deny Request
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
        </div>
      </div>
    </div>
  );
}

export default TicketDetail;
