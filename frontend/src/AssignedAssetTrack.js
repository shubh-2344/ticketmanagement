import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import axios from 'axios';
import formatTicketId from './utils/formatTicketId';
import './AssignedAssetTrack.css';
import { 
  DevicesIcon, 
  AlertIcon, 
  CheckIcon, 
  FileTextIcon, 
  SearchIcon,
  ClockIcon,
  UserIcon,
  XIcon
} from './components/Icons';

function AssignedAssetTrack({ API_URL, onSelectTicket }) {
  const [data, setData] = useState({ metrics: null, lifecycles: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedFlowItem, setSelectedFlowItem] = useState(null);

  useEffect(() => {
    fetchLifecycles();

    window.handleOpenLifecycleTrackModal = (item) => {
      if (!item) return;
      if (item.lifecycle_id) {
        setSelectedFlowItem(item);
      } else if (item.id) {
        axios.get(`${API_URL}/asset-lifecycles/ticket/${item.id}`)
          .then(res => setSelectedFlowItem(res.data))
          .catch(err => {
            console.error('Error opening lifecycle track modal:', err);
            setSelectedFlowItem({
              lifecycle_id: 'AST-PENDING',
              request_ticket_id: item.id,
              request_title: item.title,
              request_status: item.status,
              user_name: item.requester_name,
              user_email: item.requester_email,
              asset_name: item.assigned_device_name || 'Awaiting Hardware Allocation',
              lifecycle_status: item.status === 'approved' ? 'Assigned' : 'Pending Assignment',
              assigned_at: item.status === 'approved' ? item.created_at : null
            });
          });
      }
    };

    return () => {
      delete window.handleOpenLifecycleTrackModal;
    };
  }, [API_URL]);

  useEffect(() => {
    if (selectedFlowItem) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [selectedFlowItem]);

  const fetchLifecycles = async () => {
    setLoading(true);
    try {
      const response = await axios.get(`${API_URL}/admin/asset-lifecycles`);
      setData(response.data);
      setError('');
    } catch (err) {
      console.error('Error fetching asset lifecycles:', err);
      setError(err.response?.data?.error || 'Failed to load assigned asset track metrics.');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyReturn = async (ticketId) => {
    if (!ticketId) return;
    const confirmed = window.confirm('Verify physical device return and restore inventory count?');
    if (!confirmed) return;

    try {
      await axios.put(`${API_URL}/tickets/${ticketId}/verify-return`);
      alert('Return verified successfully! Asset inventory restocked.');
      fetchLifecycles();
      if (selectedFlowItem) {
        setSelectedFlowItem(null);
      }
    } catch (err) {
      console.error('Verify return error:', err);
      alert(err.response?.data?.error || 'Verification of device return failed');
    }
  };

  const deriveStatusInfo = (item) => {
    const now = Date.now();
    const isReturned = item.lifecycle_status === 'Returned' || item.return_status === 'closed';
    const isPendingReturn = item.lifecycle_status === 'Return Pending' || item.return_status === 'return_pending_verification';
    const isOverdue = !isReturned && item.expected_return_date && new Date(item.expected_return_date).getTime() < now;

    if (isReturned) {
      return {
        key: 'returned',
        label: 'RETURNED',
        className: 'badge-returned',
        isReturned: true,
        isPendingReturn: false,
        isOverdue: false
      };
    }

    if (isPendingReturn) {
      return {
        key: 'pending_return',
        label: 'PENDING RETURN',
        className: 'badge-pending-return',
        isReturned: false,
        isPendingReturn: true,
        isOverdue: false
      };
    }

    if (isOverdue) {
      const days = Math.floor((now - new Date(item.expected_return_date).getTime()) / (1000 * 3600 * 24));
      return {
        key: 'overdue',
        label: `OVERDUE (${days > 0 ? `${days}d` : 'Today'})`,
        className: 'badge-overdue',
        isReturned: false,
        isPendingReturn: false,
        isOverdue: true
      };
    }

    return {
      key: 'in_use',
      label: 'IN USE',
      className: 'badge-in-use',
      isReturned: false,
      isPendingReturn: false,
      isOverdue: false
    };
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return 'N/A';
    return new Date(dateStr).toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const formatDateTime = (dateStr) => {
    if (!dateStr) return 'N/A';
    return new Date(dateStr).toLocaleString(undefined, {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const computeSlaStatus = (createdDate, targetDate, isClosed, closedDate) => {
    if (!targetDate) return { text: 'SLA: Standard (48h)', state: 'normal' };
    const targetTime = new Date(targetDate).getTime();
    const endTime = isClosed && closedDate ? new Date(closedDate).getTime() : Date.now();
    const diff = targetTime - endTime;

    if (diff < 0) {
      const hoursOver = Math.abs(Math.floor(diff / 3600000));
      return { text: `SLA Breached (${hoursOver}h overdue)`, state: 'breached' };
    } else {
      const hoursLeft = Math.floor(diff / 3600000);
      return { text: `SLA On Track (${hoursLeft}h remaining)`, state: 'ontrack' };
    }
  };

  const filteredList = data.lifecycles.filter(item => {
    const statusInfo = deriveStatusInfo(item);

    if (filterStatus === 'in_use' && (statusInfo.isReturned || statusInfo.isPendingReturn)) return false;
    if (filterStatus === 'pending_return' && !statusInfo.isPendingReturn) return false;
    if (filterStatus === 'overdue' && !statusInfo.isOverdue) return false;
    if (filterStatus === 'returned' && !statusInfo.isReturned) return false;

    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase();
      const matchLifecycle = (item.lifecycle_id || '').toLowerCase().includes(q);
      const matchRequest = formatTicketId(item.request_ticket_id, 'device-request').toLowerCase().includes(q);
      const matchReturn = item.return_ticket_id ? formatTicketId(item.return_ticket_id, 'device-return').toLowerCase().includes(q) : false;
      const matchAsset = (item.asset_name || '').toLowerCase().includes(q);
      const matchUser = (item.user_name || '').toLowerCase().includes(q) || (item.user_email || '').toLowerCase().includes(q);

      if (!matchLifecycle && !matchRequest && !matchReturn && !matchAsset && !matchUser) {
        return false;
      }
    }

    return true;
  });

  if (loading) {
    return (
      <div className="track-container loading-state">
        <div className="spinner"></div>
        <p>Loading Assigned Asset Track Diagnostics...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="track-container error-state">
        <AlertIcon size={36} />
        <h3>{error}</h3>
        <button className="btn-retry" onClick={fetchLifecycles}>Retry Loading</button>
      </div>
    );
  }

  return (
    <div className="assigned-asset-track-page">
      {/* Page Header */}
      <div className="track-page-header">
        <div>
          <h2 className="track-page-title">
            <DevicesIcon size={26} className="title-icon" /> Assigned Asset Track
          </h2>
          <p className="track-page-subtitle">
            Lifecycle monitoring for approved hardware requests and returns (AST-YYYY-XXXX tracking)
          </p>
        </div>
        <button className="btn-refresh-track" onClick={fetchLifecycles}>
          Refresh Asset Track
        </button>
      </div>

      {/* Admin Insights KPI Cards */}
      <div className="kpi-grid">
        <div className="kpi-card card-in-use">
          <div className="kpi-header">
            <DevicesIcon size={18} /> ASSETS IN USE
          </div>
          <div className="kpi-value">{data.metrics?.assetsInUse || 0}</div>
          <div className="kpi-footer">Active hardware currently allocated</div>
        </div>

        <div className="kpi-card card-pending">
          <div className="kpi-header">
            <ClockIcon size={18} /> PENDING RETURNS
          </div>
          <div className="kpi-value">{data.metrics?.pendingReturns || 0}</div>
          <div className="kpi-footer">Return requested & awaiting admin verification</div>
        </div>

        <div className="kpi-card card-overdue">
          <div className="kpi-header">
            <AlertIcon size={18} /> OVERDUE RETURNS
          </div>
          <div className="kpi-value">{data.metrics?.overdueReturns || 0}</div>
          <div className="kpi-footer highlight-danger">
            {data.metrics?.overdueReturns > 0 ? 'Urgent: Expected return date passed' : 'No overdue return tickets'}
          </div>
        </div>
      </div>

      {/* Main Track Table Card */}
      <div className="track-table-card">
        <div className="table-controls">
          <div className="search-box">
            <SearchIcon size={16} className="search-icon" />
            <input
              type="text"
              placeholder="Search Lifecycle ID (AST-...), Ticket ID, User, Device..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          <div className="filter-tabs">
            <button
              className={`tab-btn ${filterStatus === 'all' ? 'active' : ''}`}
              onClick={() => setFilterStatus('all')}
            >
              All Lifecycles ({data.lifecycles.length})
            </button>
            <button
              className={`tab-btn tab-in-use ${filterStatus === 'in_use' ? 'active' : ''}`}
              onClick={() => setFilterStatus('in_use')}
            >
              In Use ({data.metrics?.assetsInUse || 0})
            </button>
            <button
              className={`tab-btn tab-pending ${filterStatus === 'pending_return' ? 'active' : ''}`}
              onClick={() => setFilterStatus('pending_return')}
            >
              Pending Returns ({data.metrics?.pendingReturns || 0})
            </button>
            <button
              className={`tab-btn tab-overdue ${filterStatus === 'overdue' ? 'active' : ''}`}
              onClick={() => setFilterStatus('overdue')}
            >
              Overdue ({data.metrics?.overdueReturns || 0})
            </button>
            <button
              className={`tab-btn tab-returned ${filterStatus === 'returned' ? 'active' : ''}`}
              onClick={() => setFilterStatus('returned')}
            >
              Returned
            </button>
          </div>
        </div>

        {filteredList.length === 0 ? (
          <div className="empty-track-state">
            <FileTextIcon size={40} />
            <p>No assigned asset lifecycles found matching your current filter criteria.</p>
          </div>
        ) : (
          <div className="table-wrapper">
            <table className="track-table">
              <thead>
                <tr>
                  <th>LIFECYCLE ID</th>
                  <th>REQUEST TICKET</th>
                  <th>ASSIGNED ASSET</th>
                  <th>USER</th>
                  <th>RETURN TICKET</th>
                  <th>STATUS</th>
                  <th style={{ textAlign: 'right' }}>VERTICAL FLOW</th>
                </tr>
              </thead>
              <tbody>
                {filteredList.map(item => {
                  const statusInfo = deriveStatusInfo(item);
                  return (
                    <tr key={item.lifecycle_id}>
                      <td>
                        <span 
                          className="lifecycle-id-badge"
                          onClick={() => setSelectedFlowItem(item)}
                          title="Click to view full vertical UI flow"
                        >
                          {item.lifecycle_id}
                        </span>
                      </td>
                      <td>
                        <button
                          className="ticket-link-btn"
                          onClick={() => onSelectTicket && onSelectTicket(item.request_ticket_id)}
                        >
                          {formatTicketId(item.request_ticket_id, 'device-request')}
                        </button>
                      </td>
                      <td>
                        <div className="asset-name-cell">{item.asset_name}</div>
                        {item.serial_number && (
                          <div className="asset-sub-text">S/N: {item.serial_number}</div>
                        )}
                      </td>
                      <td>
                        <div className="user-name-cell">{item.user_name}</div>
                        <div className="user-email-cell">{item.user_email}</div>
                      </td>
                      <td>
                        {item.return_ticket_id ? (
                          <button
                            className="ticket-link-btn ret-link"
                            onClick={() => onSelectTicket && onSelectTicket(item.return_ticket_id)}
                          >
                            {formatTicketId(item.return_ticket_id, 'device-return')}
                          </button>
                        ) : (
                          <span className="text-muted">—</span>
                        )}
                      </td>
                      <td>
                        <span className={`status-pill ${statusInfo.className}`}>
                          {statusInfo.label}
                        </span>
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        <button
                          className="btn-view-flow"
                          onClick={() => setSelectedFlowItem(item)}
                        >
                          View Flow ↓
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Interactive Vertical UI Flow Modal / Drawer */}
      {selectedFlowItem && createPortal(
        <div className="flow-modal-backdrop" onClick={() => setSelectedFlowItem(null)}>
          <div className="flow-modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="flow-modal-header">
              <div>
                <h3 className="flow-modal-title">
                  Asset Lifecycle Track: {selectedFlowItem.lifecycle_id}
                </h3>
                <p className="flow-modal-subtitle">
                  Vertical progression & independent SLA tracking for Asset Request & Return
                </p>
              </div>
              <button className="btn-close-modal" onClick={() => setSelectedFlowItem(null)}>
                <XIcon size={20} />
              </button>
            </div>

            <div className="flow-vertical-container">
              {/* STAGE 1 (TOP): REQUEST TICKET */}
              <div className="flow-card stage-request">
                <div className="stage-badge">STAGE 1: REQUEST</div>
                <div className="card-header-row">
                  <div className="ticket-title-group">
                    <span className="flow-ticket-id">
                      {formatTicketId(selectedFlowItem.request_ticket_id, 'device-request')}
                    </span>
                    <h4 className="flow-title-text">{selectedFlowItem.request_title || 'Hardware Asset Request'}</h4>
                  </div>
                  <span className={`flow-status-pill status-${(selectedFlowItem.request_status || 'approved').toLowerCase()}`}>
                    {selectedFlowItem.request_status === 'pending_manager_approval' 
                      ? 'PENDING MANAGER REVIEW' 
                      : (selectedFlowItem.request_status === 'pending_admin_assignment' 
                        ? 'PENDING ADMIN ASSIGNMENT' 
                        : (selectedFlowItem.request_status ? selectedFlowItem.request_status.toUpperCase() : 'APPROVED'))}
                  </span>
                </div>
                <div className="card-details-grid">
                  <div>
                    <span className="label">Requested By:</span>
                    <span className="val">{selectedFlowItem.user_name} ({selectedFlowItem.user_email})</span>
                  </div>
                  <div>
                    <span className="label">Date Created:</span>
                    <span className="val">{formatDateTime(selectedFlowItem.request_created_at || selectedFlowItem.created_at)}</span>
                  </div>
                </div>
                {/* Separate Request SLA Clock */}
                {(() => {
                  const sla = computeSlaStatus(
                    selectedFlowItem.request_created_at,
                    selectedFlowItem.request_target_date,
                    selectedFlowItem.request_status === 'approved' || selectedFlowItem.request_status === 'closed',
                    selectedFlowItem.assigned_at
                  );
                  return (
                    <div className={`sla-badge-row sla-${sla.state}`}>
                      <ClockIcon size={14} /> Request SLA: {sla.text}
                    </div>
                  );
                })()}
              </div>

              {/* DOWNWARD FORWARD ARROW (Request -> Assigned) */}
              <div className="vertical-arrow-divider forward-arrow">
                <div className="arrow-line"></div>
                <div className="arrow-head">↓</div>
                <div className="arrow-label">Request Approved → Asset Assigned</div>
              </div>

              {/* STAGE 2 (MIDDLE): ASSET ASSIGNED */}
              <div className="flow-card stage-assigned">
                <div className="stage-badge badge-middle">STAGE 2: ASSET ASSIGNED</div>
                <div className="card-header-row">
                  <div className="ticket-title-group">
                    <span className="flow-lifecycle-badge">{selectedFlowItem.lifecycle_id}</span>
                    <h4 className="flow-title-text">{selectedFlowItem.asset_name}</h4>
                  </div>
                  <span className={`status-pill ${deriveStatusInfo(selectedFlowItem).className}`}>
                    {deriveStatusInfo(selectedFlowItem).label}
                  </span>
                </div>
                <div className="card-details-grid">
                  <div>
                    <span className="label">Category:</span>
                    <span className="val">{selectedFlowItem.inventory_category || 'Hardware'}</span>
                  </div>
                  <div>
                    <span className="label">Serial / Model:</span>
                    <span className="val">{selectedFlowItem.serial_number || 'N/A'}</span>
                  </div>
                  <div>
                    <span className="label">Date Assigned:</span>
                    <span className="val">{formatDate(selectedFlowItem.assigned_at)}</span>
                  </div>
                  <div>
                    <span className="label">Expected Return:</span>
                    <span className="val highlight-date">{formatDate(selectedFlowItem.expected_return_date)}</span>
                  </div>
                </div>
              </div>

              {/* UPWARD BACKWARD ARROW (Assigned -> Return Flow) */}
              <div className="vertical-arrow-divider backward-arrow">
                <div className="arrow-line"></div>
                <div className="arrow-head">↑</div>
                <div className="arrow-label">Hardware Return Flow Progression</div>
              </div>

              {/* STAGE 3 (BOTTOM): RETURN TICKET */}
              <div className="flow-card stage-return">
                <div className="stage-badge badge-bottom">STAGE 3: RETURN</div>
                {selectedFlowItem.return_ticket_id ? (
                  <>
                    <div className="card-header-row">
                      <div className="ticket-title-group">
                        <span className="flow-ticket-id ret-id">
                          {formatTicketId(selectedFlowItem.return_ticket_id, 'device-return')}
                        </span>
                        <h4 className="flow-title-text">{selectedFlowItem.return_title || `Return Request for ${selectedFlowItem.asset_name}`}</h4>
                      </div>
                      <span className={`flow-status-pill status-${(selectedFlowItem.return_status || 'pending').toLowerCase()}`}>
                        {selectedFlowItem.return_status ? selectedFlowItem.return_status.toUpperCase() : 'RETURN PENDING'}
                      </span>
                    </div>
                    <div className="card-details-grid">
                      <div>
                        <span className="label">Return Requested On:</span>
                        <span className="val">{formatDateTime(selectedFlowItem.return_created_at)}</span>
                      </div>
                      <div>
                        <span className="label">Returned & Restocked At:</span>
                        <span className="val">{selectedFlowItem.returned_at ? formatDateTime(selectedFlowItem.returned_at) : 'Awaiting Physical Verification'}</span>
                      </div>
                    </div>

                    {/* Separate Return SLA Clock */}
                    {(() => {
                      const sla = computeSlaStatus(
                        selectedFlowItem.return_created_at,
                        selectedFlowItem.return_target_date,
                        selectedFlowItem.return_status === 'closed',
                        selectedFlowItem.returned_at
                      );
                      return (
                        <div className={`sla-badge-row sla-${sla.state}`}>
                          <ClockIcon size={14} /> Return SLA: {sla.text}
                        </div>
                      );
                    })()}

                    {selectedFlowItem.return_status === 'return_pending_verification' && (
                      <div className="flow-action-row">
                        <button
                          className="btn-verify-now"
                          onClick={() => handleVerifyReturn(selectedFlowItem.return_ticket_id)}
                        >
                          <CheckIcon size={16} /> Verify Return & Restock Inventory
                        </button>
                      </div>
                    )}
                  </>
                ) : (
                  <div className="no-return-state">
                    <ClockIcon size={24} />
                    <p>No return ticket initiated yet. Asset is currently active with user.</p>
                  </div>
                )}
              </div>
            </div>

            <div className="flow-modal-footer">
              <button
                className="btn-modal-close-action"
                onClick={() => setSelectedFlowItem(null)}
              >
                Close Lifecycle View
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}

export default AssignedAssetTrack;
