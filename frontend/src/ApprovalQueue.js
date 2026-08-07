import React, { useState, useEffect } from 'react';
import axios from 'axios';
import ViewToggle from './components/ViewToggle';
import formatTicketId from './utils/formatTicketId';
import { ApprovalsIcon, AlertIcon, InventoryIcon, CheckIcon, XIcon, ArrowRightIcon } from './components/Icons';
import './ApprovalQueue.css';

function ApprovalQueue({ tickets, currentUser, onViewTicket, onRefresh, API_URL, viewMode = 'grid', onViewModeChange }) {
  const [activeTab, setActiveTab] = useState(currentUser.role === 'admin' ? 'issue_queue' : 'manager_queue');
  const [inventoryList, setInventoryList] = useState([]);
  const [adminList, setAdminList] = useState([]);
  const [reviewComment, setReviewComment] = useState({});
  const [adminAssignment, setAdminAssignment] = useState({});
  const [transferTicket, setTransferTicket] = useState(null);
  const [selectedAdminName, setSelectedAdminName] = useState('');
  const [transferComment, setTransferComment] = useState('');

  useEffect(() => {
    if (API_URL) {
      axios.get(`${API_URL}/inventory`)
        .then(res => setInventoryList(res.data.filter(i => i.quantity > 0)))
        .catch(err => console.error('Error fetching inventory for assignment:', err));

      axios.get(`${API_URL}/users`)
        .then(res => {
          const admins = res.data.filter(u => u.role === 'admin' || u.role === 'manager');
          setAdminList(admins);
          if (admins.length > 0) setSelectedAdminName(admins[0].name);
        })
        .catch(err => console.error('Error fetching admin list:', err));
    }
  }, [API_URL]);

  const handleTransferSubmit = async (e) => {
    e.preventDefault();
    if (!selectedAdminName) {
      alert('Please select an Admin/Engineer to transfer this ticket to.');
      return;
    }
    if (!transferComment.trim()) {
      alert('Please enter comments/reasons for transferring this ticket.');
      return;
    }
    try {
      const selected = adminList.find(a => a.name === selectedAdminName);
      await axios.put(`${API_URL}/tickets/${transferTicket.id}/reassign-admin`, {
        target_admin_id: selected?.id || null,
        target_admin_name: selectedAdminName,
        comment: transferComment
      });
      alert(`Ticket successfully transferred to ${selectedAdminName}!`);
      setTransferTicket(null);
      setTransferComment('');
      if (onRefresh) onRefresh();
    } catch (err) {
      console.error('Error transferring ticket:', err);
      alert(err.response?.data?.error || 'Transfer failed.');
    }
  };

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

    const isApprove = action === 'approve';
    const confirmed = await window.showConfirm({
      title: isApprove ? 'Approve Ticket Request' : 'Deny Ticket Request',
      message: `Are you sure you want to ${isApprove ? 'approve' : 'deny'} this ticket request?`,
      confirmText: isApprove ? 'Approve Request' : 'Deny Request',
      cancelText: 'Cancel',
      confirmType: isApprove ? 'success' : 'danger'
    });
    if (!confirmed) return;

    try {
      await axios.put(`${API_URL}/tickets/${ticketId}/manager-review`, {
        action,
        approval_comment: comment,
        manager_comment: comment
      });
      alert(`Ticket successfully ${action === 'approve' ? 'approved' : 'denied'}!`);
      if (onRefresh) onRefresh();
    } catch (err) {
      console.error('Manager review error:', err);
      alert(err.response?.data?.error || 'Review failed.');
    }
  };

  const handleAdminAssign = async (ticketOrId) => {
    const ticket = typeof ticketOrId === 'object' ? ticketOrId : tickets.find(t => t.id === ticketOrId);
    if (!ticket) return;

    const data = adminAssignment[ticket.id] || {};
    const isIssue = ticket.type === 'issue';

    if (!isIssue && !data.assigned_device_name) {
      alert('Please select or specify a hardware asset to assign.');
      return;
    }
    if (isIssue && !data.assigned_device_name) {
      alert('Please provide a resolution summary.');
      return;
    }

    const confirmed = await window.showConfirm({
      title: isIssue ? 'Confirm Ticket Resolution' : 'Confirm Hardware Asset Assignment',
      message: isIssue
        ? `Are you sure you want to resolve and complete incident "${ticket.title}"?`
        : `Are you sure you want to assign asset "${data.assigned_device_name}" to ${ticket.requester_name}?`,
      confirmText: isIssue ? 'Resolve Ticket' : 'Assign Asset',
      cancelText: 'Cancel',
      confirmType: 'success'
    });
    if (!confirmed) return;

    try {
      await axios.put(`${API_URL}/tickets/${ticket.id}/admin-assign`, {
        inventory_id: data.inventory_id || null,
        assigned_device_name: data.assigned_device_name,
        assignment_description: data.assignment_description
      });
      alert(isIssue ? 'Incident resolved successfully!' : 'Hardware asset assigned successfully!');
      if (onRefresh) onRefresh();
    } catch (err) {
      console.error('Admin assignment error:', err);
      alert(err.response?.data?.error || 'Assignment failed.');
    }
  };

  const handleAdminAssignSubmit = handleAdminAssign;

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
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
      <div className="queue-header-nav" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
        <h2>Approvals & Resolution Queue</h2>
        {onViewModeChange && (
          <ViewToggle viewMode={viewMode} onViewModeChange={onViewModeChange} />
        )}
      </div>

        <div className="queue-tabs">
          <button
            className={`queue-tab ${activeTab === 'manager_queue' ? 'active' : ''}`}
            onClick={() => setActiveTab('manager_queue')}
          >
            <ApprovalsIcon size={16} /> Manager Review Queue ({managerQueue.length})
          </button>

          {currentUser.role === 'admin' && (
            <button
              className={`queue-tab admin-tab ${activeTab === 'issue_queue' ? 'active' : ''}`}
              onClick={() => setActiveTab('issue_queue')}
            >
              <AlertIcon size={16} /> Open Incidents ({issueQueue.length})
            </button>
          )}

          {currentUser.role === 'admin' && (
            <button
              className={`queue-tab admin-tab ${activeTab === 'admin_queue' ? 'active' : ''}`}
              onClick={() => setActiveTab('admin_queue')}
            >
              <InventoryIcon size={16} /> Admin Device Queue ({adminQueue.length})
            </button>
          )}
        </div>

      {/* 1. MANAGER REVIEW QUEUE TAB */}
      {activeTab === 'manager_queue' && (
        <div>
          {managerQueue.length === 0 ? (
            <div className="empty-state">
              <p>No pending manager approval requests.</p>
            </div>
          ) : (
            <div className="queue-list">
              {managerQueue.map((ticket) => (
                <div key={ticket.id} className="queue-card">
                  <div className="card-top">
                    <div>
                      <span className="stage-badge manager">STAGE 1: Manager Review</span>
                      <h3 onClick={() => onViewTicket(ticket)} className="clickable-title">
                        <span className="ticket-id-tag">{formatTicketId(ticket.id, ticket.type)}</span> {ticket.title}
                      </h3>
                    </div>
                    <span className={`priority-badge ${ticket.priority}`}>{ticket.priority.toUpperCase()}</span>
                  </div>

                  <div style={{ marginTop: '6px', fontSize: '12px', color: 'var(--text-muted)' }}>
                    Currently With: <strong style={{ color: ticket.assigned_admin_name ? '#38bdf8' : '#c084fc' }}>{ticket.assigned_admin_name || ticket.manager_name || 'Assigned Manager'}</strong>
                  </div>

                  <p className="ticket-desc">{ticket.description}</p>
                  {ticket.reassignment_comment && (
                    <div style={{ fontSize: '12px', color: '#38bdf8', background: 'rgba(56, 189, 248, 0.1)', padding: '6px 10px', borderRadius: '6px', marginBottom: '10px' }}>
                      💬 Transfer Comment: {ticket.reassignment_comment}
                    </div>
                  )}

                  <div className="card-meta-grid">
                    <div><span className="label">Requester:</span> <strong>{ticket.requester_name}</strong></div>
                    <div><span className="label">Category:</span> <span>{ticket.category}</span></div>
                    <div><span className="label">Submitted:</span> <span>{formatDate(ticket.created_at)}</span></div>
                  </div>

                  <div className="review-action-box">
                    <textarea
                      className="review-textarea"
                      rows="2"
                      placeholder="Enter review notes or reason..."
                      value={reviewComment[ticket.id] || ''}
                      onChange={(e) => setReviewComment({ ...reviewComment, [ticket.id]: e.target.value })}
                    />
                    <div className="action-buttons-flex">
                      <button
                        className="btn-approve"
                        onClick={() => handleManagerReview(ticket.id, 'approve')}
                      >
                        <CheckIcon size={14} /> Approve Request
                      </button>

                      <button
                        className="btn-deny"
                        onClick={() => handleManagerReview(ticket.id, 'reject')}
                      >
                        <XIcon size={14} /> Deny Request
                      </button>

                      {currentUser.role === 'admin' && (
                        <button
                          className="btn-deny"
                          style={{ background: 'rgba(56, 189, 248, 0.15)', borderColor: 'rgba(56, 189, 248, 0.3)', color: '#38bdf8' }}
                          onClick={() => { setTransferTicket(ticket); if (adminList.length > 0) setSelectedAdminName(adminList[0].name); }}
                        >
                          <ArrowRightIcon size={14} /> Transfer to Admin
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* 2. ADMIN INCIDENT RESOLUTION QUEUE TAB */}
      {activeTab === 'issue_queue' && currentUser.role === 'admin' && (
        <div>
          {issueQueue.length === 0 ? (
            <div className="empty-state">
              <p>No open incidents requiring admin assignment.</p>
            </div>
          ) : (
            <div className="queue-list">
              {issueQueue.map((ticket) => {
                const ticketAdminData = adminAssignment[ticket.id] || {};

                return (
                  <div key={ticket.id} className="queue-card admin-border">
                    <div className="card-top">
                      <div>
                        <span className="stage-badge admin">STAGE 1: Admin Resolution</span>
                        <h3 onClick={() => onViewTicket(ticket)} className="clickable-title">
                          {ticket.title}
                        </h3>
                      </div>
                      <span className="priority-badge high">{ticket.priority.toUpperCase()}</span>
                    </div>

                    <p className="ticket-desc">{ticket.description}</p>

                    <div className="card-meta-grid">
                      <div><span className="label">Requester:</span> <strong>{ticket.requester_name}</strong></div>
                      <div><span className="label">Category:</span> <span>{ticket.category}</span></div>
                    </div>

                    <div className="admin-assign-box">
                      <h4>Incident Resolution & Troubleshooting</h4>

                      <div className="assign-form-row">
                        <div className="form-field" style={{ flex: '1' }}>
                          <label>Resolution Summary / Action Taken *:</label>
                          <input
                            type="text"
                            placeholder="e.g. Database access granted / network config updated"
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
                        <CheckIcon size={16} /> Resolve Incident & Complete Ticket
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
              <p>No requests currently waiting for admin device assignment.</p>
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
                      <span>Approved by Manager: <strong>{ticket.approver_name || ticket.manager_name}</strong></span>
                      {ticket.approval_comment && <p className="mgr-comment">"{ticket.approval_comment}"</p>}
                    </div>

                    <div className="card-meta-grid">
                      <div><span className="label">Requester:</span> <strong>{ticket.requester_name}</strong></div>
                      <div><span className="label">Category:</span> <span>{ticket.category}</span></div>
                    </div>

                    <div className="admin-assign-box">
                      <h4>Assign Hardware & Fulfill Request</h4>

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
                        <CheckIcon size={16} /> Assign Device & Complete Fulfillment
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
      {/* Transfer / Re-assign Admin Modal */}
      {transferTicket && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '480px' }}>
            <div className="modal-header">
              <h3>Transfer Ticket #{transferTicket.id}</h3>
              <button className="modal-close" onClick={() => setTransferTicket(null)}>
                <XIcon size={16} />
              </button>
            </div>
            <form onSubmit={handleTransferSubmit} className="modal-form">
              <div className="form-group">
                <label>Select Target Admin / Engineer *</label>
                <select
                  value={selectedAdminName}
                  onChange={(e) => setSelectedAdminName(e.target.value)}
                  required
                >
                  {adminList.map(adm => (
                    <option key={adm.id} value={adm.name}>
                      {adm.name} ({adm.role.toUpperCase()} - {adm.department || 'IT'})
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label>Comments / Transfer Reason *</label>
                <textarea
                  rows="3"
                  value={transferComment}
                  onChange={(e) => setTransferComment(e.target.value)}
                  placeholder="Provide details for transferring this ticket to another admin..."
                  required
                ></textarea>
              </div>

              <div className="modal-actions" style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '16px' }}>
                <button type="button" className="btn-cancel" onClick={() => setTransferTicket(null)}>
                  Cancel
                </button>
                <button type="submit" className="btn-save" style={{ background: '#38bdf8', color: '#0f172a' }}>
                  Transfer Ticket
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default ApprovalQueue;
