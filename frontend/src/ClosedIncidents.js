import React, { useState, useMemo } from 'react';
import CountUp from './components/CountUp';
import ViewToggle from './components/ViewToggle';
import formatTicketId from './utils/formatTicketId';
import { 
  CheckIcon, 
  ClockIcon, 
  SuccessIcon,
  DevicesIcon, 
  HardwareIcon, 
  AccessIcon, 
  SoftwareIcon 
} from './components/Icons';
import './TicketList.css';

function ClosedIncidents({ tickets = [], currentUser, onViewTicket, onRefresh, API_URL, viewMode = 'grid', onViewModeChange }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [priorityFilter, setPriorityFilter] = useState('all');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // Sorting state
  const [sortField, setSortField] = useState('id');
  const [sortDir, setSortDir] = useState('desc');

  // Filter ONLY closed / resolved tickets
  const closedTickets = useMemo(() => {
    let filtered = tickets.filter((t) => {
      const statusLower = (t.status || '').toLowerCase();
      if (statusLower !== 'closed' && statusLower !== 'resolved') return false;

      if (searchTerm.trim()) {
        const query = searchTerm.toLowerCase();
        const matchesTitle = (t.title || '').toLowerCase().includes(query);
        const matchesDesc = (t.description || '').toLowerCase().includes(query);
        const matchesReq = (t.requester_name || '').toLowerCase().includes(query);
        const matchesId = formatTicketId(t.id, t.type).toLowerCase().includes(query) || String(t.id).toLowerCase().includes(query);
        if (!matchesTitle && !matchesDesc && !matchesReq && !matchesId) return false;
      }

      if (priorityFilter !== 'all') {
        const p = (t.priority || '').toLowerCase();
        if (priorityFilter === 'critical' && p !== 'urgent' && p !== 'critical') return false;
        if (priorityFilter === 'high' && p !== 'high') return false;
        if (priorityFilter === 'medium' && p !== 'medium') return false;
        if (priorityFilter === 'low' && p !== 'low') return false;
      }

      if (categoryFilter !== 'all') {
        if ((t.category || '').toLowerCase() !== categoryFilter.toLowerCase()) return false;
      }

      return true;
    });

    // Column sorting
    filtered.sort((a, b) => {
      let valA = a[sortField] || '';
      let valB = b[sortField] || '';

      if (sortField === 'id') {
        valA = Number(a.id) || 0;
        valB = Number(b.id) || 0;
      }

      if (valA < valB) return sortDir === 'asc' ? -1 : 1;
      if (valA > valB) return sortDir === 'asc' ? 1 : -1;
      return 0;
    });

    return filtered;
  }, [tickets, searchTerm, priorityFilter, categoryFilter, sortField, sortDir]);

  // Reset pagination on filter change
  useMemo(() => {
    setCurrentPage(1);
  }, [searchTerm, priorityFilter, categoryFilter]);

  // Pagination logic
  const totalPages = Math.ceil(closedTickets.length / itemsPerPage) || 1;
  const paginatedTickets = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return closedTickets.slice(start, start + itemsPerPage);
  }, [closedTickets, currentPage, itemsPerPage]);

  const handleSort = (field) => {
    if (sortField === field) {
      setSortDir(sortDir === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDir('asc');
    }
  };

  const formatPriority = (p) => {
    const val = (p || 'medium').toLowerCase();
    if (val === 'urgent' || val === 'critical') return 'Critical';
    if (val === 'high') return 'High';
    if (val === 'low') return 'Low';
    return 'Medium';
  };

  const getPriorityColor = (p) => {
    const val = (p || 'medium').toLowerCase();
    if (val === 'urgent' || val === 'critical') return '#ef4444';
    if (val === 'high') return '#f97316';
    if (val === 'low') return '#38bdf8';
    return '#f59e0b';
  };

  const formatStatus = (s) => {
    const statusLower = (s || '').toLowerCase();
    if (statusLower === 'closed') return 'Closed';
    if (statusLower === 'resolved') return 'Resolved';
    return statusLower.toUpperCase();
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
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

  return (
    <div className="closed-incidents-page" style={{ color: 'var(--text-main)', display: 'flex', flexDirection: 'column', gap: '24px' }}>
      
      {/* HEADER */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h2 style={{ fontSize: '22px', fontWeight: '800', margin: '0 0 4px 0', letterSpacing: '-0.4px' }}>
            Closed Incidents
          </h2>
          <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: '13px' }}>
            Archive of all resolved and closed support tickets across the organization.
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          {onViewModeChange && (
            <ViewToggle viewMode={viewMode} onViewModeChange={onViewModeChange} />
          )}

          {onRefresh && (
            <button
              onClick={onRefresh}
              style={{ padding: '8px 16px', borderRadius: '8px', background: 'var(--bg-card)', border: 'var(--border-card)', color: 'var(--text-main)', fontSize: '12px', fontWeight: '600', cursor: 'pointer' }}
            >
              Refresh
            </button>
          )}
        </div>
      </div>

      {/* SUMMARY CARDS */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '18px' }}>
        <div style={{ background: 'var(--bg-card)', border: 'var(--border-card)', borderRadius: 'var(--radius-card)', padding: '20px', boxShadow: 'var(--shadow)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <span style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: '700', textTransform: 'uppercase' }}>Total Closed</span>
            <span style={{ color: '#4ade80' }}><CheckIcon size={20} /></span>
          </div>
          <div style={{ fontSize: '30px', fontWeight: '800', color: 'var(--text-main)' }}>
            <CountUp end={closedTickets.length} duration={800} />
          </div>
          <p style={{ margin: '6px 0 0 0', fontSize: '11px', color: 'var(--text-muted)' }}>Successfully resolved & archived</p>
        </div>

        <div style={{ background: 'var(--bg-card)', border: 'var(--border-card)', borderRadius: 'var(--radius-card)', padding: '20px', boxShadow: 'var(--shadow)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <span style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: '700', textTransform: 'uppercase' }}>High / Critical Resolved</span>
            <span style={{ color: '#f97316' }}><SuccessIcon size={20} /></span>
          </div>
          <div style={{ fontSize: '30px', fontWeight: '800', color: '#f97316' }}>
            <CountUp end={closedTickets.filter(t => (t.priority || '').toLowerCase() === 'high' || (t.priority || '').toLowerCase() === 'critical' || (t.priority || '').toLowerCase() === 'urgent').length} duration={800} />
          </div>
          <p style={{ margin: '6px 0 0 0', fontSize: '11px', color: 'var(--text-muted)' }}>High priority items completed</p>
        </div>

        <div style={{ background: 'var(--bg-card)', border: 'var(--border-card)', borderRadius: 'var(--radius-card)', padding: '20px', boxShadow: 'var(--shadow)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <span style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: '700', textTransform: 'uppercase' }}>Showing Page</span>
            <span style={{ color: '#c084fc' }}><ClockIcon size={20} /></span>
          </div>
          <div style={{ fontSize: '30px', fontWeight: '800', color: '#c084fc' }}>
            {currentPage} <span style={{ fontSize: '16px', color: 'var(--text-muted)', fontWeight: '500' }}>/ {totalPages}</span>
          </div>
          <p style={{ margin: '6px 0 0 0', fontSize: '11px', color: 'var(--text-muted)' }}>{closedTickets.length} matching tickets</p>
        </div>
      </div>

      {/* FILTER TOOLBAR */}
      <div style={{ background: 'var(--bg-card)', border: 'var(--border-card)', borderRadius: 'var(--radius-card)', padding: '16px 20px', display: 'flex', flexWrap: 'wrap', gap: '16px', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', flex: '1' }}>
          <input
            type="text"
            placeholder="Search closed tickets by title, description, requester, ID..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{ minWidth: '240px', flex: '1', padding: '8px 12px', background: 'var(--bg-body)', border: 'var(--border-card)', borderRadius: '8px', color: 'var(--text-main)', fontSize: '12px', outline: 'none' }}
          />

          <select
            value={priorityFilter}
            onChange={(e) => setPriorityFilter(e.target.value)}
            style={{ padding: '8px 12px', background: 'var(--bg-body)', border: 'var(--border-card)', borderRadius: '8px', color: 'var(--text-main)', fontSize: '12px', outline: 'none' }}
          >
            <option value="all">All Priorities</option>
            <option value="critical">Critical</option>
            <option value="high">High</option>
            <option value="medium">Medium</option>
            <option value="low">Low</option>
          </select>

          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            style={{ padding: '8px 12px', background: 'var(--bg-body)', border: 'var(--border-card)', borderRadius: '8px', color: 'var(--text-main)', fontSize: '12px', outline: 'none' }}
          >
            <option value="all">All Categories</option>
            <option value="Software">Software</option>
            <option value="Hardware">Hardware</option>
            <option value="Network">Network</option>
            <option value="Security">Security</option>
            <option value="Access/Permission">Access/Permission</option>
            <option value="Performance">Performance</option>
            <option value="Other">Other</option>
          </select>
        </div>

        <span style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: '600' }}>
          Showing {closedTickets.length > 0 ? (currentPage - 1) * itemsPerPage + 1 : 0}-{Math.min(currentPage * itemsPerPage, closedTickets.length)} of {closedTickets.length} tickets
        </span>
      </div>

      {/* TICKET CONTENT */}
      {closedTickets.length === 0 ? (
        <div style={{ background: 'var(--bg-card)', border: 'var(--border-card)', borderRadius: 'var(--radius-card)', padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>
          <p style={{ fontSize: '15px', margin: '0 0 4px 0', color: 'var(--text-main)', fontWeight: '600' }}>No closed incidents found.</p>
          <span style={{ fontSize: '12px' }}>There are no resolved or closed tickets matching your filters.</span>
        </div>
      ) : viewMode === 'table' ? (
        /* TABLE VIEW */
        <div style={{ background: 'var(--bg-card)', border: 'var(--border-card)', borderRadius: 'var(--radius-card)', overflow: 'hidden', boxShadow: 'var(--shadow)', width: '100%' }}>
          <div style={{ width: '100%' }}>
            <table style={{ width: '100%', tableLayout: 'fixed', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px', color: 'var(--text-main)' }}>
              <thead>
                <tr style={{ background: 'rgba(0,0,0,0.15)', borderBottom: 'var(--border-card)', color: 'var(--text-muted)', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  <th onClick={() => handleSort('id')} style={{ padding: '14px 12px', cursor: 'pointer', userSelect: 'none', width: '12%' }}>
                    ID {sortField === 'id' ? (sortDir === 'asc' ? '↑' : '↓') : ''}
                  </th>
                  <th onClick={() => handleSort('title')} style={{ padding: '14px 12px', cursor: 'pointer', userSelect: 'none', width: '26%' }}>
                    Title & Type {sortField === 'title' ? (sortDir === 'asc' ? '↑' : '↓') : ''}
                  </th>
                  <th onClick={() => handleSort('requester_name')} style={{ padding: '14px 12px', cursor: 'pointer', userSelect: 'none', width: '16%' }}>
                    Requester {sortField === 'requester_name' ? (sortDir === 'asc' ? '↑' : '↓') : ''}
                  </th>
                  <th className="col-category" onClick={() => handleSort('category')} style={{ padding: '14px 12px', cursor: 'pointer', userSelect: 'none', width: '14%' }}>
                    Category {sortField === 'category' ? (sortDir === 'asc' ? '↑' : '↓') : ''}
                  </th>
                  <th onClick={() => handleSort('priority')} style={{ padding: '14px 12px', cursor: 'pointer', userSelect: 'none', width: '10%' }}>
                    Priority {sortField === 'priority' ? (sortDir === 'asc' ? '↑' : '↓') : ''}
                  </th>
                  <th onClick={() => handleSort('status')} style={{ padding: '14px 12px', cursor: 'pointer', userSelect: 'none', width: '12%' }}>
                    Status {sortField === 'status' ? (sortDir === 'asc' ? '↑' : '↓') : ''}
                  </th>
                  <th className="col-date" onClick={() => handleSort('created_at')} style={{ padding: '14px 12px', cursor: 'pointer', userSelect: 'none', width: '10%' }}>
                    Date {sortField === 'created_at' ? (sortDir === 'asc' ? '↑' : '↓') : ''}
                  </th>
                </tr>
              </thead>
              <tbody>
                {paginatedTickets.map((t) => {
                  const priorityText = formatPriority(t.priority);
                  const priorityColor = getPriorityColor(t.priority);
                  const statusText = formatStatus(t.status);

                  return (
                    <tr
                      key={t.id}
                      style={{ borderBottom: 'var(--border-card)', transition: 'background 0.15s ease' }}
                      onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.02)'}
                      onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                    >
                      <td className="ticket-id-cell">
                        {formatTicketId(t.id, t.type)}
                      </td>
                      <td style={{ wordBreak: 'break-word' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                          <span onClick={() => onViewTicket(t)} style={{ cursor: 'pointer', color: 'var(--text-main)', fontWeight: '600' }}>
                            {t.title}
                          </span>
                          <span style={{ fontSize: '11px', color: 'var(--text-muted)', display: 'inline-flex', alignItems: 'center' }}>
                            {getCategoryIcon(t.category)}
                            {t.type === 'device-request' ? 'Device Request' : (t.type === 'device-return' ? 'Asset Return' : 'Issue Ticket')}
                          </span>
                        </div>
                      </td>
                      <td style={{ color: 'var(--text-muted)', wordBreak: 'break-word' }}>
                        {t.requester_name}
                      </td>
                      <td className="col-category" style={{ color: 'var(--text-muted)' }}>
                        {t.category}
                      </td>
                      <td>
                        <span style={{ background: `${priorityColor}18`, color: priorityColor, border: `1px solid ${priorityColor}40`, fontSize: '11px', fontWeight: '700', padding: '2px 8px', borderRadius: '4px' }}>
                          {priorityText}
                        </span>
                      </td>
                      <td>
                        <span style={{ background: 'rgba(34, 197, 94, 0.15)', color: '#4ade80', border: '1px solid rgba(34, 197, 94, 0.3)', fontSize: '11px', fontWeight: '700', padding: '2px 8px', borderRadius: '4px' }}>
                          {statusText}
                        </span>
                      </td>
                      <td className="col-date" style={{ color: 'var(--text-muted)', fontSize: '12px' }}>
                        {formatDate(t.created_at)}
                      </td>
                      <td style={{ padding: '14px 16px', textAlign: 'right' }}>
                        <button
                          onClick={() => onViewTicket(t)}
                          style={{ padding: '5px 12px', borderRadius: '6px', background: 'var(--bg-body)', border: 'var(--border-card)', color: 'var(--text-main)', fontSize: '11.5px', fontWeight: '600', cursor: 'pointer' }}
                        >
                          View Details
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        /* CARD / GRID VIEW */
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '16px' }}>
          {paginatedTickets.map((t) => {
            const priorityText = formatPriority(t.priority);
            const priorityColor = getPriorityColor(t.priority);
            const statusText = formatStatus(t.status);

            return (
              <div
                key={t.id}
                style={{
                  background: 'var(--bg-card)',
                  border: 'var(--border-card)',
                  borderRadius: 'var(--radius-card)',
                  padding: '20px',
                  boxShadow: 'var(--shadow)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '12px',
                  justify: 'space-between'
                }}
              >
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                    <span style={{ background: 'rgba(34, 197, 94, 0.15)', color: '#4ade80', border: '1px solid rgba(34, 197, 94, 0.3)', fontSize: '11px', fontWeight: '700', padding: '3px 9px', borderRadius: '4px' }}>
                      {statusText}
                    </span>
                    <span style={{ background: `${priorityColor}18`, color: priorityColor, border: `1px solid ${priorityColor}40`, fontSize: '11px', fontWeight: '700', padding: '3px 9px', borderRadius: '4px' }}>
                      {priorityText} Priority
                    </span>
                  </div>

                  <h3
                    onClick={() => onViewTicket(t)}
                    style={{ fontSize: '15px', fontWeight: '700', color: 'var(--text-main)', margin: '0 0 8px 0', cursor: 'pointer' }}
                  >
                    {t.title}
                  </h3>

                  <p style={{ margin: 0, fontSize: '12.5px', color: 'var(--text-muted)', lineHeight: '1.4' }}>
                    {t.description && t.description.length > 120 ? `${t.description.substring(0, 120)}...` : t.description}
                  </p>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', background: 'var(--bg-body)', padding: '10px 12px', borderRadius: '6px', border: 'var(--border-card)', fontSize: '11.5px' }}>
                    <div><span style={{ color: 'var(--text-muted)' }}>Requester:</span> <strong style={{ color: 'var(--text-main)' }}>{t.requester_name}</strong></div>
                    <div><span style={{ color: 'var(--text-muted)' }}>Category:</span> <span style={{ color: 'var(--text-main)' }}>{t.category}</span></div>
                    <div><span style={{ color: 'var(--text-muted)' }}>Created:</span> <span style={{ color: 'var(--text-main)' }}>{formatDate(t.created_at)}</span></div>
                    <div><span style={{ color: 'var(--text-muted)' }}>ID:</span> <span style={{ color: 'var(--text-main)', fontFamily: 'monospace' }}>{formatTicketId(t.id, t.type)}</span></div>
                  </div>

                  <button
                    onClick={() => onViewTicket(t)}
                    style={{ width: '100%', padding: '8px', borderRadius: '6px', background: 'var(--bg-body)', border: 'var(--border-card)', color: 'var(--text-main)', fontSize: '12px', fontWeight: '600', cursor: 'pointer' }}
                  >
                    View Ticket Details
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* PAGINATION CONTROLS */}
      {totalPages > 1 && (
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px', marginTop: '12px' }}>
          <button
            disabled={currentPage === 1}
            onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
            style={{ padding: '6px 14px', borderRadius: '6px', background: 'var(--bg-card)', border: 'var(--border-card)', color: currentPage === 1 ? 'var(--text-muted)' : 'var(--text-main)', fontSize: '12px', fontWeight: '600', cursor: currentPage === 1 ? 'not-allowed' : 'pointer' }}
          >
            ← Previous
          </button>

          {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
            <button
              key={page}
              onClick={() => setCurrentPage(page)}
              style={{
                padding: '6px 12px',
                borderRadius: '6px',
                background: currentPage === page ? '#38bdf8' : 'var(--bg-card)',
                border: 'var(--border-card)',
                color: currentPage === page ? '#ffffff' : 'var(--text-main)',
                fontSize: '12px',
                fontWeight: currentPage === page ? '700' : '500',
                cursor: 'pointer'
              }}
            >
              {page}
            </button>
          ))}

          <button
            disabled={currentPage === totalPages}
            onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
            style={{ padding: '6px 14px', borderRadius: '6px', background: 'var(--bg-card)', border: 'var(--border-card)', color: currentPage === totalPages ? 'var(--text-muted)' : 'var(--text-main)', fontSize: '12px', fontWeight: '600', cursor: currentPage === totalPages ? 'not-allowed' : 'pointer' }}
          >
            Next →
          </button>
        </div>
      )}

    </div>
  );
}

export default ClosedIncidents;
