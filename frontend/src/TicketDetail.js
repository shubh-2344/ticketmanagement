import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './TicketDetail.css';
import formatTicketId from './utils/formatTicketId';
import { 
  EditIcon, 
  TrashIcon, 
  ClockIcon, 
  SparklesIcon,
  CheckIcon,
  XIcon,
  SettingsIcon,
  BarChartIcon
} from './components/Icons';

function TicketDetail({ ticket, currentUser, onApprove, onReject, onClose, onBack, onAdminUpdate, onAdminDelete, onRefresh, API_URL }) {
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
    approval_comment: ticket.approval_comment || ''
  });

  const [extendHours, setExtendHours] = useState(24);
  const [extendReason, setExtendReason] = useState('');

  const handleReturnDevice = async () => {
    try {
      const confirmed = await window.showConfirm({
        title: 'Return Device',
        message: 'Are you sure you want to mark this device as returned?',
        confirmText: 'Return',
        cancelText: 'Cancel',
        confirmType: 'warning'
      });
      if (!confirmed) return;

      await axios.put(`${API_URL}/tickets/${ticket.id}/return-device`);
      alert('Device marked as returned. Awaiting Administrator verification.');
      window.location.reload();
    } catch (err) {
      console.error('Error marking device as returned:', err);
      alert(err.response?.data?.error || 'Failed to mark device as returned.');
    }
  };

  const handleVerifyReturn = async () => {
    try {
      const confirmed = await window.showConfirm({
        title: 'Verify Physical Return',
        message: 'Have you physically verified that the device is returned to stock?',
        confirmText: 'Verify Return',
        cancelText: 'Cancel',
        confirmType: 'success'
      });
      if (!confirmed) return;

      await axios.put(`${API_URL}/tickets/${ticket.id}/verify-return`);
      alert('Device return verified successfully. Asset inventory restocked.');
      window.location.reload();
    } catch (err) {
      console.error('Error verifying device return:', err);
      alert(err.response?.data?.error || 'Verification of return failed.');
    }
  };

  const aiDiagnostics = React.useMemo(() => {
    const descLower = (ticket.description || '').toLowerCase();
    const titleLower = (ticket.title || '').toLowerCase();
    const text = `${titleLower} ${descLower}`;

    let category = ticket.category || 'Software';
    if (text.includes('login') || text.includes('password') || text.includes('auth') || text.includes('permission') || text.includes('account') || text.includes('sso')) {
      category = 'Access & Credentials';
    } else if (text.includes('wifi') || text.includes('internet') || text.includes('vpn') || text.includes('network') || text.includes('router') || text.includes('server')) {
      category = 'Network & Infrastructure';
    } else if (text.includes('macbook') || text.includes('dell') || text.includes('monitor') || text.includes('laptop') || text.includes('keyboard') || text.includes('mouse') || text.includes('hardware') || text.includes('screen') || text.includes('device')) {
      category = 'Hardware & Assets';
    }

    let recommendedEngineer = 'General IT Helpdesk';
    if (category === 'Hardware & Assets') recommendedEngineer = 'Alice Vance (Hardware Specialist)';
    else if (category === 'Network & Infrastructure') recommendedEngineer = 'Charlie Devops (Network Architect)';
    else if (category === 'Access & Credentials') recommendedEngineer = 'Security Ops Team';
    else recommendedEngineer = 'Bob Miller (Senior Software Engineer)';

    const firstSentence = ticket.description ? ticket.description.split(/[.!?]/)[0] : '';
    const aiSummary = firstSentence.length > 120 ? firstSentence.substring(0, 120) + '...' : firstSentence || 'Awaiting description...';

    const slaRisk = (ticket.priority === 'high' || ticket.priority === 'urgent') ? 'CRITICAL RISK' : 'HEALTHY';

    return {
      category,
      recommendedEngineer,
      aiSummary,
      slaRisk
    };
  }, [ticket]);

  const handleExtendSLA = async (e) => {
    e.preventDefault();
    if (!extendReason.trim()) {
      alert('Please enter a reason for the SLA extension.');
      return;
    }

    const currentTarget = ticket.target_resolution_date ? new Date(ticket.target_resolution_date) : new Date();
    currentTarget.setHours(currentTarget.getHours() + parseInt(extendHours, 10));

    const updatedSlaHours = (ticket.sla_hours || 48) + parseInt(extendHours, 10);

    try {
      await axios.put(`${API_URL}/tickets/${ticket.id}/extend-sla`, {
        target_resolution_date: currentTarget.toISOString(),
        sla_hours: updatedSlaHours,
        extension_reason: extendReason
      });
      alert(`SLA successfully extended by ${extendHours} hours!`);
      setExtendReason('');
      window.location.reload();
    } catch (err) {
      console.error('Error extending SLA:', err);
      alert(err.response?.data?.error || 'SLA extension failed.');
    }
  };

  const renderSLADashboard = () => {
    if (!ticket.target_resolution_date) return null;

    const created = new Date(ticket.created_at).getTime();
    const target = new Date(ticket.target_resolution_date).getTime();
    const now = Date.now();

    const totalDuration = target - created;
    const elapsed = now - created;

    let percentage = 0;
    if (totalDuration > 0) {
      percentage = Math.min(100, Math.max(0, (elapsed / totalDuration) * 100));
    }

    const isClosed = ticket.status === 'closed' || ticket.status === 'resolved' || ticket.status === 'rejected';
    const isOverdue = now > target && !isClosed;
    const timeDiff = target - now;

    let timeText = '';
    if (isClosed) {
      timeText = 'Ticket Closed/Resolved - SLA Stopped';
    } else if (isOverdue) {
      const overdueMs = now - target;
      const hours = Math.floor(overdueMs / (1000 * 60 * 60));
      const mins = Math.floor((overdueMs % (1000 * 60 * 60)) / (1000 * 60));
      timeText = `OVERDUE BY: ${hours}h ${mins}m`;
    } else {
      const hours = Math.floor(timeDiff / (1000 * 60 * 60));
      const mins = Math.floor((timeDiff % (1000 * 60 * 60)) / (1000 * 60));
      timeText = `Time Remaining: ${hours}h ${mins}m`;
    }

    let progressColor = '#10b981'; 
    if (isOverdue) {
      progressColor = '#ef4444'; 
    } else if (percentage >= 85) {
      progressColor = '#f97316'; 
    } else if (percentage >= 50) {
      progressColor = '#f59e0b'; 
    }

    return (
      <section className={`section sla-dashboard-card ${isOverdue ? 'overdue' : ''}`} style={{ background: 'var(--bg-card)', border: isOverdue ? '1px solid rgba(239, 68, 68, 0.4)' : 'var(--border-card)', borderRadius: '12px', padding: '20px', marginBottom: '20px' }}>
        <div className="sla-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px', flexWrap: 'wrap', gap: '10px' }}>
          <h2 style={{ fontSize: '1.1rem', margin: 0, color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <BarChartIcon size={18} style={{ color: 'var(--accent)' }} /> SLA Resolution Progress & Risk Details
          </h2>
          <span className="sla-target-badge" style={{ backgroundColor: progressColor, padding: '5px 12px', borderRadius: '8px', fontSize: '0.85rem', color: '#ffffff', fontWeight: 'bold' }}>
            Target: {new Date(ticket.target_resolution_date || (new Date(created).getTime() + 48 * 3600000)).toLocaleString('en-US', {
              month: 'short',
              day: 'numeric',
              hour: '2-digit',
              minute: '2-digit'
            })}
          </span>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px', background: 'var(--bg-body)', padding: '14px', borderRadius: '10px', margin: '12px 0' }}>
          <div>
            <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: '700', textTransform: 'uppercase', display: 'block', marginBottom: '4px' }}>Time Remaining</span>
            <strong style={{ fontSize: '15px', color: isOverdue ? '#ef4444' : '#10b981', fontFamily: 'monospace' }}>{timeText}</strong>
          </div>
          <div>
            <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: '700', textTransform: 'uppercase', display: 'block', marginBottom: '4px' }}>SLA Status</span>
            <strong style={{ fontSize: '14px', color: isClosed ? '#64748b' : (isOverdue ? '#ef4444' : '#10b981') }}>
              {isClosed ? 'Complete' : (isOverdue ? 'SLA Breached' : 'On Track (Normal)')}
            </strong>
          </div>
          <div>
            <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: '700', textTransform: 'uppercase', display: 'block', marginBottom: '4px' }}>Assigned Specialist</span>
            <strong style={{ fontSize: '14px', color: 'var(--text-main)' }}>{ticket.assigned_engineer || ticket.manager_name || 'IT Support Team'}</strong>
          </div>
          <div>
            <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: '700', textTransform: 'uppercase', display: 'block', marginBottom: '4px' }}>Escalation Level</span>
            <span style={{ padding: '2px 8px', borderRadius: '6px', fontSize: '11px', fontWeight: '700', background: 'rgba(168, 85, 247, 0.15)', color: '#c084fc', border: '1px solid rgba(168, 85, 247, 0.3)', display: 'inline-block' }}>
              {ticket.escalation_level || 'Engineer Level 1'}
            </span>
          </div>
        </div>

        <div className="sla-progress-track" style={{ background: 'rgba(0,0,0,0.2)', borderRadius: '8px', height: '10px', overflow: 'hidden', margin: '10px 0' }}>
          <div 
            className="sla-progress-bar"
            style={{ 
              width: `${isClosed ? 100 : percentage}%`, 
              backgroundColor: isClosed ? '#64748b' : progressColor,
              height: '100%',
              transition: 'width 0.4s ease'
            }}
          />
        </div>
        <div className="sla-footer-meta" style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '6px' }}>
          <span>Initial SLA Limit: {ticket.sla_hours || (ticket.priority === 'high' ? 24 : 48)} Hours</span>
          <span>Priority: {(ticket.priority || 'medium').toUpperCase()}</span>
        </div>
      </section>
    );
  };

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
      alert(ticket.type === 'issue' ? 'Please enter a resolution summary.' : 'Please enter or select the assigned device name.');
      return;
    }

    const isIssue = ticket.type === 'issue';

    const confirmed = await window.showConfirm({
      title: isIssue ? 'Confirm Ticket Resolution' : 'Confirm Hardware Assignment',
      message: isIssue 
        ? `Are you sure you want to resolve and complete ticket "${ticket.title}"?`
        : `Are you sure you want to assign "${deviceAssignData.assigned_device_name}" to fulfill this request?`,
      confirmText: isIssue ? 'Resolve Ticket' : 'Assign & Fulfill',
      cancelText: 'Cancel',
      confirmType: 'success'
    });
    if (!confirmed) return;

    try {
      await axios.put(`${API_URL}/tickets/${ticket.id}/admin-assign`, {
        inventory_id: deviceAssignData.inventory_id || null,
        assigned_device_name: deviceAssignData.assigned_device_name,
        assignment_description: deviceAssignData.assignment_description
      });
      alert(isIssue ? 'Incident resolved and completed successfully!' : 'Device assigned and ticket fulfilled successfully!');
      setShowDeviceAssignForm(false);
      if (onRefresh) onRefresh();
      if (onBack) onBack();
    } catch (err) {
      console.error('Error fulfilling ticket:', err);
      alert(err.response?.data?.error || 'Action failed.');
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

  const handleAdminDeleteClick = async () => {
    const confirmed = await window.showConfirm({
      title: 'Delete Ticket',
      message: `Are you sure you want to permanently delete ticket "${ticket.title}"? This action cannot be undone.`,
      confirmText: 'Yes, Delete Ticket',
      cancelText: 'Cancel',
      confirmType: 'danger'
    });
    if (confirmed && onAdminDelete) {
      onAdminDelete(ticket.id);
    }
  };

  const handleApprove = async () => {
    const confirmed = await window.showConfirm({
      title: 'Approve Ticket Request',
      message: 'Are you sure you want to approve this ticket request?',
      confirmText: 'Approve Request',
      cancelText: 'Cancel',
      confirmType: 'success'
    });
    if (confirmed) {
      onApprove(ticket.id, comment);
    }
  };

  const handleReject = async () => {
    if (!comment.trim()) {
      alert('Please add a reason before denying');
      return;
    }
    const confirmed = await window.showConfirm({
      title: 'Deny Ticket Request',
      message: 'Are you sure you want to deny this request?',
      confirmText: 'Deny Request',
      cancelText: 'Cancel',
      confirmType: 'danger'
    });
    if (confirmed) {
      onReject(ticket.id, comment);
    }
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

  const getStatusBadge = (status, type) => {
    switch (status) {
      case 'pending_manager_approval':
        return { text: 'Pending Manager Review', bg: '#f59e0b' };
      case 'pending_admin_assignment':
        return { text: type === 'issue' ? 'Pending Admin Action' : 'Pending Admin Device Assignment', bg: '#8b5cf6' };
      case 'approved':
        return { text: type === 'issue' ? 'Resolved & Closed' : 'Device Assigned & Fulfilled', bg: '#10b981' };
      case 'rejected':
        return { text: 'Denied by Manager', bg: '#ef4444' };
      case 'closed':
        return { text: 'Closed', bg: '#64748b' };
      default:
        return { text: status.toUpperCase(), bg: '#3b82f6' };
    }
  };

  const statusInfo = getStatusBadge(ticket.status, ticket.type);
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
            <button className="btn-admin-edit" onClick={() => setShowAdminEditModal(true)} style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
              <EditIcon size={14} /> Admin Edit Ticket
            </button>
            <button className="btn-admin-delete" onClick={handleAdminDeleteClick} style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
              <TrashIcon size={14} /> Admin Delete
            </button>
          </div>
        )}
      </div>

      <div className="detail-header">
        <div>
          <h1>{ticket.title}</h1>
          <p className="ticket-id">Ticket ID: {formatTicketId(ticket.id, ticket.type)}</p>
        </div>
        <span
          className="status-badge"
          style={{ backgroundColor: statusInfo.bg }}
        >
          {statusInfo.text}
        </span>
      </div>

      {/* Linked Parent / Allocation Ticket Relationship Banner */}
      {ticket.parent_ticket_id && (
        <div style={{ background: 'rgba(56, 189, 248, 0.12)', border: '1px solid rgba(56, 189, 248, 0.4)', borderRadius: '8px', padding: '12px 16px', marginTop: '12px', marginBottom: '16px', color: '#38bdf8', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '16px' }}>🔗</span>
          <div>
            <strong>Linked Parent Ticket:</strong> Initiated from original hardware allocation ticket{' '}
            <strong style={{ textDecoration: 'underline' }}>
              {formatTicketId(ticket.parent_ticket_id)}
            </strong>
          </div>
        </div>
      )}

      {/* Multi-Stage Workflow Timeline Indicator */}
      {ticket.type === 'issue' ? (
        <div className="workflow-timeline issue-timeline">
          <div className={`timeline-step ${ticket.created_at ? 'completed' : ''}`}>
            <div className="step-num">1</div>
            <div className="step-label">Submitted</div>
          </div>
          <div className="step-connector"></div>
          <div className={`timeline-step ${ticket.status === 'approved' || ticket.status === 'closed' ? 'completed' : 'active'}`}>
            <div className="step-num">2</div>
            <div className="step-label">Admin Resolution</div>
          </div>
        </div>
      ) : (
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
      )}

      <div className="detail-container">
        <div className="main-panel">
          {/* SLA Resolution Progress Dashboard */}
          {renderSLADashboard()}

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
                  {ticket.type === 'device-request' ? 'Device Request' : (ticket.type === 'device-return' ? 'Asset Return Request' : 'Issue Report')}
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
              {ticket.type === 'device-request' && (
                <>
                  <div className="detail-item">
                    <span className="label">Reservation Duration:</span>
                    <span className="value">
                      {ticket.reservation_duration === 'custom' ? 'Custom Date' : `${ticket.reservation_duration} Days`}
                    </span>
                  </div>
                  <div className="detail-item">
                    <span className="label">Expected Return Date:</span>
                    <span className="value text-amber">{formatDate(ticket.expected_return_date) || 'Not specified'}</span>
                  </div>
                  {ticket.returned_at && (
                    <div className="detail-item">
                      <span className="label">Returned Date:</span>
                      <span className="value text-cyan">{formatDate(ticket.returned_at)}</span>
                    </div>
                  )}
                </>
              )}
            </div>
          </section>

          {/* ASSET RETURN DETAILED INFORMATION PANEL */}
          {ticket.type === 'device-return' && (
            <section className="section" style={{ background: 'rgba(56, 189, 248, 0.08)', border: '1px solid rgba(56, 189, 248, 0.3)', borderRadius: '10px', padding: '20px' }}>
              <h2 style={{ color: 'var(--accent)', marginTop: 0 }}>Asset Return Details</h2>
              <div className="details-grid">
                <div className="detail-item">
                  <span className="label">Asset Serial Number:</span>
                  <span className="value font-bold" style={{ color: '#38bdf8' }}>{ticket.serial_number || 'N/A'}</span>
                </div>
                <div className="detail-item">
                  <span className="label">Model / Device Details:</span>
                  <span className="value font-bold" style={{ color: '#f8fafc' }}>{ticket.model_number || ticket.assigned_device_name || 'N/A'}</span>
                </div>
                <div className="detail-item">
                  <span className="label">Return Reason:</span>
                  <span className="value font-bold" style={{ color: '#f59e0b' }}>{ticket.return_reason || 'Hardware Upgrade'}</span>
                </div>
                <div className="detail-item">
                  <span className="label">Return Verification Status:</span>
                  <span className="value font-bold" style={{ color: ticket.status === 'closed' ? '#10b981' : '#38bdf8' }}>
                    {ticket.status === 'closed' ? 'Returned & Inventory Restocked' : 'Pending Physical Verification by Admin'}
                  </span>
                </div>
              </div>

              {isAdmin && ticket.status === 'return_pending_verification' && (
                <div style={{ marginTop: '18px', paddingTop: '14px', borderTop: '1px solid rgba(255,255,255,0.1)' }}>
                  <button
                    onClick={() => handleVerifyReturn(ticket.id)}
                    style={{ padding: '10px 20px', borderRadius: '8px', background: '#10b981', border: 'none', color: '#ffffff', fontWeight: '700', cursor: 'pointer', boxShadow: '0 4px 12px rgba(16, 185, 129, 0.3)' }}
                  >
                    Verify Physical Return & Restock Inventory
                  </button>
                </div>
              )}
            </section>
          )}

          <section className="section">
            <h2>Requester & Assigned Manager</h2>
            <div className="details-grid">
              <div className="detail-item">
                <span className="label">Requester Name:</span>
                <span className="value">{ticket.requester_name} ({ticket.requester_email})</span>
              </div>
              <div className="detail-item">
                <span className="label">Assigned Manager:</span>
                <span className="value">{(ticket.type === 'issue' || ticket.type === 'device-return') ? 'N/A - Direct Admin' : (ticket.manager_name || 'Assigned Manager')}</span>
              </div>
            </div>
          </section>

          {/* STAGE 2: Manager Review Details (ONLY for Device Request Tickets) */}
          {ticket.type === 'device-request' && ticket.approver_name && (
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
              <h2>{ticket.type === 'issue' ? 'STAGE 2: Admin Resolution & Fulfillment' : 'STAGE 3: Admin Device Assignment & Fulfillment'}</h2>
              {isAdmin && (ticket.assigned_device_name || isPendingAdminAssignment) && (
                <button
                  className="btn-toggle-device-edit"
                  onClick={() => setShowDeviceAssignForm(!showDeviceAssignForm)}
                >
                  {showDeviceAssignForm ? 'Cancel Form' : (ticket.assigned_device_name ? 'Modify Resolution' : 'Resolve Issue Now')}
                </button>
              )}
            </div>

            {/* Admin Interactive Assignment Form */}
            {isAdmin && (showDeviceAssignForm || isPendingAdminAssignment) && (
              <form onSubmit={handleAdminDeviceAssignSubmit} className="detail-assign-form">
                {ticket.type !== 'issue' && (
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
                )}

                <div className="form-field-group">
                  <label>{ticket.type === 'issue' ? 'Resolution Summary / Status *:' : 'Assigned Device Name / Model Details *:'}</label>
                  <input
                    type="text"
                    value={deviceAssignData.assigned_device_name}
                    onChange={(e) => setDeviceAssignData({ ...deviceAssignData, assigned_device_name: e.target.value })}
                    placeholder={ticket.type === 'issue' ? 'e.g. Access granted to DB server / software updated' : 'e.g. MacBook Pro 16 Inch (Serial #MP-2026-X9)'}
                    required
                  />
                </div>

                <div className="form-field-group">
                  <label>{ticket.type === 'issue' ? 'Admin Resolution Description & Setup Notes:' : 'Admin Fulfillment Notes & Setup Description:'}</label>
                  <textarea
                    rows="3"
                    value={deviceAssignData.assignment_description}
                    onChange={(e) => setDeviceAssignData({ ...deviceAssignData, assignment_description: e.target.value })}
                    placeholder={ticket.type === 'issue' ? 'Enter detailed resolution details, troubleshooting steps, or credentials setup instructions...' : 'Enter hardware specifications, serial number, workstation location, or setup credentials...'}
                  />
                </div>

                <button type="submit" className="btn-submit-fulfillment">
                  {ticket.type === 'issue' ? 'Save Resolution & Complete Stage 2' : 'Save Device Assignment & Complete Stage 3'}
                </button>
              </form>
            )}

            {/* Display Assigned Device Info to All Users */}
            {ticket.assigned_device_name ? (
              <div>
                <div className="details-grid">
                  <div className="detail-item">
                    <span className="label">{ticket.type === 'issue' ? 'Resolution Action:' : 'Assigned Hardware Device:'}</span>
                    <span className="value font-bold text-cyan">{ticket.assigned_device_name}</span>
                  </div>
                  <div className="detail-item">
                    <span className="label">{ticket.type === 'issue' ? 'Resolution Date:' : 'Fulfillment Date:'}</span>
                    <span className="value">{formatDate(ticket.assigned_at)}</span>
                  </div>
                </div>
                {ticket.assignment_description && (
                  <div className="assignment-notes">
                    <p><strong>{ticket.type === 'issue' ? 'Admin Resolution Instructions & Notes:' : 'Admin Fulfillment Instructions & Notes:'}</strong></p>
                    <p>{ticket.assignment_description}</p>
                  </div>
                )}
              </div>
            ) : (
              !isPendingAdminAssignment && !showDeviceAssignForm && (
                <p className="pending-assignment-text">
                  {ticket.type === 'issue' ? '⏳ Pending Administrator review and resolution.' : '⏳ Pending manager review before device assignment.'}
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
                    <CheckIcon size={14} /> Approve & Pass to Admin
                  </button>
                  <button
                    className="btn btn-reject"
                    onClick={() => setShowApprovalForm(true)}
                  >
                    <XIcon size={14} /> Deny Request
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
                      <CheckIcon size={14} /> Approve (Send to Admin)
                    </button>
                    <button
                      className="btn btn-reject"
                      onClick={handleReject}
                    >
                      <XIcon size={14} /> Deny Request
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
                <CheckIcon size={14} /> Close Ticket
              </button>
            </div>
          )}

          {/* Device Return Actions (ONLY for Hardware Device Request Tickets) */}
          {ticket.type === 'device-request' && ticket.status === 'approved' && ticket.assigned_device_name && !ticket.returned_at && (isRequester || isAdmin || isManager) && (
            <div className="action-panel">
              <h3>Device Return Workflow</h3>
              <p className="admin-help-text">Click below to submit this device back to IT inventory.</p>
              <button
                className="btn btn-approve"
                style={{ background: 'linear-gradient(135deg, #a855f7, #7c3aed)', width: '100%' }}
                onClick={handleReturnDevice}
              >
                Mark Device as Returned
              </button>
            </div>
          )}

          {ticket.type === 'device-request' && ticket.status === 'return_pending_verification' && isAdmin && (
            <div className="action-panel admin-panel-card">
              <h3>Verify Device Return</h3>
              <p className="admin-help-text">Please confirm that the user has returned the device to IT inventory.</p>
              <button
                className="btn btn-approve"
                style={{ width: '100%' }}
                onClick={handleVerifyReturn}
              >
                <CheckIcon size={14} /> Confirm Physical Return
              </button>
            </div>
          )}

          {isAdmin && (
            <div className="action-panel admin-panel-card">
              <h3>Admin Management</h3>
              <p className="admin-help-text">You have full administrative privileges to edit or delete any ticket for all users.</p>
              <button className="btn btn-admin-modal-trigger" onClick={() => setShowAdminEditModal(true)}>
                <EditIcon size={14} /> Modify Ticket Fields
              </button>
            </div>
          )}

          {isAdmin && ticket.status !== 'closed' && ticket.status !== 'approved' && ticket.status !== 'rejected' && (
            <div className="action-panel admin-panel-card sla-extension-panel">
              <h3>Extend Ticket SLA</h3>
              <p className="admin-help-text">You can increase the resolution SLA or extend the resolution date for this ticket.</p>
              
              <form onSubmit={handleExtendSLA} className="sla-extend-form">
                <div className="form-group" style={{ marginBottom: '12px' }}>
                  <label style={{ fontSize: '0.8rem', color: '#cbd5e1' }}>Extension Duration:</label>
                  <select 
                    value={extendHours} 
                    onChange={(e) => setExtendHours(parseInt(e.target.value, 10))}
                    style={{ padding: '8px', background: '#1e293b', color: '#f8fafc', width: '100%', border: '1px solid #475569', borderRadius: '6px' }}
                  >
                    <option value={12}>+12 Hours</option>
                    <option value={24}>+24 Hours (1 Day)</option>
                    <option value={48}>+48 Hours (2 Days)</option>
                    <option value={72}>+72 Hours (3 Days)</option>
                    <option value={168}>+168 Hours (1 Week)</option>
                  </select>
                </div>

                <div className="form-group" style={{ marginBottom: '12px' }}>
                  <label style={{ fontSize: '0.8rem', color: '#cbd5e1' }}>Reason for Extension *</label>
                  <textarea 
                    value={extendReason} 
                    onChange={(e) => setExtendReason(e.target.value)}
                    placeholder="e.g. Waiting for vendor parts / client feedback..."
                    rows={2}
                    required
                    style={{ padding: '8px', background: '#1e293b', color: '#f8fafc', width: '100%', border: '1px solid #475569', borderRadius: '6px', fontSize: '0.85rem' }}
                  />
                </div>

                <button type="submit" className="btn btn-primary" style={{ padding: '10px', fontSize: '0.85rem' }}>
                  Extend Resolution Time
                </button>
              </form>
            </div>
          )}
        </div>
      </div>

      {/* ADMIN EDIT MODAL */}
      {showAdminEditModal && (
        <div className="modal-overlay">
          <div className="modal-content admin-edit-modal">
            <div className="modal-header">
              <h3>Admin Modify Ticket Fields</h3>
              <button className="modal-close" onClick={() => setShowAdminEditModal(false)}>
                <XIcon size={16} />
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
                    <option value="device-request">Device Request</option>
                    <option value="issue">Report Issue</option>
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
                    <option value="pending_manager_approval">Pending Manager Review</option>
                    <option value="pending_admin_assignment">Pending Admin Assignment</option>
                    <option value="approved">Device Assigned & Fulfilled</option>
                    <option value="rejected">Denied by Manager</option>
                    <option value="closed">Closed</option>
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
