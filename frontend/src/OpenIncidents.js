import React, { useState, useMemo, useEffect } from 'react';
import axios from 'axios';
import CountUp from './components/CountUp';
import { ClockIcon, SparklesIcon, SuccessIcon, InventoryIcon } from './components/Icons';
import './TicketList.css';

function OpenIncidents({ tickets = [], currentUser, onViewTicket, onRefresh, API_URL }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [priorityFilter, setPriorityFilter] = useState('all');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [now, setNow] = useState(Date.now());
  const [resolvingTicket, setResolvingTicket] = useState(null);
  const [resolutionSummary, setResolutionSummary] = useState('');
  const [resolutionNotes, setResolutionNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Live 1-second interval ticker for real-time SLA calculation
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Filter ONLY active "Report Issue" tickets
  const activeIncidents = useMemo(() => {
    return tickets.filter((t) => {
      // Must be issue type
      if (t.type !== 'issue') return false;

      // Must be active (not closed / not resolved)
      const statusLower = (t.status || '').toLowerCase();
      if (statusLower === 'closed' || statusLower === 'resolved') return false;

      // Search term filter
      if (searchTerm.trim()) {
        const query = searchTerm.toLowerCase();
        const matchesTitle = (t.title || '').toLowerCase().includes(query);
        const matchesDesc = (t.description || '').toLowerCase().includes(query);
        const matchesReq = (t.requester_name || '').toLowerCase().includes(query);
        if (!matchesTitle && !matchesDesc && !matchesReq) return false;
      }

      // Priority filter
      if (priorityFilter !== 'all') {
        const p = (t.priority || '').toLowerCase();
        if (priorityFilter === 'critical' && p !== 'urgent' && p !== 'critical') return false;
        if (priorityFilter === 'high' && p !== 'high') return false;
        if (priorityFilter === 'medium' && p !== 'medium') return false;
        if (priorityFilter === 'low' && p !== 'low') return false;
      }

      // Category filter
      if (categoryFilter !== 'all') {
        if ((t.category || '').toLowerCase() !== categoryFilter.toLowerCase()) return false;
      }

      return true;
    });
  }, [tickets, searchTerm, priorityFilter, categoryFilter]);

  // Compute Incident Metrics
  const criticalCount = useMemo(() => {
    return activeIncidents.filter((t) => {
      const p = (t.priority || '').toLowerCase();
      return p === 'urgent' || p === 'critical' || p === 'high';
    }).length;
  }, [activeIncidents]);

  const calculateSlaInfo = (ticket) => {
    if (!ticket.target_resolution_date) {
      return { text: '24h standard SLA', status: 'Normal', color: '#38bdf8', diffMs: 86400000 };
    }

    const targetTime = new Date(ticket.target_resolution_date).getTime();
    const diffMs = targetTime - now;

    if (diffMs <= 0) {
      return { text: 'SLA Breached', status: 'Breached', color: '#ef4444', diffMs };
    }

    const hours = Math.floor(diffMs / (1000 * 60 * 60));
    const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((diffMs % (1000 * 60)) / 1000);

    const timeStr = `${hours}h ${minutes}m ${seconds}s remaining`;
    if (diffMs < 4 * 60 * 60 * 1000) {
      return { text: timeStr, status: 'At Risk', color: '#f59e0b', diffMs };
    }
    return { text: timeStr, status: 'Normal', color: '#10b981', diffMs };
  };

  const handleOpenResolveModal = (ticket) => {
    setResolvingTicket(ticket);
    setResolutionSummary('');
    setResolutionNotes('');
  };

  const handleConfirmResolution = async (e) => {
    e.preventDefault();
    if (!resolutionSummary.trim()) {
      alert('Please provide a resolution action summary.');
      return;
    }

    const confirmed = await window.showConfirm({
      title: 'Confirm Ticket Resolution',
      message: `Are you sure you want to resolve and complete incident "${resolvingTicket.title}"?`,
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
      alert('Incident resolved and completed successfully!');
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
      
      {/* HEADER SECTION */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h2 style={{ fontSize: '24px', fontWeight: '800', margin: '0 0 4px 0', letterSpacing: '-0.4px', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span>🚨 Active Open Incidents</span>
          </h2>
          <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: '13px' }}>
            Live technical issue reports requiring system administrator diagnosis and resolution.
          </p>
        </div>

        <button
          onClick={onRefresh}
          style={{ padding: '8px 16px', borderRadius: '8px', background: 'var(--bg-card)', border: 'var(--border-card)', color: 'var(--text-main)', fontSize: '12px', fontWeight: '600', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}
        >
          🔄 Refresh Incidents
        </button>
      </div>

      {/* METRIC CARDS */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '18px' }}>
        <div style={{ background: 'var(--bg-card)', border: 'var(--border-card)', borderRadius: 'var(--radius-card)', padding: '20px', boxShadow: 'var(--shadow)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
            <span style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: '700', textTransform: 'uppercase' }}>Active Incidents</span>
            <span style={{ color: '#ef4444' }}>🚨</span>
          </div>
          <div style={{ fontSize: '32px', fontWeight: '800', color: '#ef4444' }}>
            <CountUp end={activeIncidents.length} duration={800} />
          </div>
          <p style={{ margin: '6px 0 0 0', fontSize: '11px', color: 'var(--text-muted)' }}>Excludes approval and asset requests</p>
        </div>

        <div style={{ background: 'var(--bg-card)', border: 'var(--border-card)', borderRadius: 'var(--radius-card)', padding: '20px', boxShadow: 'var(--shadow)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
            <span style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: '700', textTransform: 'uppercase' }}>High & Critical Severity</span>
            <span style={{ color: '#f97316' }}>⚠️</span>
          </div>
          <div style={{ fontSize: '32px', fontWeight: '800', color: '#f97316' }}>
            <CountUp end={criticalCount} duration={800} />
          </div>
          <p style={{ margin: '6px 0 0 0', fontSize: '11px', color: 'var(--text-muted)' }}>Requiring immediate turnaround</p>
        </div>

        <div style={{ background: 'var(--bg-card)', border: 'var(--border-card)', borderRadius: 'var(--radius-card)', padding: '20px', boxShadow: 'var(--shadow)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
            <span style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: '700', textTransform: 'uppercase' }}>Mean SLA Resolution</span>
            <span style={{ color: '#38bdf8' }}><ClockIcon size={20} /></span>
          </div>
          <div style={{ fontSize: '32px', fontWeight: '800', color: '#38bdf8' }}>
            4.2 <span style={{ fontSize: '16px' }}>hrs</span>
          </div>
          <p style={{ margin: '6px 0 0 0', fontSize: '11px', color: 'var(--text-muted)' }}>Target threshold: 24.0 hrs</p>
        </div>
      </div>

      {/* FILTER TOOLBAR */}
      <div style={{ background: 'var(--bg-card)', border: 'var(--border-card)', borderRadius: 'var(--radius-card)', padding: '16px 20px', display: 'flex', flexWrap: 'wrap', gap: '16px', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', flex: '1' }}>
          <input
            type="text"
            placeholder="🔍 Search active incidents by title, description, or requester..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{ minWidth: '260px', flex: '1', padding: '9px 14px', background: 'var(--bg-body)', border: 'var(--border-card)', borderRadius: '8px', color: 'var(--text-main)', fontSize: '13px', outline: 'none' }}
          />

          <select
            value={priorityFilter}
            onChange={(e) => setPriorityFilter(e.target.value)}
            style={{ padding: '9px 14px', background: 'var(--bg-body)', border: 'var(--border-card)', borderRadius: '8px', color: 'var(--text-main)', fontSize: '13px', outline: 'none' }}
          >
            <option value="all">All Priorities</option>
            <option value="critical">Urgent / Critical</option>
            <option value="high">High Priority</option>
            <option value="medium">Medium Priority</option>
            <option value="low">Low Priority</option>
          </select>

          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            style={{ padding: '9px 14px', background: 'var(--bg-body)', border: 'var(--border-card)', borderRadius: '8px', color: 'var(--text-main)', fontSize: '13px', outline: 'none' }}
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
          Showing <strong>{activeIncidents.length}</strong> active issue reports
        </span>
      </div>

      {/* INCIDENT LIST */}
      {activeIncidents.length === 0 ? (
        <div style={{ background: 'var(--bg-card)', border: 'var(--border-card)', borderRadius: 'var(--radius-card)', padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>
          <p style={{ fontSize: '16px', margin: '0 0 6px 0' }}>🎉 No active open incidents match your search criteria.</p>
          <span style={{ fontSize: '13px' }}>All technical issue reports have been cleanly resolved.</span>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {activeIncidents.map((t) => {
            const sla = calculateSlaInfo(t);
            const pLower = (t.priority || 'medium').toLowerCase();
            const priorityBadgeColor = pLower === 'critical' || pLower === 'urgent' ? '#ef4444' : pLower === 'high' ? '#f97316' : pLower === 'low' ? '#38bdf8' : '#f59e0b';

            return (
              <div
                key={t.id}
                style={{
                  background: 'var(--bg-card)',
                  border: '1px solid rgba(56, 189, 248, 0.25)',
                  borderRadius: 'var(--radius-card)',
                  padding: '20px',
                  boxShadow: 'var(--shadow)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '12px',
                  transition: 'all 0.2s ease'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '12px', flexWrap: 'wrap' }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px' }}>
                      <span style={{ background: 'linear-gradient(135deg, #0284c7, #7c3aed)', color: '#ffffff', fontSize: '11px', fontWeight: '800', padding: '3px 10px', borderRadius: '20px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                        🛡️ REPORTED INCIDENT
                      </span>
                      <span style={{ background: `${priorityBadgeColor}20`, color: priorityBadgeColor, border: `1px solid ${priorityBadgeColor}50`, fontSize: '11px', fontWeight: '700', padding: '2px 8px', borderRadius: '6px' }}>
                        {t.priority ? t.priority.toUpperCase() : 'MEDIUM'}
                      </span>
                      <span style={{ background: `${sla.color}20`, color: sla.color, border: `1px solid ${sla.color}50`, fontSize: '11px', fontWeight: '700', padding: '2px 8px', borderRadius: '6px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                        ⏱️ {sla.text}
                      </span>
                    </div>

                    <h3
                      onClick={() => onViewTicket(t)}
                      style={{ fontSize: '17px', fontWeight: '700', color: 'var(--text-main)', margin: 0, cursor: 'pointer', letterSpacing: '-0.2px' }}
                    >
                      {t.title}
                    </h3>
                  </div>

                  <div style={{ display: 'flex', gap: '10px' }}>
                    <button
                      onClick={() => onViewTicket(t)}
                      style={{ padding: '8px 14px', borderRadius: '8px', background: 'rgba(255,255,255,0.06)', border: 'var(--border-card)', color: 'var(--text-main)', fontSize: '12px', fontWeight: '600', cursor: 'pointer' }}
                    >
                      👁️ View Details
                    </button>

                    {currentUser.role === 'admin' && (
                      <button
                        onClick={() => handleOpenResolveModal(t)}
                        style={{ padding: '8px 16px', borderRadius: '8px', background: 'linear-gradient(135deg, #10b981, #059669)', border: 'none', color: '#ffffff', fontSize: '12px', fontWeight: '700', cursor: 'pointer', boxShadow: '0 4px 12px rgba(16, 185, 129, 0.3)' }}
                      >
                        🚀 Resolve Incident
                      </button>
                    )}
                  </div>
                </div>

                <p style={{ margin: 0, fontSize: '13px', color: 'var(--text-muted)', lineHeight: '1.5' }}>
                  {t.description}
                </p>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '12px', background: 'rgba(0,0,0,0.15)', padding: '12px 16px', borderRadius: '8px', border: 'var(--border-card)', fontSize: '12px' }}>
                  <div><span style={{ color: 'var(--text-muted)' }}>Requester:</span> <strong>{t.requester_name}</strong></div>
                  <div><span style={{ color: 'var(--text-muted)' }}>Category:</span> <span>{t.category}</span></div>
                  <div><span style={{ color: 'var(--text-muted)' }}>Escalation Tier:</span> <strong style={{ color: '#38bdf8' }}>{t.escalation_level || 'Engineer'}</strong></div>
                  <div><span style={{ color: 'var(--text-muted)' }}>Assigned Specialist:</span> <span>{t.assigned_engineer || 'System Admin'}</span></div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* INCIDENT RESOLUTION MODAL FOR ADMIN */}
      {resolvingTicket && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '20px' }}>
          <div style={{ background: 'var(--bg-card)', border: '1px solid rgba(56, 189, 248, 0.4)', borderRadius: '14px', width: '100%', maxWidth: '520px', padding: '24px', boxShadow: '0 20px 50px rgba(0,0,0,0.6)', display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ margin: 0, fontSize: '18px', fontWeight: '800', color: 'var(--text-main)' }}>
                🚀 Resolve Incident: {resolvingTicket.title}
              </h3>
              <button
                onClick={() => setResolvingTicket(null)}
                style={{ background: 'none', border: 'none', color: 'var(--text-muted)', fontSize: '18px', cursor: 'pointer' }}
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleConfirmResolution} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: 'var(--text-main)', marginBottom: '6px' }}>
                  Resolution Action Summary *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Access rights updated / network patch applied / password reset"
                  value={resolutionSummary}
                  onChange={(e) => setResolutionSummary(e.target.value)}
                  style={{ width: '100%', padding: '10px 14px', background: 'var(--bg-body)', border: 'var(--border-card)', borderRadius: '8px', color: 'var(--text-main)', fontSize: '13px', outline: 'none' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: 'var(--text-main)', marginBottom: '6px' }}>
                  Troubleshooting & Resolution Description
                </label>
                <textarea
                  rows="3"
                  placeholder="Provide technical root cause details, credentials setup, or resolution steps..."
                  value={resolutionNotes}
                  onChange={(e) => setResolutionNotes(e.target.value)}
                  style={{ width: '100%', padding: '10px 14px', background: 'var(--bg-body)', border: 'var(--border-card)', borderRadius: '8px', color: 'var(--text-main)', fontSize: '13px', outline: 'none' }}
                />
              </div>

              <div style={{ display: 'flex', gap: '12px', marginTop: '10px' }}>
                <button
                  type="button"
                  onClick={() => setResolvingTicket(null)}
                  style={{ flex: 1, padding: '12px', background: 'rgba(255,255,255,0.06)', border: 'var(--border-card)', color: 'var(--text-main)', borderRadius: '8px', fontWeight: '600', cursor: 'pointer' }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  style={{ flex: 1, padding: '12px', background: 'linear-gradient(135deg, #10b981, #059669)', border: 'none', color: '#ffffff', borderRadius: '8px', fontWeight: '700', cursor: 'pointer' }}
                >
                  {isSubmitting ? 'Resolving...' : '✓ Resolve Ticket'}
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
