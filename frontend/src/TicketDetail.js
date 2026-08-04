import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './TicketDetail.css';

function TicketDetail({ ticket, currentUser, onApprove, onReject, onClose, onBack, onAdminUpdate, onAdminDelete, API_URL }) {
  const [comment, setComment] = useState('');
  const [showApprovalForm, setShowApprovalForm] = useState(false);
  const [showAdminEditModal, setShowAdminEditModal] = useState(false);
  const [showDeviceAssignForm, setShowDeviceAssignForm] = useState(false);
  
  const [inventoryList, setInventoryList] = useState([]);
  const [managerList, setManagerList] = useState([]);

  const [deviceAssignData, setDeviceAssignData] = useState({
    inventory_id: ticket.inventory_id || '',
    assigned_device_name: ticket.assigned_device_name || '',
    assignment_description: ticket.assignment_description || ''
  });

  const [editFormData, setEditFormData] = useState({
    title: ticket.title || '',
    description: ticket.description || '',
    type: ticket.type || 'issue',
    category: ticket.category || 'general',
    priority: ticket.priority || 'medium',
    status: ticket.status || 'pending_manager_approval',
    manager_id: ticket.manager_id || '',
    manager_name: ticket.manager_name || '',
    assigned_device_name: ticket.assigned_device_name || '',
    assignment_description: ticket.assignment_description || '',
    approval_comment: ticket.approval_comment || ''
  });

  useEffect(() => {
    if (API_URL) {
      axios.get(`${API_URL}/inventory`)
        .then(res => setInventoryList(res.data.filter(i => i.quantity > 0 || i.id === ticket.inventory_id)))
        .catch(err => console.error('Error fetching inventory:', err));

      if (currentUser.role === 'admin') {
        axios.get(`${API_URL}/managers`)
          .then(res => setManagerList(res.data))
          .catch(err => console.error('Error fetching managers:', err));
      }
    }
  }, [API_URL, currentUser, ticket]);

  const handleAdminDeviceAssignSubmit = async (e) => {
    e.preventDefault();
    if (!deviceAssignData.assigned_device_name.trim()) {
      alert('Please enter or select the assigned device name.');
      return;
    }

    try {
      await axios.put(`${API_URL}/tickets/${ticket.id}/admin-assign`, {
        inventory_id: deviceAssignData.inventory_id || null,
        assigned_device_name: deviceAssignData.assigned_device_name,
        assignment_description: deviceAssignData.assignment_description
      });
      alert('Device assigned and ticket fulfilled successfully!');
      setShowDeviceAssignForm(false);
      window.location.reload();
    } catch (err) {
      console.error('Error assigning device:', err);
      alert(err.response?.data?.error || 'Device assignment failed.');
    }
  };

  const handleAdminEditChange = (e) => {
    const { name, value } = e.target;
    setEditFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleAdminManagerSelect = (e) => {
    const mgrId = e.target.value;
    const selectedMgr = managerList.find(m => m.id === mgrId);
    setEditFormData(prev => ({
      ...prev,
      manager_id: mgrId,
      manager_name: selectedMgr ? selectedMgr.name : prev.manager_name
    }));
  };

  const handleAdminSave = async (e) => {
    e.preventDefault();
    if (onAdminUpdate) {
      await onAdminUpdate(ticket.id, editFormData);
      setShowAdminEditModal(false);
    }
  };

  const handleAdminDeleteClick = () => {
    if (window.confirm(`Are you sure you want to permanently delete ticket "${ticket.title}"?`)) {
      if (onAdminDelete) {
        onAdminDelete(ticket.id);
      }
    }
  };

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
  const isPendingAdminAssignment = ticket.status === 'pending_admin_assignment';

  return (
    <div className="ticket-detail">
      <div className="top-nav-bar">
        <button className="btn-back" onClick={onBack}>
          ← Back to List
        </button>

        {isAdmin && (
          <div className="admin-quick-actions">
            <button className="btn-admin-edit" onClick={() => setShowAdminEditModal(true)}>
              ✏️ Admin Edit Ticket
            </button>
            <button className="btn-admin-delete" onClick={handleAdminDeleteClick}>
              🗑️ Admin Delete
            </button>
          </div>
        )}
      </div>

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
        <div className={`timeline-step ${ticket.assigned_at || ticket.status === 'approved' ? 'completed' : (ticket.status === 'pending_admin_assignment' ? 'active' : '')}`}>
          <div className="step-num">3</div>
          <div className="step-label">Admin Device Assignment</div>
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

          {/* STAGE 3: ADMIN DEVICE ASSIGNMENT & FULFILLMENT SECTION (Visible for All Users) */}
          <section className="section admin-fulfilled-info">
            <div className="section-header-flex">
              <h2>STAGE 3: Admin Device Assignment & Fulfillment</h2>
              {isAdmin && (ticket.assigned_device_name || isPendingAdminAssignment) && (
                <button
                  className="btn-toggle-device-edit"
                  onClick={() => setShowDeviceAssignForm(!showDeviceAssignForm)}
                >
                  {showDeviceAssignForm ? '✖ Cancel Form' : (ticket.assigned_device_name ? '✏️ Modify Assignment' : '🚀 Assign Device Now')}
                </button>
              )}
            </div>

            {/* Admin Interactive Assignment Form */}
            {isAdmin && (showDeviceAssignForm || isPendingAdminAssignment) && (
              <form onSubmit={handleAdminDeviceAssignSubmit} className="detail-assign-form">
                <div className="form-field-group">
                  <label>Select Hardware from Company Inventory (Optional):</label>
                  <select
                    value={deviceAssignData.inventory_id}
                    onChange={(e) => {
                      const invId = e.target.value;
                      const invItem = inventoryList.find(i => i.id === invId);
                      setDeviceAssignData({
                        ...deviceAssignData,
                        inventory_id: invId,
                        assigned_device_name: invItem ? invItem.name : deviceAssignData.assigned_device_name
                      });
                    }}
                  >
                    <option value="">-- Custom Hardware Entry --</option>
                    {inventoryList.map(i => (
                      <option key={i.id} value={i.id}>
                        {i.name} ({i.quantity} in stock)
                      </option>
                    ))}
                  </select>
                </div>

                <div className="form-field-group">
                  <label>Assigned Device Name / Model Details *:</label>
                  <input
                    type="text"
                    value={deviceAssignData.assigned_device_name}
                    onChange={(e) => setDeviceAssignData({ ...deviceAssignData, assigned_device_name: e.target.value })}
                    placeholder="e.g. MacBook Pro 16 Inch (Serial #MP-2026-X9)"
                    required
                  />
                </div>

                <div className="form-field-group">
                  <label>Admin Fulfillment Notes & Setup Description:</label>
                  <textarea
                    rows="3"
                    value={deviceAssignData.assignment_description}
                    onChange={(e) => setDeviceAssignData({ ...deviceAssignData, assignment_description: e.target.value })}
                    placeholder="Enter hardware specifications, serial number, workstation location, or setup credentials..."
                  />
                </div>

                <button type="submit" className="btn-submit-fulfillment">
                  🚀 Save Device Assignment & Complete Stage 3
                </button>
              </form>
            )}

            {/* Display Assigned Device Info to All Users */}
            {ticket.assigned_device_name ? (
              <div>
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
                    <p><strong>Admin Fulfillment Instructions & Notes:</strong></p>
                    <p>{ticket.assignment_description}</p>
                  </div>
                )}
              </div>
            ) : (
              !isPendingAdminAssignment && !showDeviceAssignForm && (
                <p className="pending-assignment-text">
                  ⏳ Pending manager review before device assignment.
                </p>
              )
            )}
          </section>
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

          {isAdmin && (
            <div className="action-panel admin-panel-card">
              <h3>⚙️ Admin Management</h3>
              <p className="admin-help-text">You have full administrative privileges to edit or delete any ticket for all users.</p>
              <button className="btn btn-admin-modal-trigger" onClick={() => setShowAdminEditModal(true)}>
                ✏️ Modify All Ticket Fields
              </button>
            </div>
          )}
        </div>
      </div>

      {/* ADMIN EDIT MODAL */}
      {showAdminEditModal && (
        <div className="modal-overlay">
          <div className="modal-content admin-edit-modal">
            <div className="modal-header">
              <h3>✏️ Admin Modify Ticket Fields</h3>
              <button className="modal-close" onClick={() => setShowAdminEditModal(false)}>
                ✖
              </button>
            </div>

            <form onSubmit={handleAdminSave} className="modal-form">
              <div className="form-group">
                <label>Ticket Title *</label>
                <input
                  type="text"
                  name="title"
                  value={editFormData.title}
                  onChange={handleAdminEditChange}
                  required
                />
              </div>

              <div className="form-group">
                <label>Description *</label>
                <textarea
                  name="description"
                  value={editFormData.description}
                  onChange={handleAdminEditChange}
                  rows="4"
                  required
                />
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Type *</label>
                  <select name="type" value={editFormData.type} onChange={handleAdminEditChange}>
                    <option value="device-request">🖥️ Device Request</option>
                    <option value="issue">🐛 Report Issue</option>
                  </select>
                </div>

                <div className="form-group">
                  <label>Priority *</label>
                  <select name="priority" value={editFormData.priority} onChange={handleAdminEditChange}>
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                  </select>
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Category *</label>
                  <input
                    type="text"
                    name="category"
                    value={editFormData.category}
                    onChange={handleAdminEditChange}
                    required
                  />
                </div>

                <div className="form-group">
                  <label>Ticket Status *</label>
                  <select name="status" value={editFormData.status} onChange={handleAdminEditChange}>
                    <option value="pending_manager_approval">🟡 Pending Manager Review</option>
                    <option value="pending_admin_assignment">🟣 Pending Admin Assignment</option>
                    <option value="approved">🟢 Device Assigned & Fulfilled</option>
                    <option value="rejected">🔴 Denied by Manager</option>
                    <option value="closed">⚪ Closed</option>
                  </select>
                </div>
              </div>

              <div className="form-group">
                <label>Assigned Manager</label>
                <select name="manager_id" value={editFormData.manager_id} onChange={handleAdminManagerSelect}>
                  <option value="">-- Unassigned --</option>
                  {managerList.map(mgr => (
                    <option key={mgr.id} value={mgr.id}>
                      {mgr.name} ({mgr.email})
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label>Assigned Device Name / Hardware Details</label>
                <input
                  type="text"
                  name="assigned_device_name"
                  value={editFormData.assigned_device_name}
                  onChange={handleAdminEditChange}
                  placeholder="e.g. MacBook Pro 16 Inch"
                />
              </div>

              <div className="form-group">
                <label>Admin Fulfillment Description & Notes</label>
                <textarea
                  name="assignment_description"
                  value={editFormData.assignment_description}
                  onChange={handleAdminEditChange}
                  rows="3"
                  placeholder="Admin notes or setup instructions..."
                />
              </div>

              <div className="modal-actions">
                <button type="button" className="btn-cancel" onClick={() => setShowAdminEditModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn-save">
                  Save Ticket Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default TicketDetail;
