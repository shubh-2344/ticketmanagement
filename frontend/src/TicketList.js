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
  const getStatusBadge = (status, type, isRejected) => {
    if (isRejected || status === 'rejected') {
      return { text: 'REJECTED', bg: 'rgba(239, 68, 68, 0.2)', border: '1px solid rgba(239, 68, 68, 0.4)', color: '#fca5a5' };
    }
    const isIssue = type === 'issue';
    switch (status) {
      case 'pending_manager_approval':
        return { text: 'Pending Manager Review', bg: 'rgba(245, 158, 11, 0.2)', border: '1px solid rgba(245, 158, 11, 0.4)', color: '#fbbf24' };
      case 'pending_admin_assignment':
      case 'pending':
        return { text: isIssue ? 'Pending IT Action' : 'Pending Admin Device Assignment', bg: 'rgba(139, 92, 246, 0.2)', border: '1px solid rgba(139, 92, 246, 0.4)', color: '#c084fc' };
      case 'approved':
        return { text: isIssue ? 'Resolved by IT' : 'Device Assigned', bg: 'rgba(34, 197, 94, 0.2)', border: '1px solid rgba(34, 197, 94, 0.4)', color: '#4ade80' };
      case 'closed':
        return { text: isIssue ? 'Resolved & Closed' : 'Fulfilled & Closed', bg: 'rgba(34, 197, 94, 0.15)', border: '1px solid rgba(34, 197, 94, 0.3)', color: '#4ade80' };
      default:
        return { text: status.toUpperCase().replace(/_/g, ' '), bg: 'rgba(56, 189, 248, 0.2)', border: '1px solid rgba(56, 189, 248, 0.4)', color: '#38bdf8' };
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
        <h2>{currentUser.role === 'employee' || !onViewModeChange ? 'My Tickets' : 'Tickets Overview'}</h2>
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
                <th className="col-manager" style={{ width: '15%' }}>CURRENTLY WITH</th>
                <th style={{ width: '9%' }}>PRIORITY</th>
                <th style={{ width: '13%' }}>STATUS</th>
                <th className="col-device" style={{ width: '13%' }}>ASSIGNED DEVICE</th>
                <th className="col-date" style={{ width: '10%' }}>DATE</th>
              </tr>
            </thead>
            <tbody>
              {tickets.map((t) => {
                const isRejected = t.is_rejected || t.status === 'rejected' || !!(t.rejection_comment && t.rejection_comment.trim());
                const statusInfo = getStatusBadge(t.status, t.type, isRejected);
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
                    <td className="col-manager">
                      <div style={{ fontWeight: '600', color: t.assigned_admin_name ? '#38bdf8' : 'var(--text-main)' }}>
                        {t.type === 'issue'
                          ? (t.assigned_admin_name || t.assigned_engineer || 'IT Admin Desk')
                          : (t.status === 'pending_manager_approval' ? (t.manager_name || 'Manager Review') : (t.assigned_admin_name || t.assigned_engineer || 'IT Admin Desk'))
                        }
                      </div>
                    </td>
                    <td><span className={`priority-text ${t.priority}`}>{t.priority.toUpperCase()}</span></td>
                    <td>
                      <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                        {isRejected && (
                          <span className="status-pill-table" style={{ background: 'rgba(239, 68, 68, 0.2)', border: '1px solid rgba(239, 68, 68, 0.4)', color: '#fca5a5', fontWeight: '800' }}>
                            REJECTED
                          </span>
                        )}
                        <span className="status-pill-table" style={{ background: isRejected ? 'rgba(100, 116, 139, 0.2)' : statusInfo.bg, border: isRejected ? '1px solid rgba(100, 116, 139, 0.4)' : statusInfo.border, color: isRejected ? '#94a3b8' : statusInfo.color }}>
                          {isRejected ? 'Closed' : statusInfo.text}
                        </span>
                      </div>
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
              const isRejected = ticket.is_rejected || ticket.status === 'rejected' || !!(ticket.rejection_comment && ticket.rejection_comment.trim());
              const statusInfo = getStatusBadge(ticket.status, ticket.type, isRejected);
              return (
                <div key={ticket.id} className="ticket-card clickable-card" onClick={() => onViewTicket(ticket)}>
                  <div className="card-header">
                    <div>
                      <span className="ticket-id-tag">{formatTicketId(ticket.id, ticket.type)}</span>
                      <h3 className="ticket-title">{ticket.title}</h3>
                    </div>
                    <div style={{ display: 'flex', gap: '4px' }}>
                      {isRejected && (
                        <span className="status-pill" style={{ background: 'rgba(239, 68, 68, 0.2)', border: '1px solid rgba(239, 68, 68, 0.4)', color: '#fca5a5', fontWeight: '800' }}>
                          REJECTED
                        </span>
                      )}
                      <span
                        className="status-pill"
                        style={{ background: isRejected ? 'rgba(100, 116, 139, 0.2)' : statusInfo.bg, border: isRejected ? '1px solid rgba(100, 116, 139, 0.4)' : statusInfo.border, color: isRejected ? '#94a3b8' : statusInfo.color }}
                      >
                        {isRejected ? 'Closed' : statusInfo.text}
                      </span>
                    </div>
                  </div>

                  <p className="ticket-description">{ticket.description}</p>
                  
                  {isRejected ? (
                    <div style={{ fontSize: '11px', color: '#fca5a5', background: 'rgba(239, 68, 68, 0.1)', padding: '6px 10px', borderRadius: '6px', marginBottom: '10px', border: '1px solid rgba(239, 68, 68, 0.2)' }}>
                      🚫 <strong>Rejection Comment:</strong> {ticket.rejection_comment || ticket.approval_comment || 'Request denied by Admin'}
                    </div>
                  ) : (
                    ticket.reassignment_comment && (
                      <div style={{ fontSize: '11px', color: '#38bdf8', background: 'rgba(56, 189, 248, 0.1)', padding: '6px 10px', borderRadius: '6px', marginBottom: '10px' }}>
                        💬 <strong>Reassignment Note:</strong> {ticket.reassignment_comment}
                      </div>
                    )
                  )}<small className="compact-date">{formatDate(ticket.created_at)}</small>
                </div>
              );
            })}
        </div>
      ) : (
        /* DEFAULT GRID CARDS VIEW LAYOUT */
        <div className="tickets-grid">
          {tickets.map((ticket) => {
            const isRejected = ticket.is_rejected || ticket.status === 'rejected' || (ticket.approval_comment && ticket.approval_comment.toLowerCase().includes('reject')) || (ticket.reassignment_comment && ticket.reassignment_comment.toLowerCase().includes('wrong'));
            const statusInfo = getStatusBadge(ticket.status, ticket.type, isRejected);

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
                    {isRejected ? (
                      <span
                        className="badge status-pill"
                        style={{
                          background: 'rgba(239, 68, 68, 0.2)',
                          border: '1px solid rgba(239, 68, 68, 0.4)',
                          color: '#fca5a5',
                          fontWeight: '800'
                        }}
                      >
                        REJECTED
                      </span>
                    ) : (
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
                    )}
                  </div>
                </div>

                <p className="ticket-description">{ticket.description}</p>

                <div className="ticket-meta">
                  <div className="meta-item">
                    <span className="label">Currently With:</span>
                    <span className="value" style={{ fontWeight: '700', color: ticket.assigned_admin_name ? '#38bdf8' : '#a855f7' }}>
                      {ticket.type === 'issue'
                        ? (ticket.assigned_admin_name || ticket.assigned_engineer || 'IT Admin Desk')
                        : (ticket.status === 'pending_manager_approval' ? (ticket.manager_name || 'Manager Review') : (ticket.assigned_admin_name || ticket.assigned_engineer || 'IT Admin Desk'))
                      }
                    </span>
                  </div>
                  <div className="meta-item">
                    <span className="label">Priority:</span>
                    <span className="value uppercase">{ticket.priority}</span>
                  </div>
                </div>

                {isRejected ? (
                  <div style={{ fontSize: '11.5px', color: '#fca5a5', background: 'rgba(239, 68, 68, 0.1)', padding: '6px 10px', borderRadius: '6px', border: '1px solid rgba(239, 68, 68, 0.2)', margin: '8px 0' }}>
                    🚫 <strong>Rejection Comment:</strong> {ticket.rejection_comment || ticket.approval_comment || ticket.reassignment_comment || 'Request denied by Admin'}
                  </div>
                ) : (
                  ticket.reassignment_comment && (
                    <div style={{ fontSize: '11.5px', color: '#38bdf8', background: 'rgba(56, 189, 248, 0.1)', padding: '6px 10px', borderRadius: '6px', border: '1px solid rgba(56, 189, 248, 0.2)', margin: '8px 0' }}>
                      💬 Reassignment Note: {ticket.reassignment_comment}
                    </div>
                  )
                )}

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
