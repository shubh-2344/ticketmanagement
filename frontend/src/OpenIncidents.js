import React, { useState, useMemo } from 'react';
import axios from 'axios';
import CountUp from './components/CountUp';
import './TicketList.css';

function OpenIncidents({ tickets = [], currentUser, onViewTicket, onRefresh, API_URL }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [priorityFilter, setPriorityFilter] = useState('all');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [resolvingTicket, setResolvingTicket] = useState(null);
  const [resolutionSummary, setResolutionSummary] = useState('');
  const [resolutionNotes, setResolutionNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Filter ONLY active "Report Issue" tickets
  const activeIncidents = useMemo(() => {
    return tickets.filter((t) => {
      if (t.type !== 'issue') return false;

      const statusLower = (t.status || '').toLowerCase();
      if (statusLower === 'closed' || statusLower === 'resolved') return false;

      if (searchTerm.trim()) {
        const query = searchTerm.toLowerCase();
        const matchesTitle = (t.title || '').toLowerCase().includes(query);
        const matchesDesc = (t.description || '').toLowerCase().includes(query);
        const matchesReq = (t.requester_name || '').toLowerCase().includes(query);
        if (!matchesTitle && !matchesDesc && !matchesReq) return false;
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
  }, [tickets, searchTerm, priorityFilter, categoryFilter]);

  const criticalCount = useMemo(() => {
    return activeIncidents.filter((t) => {
      const p = (t.priority || '').toLowerCase();
      return p === 'urgent' || p === 'critical' || p === 'high';
    }).length;
  }, [activeIncidents]);

  const inProgressCount = useMemo(() => {
    return activeIncidents.filter((t) => {
      const st = (t.status || '').toLowerCase();
      return st === 'approved' || st === 'in_progress' || st === 'pending_admin_assignment';
    }).length;
  }, [activeIncidents]);

  const formatPriority = (p) => {
    const val = (p || 'medium').toLowerCase();
    if (val === 'urgent' || val === 'critical') return 'Critical';
    if (val === 'high') return 'High';
    if (val === 'low') return 'Low';
    return 'Medium';
  };

  const getPriorityColor = (p) => {
    const formatted = formatPriority(p);
    if (formatted === 'Critical') return '#ef4444';
    if (formatted === 'High') return '#f97316';
    if (formatted === 'Low') return '#38bdf8';
    return '#f59e0b';
  };

  const formatStatus = (s) => {
    const val = (s || 'open').toLowerCase();
    if (val === 'approved' || val === 'in_progress' || val === 'pending_admin_assignment') return 'In Progress';
    if (val === 'closed' || val === 'resolved') return 'Resolved';
    return 'Open';
  };

  const getStatusColor = (s) => {
    const formatted = formatStatus(s);
    if (formatted === 'In Progress') return '#f59e0b';
    if (formatted === 'Resolved') return '#10b981';
    return '#38bdf8';
  };

  const handleOpenResolveModal = (ticket) => {
    setResolvingTicket(ticket);
    setResolutionSummary('');
    setResolutionNotes('');
  };

  const handleConfirmResolution = async (e) => {
    e.preventDefault();
    if (!resolutionSummary.trim()) {
      alert('Please provide a resolution summary.');
      return;
    }

    const confirmed = await window.showConfirm({
      title: 'Confirm Ticket Resolution',
      message: `Are you sure you want to resolve ticket "${resolvingTicket.title}"?`,
      confirmText: 'Resolve Ticket',
      cancelText: 'Cancel',
      confirmType: 'success'
    });
    if (!confirmed) return;

    setIsSubmitting(true);
    try {
      await axios.put(`${API_URL}/tickets/${resolvingTicket.id}/admin-assign`, {
        assigned_device_name: resolutionSummary,
        assignment_description: resolutionNotes
      });
      alert('Incident resolved successfully');
      setResolvingTicket(null);
      if (onRefresh) onRefresh();
    } catch (err) {
      console.error('Error resolving incident:', err);
      alert(err.response?.data?.error || 'Failed to resolve incident');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="open-incidents-page" style={{ color: 'var(--text-main)', display: 'flex', flexDirection: 'column', gap: '24px' }}>
      
      {/* HEADER */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h2 style={{ fontSize: '22px', fontWeight: '700', margin: '0 0 4px 0', letterSpacing: '-0.3px' }}>
            Open Incidents
          </h2>
          <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: '13px' }}>
            Active technical issue reports assigned for resolution.
          </p>
        </div>

        <button
          onClick={onRefresh}
          style={{ padding: '8px 16px', borderRadius: '8px', background: 'var(--bg-card)', border: 'var(--border-card)', color: 'var(--text-main)', fontSize: '12px', fontWeight: '600', cursor: 'pointer' }}
        >
          Refresh Incidents
        </button>
      </div>

      {/* SUMMARY CARDS */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '18px' }}>
        <div style={{ background: 'var(--bg-card)', border: 'var(--border-card)', borderRadius: 'var(--radius-card)', padding: '20px', boxShadow: 'var(--shadow)' }}>
          <span style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: '700', textTransform: 'uppercase', display: 'block', marginBottom: '8px' }}>Total Active Incidents</span>
          <div style={{ fontSize: '30px', fontWeight: '800', color: 'var(--text-main)' }}>
            <CountUp end={activeIncidents.length} duration={800} />
          </div>
          <p style={{ margin: '6px 0 0 0', fontSize: '11px', color: 'var(--text-muted)' }}>Excludes asset & approval requests</p>
        </div>

        <div style={{ background: 'var(--bg-card)', border: 'var(--border-card)', borderRadius: 'var(--radius-card)', padding: '20px', boxShadow: 'var(--shadow)' }}>
          <span style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: '700', textTransform: 'uppercase', display: 'block', marginBottom: '8px' }}>High & Critical Priority</span>
          <div style={{ fontSize: '30px', fontWeight: '800', color: '#f97316' }}>
            <CountUp end={criticalCount} duration={800} />
          </div>
          <p style={{ margin: '6px 0 0 0', fontSize: '11px', color: 'var(--text-muted)' }}>Requires urgent attention</p>
        </div>

        <div style={{ background: 'var(--bg-card)', border: 'var(--border-card)', borderRadius: 'var(--radius-card)', padding: '20px', boxShadow: 'var(--shadow)' }}>
          <span style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: '700', textTransform: 'uppercase', display: 'block', marginBottom: '8px' }}>In Progress</span>
          <div style={{ fontSize: '30px', fontWeight: '800', color: '#f59e0b' }}>
            <CountUp end={inProgressCount} duration={800} />
          </div>
          <p style={{ margin: '6px 0 0 0', fontSize: '11px', color: 'var(--text-muted)' }}>Currently being investigated</p>
        </div>
      </div>

      {/* FILTER TOOLBAR */}
      <div style={{ background: 'var(--bg-card)', border: 'var(--border-card)', borderRadius: 'var(--radius-card)', padding: '16px 20px', display: 'flex', flexWrap: 'wrap', gap: '16px', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', flex: '1' }}>
          <input
            type="text"
            placeholder="Filter incidents by keyword, requester..."
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
          Showing {activeIncidents.length} incidents
        </span>
      </div>

      {/* INCIDENT CARDS LIST */}
      {activeIncidents.length === 0 ? (
        <div style={{ background: 'var(--bg-card)', border: 'var(--border-card)', borderRadius: 'var(--radius-card)', padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>
          <p style={{ fontSize: '15px', margin: '0 0 4px 0', color: 'var(--text-main)', fontWeight: '600' }}>No active incidents found.</p>
          <span style={{ fontSize: '12px' }}>There are currently no open issue tickets matching the selected filters.</span>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          {activeIncidents.map((t) => {
            const priorityText = formatPriority(t.priority);
            const priorityColor = getPriorityColor(t.priority);
            const statusText = formatStatus(t.status);
            const statusColor = getStatusColor(t.status);

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
                  gap: '12px'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '12px', flexWrap: 'wrap' }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                      <span style={{ background: `${statusColor}18`, color: statusColor, border: `1px solid ${statusColor}40`, fontSize: '11px', fontWeight: '700', padding: '3px 9px', borderRadius: '4px' }}>
                        {statusText}
                      </span>
                      <span style={{ background: `${priorityColor}18`, color: priorityColor, border: `1px solid ${priorityColor}40`, fontSize: '11px', fontWeight: '700', padding: '3px 9px', borderRadius: '4px' }}>
                        {priorityText} Priority
                      </span>
                    </div>

                    <h3
                      onClick={() => onViewTicket(t)}
                      style={{ fontSize: '16px', fontWeight: '700', color: 'var(--text-main)', margin: 0, cursor: 'pointer' }}
                    >
                      {t.title}
                    </h3>
                  </div>

                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button
                      onClick={() => onViewTicket(t)}
                      style={{ padding: '7px 13px', borderRadius: '6px', background: 'var(--bg-body)', border: 'var(--border-card)', color: 'var(--text-main)', fontSize: '12px', fontWeight: '600', cursor: 'pointer' }}
                    >
                      View Details
                    </button>

                    {currentUser.role === 'admin' && (
                      <button
                        onClick={() => handleOpenResolveModal(t)}
                        style={{ padding: '7px 14px', borderRadius: '6px', background: '#10b981', border: 'none', color: '#ffffff', fontSize: '12px', fontWeight: '700', cursor: 'pointer' }}
                      >
                        Resolve
                      </button>
                    )}
                  </div>
                </div>

                <p style={{ margin: 0, fontSize: '13px', color: 'var(--text-muted)', lineHeight: '1.4' }}>
                  {t.description}
                </p>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '12px', background: 'var(--bg-body)', padding: '10px 14px', borderRadius: '6px', border: 'var(--border-card)', fontSize: '12px' }}>
                  <div><span style={{ color: 'var(--text-muted)' }}>Requester:</span> <strong style={{ color: 'var(--text-main)' }}>{t.requester_name}</strong></div>
                  <div><span style={{ color: 'var(--text-muted)' }}>Category:</span> <span style={{ color: 'var(--text-main)' }}>{t.category}</span></div>
                  <div><span style={{ color: 'var(--text-muted)' }}>Assigned Specialist:</span> <span style={{ color: 'var(--text-main)' }}>{t.assigned_engineer || 'System Admin'}</span></div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* RESOLVE MODAL */}
      {resolvingTicket && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(3px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '20px' }}>
          <div style={{ background: 'var(--bg-card)', border: 'var(--border-card)', borderRadius: '12px', width: '100%', maxWidth: '500px', padding: '24px', boxShadow: '0 10px 30px rgba(0,0,0,0.5)', display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ margin: 0, fontSize: '16px', fontWeight: '700', color: 'var(--text-main)' }}>
                Resolve Incident: {resolvingTicket.title}
              </h3>
              <button
                onClick={() => setResolvingTicket(null)}
                style={{ background: 'none', border: 'none', color: 'var(--text-muted)', fontSize: '16px', cursor: 'pointer' }}
              >
                Cancel
              </button>
            </div>

            <form onSubmit={handleConfirmResolution} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: 'var(--text-main)', marginBottom: '6px' }}>
                  Resolution Summary *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Access updated / software patch applied / password reset"
                  value={resolutionSummary}
                  onChange={(e) => setResolutionSummary(e.target.value)}
                  style={{ width: '100%', padding: '9px 12px', background: 'var(--bg-body)', border: 'var(--border-card)', borderRadius: '6px', color: 'var(--text-main)', fontSize: '12px', outline: 'none' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: 'var(--text-main)', marginBottom: '6px' }}>
                  Resolution Details & Notes
                </label>
                <textarea
                  rows="3"
                  placeholder="Provide technical root cause details or credentials instructions..."
                  value={resolutionNotes}
                  onChange={(e) => setResolutionNotes(e.target.value)}
                  style={{ width: '100%', padding: '9px 12px', background: 'var(--bg-body)', border: 'var(--border-card)', borderRadius: '6px', color: 'var(--text-main)', fontSize: '12px', outline: 'none' }}
                />
              </div>

              <div style={{ display: 'flex', gap: '10px', marginTop: '6px' }}>
                <button
                  type="button"
                  onClick={() => setResolvingTicket(null)}
                  style={{ flex: 1, padding: '10px', background: 'var(--bg-body)', border: 'var(--border-card)', color: 'var(--text-main)', borderRadius: '6px', fontWeight: '600', cursor: 'pointer', fontSize: '12px' }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  style={{ flex: 1, padding: '10px', background: '#10b981', border: 'none', color: '#ffffff', borderRadius: '6px', fontWeight: '700', cursor: 'pointer', fontSize: '12px' }}
                >
                  {isSubmitting ? 'Resolving...' : 'Resolve Ticket'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default OpenIncidents;
