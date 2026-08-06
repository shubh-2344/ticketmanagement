import React, { useState, useEffect } from 'react';
import axios from 'axios';

import { DevicesIcon, AlertIcon, CheckIcon, FileTextIcon, InventoryIcon, SearchIcon } from './components/Icons';

function AssetLifecycleDashboard({ API_URL, onSelectTicket }) {
  const [metrics, setMetrics] = useState(null);
  const [trackingList, setTrackingList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
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

  const getRemainingTime = (expectedDateStr, ticketStatus) => {
    if (ticketStatus === 'closed') return { text: 'Returned', class: 'text-emerald' };
    if (!expectedDateStr) return { text: 'No return date set', class: '' };

    const expected = new Date(expectedDateStr).getTime();
    const now = Date.now();
    const diff = expected - now;

    if (diff < 0) {
      const absDiff = Math.abs(diff);
      const days = Math.floor(absDiff / (1000 * 60 * 60 * 24));
      return { 
        text: `⚠️ OVERDUE BY ${days} DAYS`, 
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
    if (filterStatus === 'all') return true;
    if (filterStatus === 'overdue') {
      return item.ticket_status !== 'closed' && new Date(item.expected_return_date) < new Date();
    }
    if (filterStatus === 'pending_return') {
      return item.ticket_status === 'return_pending_verification';
    }
    return true;
  });

  if (loading) {
    return (
      <div className="loading-ai" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '300px', color: '#818cf8' }}>
        <div className="spinner" style={{ width: '40px', height: '40px', border: '3px solid rgba(129, 140, 248, 0.2)', borderTopColor: '#818cf8', borderRadius: '50%', animation: 'spin 1s linear infinite' }}></div>
        <p style={{ marginTop: '16px', fontSize: '14px' }}>Loading Asset Diagnostics...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ color: '#ef4444', background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.2)', padding: '20px', borderRadius: '12px', margin: '20px 0' }}>
        <h3>Connection Error</h3>
        <p>{error}</p>
      </div>
    );
  }

  return (
    <div style={{ color: 'var(--text-main)', display: 'flex', flexDirection: 'column', gap: '24px' }}>
      <div>
        <h2 style={{ fontSize: '22px', fontWeight: '700', color: 'var(--text-main)', margin: '0 0 4px 0', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <DevicesIcon size={24} style={{ color: 'var(--accent)' }} /> Enterprise Asset Lifecycle
        </h2>
        <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: '13px' }}>Monitor hardware utilization splits, device assignments, and return lifecycle pipelines.</p>
      </div>

      {/* Metrics Cards Grid */}
      {metrics && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '20px' }}>
          <div style={{ background: 'var(--bg-card)', border: 'var(--border-card)', borderRadius: 'var(--radius-card)', padding: '20px', boxShadow: 'var(--shadow)', backdropFilter: 'var(--backdrop)' }}>
            <div style={{ fontSize: '12px', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: '700', letterSpacing: '0.5px' }}>Total Fleet Quantity</div>
            <div style={{ fontSize: '32px', fontWeight: '800', marginTop: '6px' }}>{metrics.totalInventory} Units</div>
            <div style={{ fontSize: '11px', color: '#10b981', marginTop: '8px' }}>Available: {metrics.statusCounts.Available}</div>
          </div>

          <div style={{ background: 'var(--bg-card)', border: 'var(--border-card)', borderRadius: 'var(--radius-card)', padding: '20px', boxShadow: 'var(--shadow)', backdropFilter: 'var(--backdrop)' }}>
            <div style={{ fontSize: '12px', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: '700', letterSpacing: '0.5px' }}>Active Allocations</div>
            <div style={{ fontSize: '32px', fontWeight: '800', marginTop: '6px', color: '#a855f7' }}>{metrics.statusCounts.Assigned} Units</div>
            <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '8px' }}>Reserved: {metrics.statusCounts.Reserved} | Maint: {metrics.statusCounts.Maintenance}</div>
          </div>

          <div style={{ background: 'var(--bg-card)', border: 'var(--border-card)', borderRadius: 'var(--radius-card)', padding: '20px', boxShadow: 'var(--shadow)', backdropFilter: 'var(--backdrop)' }}>
            <div style={{ fontSize: '12px', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: '700', letterSpacing: '0.5px' }}>Overdue Returns</div>
            <div style={{ fontSize: '32px', fontWeight: '800', marginTop: '6px', color: metrics.overdueReturns > 0 ? '#ef4444' : 'var(--text-main)' }}>
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
      <div style={{ background: 'var(--bg-card)', border: 'var(--border-card)', borderRadius: 'var(--radius-card)', padding: '24px', boxShadow: 'var(--shadow)', backdropFilter: 'var(--backdrop)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '12px' }}>
          <h3 style={{ fontSize: '16px', fontWeight: '700', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
            <FileTextIcon size={18} /> Device Allocation & Return Tracking
          </h3>
          
          <div style={{ display: 'flex', gap: '10px' }}>
            <button 
              onClick={() => setFilterStatus('all')} 
              style={{ padding: '6px 12px', borderRadius: '6px', fontSize: '12px', cursor: 'pointer', background: filterStatus === 'all' ? 'var(--accent)' : 'var(--bg-body)', border: 'var(--border-card)', color: filterStatus === 'all' ? '#ffffff' : 'var(--text-main)' }}
            >
              All Assignments
            </button>
            <button 
              onClick={() => setFilterStatus('overdue')} 
              style={{ padding: '6px 12px', borderRadius: '6px', fontSize: '12px', cursor: 'pointer', background: filterStatus === 'overdue' ? '#ef4444' : 'var(--bg-body)', border: 'var(--border-card)', color: filterStatus === 'overdue' ? '#ffffff' : 'var(--text-main)' }}
            >
              Overdue Only
            </button>
            <button 
              onClick={() => setFilterStatus('pending_return')} 
              style={{ padding: '6px 12px', borderRadius: '6px', fontSize: '12px', cursor: 'pointer', background: filterStatus === 'pending_return' ? '#a855f7' : 'var(--bg-body)', border: 'var(--border-card)', color: filterStatus === 'pending_return' ? '#ffffff' : 'var(--text-main)' }}
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
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px', textAlign: 'left' }}>
              <thead>
                <tr style={{ borderBottom: 'var(--border-card)', color: 'var(--text-muted)' }}>
                  <th style={{ padding: '12px 8px' }}>Device</th>
                  <th style={{ padding: '12px 8px' }}>Assigned User</th>
                  <th style={{ padding: '12px 8px' }}>Assignment Date</th>
                  <th style={{ padding: '12px 8px' }}>Expected Return</th>
                  <th style={{ padding: '12px 8px' }}>Time Left</th>
                  <th style={{ padding: '12px 8px' }}>Status</th>
                  <th style={{ padding: '12px 8px', textRight: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredList.map(item => {
                  const remaining = getRemainingTime(item.expected_return_date, item.ticket_status);
                  return (
                    <tr key={item.ticket_id} style={{ borderBottom: 'var(--border-card)', verticalAlign: 'middle' }}>
                      <td style={{ padding: '16px 8px', fontWeight: '600' }}>{item.assigned_device_name}</td>
                      <td style={{ padding: '16px 8px' }}>
                        <div>{item.requester_name}</div>
                        <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{item.requester_email}</div>
                      </td>
                      <td style={{ padding: '16px 8px' }}>{formatDate(item.assigned_at)}</td>
                      <td style={{ padding: '16px 8px' }}>{formatDate(item.expected_return_date)}</td>
                      <td style={{ padding: '16px 8px' }}>
                        <span className={remaining.class} style={remaining.style}>{remaining.text}</span>
                      </td>
                      <td style={{ padding: '16px 8px' }}>
                        <span style={{
                          padding: '4px 8px',
                          borderRadius: '12px',
                          fontSize: '10px',
                          fontWeight: '700',
                          backgroundColor: item.ticket_status === 'return_pending_verification' ? 'rgba(168, 85, 247, 0.2)' : 'rgba(16, 185, 129, 0.2)',
                          color: item.ticket_status === 'return_pending_verification' ? '#c084fc' : '#34d399',
                          border: item.ticket_status === 'return_pending_verification' ? '1px solid rgba(168, 85, 247, 0.4)' : '1px solid rgba(16, 185, 129, 0.4)'
                        }}>
                          {item.ticket_status === 'return_pending_verification' ? 'RETURN REQUESTED' : 'ASSIGNED'}
                        </span>
                      </td>
                      <td style={{ padding: '16px 8px', textAlign: 'right' }}>
                        <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                          <button 
                            onClick={() => onSelectTicket(item.ticket_id)}
                            style={{ padding: '4px 10px', borderRadius: '4px', background: 'var(--bg-body)', border: 'var(--border-card)', color: 'var(--text-main)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}
                          >
                            <SearchIcon size={12} /> View Detail
                          </button>
                          {item.ticket_status === 'return_pending_verification' && (
                            <button 
                              onClick={() => handleVerifyReturn(item.ticket_id)}
                              style={{ padding: '4px 10px', borderRadius: '4px', background: 'linear-gradient(135deg, #10b981, #059669)', border: 'none', color: '#ffffff', fontWeight: '600', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}
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
