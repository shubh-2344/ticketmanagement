import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './ApprovalQueue.css';

function ApprovalQueue({ tickets, currentUser, onViewTicket, onRefresh, API_URL }) {
  const [activeTab, setActiveTab] = useState(currentUser.role === 'admin' ? 'issue_queue' : 'manager_queue');
  const [inventoryList, setInventoryList] = useState([]);
  const [reviewComment, setReviewComment] = useState({});
  const [adminAssignment, setAdminAssignment] = useState({});

  useEffect(() => {
    if (API_URL) {
      axios.get(`${API_URL}/inventory`)
        .then(res => setInventoryList(res.data.filter(i => i.quantity > 0)))
        .catch(err => console.error('Error fetching inventory for assignment:', err));
    }
  }, [API_URL]);

  // Queue Partitioning by Ticket Type
  const managerQueue = tickets.filter(
    (t) => (t.type === 'device-request' || !t.type) &&
           (t.status === 'pending_manager_approval' || t.status === 'pending') &&
           (currentUser.role === 'admin' || t.manager_id === currentUser.id || !t.manager_id)
  );

  const issueQueue = tickets.filter(
    (t) => t.type === 'issue' &&
           (t.status === 'pending_admin_assignment' || t.status === 'open' || t.status === 'pending')
  );

  const adminQueue = tickets.filter(
    (t) => t.type === 'device-request' && t.status === 'pending_admin_assignment'
  );

  const handleManagerReview = async (ticketId, action) => {
    const comment = reviewComment[ticketId] || '';
    if (action === 'reject' && !comment.trim()) {
      alert('Please provide a reason before denying this request.');
      return;
    }

    const confirmed = await window.showConfirm({
      title: action === 'approve' ? 'Approve Ticket Request' : 'Deny Ticket Request',
      message: action === 'approve' 
        ? 'Are you sure you want to approve this request and forward it for fulfillment?' 
        : 'Are you sure you want to deny this request?',
      confirmText: action === 'approve' ? 'Approve Request' : 'Deny Request',
      cancelText: 'Cancel',
      confirmType: action === 'approve' ? 'success' : 'danger'
    });
    if (!confirmed) return;

    try {
      await axios.put(`${API_URL}/tickets/${ticketId}/manager-review`, {
        action,
        approval_comment: comment
      });
      alert(action === 'approve' ? 'Ticket approved! Sent to Admin for device assignment.' : 'Ticket denied.');
      setReviewComment(prev => ({ ...prev, [ticketId]: '' }));
      if (onRefresh) onRefresh();
    } catch (err) {
      console.error('Error reviewing ticket:', err);
      alert(err.response?.data?.error || 'Action failed.');
    }
  };

  const handleAdminAssign = async (ticketId) => {
    const data = adminAssignment[ticketId] || {};
    const targetTicket = tickets.find(t => t.id === ticketId);
    const isIssue = targetTicket && targetTicket.type === 'issue';

    if (!data.assigned_device_name || !data.assigned_device_name.trim()) {
      alert(isIssue ? 'Please enter a resolution action summary.' : 'Please enter or select the assigned device name.');
      return;
    }

    const confirmed = await window.showConfirm({
      title: isIssue ? 'Confirm Ticket Resolution' : 'Confirm Hardware Asset Assignment',
      message: isIssue 
        ? `Are you sure you want to resolve and complete ticket "${targetTicket.title}"?` 
        : `Are you sure you want to assign "${data.assigned_device_name}" to fulfill this request?`,
      confirmText: isIssue ? 'Resolve Ticket' : 'Confirm Assignment',
      cancelText: 'Cancel',
      confirmType: 'success'
    });
    if (!confirmed) return;

    try {
      await axios.put(`${API_URL}/tickets/${ticketId}/admin-assign`, {
        inventory_id: data.inventory_id || null,
        assigned_device_name: data.assigned_device_name,
        assignment_description: data.assignment_description || ''
      });
      alert(isIssue ? 'Incident resolved and ticket completed successfully!' : 'Device assigned and ticket fulfilled successfully!');
      setAdminAssignment(prev => ({ ...prev, [ticketId]: {} }));
      if (onRefresh) onRefresh();
    } catch (err) {
      console.error('Error fulfilling ticket:', err);
      alert(err.response?.data?.error || 'Action failed.');
    }
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
    <div className="approval-queue-container">
      <div className="queue-header-nav">
        <h2>📋 Multi-Stage Approval & Resolution Portal</h2>

        {/* 3-TAB APPROVALS NAVIGATION */}
        <div className="queue-tabs">
          <button
            className={`queue-tab ${activeTab === 'manager_queue' ? 'active' : ''}`}
            onClick={() => setActiveTab('manager_queue')}
          >
            📋 Manager Review Queue ({managerQueue.length})
          </button>

          {currentUser.role === 'admin' && (
            <button
              className={`queue-tab admin-tab ${activeTab === 'issue_queue' ? 'active' : ''}`}
              onClick={() => setActiveTab('issue_queue')}
            >
              Open Incidents ({issueQueue.length})
            </button>
          )}

          {currentUser.role === 'admin' && (
            <button
              className={`queue-tab admin-tab ${activeTab === 'admin_queue' ? 'active' : ''}`}
              onClick={() => setActiveTab('admin_queue')}
            >
              📦 Admin Device Queue ({adminQueue.length})
            </button>
          )}
        </div>
      </div>

      {/* 1. MANAGER REVIEW QUEUE TAB */}
      {activeTab === 'manager_queue' && (
        <div>
          {managerQueue.length === 0 ? (
            <div className="empty-state">
              <p>🎉 No pending manager approval requests.</p>
            </div>
          ) : (
            <div className="queue-list">
              {managerQueue.map((ticket) => (
                <div key={ticket.id} className="queue-card">
                  <div className="card-top">
                    <div>
                      <span className="stage-badge manager">STAGE 1: Manager Review</span>
                      <h3 onClick={() => onViewTicket(ticket)} className="clickable-title">
                        {ticket.title}
                      </h3>
                    </div>
                    <span className="priority-badge">{ticket.priority.toUpperCase()}</span>
                  </div>

                  <p className="ticket-desc">{ticket.description}</p>

                  <div className="card-meta-grid">
                    <div><span className="label">Requester:</span> <strong>{ticket.requester_name}</strong></div>
                    <div><span className="label">Assigned Manager:</span> <strong>{ticket.manager_name || 'Manager'}</strong></div>
                    <div><span className="label">Category:</span> <span>{ticket.category}</span></div>
                    <div><span className="label">Date:</span> <span>{formatDate(ticket.created_at)}</span></div>
                  </div>

                  <div className="action-box">
                    <input
                      type="text"
                      placeholder="Add manager review comment / reason..."
                      value={reviewComment[ticket.id] || ''}
                      onChange={(e) => setReviewComment({ ...reviewComment, [ticket.id]: e.target.value })}
                      className="comment-input"
                    />
                    <div className="btn-group">
                      <button
                        className="btn-approve-mgr"
                        onClick={() => handleManagerReview(ticket.id, 'approve')}
                      >
                        ✓ Approve & Pass to Admin
                      </button>
                      <button
                        className="btn-deny-mgr"
                        onClick={() => handleManagerReview(ticket.id, 'reject')}
                      >
                        ✗ Deny Request
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* 2. OPEN INCIDENTS QUEUE TAB */}
      {activeTab === 'issue_queue' && currentUser.role === 'admin' && (
        <div>
          {issueQueue.length === 0 ? (
            <div className="empty-state">
              <p>🎉 Zero open reported incidents needing resolution.</p>
            </div>
          ) : (
            <div className="queue-list">
              {issueQueue.map((ticket) => {
                const ticketAdminData = adminAssignment[ticket.id] || {};

                return (
                  <div key={ticket.id} className="queue-card admin-border">
                    <div className="card-top">
                      <div>
                        <span className="stage-badge admin" style={{ background: 'linear-gradient(135deg, #0284c7, #7c3aed)' }}>
                          🛡️ OPEN INCIDENT
                        </span>
                        <h3 onClick={() => onViewTicket(ticket)} className="clickable-title">
                          {ticket.title}
                        </h3>
                      </div>
                      <span className="priority-badge" style={{ background: 'rgba(56, 189, 248, 0.15)', color: '#38bdf8', border: '1px solid rgba(56, 189, 248, 0.3)' }}>
                        PENDING RESOLUTION
                      </span>
                    </div>

                    <p className="ticket-desc">{ticket.description}</p>

                    <div className="card-meta-grid" style={{ marginTop: '12px' }}>
                      <div><span className="label">Requester:</span> <strong>{ticket.requester_name}</strong></div>
                      <div><span className="label">Category:</span> <span>{ticket.category}</span></div>
                      <div><span className="label">Priority:</span> <strong>{ticket.priority.toUpperCase()}</strong></div>
                      <div><span className="label">Date:</span> <span>{formatDate(ticket.created_at)}</span></div>
                    </div>

                    {/* Direct Incident Resolution Form (No Manager Proof Box / No Hardware Selection) */}
                    <div className="admin-assign-box" style={{ marginTop: '16px' }}>
                      <h4>🚀 Resolve Incident & Complete Ticket</h4>

                      <div className="assign-form-row">
                        <div className="form-field" style={{ width: '100%' }}>
                          <label>Resolution Action / Summary *:</label>
                          <input
                            type="text"
                            placeholder="e.g. Screen replaced / access granted / software patch applied"
                            value={ticketAdminData.assigned_device_name || ''}
                            onChange={(e) => setAdminAssignment({
                              ...adminAssignment,
                              [ticket.id]: { ...ticketAdminData, assigned_device_name: e.target.value }
                            })}
                          />
                        </div>
                      </div>

                      <div className="form-field">
                        <label>Resolution Description & Troubleshooting Notes:</label>
                        <textarea
                          rows="2"
                          placeholder="Provide detailed resolution steps, troubleshooting notes, or credentials setup instructions..."
                          value={ticketAdminData.assignment_description || ''}
                          onChange={(e) => setAdminAssignment({
                            ...adminAssignment,
                            [ticket.id]: { ...ticketAdminData, assignment_description: e.target.value }
                          })}
                        />
                      </div>

                      <button
                        className="btn-fulfill-admin"
                        onClick={() => handleAdminAssign(ticket.id)}
                      >
                        🚀 Resolve Incident & Complete Ticket
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* 3. ADMIN DEVICE ASSIGNMENT QUEUE TAB */}
      {activeTab === 'admin_queue' && currentUser.role === 'admin' && (
        <div>
          {adminQueue.length === 0 ? (
            <div className="empty-state">
              <p>🎉 No requests currently waiting for admin device assignment.</p>
            </div>
          ) : (
            <div className="queue-list">
              {adminQueue.map((ticket) => {
                const ticketAdminData = adminAssignment[ticket.id] || {};

                return (
                  <div key={ticket.id} className="queue-card admin-border">
                    <div className="card-top">
                      <div>
                        <span className="stage-badge admin">STAGE 2: Admin Device Assignment</span>
                        <h3 onClick={() => onViewTicket(ticket)} className="clickable-title">
                          {ticket.title}
                        </h3>
                      </div>
                      <span className="priority-badge high">READY FOR ASSIGNMENT</span>
                    </div>

                    <p className="ticket-desc">{ticket.description}</p>

                    <div className="approval-proof-box">
                      <span>✓ Approved by Manager: <strong>{ticket.approver_name || ticket.manager_name}</strong></span>
                      {ticket.approval_comment && <p className="mgr-comment">"{ticket.approval_comment}"</p>}
                    </div>

                    <div className="card-meta-grid">
                      <div><span className="label">Requester:</span> <strong>{ticket.requester_name}</strong></div>
                      <div><span className="label">Category:</span> <span>{ticket.category}</span></div>
                    </div>

                    <div className="admin-assign-box">
                      <h4>🚀 Assign Hardware & Fulfill Request</h4>

                      <div className="assign-form-row">
                        <div className="form-field">
                          <label>Select Inventory Hardware Item (Optional):</label>
                          <select
                            value={ticketAdminData.inventory_id || ''}
                            onChange={(e) => {
                              const invId = e.target.value;
                              const invItem = inventoryList.find(i => i.id === invId);
                              setAdminAssignment({
                                ...adminAssignment,
                                [ticket.id]: {
                                  ...ticketAdminData,
                                  inventory_id: invId,
                                  assigned_device_name: invItem ? invItem.name : ticketAdminData.assigned_device_name || ''
                                }
                              });
                            }}
                          >
                            <option value="">-- Custom Device Entry --</option>
                            {inventoryList.map(i => (
                              <option key={i.id} value={i.id}>
                                {i.name} ({i.quantity} available)
                              </option>
                            ))}
                          </select>
                        </div>

                        <div className="form-field">
                          <label>Assigned Device Name / Model *:</label>
                          <input
                            type="text"
                            placeholder="e.g. MacBook Pro 16 Inch (Serial #MP-2026-X9)"
                            value={ticketAdminData.assigned_device_name || ''}
                            onChange={(e) => setAdminAssignment({
                              ...adminAssignment,
                              [ticket.id]: { ...ticketAdminData, assigned_device_name: e.target.value }
                            })}
                          />
                        </div>
                      </div>

                      <div className="form-field">
                        <label>Admin Fulfillment Description & Setup Notes:</label>
                        <textarea
                          rows="2"
                          placeholder="Provide hardware specifications, serial numbers, desk setup instructions, or security credentials..."
                          value={ticketAdminData.assignment_description || ''}
                          onChange={(e) => setAdminAssignment({
                            ...adminAssignment,
                            [ticket.id]: { ...ticketAdminData, assignment_description: e.target.value }
                          })}
                        />
                      </div>

                      <button
                        className="btn-fulfill-admin"
                        onClick={() => handleAdminAssign(ticket.id)}
                      >
                        🚀 Assign Device & Complete Fulfillment
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default ApprovalQueue;
