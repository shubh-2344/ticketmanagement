import React, { useState, useEffect } from 'react';
import axios from 'axios';
import formatTicketId from './utils/formatTicketId';

import { DevicesIcon, AlertIcon, CheckIcon, FileTextIcon, InventoryIcon, SearchIcon } from './components/Icons';

function AssetLifecycleDashboard({ API_URL, onSelectTicket }) {
  const [metrics, setMetrics] = useState(null);
  const [trackingList, setTrackingList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [animate, setAnimate] = useState(false);

  useEffect(() => {
    fetchData(false);
  }, []);

  useEffect(() => {
    if (!loading) {
      const timer = setTimeout(() => setAnimate(true), 50);
      return () => clearTimeout(timer);
    } else {
      setAnimate(false);
    }
  }, [loading]);

  const fetchData = async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const [metricsRes, trackingRes] = await Promise.all([
        axios.get(`${API_URL}/admin/asset-lifecycle`),
        axios.get(`${API_URL}/admin/device-tracking`)
      ]);
      setMetrics(metricsRes.data);
      setTrackingList(trackingRes.data);
      setError('');
    } catch (err) {
      console.error('Error fetching asset lifecycle data:', err);
      if (!silent) setError('Failed to load asset lifecycle metrics. Ensure you are logged in as Administrator.');
    } finally {
      if (!silent) setLoading(false);
    }
  };

  const handleVerifyReturn = async (ticketId) => {
    const confirmed = window.confirm('Verify physical device return and restore item count to inventory?');
    if (!confirmed) return;

    try {
      await axios.put(`${API_URL}/tickets/${ticketId}/verify-return`);
      alert('Return verified successfully! Inventory restocked.');
      fetchData();
    } catch (err) {
      console.error('Verify return error:', err);
      alert(err.response?.data?.error || 'Verification of device return failed');
    }
  };

  const getReturnStatusInfo = (item) => {
    if (item.ticket_status === 'closed') {
      return { text: 'Returned', class: 'status-tag closed' };
    }
    if (item.ticket_status === 'return_pending_verification') {
      return { text: 'Return Pending Verification', class: 'status-tag pending' };
    }

    if (!item.expected_return_date) {
      return { text: 'Active Allocation', class: 'status-tag active' };
    }

    const expected = new Date(item.expected_return_date).getTime();
    const now = Date.now();
    const diff = expected - now;

    if (diff < 0) {
      const absDiff = Math.abs(diff);
      const days = Math.floor(absDiff / (1000 * 60 * 60 * 24));
      return {
        text: `OVERDUE BY ${days} DAYS`,
        class: 'overdue-pulse',
        style: { color: '#ef4444', fontWeight: '800', textShadow: '0 0 10px rgba(239, 68, 68, 0.4)' }
      };
    } else {
      const days = Math.floor(diff / (1000 * 60 * 60 * 24));
      if (days === 0) {
        const hours = Math.floor(diff / (1000 * 60 * 60));
        return { text: `Due in ${hours} hours`, class: 'text-amber' };
      }
      return { text: `Due in ${days} days`, class: days < 3 ? 'text-amber' : 'text-slate-300' };
    }
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return 'N/A';
    return new Date(dateStr).toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const filteredList = trackingList.filter(item => {
    if (filterStatus === 'overdue' && !(item.ticket_status !== 'closed' && item.expected_return_date && new Date(item.expected_return_date) < new Date())) {
      return false;
    }
    if (filterStatus === 'pending_return' && item.ticket_status !== 'return_pending_verification') {
      return false;
    }
    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase();
      const titleMatch = (item.ticket_title || '').toLowerCase().includes(q);
      const userMatch = (item.requester_name || '').toLowerCase().includes(q) || (item.requester_email || '').toLowerCase().includes(q);
      const deviceMatch = (item.assigned_device_name || '').toLowerCase().includes(q);
      const idMatch = formatTicketId(item.ticket_id, item.ticket_type).toLowerCase().includes(q);
      if (!titleMatch && !userMatch && !deviceMatch && !idMatch) return false;
    }
    return true;
  });

  if (loading) {
    return (
      <div style={{ background: 'var(--bg-card)', border: 'var(--border-card)', borderRadius: 'var(--radius-card)', padding: '60px', textAlign: 'center', color: 'var(--text-muted)' }}>
        <div className="spinner" style={{ margin: '0 auto 16px auto', width: '40px', height: '40px', border: '3px solid rgba(129, 140, 248, 0.2)', borderTopColor: '#818cf8', borderRadius: '50%', animation: 'spin 1s linear infinite' }}></div>
        <p style={{ margin: 0, fontSize: '14px' }}>Loading Asset Diagnostics...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ background: 'var(--bg-card)', border: 'var(--border-card)', borderRadius: 'var(--radius-card)', padding: '40px', textAlign: 'center', color: '#ef4444' }}>
        <AlertIcon size={32} style={{ marginBottom: '12px' }} />
        <p style={{ margin: 0, fontSize: '14px', fontWeight: '600' }}>{error}</p>
        <button onClick={() => fetchData()} style={{ marginTop: '16px', padding: '8px 16px', borderRadius: '6px', background: 'var(--bg-body)', border: 'var(--border-card)', color: 'var(--text-main)', cursor: 'pointer' }}>
          Retry Loading
        </button>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', color: 'var(--text-main)' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h2 style={{ fontSize: '22px', fontWeight: '800', margin: '0 0 4px 0', letterSpacing: '-0.4px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <DevicesIcon size={24} style={{ color: 'var(--accent)' }} /> Asset Lifecycle & Return Tracking
          </h2>
          <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: '13px' }}>
            Real-time hardware allocation, SLA return monitoring, and inventory health metrics.
          </p>
        </div>

        <button
          onClick={() => fetchData()}
          style={{ padding: '8px 16px', borderRadius: '8px', background: 'var(--bg-card)', border: 'var(--border-card)', color: 'var(--text-main)', fontSize: '12px', fontWeight: '600', cursor: 'pointer' }}
        >
          Refresh Fleet Tracking
        </button>
      </div>

      {/* KPI Row */}
      {metrics && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '18px' }}>
          <div style={{ background: 'var(--bg-card)', border: 'var(--border-card)', borderRadius: 'var(--radius-card)', padding: '20px', boxShadow: 'var(--shadow)', backdropFilter: 'var(--backdrop)' }}>
            <div style={{ fontSize: '12px', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: '700', letterSpacing: '0.5px' }}>Total In Stock</div>
            <div style={{ fontSize: '32px', fontWeight: '800', marginTop: '6px', color: '#4ade80' }}>{metrics.statusCounts?.Available || 0} Units</div>
            <span style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '8px', display: 'block' }}>Ready for deployment</span>
          </div>

          <div style={{ background: 'var(--bg-card)', border: 'var(--border-card)', borderRadius: 'var(--radius-card)', padding: '20px', boxShadow: 'var(--shadow)', backdropFilter: 'var(--backdrop)' }}>
            <div style={{ fontSize: '12px', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: '700', letterSpacing: '0.5px' }}>Active Allocations</div>
            <div style={{ fontSize: '32px', fontWeight: '800', marginTop: '6px', color: '#c084fc' }}>{metrics.statusCounts?.Assigned || 0} Units</div>
            <span style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '8px', display: 'block' }}>Currently assigned to employees</span>
          </div>

          <div style={{ background: 'var(--bg-card)', border: 'var(--border-card)', borderRadius: 'var(--radius-card)', padding: '20px', boxShadow: 'var(--shadow)', backdropFilter: 'var(--backdrop)' }}>
            <div style={{ fontSize: '12px', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: '700', letterSpacing: '0.5px' }}>Overdue Returns</div>
            <div style={{ fontSize: '32px', fontWeight: '800', marginTop: '6px', color: metrics.overdueReturns > 0 ? '#ef4444' : '#10b981' }}>
              {metrics.overdueReturns} Units
            </div>
            <span style={{ fontSize: '11px', color: metrics.overdueReturns > 0 ? '#ef4444' : '#10b981', marginTop: '8px', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
              {metrics.overdueReturns > 0 ? <><AlertIcon size={12} /> Action required</> : <><CheckIcon size={12} /> Fleet healthy</>}
            </span>
          </div>

          <div style={{ background: 'var(--bg-card)', border: 'var(--border-card)', borderRadius: 'var(--radius-card)', padding: '20px', boxShadow: 'var(--shadow)', backdropFilter: 'var(--backdrop)' }}>
            <div style={{ fontSize: '12px', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: '700', letterSpacing: '0.5px' }}>Utilization Rate</div>
            <div style={{ fontSize: '32px', fontWeight: '800', marginTop: '6px', color: '#38bdf8' }}>{metrics.utilizationRate}%</div>
            <div style={{ width: '100%', height: '6px', background: 'rgba(255,255,255,0.05)', borderRadius: '3px', marginTop: '12px', overflow: 'hidden' }}>
              <div style={{ width: animate ? `${metrics.utilizationRate}%` : '0%', height: '100%', background: '#38bdf8', transition: 'width 1.2s cubic-bezier(0.34, 1.56, 0.64, 1)' }}></div>
            </div>
          </div>
        </div>
      )}

      {/* Tracking Table Section */}
      <div style={{ background: 'var(--bg-card)', border: 'var(--border-card)', borderRadius: 'var(--radius-card)', padding: '24px', boxShadow: 'var(--shadow)', backdropFilter: 'var(--backdrop)', width: '100%', maxWidth: '100%', boxSizing: 'border-box', overflow: 'hidden' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '12px' }}>
          <h3 style={{ fontSize: '16px', fontWeight: '700', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
            <FileTextIcon size={18} /> Device Allocation & Return Tracking
          </h3>

          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', alignItems: 'center' }}>
            <div style={{ position: 'relative', width: '220px', maxWidth: '100%' }}>
              <input
                type="text"
                placeholder="Search device, user, serial..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                style={{
                  width: '100%',
                  padding: '6px 12px',
                  borderRadius: '6px',
                  background: 'var(--bg-body)',
                  border: 'var(--border-card)',
                  color: 'var(--text-main)',
                  fontSize: '12px'
                }}
              />
            </div>
            <button
              onClick={() => setFilterStatus('all')}
              style={{ padding: '6px 12px', borderRadius: '6px', fontSize: '12px', cursor: 'pointer', background: filterStatus === 'all' ? 'var(--accent)' : 'var(--bg-body)', border: 'var(--border-card)', color: filterStatus === 'all' ? '#ffffff' : 'var(--text-main)', whiteSpace: 'nowrap' }}
            >
              All Assignments
            </button>
            <button
              onClick={() => setFilterStatus('overdue')}
              style={{ padding: '6px 12px', borderRadius: '6px', fontSize: '12px', cursor: 'pointer', background: filterStatus === 'overdue' ? '#ef4444' : 'var(--bg-body)', border: 'var(--border-card)', color: filterStatus === 'overdue' ? '#ffffff' : 'var(--text-main)', whiteSpace: 'nowrap' }}
            >
              Overdue Only
            </button>
            <button
              onClick={() => setFilterStatus('pending_return')}
              style={{ padding: '6px 12px', borderRadius: '6px', fontSize: '12px', cursor: 'pointer', background: filterStatus === 'pending_return' ? '#a855f7' : 'var(--bg-body)', border: 'var(--border-card)', color: filterStatus === 'pending_return' ? '#ffffff' : 'var(--text-main)', whiteSpace: 'nowrap' }}
            >
              Return Requests
            </button>
          </div>
        </div>

        {filteredList.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--text-muted)' }}>
            <p>No active device allocations match this filter.</p>
          </div>
        ) : (
          <div className="table-responsive-container" style={{ width: '100%', maxWidth: '100%', overflowX: 'auto', WebkitOverflowScrolling: 'touch', boxSizing: 'border-box' }}>
            <table style={{ width: '100%', tableLayout: 'fixed', borderCollapse: 'collapse', fontSize: '13px', textAlign: 'left' }}>
              <thead>
                <tr style={{ borderBottom: 'var(--border-card)', color: 'var(--text-muted)', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.3px' }}>
                  <th style={{ width: '14%', whiteSpace: 'nowrap' }}>Ticket ID</th>
                  <th style={{ width: '22%' }}>Device</th>
                  <th style={{ width: '22%' }}>Assigned User</th>
                  <th className="col-assigned-date" style={{ width: '10%', whiteSpace: 'nowrap' }}>Asg-Date</th>
                  <th className="col-return-date" style={{ width: '10%', whiteSpace: 'nowrap' }}>EXP-Return</th>
                  <th style={{ width: '10%', whiteSpace: 'nowrap' }}>Time Left</th>
                  <th style={{ width: '12%', whiteSpace: 'nowrap' }}>Status</th>
                  <th style={{ width: '10%', textAlign: 'right', whiteSpace: 'nowrap' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredList.map(item => {
                  const remaining = getReturnStatusInfo(item);
                  return (
                    <tr key={item.ticket_id} style={{ borderBottom: 'var(--border-card)', verticalAlign: 'middle' }}>
                      <td className="ticket-id-cell">
                        {formatTicketId(item.ticket_id, item.ticket_type || 'device-request')}
                      </td>
                      <td style={{ fontWeight: '600', wordBreak: 'break-word' }}>{item.assigned_device_name}</td>
                      <td>
                        <div style={{ fontWeight: '600', wordBreak: 'break-word' }}>{item.requester_name}</div>
                        <div style={{ fontSize: '11px', color: 'var(--text-muted)', wordBreak: 'break-all' }}>{item.requester_email}</div>
                      </td>
                      <td className="col-assigned-date">{formatDate(item.assigned_at)}</td>
                      <td className="col-return-date">{formatDate(item.expected_return_date)}</td>
                      <td style={{ padding: '14px 10px', whiteSpace: 'nowrap' }}>
                        <span className={remaining.class} style={{ ...remaining.style, whiteSpace: 'nowrap', display: 'inline-flex', alignItems: 'center' }}>{remaining.text}</span>
                      </td>
                      <td style={{ padding: '14px 10px', whiteSpace: 'nowrap' }}>
                        <span style={{
                          padding: '5px 12px',
                          borderRadius: '12px',
                          fontSize: '11px',
                          fontWeight: '800',
                          backgroundColor: item.ticket_status === 'return_pending_verification' ? 'rgba(168, 85, 247, 0.2)' : 'rgba(16, 185, 129, 0.2)',
                          color: item.ticket_status === 'return_pending_verification' ? '#c084fc' : '#34d399',
                          border: item.ticket_status === 'return_pending_verification' ? '1px solid rgba(168, 85, 247, 0.4)' : '1px solid rgba(16, 185, 129, 0.4)',
                          display: 'inline-flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          whiteSpace: 'nowrap'
                        }}>
                          {item.ticket_status === 'return_pending_verification' ? 'RETURN REQUESTED' : 'ASSIGNED'}
                        </span>
                      </td>
                      <td style={{ padding: '16px 8px', textAlign: 'right' }}>
                        <div style={{ display: 'inline-flex', gap: '6px', justifyContent: 'flex-end' }}>
                          <button
                            onClick={() => onSelectTicket(item.ticket_id)}
                            style={{ padding: '4px 10px', borderRadius: '4px', background: 'var(--bg-body)', border: 'var(--border-card)', color: 'var(--text-main)', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '4px', whiteSpace: 'nowrap' }}
                          >
                            <SearchIcon size={12} /> View
                          </button>
                          {item.ticket_status === 'return_pending_verification' && (
                            <button
                              onClick={() => handleVerifyReturn(item.ticket_id)}
                              style={{ padding: '4px 10px', borderRadius: '4px', background: 'linear-gradient(135deg, #10b981, #059669)', border: 'none', color: '#ffffff', fontWeight: '600', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '4px', whiteSpace: 'nowrap' }}
                            >
                              <CheckIcon size={12} /> Verify Return
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

export default AssetLifecycleDashboard;
