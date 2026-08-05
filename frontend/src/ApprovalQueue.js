import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './ApprovalQueue.css';

function ApprovalQueue({ tickets, currentUser, onViewTicket, onRefresh, API_URL }) {
  const [activeTab, setActiveTab] = useState(currentUser.role === 'admin' ? 'admin_queue' : 'manager_queue');
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

  const managerQueue = tickets.filter(
    (t) => (t.status === 'pending_manager_approval' || t.status === 'pending') &&
           (currentUser.role === 'admin' || t.manager_id === currentUser.id || !t.manager_id)
  );

  const adminQueue = tickets.filter(
    (t) => t.status === 'pending_admin_assignment'
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
    if (!data.assigned_device_name || !data.assigned_device_name.trim()) {
      alert('Please enter or select the assigned device name.');
      return;
    }

    const confirmed = await window.showConfirm({
      title: 'Assign Hardware Asset',
      message: `Are you sure you want to assign "${data.assigned_device_name}" to fulfill this request?`,
      confirmText: 'Confirm Assignment',
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
      alert('Device assigned and ticket fulfilled successfully!');
      setAdminAssignment(prev => ({ ...prev, [ticketId]: {} }));
      if (onRefresh) onRefresh();
    } catch (err) {
      console.error('Error assigning device:', err);
      alert(err.response?.data?.error || 'Device assignment failed.');
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
        <h2>📋 Multi-Stage Approval & Assignment Portal</h2>

        <div className="queue-tabs">
          <button
            className={`queue-tab ${activeTab === 'manager_queue' ? 'active' : ''}`}
            onClick={() => setActiveTab('manager_queue')}
          >
            📋 Manager Review Queue ({managerQueue.length})
          </button>

          {currentUser.role === 'admin' && (
            <button
              className={`queue-tab admin-tab ${activeTab === 'admin_queue' ? 'active' : ''}`}
              onClick={() => setActiveTab('admin_queue')}
            >
              📦 Admin Actions Queue ({adminQueue.length})
            </button>
          )}
        </div>
      </div>

      {/* MANAGER REVIEW QUEUE */}
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

                  {/* Manager Review Action Box */}
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

      {/* ADMIN DEVICE ASSIGNMENT QUEUE */}
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

                    {/* Admin Device Assignment / Issue Resolution Form */}
                    <div className="admin-assign-box">
                      <h4>{ticket.type === 'issue' ? '🚀 Fulfill & Resolve Issue' : '🚀 Assign Hardware & Fulfill Request'}</h4>

                      <div className="assign-form-row">
                        {ticket.type !== 'issue' && (
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
                        )}

                        <div className="form-field">
                          <label>{ticket.type === 'issue' ? 'Resolution Summary / Action Taken *:' : 'Assigned Device Name / Model *:'}</label>
                          <input
                            type="text"
                            placeholder={ticket.type === 'issue' ? 'e.g. Access granted / password reset' : 'e.g. MacBook Pro 16 Inch (Serial #MP-2026-X9)'}
                            value={ticketAdminData.assigned_device_name || ''}
                            onChange={(e) => setAdminAssignment({
                              ...adminAssignment,
                              [ticket.id]: { ...ticketAdminData, assigned_device_name: e.target.value }
                            })}
                          />
                        </div>
                      </div>

                      <div className="form-field">
                        <label>{ticket.type === 'issue' ? 'Admin Resolution Description & Troubleshooting Notes:' : 'Admin Fulfillment Description & Setup Notes:'}</label>
                        <textarea
                          rows="2"
                          placeholder={ticket.type === 'issue' ? 'Provide resolution details, troubleshooting steps, or credentials setup instructions...' : 'Provide hardware specifications, serial numbers, desk setup instructions, or security credentials...'}
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
                        {ticket.type === 'issue' ? '🚀 Resolve Issue & Complete Ticket' : '🚀 Assign Device & Complete Fulfillment'}
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
