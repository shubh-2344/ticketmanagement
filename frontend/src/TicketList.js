import React from 'react';
import './TicketList.css';
import ViewToggle from './components/ViewToggle';
import formatTicketId from './utils/formatTicketId';
import { 
  DevicesIcon, 
  HardwareIcon, 
  AccessIcon, 
  SoftwareIcon 
} from './components/Icons';

function TicketList({ tickets, currentUser, onViewTicket, viewMode = 'grid', onViewModeChange }) {
  const getStatusBadge = (status, type) => {
    switch (status) {
      case 'pending_manager_approval':
        return { text: 'Manager Review', bg: 'rgba(245, 158, 11, 0.2)', border: '1px solid rgba(245, 158, 11, 0.4)', color: '#fbbf24' };
      case 'pending_admin_assignment':
        return { text: type === 'issue' ? 'Pending Admin Action' : 'Admin Device Assignment', bg: 'rgba(139, 92, 246, 0.2)', border: '1px solid rgba(139, 92, 246, 0.4)', color: '#c084fc' };
      case 'approved':
        return { text: type === 'issue' ? 'Resolved' : 'Device Assigned', bg: 'rgba(34, 197, 94, 0.2)', border: '1px solid rgba(34, 197, 94, 0.4)', color: '#4ade80' };
      case 'rejected':
        return { text: 'Denied by Manager', bg: 'rgba(239, 68, 68, 0.2)', border: '1px solid rgba(239, 68, 68, 0.4)', color: '#fca5a5' };
      case 'closed':
        return { text: 'Closed / Resolved', bg: 'rgba(34, 197, 94, 0.15)', border: '1px solid rgba(34, 197, 94, 0.3)', color: '#4ade80' };
      default:
        return { text: status.toUpperCase(), bg: 'rgba(56, 189, 248, 0.2)', border: '1px solid rgba(56, 189, 248, 0.4)', color: '#38bdf8' };
    }
  };

  const getCategoryIcon = (category) => {
    const cat = (category || '').toLowerCase();
    if (cat.includes('hardware') || cat.includes('laptop') || cat.includes('monitor') || cat.includes('keyboard')) {
      return <DevicesIcon size={14} style={{ marginRight: '6px' }} />;
    } else if (cat.includes('access') || cat.includes('permission') || cat.includes('network')) {
      return <AccessIcon size={14} style={{ marginRight: '6px' }} />;
    } else if (cat.includes('software') || cat.includes('app') || cat.includes('install')) {
      return <SoftwareIcon size={14} style={{ marginRight: '6px' }} />;
    }
    return <HardwareIcon size={14} style={{ marginRight: '6px' }} />;
  };

  const getTypeColor = (type) => {
    return type === 'device-request' ? '#38bdf8' : '#e2e8f0';
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
    <div className="ticket-list">
      <div className="list-title-bar" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h2>{currentUser.role === 'employee' || !onViewModeChange ? 'My Submitted Tickets' : 'Tickets Overview'}</h2>
        {onViewModeChange && (
          <ViewToggle viewMode={viewMode} onViewModeChange={onViewModeChange} />
        )}
      </div>

      {tickets.length === 0 ? (
        <div className="empty-state">
          <p>No tickets found. Click "Create Ticket" to get started!</p>
        </div>
      ) : viewMode === 'table' ? (
        /* TABLE VIEW LAYOUT */
        <div className="table-responsive-container" style={{ width: '100%' }}>
          <table className="tickets-table-view" style={{ width: '100%', tableLayout: 'fixed' }}>
            <thead>
              <tr>
                <th style={{ width: '12%' }}>ID</th>
                <th style={{ width: '25%' }}>TITLE & TYPE</th>
                <th style={{ width: '15%' }}>REQUESTER</th>
                <th className="col-manager" style={{ width: '13%' }}>ASSIGNED MANAGER</th>
                <th style={{ width: '9%' }}>PRIORITY</th>
                <th style={{ width: '13%' }}>STATUS</th>
                <th className="col-device" style={{ width: '13%' }}>ASSIGNED DEVICE</th>
                <th className="col-date" style={{ width: '10%' }}>DATE</th>
              </tr>
            </thead>
            <tbody>
              {tickets.map((t) => {
                const statusInfo = getStatusBadge(t.status, t.type);
                return (
                  <tr key={t.id} onClick={() => onViewTicket(t)} className="clickable-row">
                    <td className="ticket-id-cell">
                      {formatTicketId(t.id, t.type)}
                    </td>
                    <td>
                      <div className="table-title-cell">
                        <strong style={{ display: 'block', marginBottom: '2px', wordBreak: 'break-word' }}>{t.title}</strong>
                        <span className="mini-type-tag" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                          {getCategoryIcon(t.category)}
                          {t.type === 'device-request' ? 'Device' : (t.type === 'device-return' ? 'Asset Return' : 'Issue')}
                        </span>
                      </div>
                    </td>
                    <td>{t.requester_name}</td>
                    <td className="col-manager">{(t.type === 'issue' || t.type === 'device-return') ? 'N/A - Direct Admin' : (t.manager_name || 'Manager')}</td>
                    <td><span className={`priority-text ${t.priority}`}>{t.priority.toUpperCase()}</span></td>
                    <td>
                      <span className="status-pill-table" style={{ background: statusInfo.bg, border: statusInfo.border, color: statusInfo.color }}>
                        {statusInfo.text}
                      </span>
                    </td>
                    <td className="col-device">{t.assigned_device_name || '-'}</td>
                    <td className="col-date"><small>{formatDate(t.created_at)}</small></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : viewMode === 'compact' ? (
        /* COMPACT LIST VIEW LAYOUT */
        <div className="compact-list-container">
          {tickets.map((ticket) => {
            const statusInfo = getStatusBadge(ticket.status, ticket.type);
            return (
              <div key={ticket.id} className="compact-row" onClick={() => onViewTicket(ticket)}>
                <div className="compact-left">
                  <span className="compact-type" style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
                    {getCategoryIcon(ticket.category)}
                  </span>
                  <div className="compact-title-group">
                    <h4>{formatTicketId(ticket.id, ticket.type)}: {ticket.title}</h4>
                    <small>By {ticket.requester_name}{ticket.type !== 'issue' && ` • Manager: ${ticket.manager_name || 'Manager'}`}</small>
                  </div>
                </div>
                <div className="compact-right">
                  <span className="badge status-pill" style={{ background: statusInfo.bg, border: statusInfo.border, color: statusInfo.color }}>
                    {statusInfo.text}
                  </span>
                  <small className="compact-date">{formatDate(ticket.created_at)}</small>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* DEFAULT GRID CARDS VIEW LAYOUT */
        <div className="tickets-grid">
          {tickets.map((ticket) => {
            const statusInfo = getStatusBadge(ticket.status, ticket.type);

            return (
              <div
                key={ticket.id}
                className="ticket-card"
                onClick={() => onViewTicket(ticket)}
              >
                <div className="ticket-header">
                  <div>
                    <span style={{ fontSize: '11px', fontFamily: 'monospace', color: 'var(--text-muted)', display: 'block', marginBottom: '2px' }}>
                      {formatTicketId(ticket.id, ticket.type)}
                    </span>
                    <h3>{ticket.title}</h3>
                  </div>
                  <div className="ticket-badges">
                    <span
                      className="badge"
                      style={{ backgroundColor: getTypeColor(ticket.type), display: 'inline-flex', alignItems: 'center' }}
                    >
                      {getCategoryIcon(ticket.category)}
                      {ticket.type === 'device-request' ? 'Device' : 'Issue'}
                    </span>
                    <span
                      className="badge status-pill"
                      style={{
                        background: statusInfo.bg,
                        border: statusInfo.border,
                        color: statusInfo.color
                      }}
                    >
                      {statusInfo.text}
                    </span>
                  </div>
                </div>

                <p className="ticket-description">{ticket.description}</p>

                <div className="ticket-meta">
                  <div className="meta-item">
                    <span className="label">{ticket.type === 'issue' ? 'Workflow:' : 'Assigned Manager:'}</span>
                    <span className="value">{ticket.type === 'issue' ? 'Direct Admin Approval' : (ticket.manager_name || 'Manager')}</span>
                  </div>
                  <div className="meta-item">
                    <span className="label">Priority:</span>
                    <span className="value uppercase">{ticket.priority}</span>
                  </div>
                </div>

                {ticket.assigned_device_name && (
                  <div className="device-assigned-preview">
                    <span>{ticket.type === 'issue' ? 'Resolution' : 'Assigned Device'}: <strong>{ticket.assigned_device_name}</strong></span>
                  </div>
                )}

                <div className="ticket-footer">
                  <div className="requester">
                    <small>Requested by: {ticket.requester_name}</small>
                  </div>
                  <div className="date">
                    <small>{formatDate(ticket.created_at)}</small>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default TicketList;
