import React, { useMemo, useState, useEffect } from 'react';
import axios from 'axios';
import CountUp from './components/CountUp';
import formatTicketId from './utils/formatTicketId';
import { 
  SparklesIcon, 
  ClockIcon, 
  AlertIcon, 
  DevicesIcon, 
  DashboardIcon,
  SuccessIcon,
  TrendingUpIcon,
  ShieldIcon,
  UserIcon,
  CheckIcon,
  XIcon,
  SearchIcon
} from './components/Icons';

function ExecutiveDashboard({ tickets, currentUser, onSelectTicket, onViewAllTickets, onViewInventory, API_URL, onRefresh }) {
  const [animate, setAnimate] = useState(false);
  const [now, setNow] = useState(Date.now());
  const [totalDevices, setTotalDevices] = useState(0);
  const [dismissedAlerts, setDismissedAlerts] = useState([]);

  // Device Tracking state
  const [deviceTrackingList, setDeviceTrackingList] = useState([]);
  const [deviceFilter, setDeviceFilter] = useState('all'); // 'all', 'overdue', 'pending_return', 'active'
  const [deviceSearch, setDeviceSearch] = useState('');

  useEffect(() => {
    const timer = setTimeout(() => setAnimate(true), 50);
    return () => clearTimeout(timer);
  }, []);

  // Fetch live inventory total count from database
  useEffect(() => {
    if (API_URL) {
      axios.get(`${API_URL}/inventory`)
        .then(res => {
          if (Array.isArray(res.data)) {
            const count = res.data.reduce((sum, item) => sum + (parseInt(item.quantity, 10) || 1), 0);
            setTotalDevices(count || res.data.length);
          }
        })
        .catch(err => console.error('Error fetching inventory in ExecutiveDashboard:', err));
    }
  }, [API_URL]);

  // Fetch live device allocation & return tracking records
  useEffect(() => {
    if (API_URL && (currentUser?.role === 'admin' || currentUser?.role === 'manager')) {
      axios.get(`${API_URL}/admin/device-tracking`)
        .then(res => {
          if (Array.isArray(res.data)) {
            setDeviceTrackingList(res.data);
          }
        })
        .catch(err => console.error('Error fetching device tracking in ExecutiveDashboard:', err));
    }
  }, [API_URL, currentUser]);

  // Real-time live countdown ticker updating every 1 second without page refresh
  useEffect(() => {
    const interval = setInterval(() => {
      setNow(Date.now());
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  // Manager Department Scope & Assigned Approval Filtering
  const scopedTickets = useMemo(() => {
    if (currentUser?.role === 'manager') {
      const mgrId = currentUser.id;
      const mgrDept = (currentUser.department || '').toLowerCase();
      return tickets.filter(t => 
        t.manager_id === mgrId || 
        t.approver_id === mgrId || 
        t.requester_id === mgrId || 
        (mgrDept && (t.department || '').toLowerCase() === mgrDept)
      );
    }
    return tickets;
  }, [tickets, currentUser]);

  // Helper function to calculate SLA details dynamically
  const getTicketSLAInfo = (t, currentTime) => {
    const target = t.target_resolution_date 
      ? new Date(t.target_resolution_date).getTime() 
      : (new Date(t.created_at).getTime() + (t.priority === 'high' || t.priority === 'urgent' ? 24 : t.priority === 'low' ? 72 : 48) * 3600000);
    
    const diff = target - currentTime;
    // Closed tickets are ONLY closed, resolved, or rejected. (Approved tickets remain active until completed!)
    const isClosed = t.status === 'closed' || t.status === 'resolved' || t.status === 'rejected';

    let slaStatus = 'Normal';
    if (!isClosed) {
      if (diff <= 0) {
        slaStatus = 'Breached';
      } else if (diff <= 12 * 3600 * 1000) {
        slaStatus = 'At Risk';
      }
    }

    // Dynamic Risk Level Calculation
    let riskLevel = 'Low';
    if (slaStatus === 'Breached') {
      riskLevel = 'High';
    } else if (slaStatus === 'At Risk') {
      if (t.priority === 'high' || t.priority === 'urgent' || diff <= 4 * 3600 * 1000) {
        riskLevel = 'High';
      } else if (diff <= 8 * 3600 * 1000) {
        riskLevel = 'Medium';
      } else {
        riskLevel = 'Low';
      }
    }

    // Dynamic Time Remaining String (live real-time countdown format)
    let timeRemainingStr = '';
    if (isClosed) {
      timeRemainingStr = 'Resolved';
    } else if (diff <= 0) {
      const overdueMs = Math.abs(diff);
      const hrs = Math.floor(overdueMs / 3600000);
      const mins = Math.floor((overdueMs % 3600000) / 60000);
      const secs = Math.floor((overdueMs % 60000) / 1000);
      timeRemainingStr = `Overdue: ${hrs > 0 ? hrs + 'h ' : ''}${mins}m ${secs}s`;
    } else {
      const hrs = Math.floor(diff / 3600000);
      const mins = Math.floor((diff % 3600000) / 60000);
      const secs = Math.floor((diff % 60000) / 1000);
      timeRemainingStr = `${hrs > 0 ? hrs + 'h ' : ''}${mins}m ${secs}s`;
    }

    const escalationLevel = t.escalation_level || 'Engineer';
    const assignedEngineer = t.assigned_engineer || t.approver_name || t.manager_name || 'IT Helpdesk Specialist';

    return {
      target,
      diff,
      slaStatus,
      riskLevel,
      timeRemainingStr,
      escalationLevel,
      assignedEngineer,
      isClosed
    };
  };

  // KPI Metrics Calculation driven strictly by database records
  const metrics = useMemo(() => {
    const total = scopedTickets.length;
    const open = scopedTickets.filter(t => t.status !== 'closed' && t.status !== 'resolved' && t.status !== 'rejected').length;
    const closed = scopedTickets.filter(t => t.status === 'closed' || t.status === 'resolved').length;
    
    let slaBreached = 0;
    let slaAtRisk = 0;

    scopedTickets.forEach(t => {
      if (t.status !== 'closed' && t.status !== 'resolved' && t.status !== 'rejected') {
        const info = getTicketSLAInfo(t, now);
        if (info.slaStatus === 'Breached') slaBreached++;
        else if (info.slaStatus === 'At Risk') slaAtRisk++;
      }
    });

    const slaCompliance = closed > 0 
      ? Math.round((scopedTickets.filter(t => {
          if (t.status !== 'closed' && t.status !== 'resolved') return false;
          const target = t.target_resolution_date ? new Date(t.target_resolution_date).getTime() : 0;
          const returned = t.returned_at ? new Date(t.returned_at).getTime() : Date.now();
          return !target || returned <= target;
        }).length / closed) * 100)
      : 100;

    const categories = { Laptop: 0, Monitor: 0, Software: 0, Access: 0, Other: 0 };
    scopedTickets.forEach(t => {
      const cat = t.category || 'Other';
      if (cat.includes('Laptop')) categories.Laptop++;
      else if (cat.includes('Monitor')) categories.Monitor++;
      else if (cat.includes('Software')) categories.Software++;
      else if (cat.includes('Access') || cat.includes('Permission')) categories.Access++;
      else categories.Other++;
    });

    const assignedDevices = scopedTickets.filter(t => t.assigned_device_name && t.status !== 'closed').length;
    const utilization = totalDevices > 0 ? Math.min(100, Math.round((assignedDevices / totalDevices) * 100)) : 0;

    const feed = scopedTickets
      .slice(0, 5)
      .map(t => {
        const dateStr = new Date(t.created_at).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
        return {
          id: t.id,
          time: dateStr,
          title: t.title,
          user: t.requester_name,
          desc: `${t.requester_name} raised a ${t.priority.toUpperCase()} ticket for ${t.category || 'general'}`
        };
      });

    return {
      total,
      open,
      closed,
      slaBreached,
      slaAtRisk,
      slaCompliance,
      categories,
      utilization,
      feed
    };
  }, [scopedTickets, totalDevices, now]);

  const [slaFilter, setSlaFilter] = useState('all'); // 'all', 'expired', 'expiring_soon'

  // Actionable Tickets Filter for SLA Risk Monitor: Show ONLY 'At Risk' or 'Breached' tickets
  const actionableTickets = useMemo(() => {
    return scopedTickets
      .map(t => ({ ticket: t, sla: getTicketSLAInfo(t, now) }))
      .filter(({ ticket, sla }) => {
        if (sla.isClosed) return false;
        if (slaFilter === 'expired') return sla.slaStatus === 'Breached';
        if (slaFilter === 'expiring_soon') return sla.slaStatus === 'At Risk';
        return sla.slaStatus === 'At Risk' || sla.slaStatus === 'Breached';
      });
  }, [scopedTickets, now, slaFilter]);

  // Live SLA Warning Notifications (expiring & breached tickets)
  const slaWarningNotifications = useMemo(() => {
    return scopedTickets
      .map(t => ({ ticket: t, sla: getTicketSLAInfo(t, now) }))
      .filter(({ ticket, sla }) => !sla.isClosed && (sla.slaStatus === 'Breached' || sla.slaStatus === 'At Risk'))
      .filter(({ ticket }) => !dismissedAlerts.includes(ticket.id))
      .sort((a, b) => a.sla.diff - b.sla.diff);
  }, [scopedTickets, now, dismissedAlerts]);

  // Comprehensive tracking list with fallback to scopedTickets
  const trackingData = useMemo(() => {
    let list = deviceTrackingList;
    if (!list || list.length === 0) {
      list = scopedTickets
        .filter(t => t.assigned_device_name && t.assigned_device_name.trim() !== '')
        .map(t => ({
          ticket_id: t.id,
          ticket_title: t.title,
          ticket_type: t.type,
          requester_name: t.requester_name,
          requester_email: t.requester_email,
          assigned_device_name: t.assigned_device_name,
          assigned_at: t.assigned_at || t.created_at,
          expected_return_date: t.expected_return_date,
          ticket_status: t.status,
          inventory_name: t.assigned_device_name,
          inventory_category: t.category || 'Hardware'
        }));
    }
    return list;
  }, [deviceTrackingList, scopedTickets]);

  const filteredTrackingData = useMemo(() => {
    return trackingData.filter(item => {
      const isOverdue = item.ticket_status !== 'closed' && item.expected_return_date && new Date(item.expected_return_date).getTime() < now;
      const isPendingReturn = item.ticket_status === 'return_pending_verification';

      if (deviceFilter === 'overdue' && !isOverdue) return false;
      if (deviceFilter === 'pending_return' && !isPendingReturn) return false;
      if (deviceFilter === 'active' && item.ticket_status === 'closed') return false;

      if (deviceSearch.trim()) {
        const q = deviceSearch.toLowerCase();
        const titleMatch = (item.ticket_title || '').toLowerCase().includes(q);
        const userMatch = (item.requester_name || '').toLowerCase().includes(q) || (item.requester_email || '').toLowerCase().includes(q);
        const deviceMatch = (item.assigned_device_name || '').toLowerCase().includes(q);
        const serialMatch = (item.serial_number || '').toLowerCase().includes(q);
        const modelMatch = (item.model_number || '').toLowerCase().includes(q);
        const idMatch = (item.ticket_id || '').toLowerCase().includes(q);
        return titleMatch || userMatch || deviceMatch || serialMatch || modelMatch || idMatch;
      }
      return true;
    });
  }, [trackingData, deviceFilter, deviceSearch, now]);

  const deviceMetrics = useMemo(() => {
    const totalAllocated = trackingData.filter(i => i.ticket_status !== 'closed').length;
    const overdueCount = trackingData.filter(i => i.ticket_status !== 'closed' && i.expected_return_date && new Date(i.expected_return_date).getTime() < now).length;
    const pendingReturnCount = trackingData.filter(i => i.ticket_status === 'return_pending_verification').length;
    const returnedCount = trackingData.filter(i => i.ticket_status === 'closed').length;

    return { totalAllocated, overdueCount, pendingReturnCount, returnedCount };
  }, [trackingData, now]);

  // Escalation Handler cycling: Engineer -> Team Lead -> Manager -> Admin
  const handleEscalateTicket = async (ticket, currentLevel) => {
    let nextLevel = 'Team Lead';
    let nextEngineer = 'Lead Systems Specialist';

    if (currentLevel === 'Engineer') {
      nextLevel = 'Team Lead';
      nextEngineer = 'Lead Systems Specialist';
    } else if (currentLevel === 'Team Lead') {
      nextLevel = 'Manager';
      nextEngineer = 'IT Operations Manager';
    } else if (currentLevel === 'Manager') {
      nextLevel = 'Admin';
      nextEngineer = 'Chief Admin Officer';
    } else {
      return;
    }

    const confirmed = await window.showConfirm({
      title: 'Escalate Ticket',
      message: `Are you sure you want to escalate "${ticket.title}" to ${nextLevel} level (${nextEngineer})?`,
      confirmText: `Escalate to ${nextLevel}`,
      cancelText: 'Cancel',
      confirmType: 'success'
    });
    if (!confirmed) return;

    try {
      if (API_URL) {
        await axios.put(`${API_URL}/tickets/${ticket.id}/escalate`, {
          escalation_level: nextLevel,
          assigned_engineer: nextEngineer
        });
      }
      alert(`Ticket successfully escalated to ${nextLevel}!`);
      if (onRefresh) onRefresh();
    } catch (err) {
      console.error('Escalation error:', err);
      alert(err.response?.data?.error || 'Failed to escalate ticket');
    }
  };

  const handleVerifyReturn = async (ticketId) => {
    const confirmed = await window.showConfirm({
      title: 'Verify Device Return',
      message: `Are you sure you want to verify physical device return for ticket #${formatTicketId(ticketId, 'device-request')}? Inventory count will be restocked.`,
      confirmText: 'Verify Return',
      cancelText: 'Cancel',
      confirmType: 'success'
    });
    if (!confirmed) return;

    try {
      if (API_URL) {
        await axios.put(`${API_URL}/tickets/${ticketId}/verify-return`);
      }
      alert('Device return verified! Hardware restocked to inventory.');
      if (onRefresh) onRefresh();
    } catch (err) {
      console.error('Verify return error:', err);
      alert(err.response?.data?.error || 'Verification of device return failed');
    }
  };

  const getReturnStatusInfo = (item) => {
    if (item.ticket_status === 'closed') {
      return { text: 'Returned & Restocked', bg: 'rgba(16, 185, 129, 0.15)', color: '#10b981', border: '1px solid rgba(16, 185, 129, 0.3)' };
    }
    if (item.ticket_status === 'return_pending_verification') {
      return { text: 'Return Pending Verification', bg: 'rgba(56, 189, 248, 0.15)', color: '#38bdf8', border: '1px solid rgba(56, 189, 248, 0.3)' };
    }
    if (item.expected_return_date) {
      const exp = new Date(item.expected_return_date).getTime();
      const diff = exp - now;
      if (diff < 0) {
        const overdueDays = Math.floor(Math.abs(diff) / (1000 * 3600 * 24));
        return { text: `OVERDUE BY ${overdueDays || 1} DAYS`, bg: 'rgba(239, 68, 68, 0.18)', color: '#ef4444', border: '1px solid rgba(239, 68, 68, 0.4)' };
      } else {
        const days = Math.floor(diff / (1000 * 3600 * 24));
        return { text: `Due in ${days} days`, bg: 'rgba(245, 158, 11, 0.15)', color: '#f59e0b', border: '1px solid rgba(245, 158, 11, 0.3)' };
      }
    }
    return { text: 'Active Allocation', bg: 'rgba(168, 85, 247, 0.15)', color: '#c084fc', border: '1px solid rgba(168, 85, 247, 0.3)' };
  };

  const isManager = currentUser?.role === 'manager';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '28px', color: 'var(--text-main)' }}>
      {/* Top Welcome Title Banner */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h2 style={{ fontSize: '24px', fontWeight: '800', letterSpacing: '-0.5px', margin: '0 0 4px 0', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <TrendingUpIcon size={24} style={{ color: 'var(--accent)' }} /> {isManager ? 'Manager Team Dashboard' : 'Executive Command Center'}
          </h2>
          <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: '13px' }}>
            {isManager 
              ? 'Personalized team ticket workload, pending approval queue, and SLA resolution metrics.'
              : 'System performance index, active SLA risks, and asset lifecycle oversight.'
            }
          </p>
        </div>
        <div style={{ display: 'flex', gap: '10px' }}>
          <button 
            onClick={onViewAllTickets}
            style={{ padding: '8px 16px', borderRadius: '8px', background: 'var(--bg-card)', border: 'var(--border-card)', color: 'var(--text-main)', fontSize: '13px', cursor: 'pointer', fontWeight: '600' }}
          >
            {isManager ? 'Team Tickets List' : 'All Tickets List'}
          </button>
          {currentUser?.role === 'admin' && (
            <button 
              onClick={onViewInventory}
              style={{ padding: '8px 16px', borderRadius: '8px', background: 'var(--accent)', border: 'none', color: '#ffffff', fontSize: '13px', cursor: 'pointer', fontWeight: '600', boxShadow: '0 4px 12px var(--accent)33' }}
            >
              Manage Fleet
            </button>
          )}
        </div>
      </div>

      {/* Real-time SLA Warning Notification Banner */}
      {slaWarningNotifications.length > 0 && (
        <div className="sla-warning-center">
          <div className="sla-warning-header">
            <h3 className="sla-warning-title">
              <span className="sla-badge-pulse" style={{ display: 'inline-flex', padding: '4px', borderRadius: '50%', background: '#ef4444' }}>
                <AlertIcon size={16} style={{ color: '#ffffff' }} />
              </span>
              <span>SLA Warning Notifications Center ({slaWarningNotifications.length} Actionable)</span>
            </h3>
            <button 
              onClick={() => setDismissedAlerts(slaWarningNotifications.map(a => a.ticket.id))}
              style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '12px', fontWeight: '600' }}
            >
              Dismiss All Warnings
            </button>
          </div>

          <div className="sla-alert-grid">
            {slaWarningNotifications.slice(0, 3).map(({ ticket, sla }) => {
              const isBreached = sla.slaStatus === 'Breached';
              return (
                <div key={ticket.id} className={`sla-alert-card ${isBreached ? 'breached' : 'at-risk'}`}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flex: '1' }}>
                    <span style={{
                      padding: '3px 8px',
                      borderRadius: '6px',
                      fontSize: '11px',
                      fontWeight: '800',
                      background: isBreached ? 'rgba(239, 68, 68, 0.25)' : 'rgba(245, 158, 11, 0.25)',
                      color: isBreached ? '#ef4444' : '#f59e0b',
                      border: `1px solid ${isBreached ? 'rgba(239, 68, 68, 0.5)' : 'rgba(245, 158, 11, 0.5)'}`
                    }}>
                      {isBreached ? 'CRITICAL BREACH' : 'EXPIRING SOON'}
                    </span>
                    <strong style={{ fontFamily: 'monospace', fontSize: '12px' }}>{formatTicketId(ticket.id, ticket.type)}</strong>
                    <span style={{ fontWeight: '700' }}>"{ticket.title}"</span>
                    <span style={{ color: 'var(--text-muted)', fontSize: '12px' }}>
                      — Assigned to: <strong style={{ color: 'var(--text-main)' }}>{sla.assignedEngineer}</strong>
                    </span>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <span style={{ fontFamily: 'monospace', fontWeight: '800', color: isBreached ? '#ef4444' : '#f59e0b', fontSize: '13px' }}>
                      {sla.timeRemainingStr}
                    </span>
                    <button
                      onClick={() => onSelectTicket(ticket.id)}
                      style={{
                        padding: '5px 12px',
                        borderRadius: '6px',
                        background: isBreached ? '#ef4444' : '#f59e0b',
                        border: 'none',
                        color: '#ffffff',
                        fontSize: '12px',
                        fontWeight: '700',
                        cursor: 'pointer'
                      }}
                    >
                      View Ticket
                    </button>
                    <button
                      onClick={() => setDismissedAlerts(prev => [...prev, ticket.id])}
                      style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: '4px' }}
                      title="Dismiss Warning"
                    >
                      <XIcon size={14} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* KPI Cards Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '20px' }}>
        {/* KPI 1 */}
        <div style={{ background: 'var(--bg-card)', border: 'var(--border-card)', borderRadius: 'var(--radius-card)', padding: '20px', boxShadow: 'var(--shadow)', backdropFilter: 'var(--backdrop)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
            <span style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Active Backlog</span>
            <span style={{ color: 'var(--accent)' }}><DashboardIcon size={22} /></span>
          </div>
          <div style={{ fontSize: '32px', fontWeight: '800' }}>
            <CountUp end={metrics.open} duration={1200} suffix=" Open" />
          </div>
          <p style={{ margin: '8px 0 0 0', fontSize: '11px', color: 'var(--text-muted)' }}>From {metrics.total} total submitted tickets</p>
        </div>

        {/* KPI 2 */}
        <div style={{ background: 'var(--bg-card)', border: 'var(--border-card)', borderRadius: 'var(--radius-card)', padding: '20px', boxShadow: 'var(--shadow)', backdropFilter: 'var(--backdrop)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
            <span style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.5px' }}>SLA Compliance</span>
            <span style={{ color: '#10b981' }}><SuccessIcon size={22} /></span>
          </div>
          <div style={{ fontSize: '32px', fontWeight: '800', color: '#10b981' }}>
            <CountUp end={metrics.slaCompliance} duration={1200} suffix="%" />
          </div>
          <p style={{ margin: '8px 0 0 0', fontSize: '11px', color: 'var(--text-muted)' }}>Target threshold met: 90%</p>
        </div>

        {/* KPI 3 */}
        <div style={{ background: 'var(--bg-card)', border: 'var(--border-card)', borderRadius: 'var(--radius-card)', padding: '20px', boxShadow: 'var(--shadow)', backdropFilter: 'var(--backdrop)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
            <span style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Fleet Utilization</span>
            <span style={{ color: '#38bdf8' }}><DevicesIcon size={22} /></span>
          </div>
          <div style={{ fontSize: '32px', fontWeight: '800', color: '#38bdf8' }}>
            <CountUp end={metrics.utilization} duration={1200} suffix="%" />
          </div>
          <p style={{ margin: '8px 0 0 0', fontSize: '11px', color: 'var(--text-muted)' }}>Of {totalDevices} total inventory hardware</p>
        </div>

        {/* KPI 4 */}
        <div style={{ background: 'var(--bg-card)', border: 'var(--border-card)', borderRadius: 'var(--radius-card)', padding: '20px', boxShadow: 'var(--shadow)', backdropFilter: 'var(--backdrop)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
            <span style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.5px' }}>SLA At Risk</span>
            <span style={{ color: '#ef4444' }}><ClockIcon size={22} /></span>
          </div>
          <div style={{ fontSize: '32px', fontWeight: '800', color: '#ef4444' }}>
            <CountUp end={metrics.slaAtRisk + metrics.slaBreached} duration={1200} suffix=" Tickets" />
          </div>
          <p style={{ margin: '8px 0 0 0', fontSize: '11px', color: 'var(--text-muted)' }}>{metrics.slaBreached} breached, {metrics.slaAtRisk} critical</p>
        </div>
      </div>

      {/* Middle Row: Category Breakdown & Activity Feed */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '24px' }}>
        {/* Category Breakdown */}
        <div style={{ background: 'var(--bg-card)', border: 'var(--border-card)', borderRadius: 'var(--radius-card)', padding: '24px', boxShadow: 'var(--shadow)', backdropFilter: 'var(--backdrop)' }}>
          <h3 style={{ fontSize: '16px', fontWeight: '700', margin: '0 0 16px 0' }}>Ticket Breakdown by Category</h3>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {Object.entries(metrics.categories).map(([cat, count]) => {
              const percentage = metrics.total > 0 ? Math.round((count / metrics.total) * 100) : 0;
              return (
                <div key={cat} style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <span style={{ fontSize: '13px', width: '100px' }}>{cat}</span>
                  <div style={{ flex: '1', height: '10px', background: 'rgba(255,255,255,0.05)', borderRadius: '5px', overflow: 'hidden' }}>
                    <div style={{ width: animate ? `${percentage}%` : '0%', height: '100%', background: 'var(--accent-gradient, linear-gradient(90deg, #4f46e5, #06b6d4))', borderRadius: '5px', transition: 'width 1.2s cubic-bezier(0.34, 1.56, 0.64, 1)' }}></div>
                  </div>
                  <strong style={{ fontSize: '12px', width: '20px', textAlign: 'right' }}>{count}</strong>
                </div>
              );
            })}
          </div>
        </div>

        {/* Real-time Activity Feed */}
        <div style={{ background: 'var(--bg-card)', border: 'var(--border-card)', borderRadius: 'var(--radius-card)', padding: '24px', boxShadow: 'var(--shadow)', backdropFilter: 'var(--backdrop)', display: 'flex', flexDirection: 'column' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
            <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#10b981', display: 'inline-block', boxShadow: '0 0 8px #10b981' }}></span>
            <h3 style={{ fontSize: '15px', fontWeight: '700', margin: 0 }}>Live Activity Feed</h3>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', flex: '1' }}>
            {metrics.feed.length === 0 ? (
              <p style={{ color: 'var(--text-muted)', fontSize: '13px', textAlign: 'center', padding: '20px 0' }}>No recent activity to show.</p>
            ) : (
              metrics.feed.map(item => (
                <div key={item.id} style={{ display: 'flex', gap: '12px', fontSize: '12.5px', borderBottom: 'var(--border-card)', paddingBottom: '10px', cursor: 'pointer' }} onClick={() => onSelectTicket(item.id)}>
                  <span style={{ color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>{item.time}</span>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                    <span style={{ fontWeight: '600' }}>{item.title}</span>
                    <span style={{ color: 'var(--text-muted)', fontSize: '11px' }}>{item.desc}</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* SLA Risk Monitor Section (Actionable Tickets Only) */}
      <div style={{ background: 'var(--bg-card)', border: 'var(--border-card)', borderRadius: 'var(--radius-card)', padding: '24px', boxShadow: 'var(--shadow)', backdropFilter: 'var(--backdrop)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <h3 style={{ fontSize: '16px', fontWeight: '800', margin: 0, letterSpacing: '-0.3px', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <AlertIcon size={18} style={{ color: '#ef4444' }} /> SLA Risk Monitor
            </h3>
            <span style={{ fontSize: '11px', background: 'rgba(239, 68, 68, 0.15)', color: '#ef4444', border: '1px solid rgba(239, 68, 68, 0.3)', padding: '2px 8px', borderRadius: '12px', fontWeight: '700' }}>
              {actionableTickets.length} Actionable
            </span>
          </div>

          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
            <button
              onClick={() => setSlaFilter('all')}
              style={{
                padding: '5px 12px',
                borderRadius: '6px',
                fontSize: '12px',
                fontWeight: '600',
                cursor: 'pointer',
                background: slaFilter === 'all' ? 'var(--accent)' : 'var(--bg-body)',
                border: 'var(--border-card)',
                color: slaFilter === 'all' ? '#ffffff' : 'var(--text-main)'
              }}
            >
              All SLA Risks
            </button>
            <button
              onClick={() => setSlaFilter('expired')}
              style={{
                padding: '5px 12px',
                borderRadius: '6px',
                fontSize: '12px',
                fontWeight: '600',
                cursor: 'pointer',
                background: slaFilter === 'expired' ? '#ef4444' : 'var(--bg-body)',
                border: 'var(--border-card)',
                color: slaFilter === 'expired' ? '#ffffff' : 'var(--text-main)'
              }}
            >
              Expired (Breached) ({metrics.slaBreached})
            </button>
            <button
              onClick={() => setSlaFilter('expiring_soon')}
              style={{
                padding: '5px 12px',
                borderRadius: '6px',
                fontSize: '12px',
                fontWeight: '600',
                cursor: 'pointer',
                background: slaFilter === 'expiring_soon' ? '#f59e0b' : 'var(--bg-body)',
                border: 'var(--border-card)',
                color: slaFilter === 'expiring_soon' ? '#ffffff' : 'var(--text-main)'
              }}
            >
              About to Expire (&lt; 12 hrs) ({metrics.slaAtRisk})
            </button>
          </div>
        </div>
        
        {actionableTickets.length === 0 ? (
          <div style={{ padding: '28px 0', textAlign: 'center', color: '#10b981', fontSize: '14px', fontWeight: '600' }}>
            {slaFilter === 'all' 
              ? 'Zero active SLA risk or breached tickets. System SLA healthy!'
              : `No tickets found matching "${slaFilter === 'expired' ? 'Expired (Breached)' : 'About to Expire'}" SLA filter.`
            }
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px', textAlign: 'left' }}>
              <thead>
                <tr style={{ borderBottom: 'var(--border-card)', color: 'var(--text-muted)', fontSize: '12px' }}>
                  <th style={{ padding: '12px 10px' }}>Ticket ID</th>
                  <th style={{ padding: '12px 10px' }}>Ticket Title</th>
                  <th style={{ padding: '12px 10px' }}>Assigned Engineer</th>
                  <th style={{ padding: '12px 10px' }}>Priority</th>
                  <th style={{ padding: '12px 10px' }}>Time Remaining</th>
                  <th style={{ padding: '12px 10px' }}>SLA Status</th>
                  <th style={{ padding: '12px 10px' }}>Risk Level</th>
                  <th style={{ padding: '12px 10px' }}>Escalation Level</th>
                  <th style={{ padding: '12px 10px', textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {actionableTickets.map(({ ticket, sla }) => {
                  const isHighRiskOrBreached = sla.riskLevel === 'High' || sla.slaStatus === 'Breached';
                  const canEscalate = isHighRiskOrBreached && sla.escalationLevel !== 'Admin';

                  return (
                    <tr key={ticket.id} style={{ borderBottom: 'var(--border-card)', transition: 'background 0.2s ease' }}>
                      {/* Ticket ID */}
                      <td style={{ padding: '12px 10px', fontFamily: 'monospace', fontSize: '12px', color: 'var(--text-muted)' }}>
                        {formatTicketId(ticket.id, ticket.type)}
                      </td>
                      {/* 1. Ticket Title */}
                      <td 
                        style={{ padding: '12px 10px', fontWeight: '700', color: 'var(--text-main)', cursor: 'pointer' }}
                        onClick={() => onSelectTicket(ticket.id)}
                        title="Click to view details"
                      >
                        {ticket.title}
                      </td>

                      {/* 2. Assigned Engineer */}
                      <td style={{ padding: '12px 10px', color: 'var(--text-main)', fontWeight: '500' }}>
                        {sla.assignedEngineer}
                      </td>

                      {/* 3. Priority */}
                      <td style={{ padding: '12px 10px' }}>
                        <span style={{
                          padding: '3px 8px',
                          borderRadius: '6px',
                          fontSize: '11px',
                          fontWeight: '800',
                          textTransform: 'uppercase',
                          background: ticket.priority === 'high' || ticket.priority === 'urgent' ? 'rgba(239, 68, 68, 0.15)' : ticket.priority === 'medium' ? 'rgba(245, 158, 11, 0.15)' : 'rgba(56, 189, 248, 0.15)',
                          color: ticket.priority === 'high' || ticket.priority === 'urgent' ? '#ef4444' : ticket.priority === 'medium' ? '#f59e0b' : '#38bdf8',
                          border: `1px solid ${ticket.priority === 'high' || ticket.priority === 'urgent' ? 'rgba(239, 68, 68, 0.3)' : ticket.priority === 'medium' ? 'rgba(245, 158, 11, 0.3)' : 'rgba(56, 189, 248, 0.3)'}`
                        }}>
                          {ticket.priority.toUpperCase()}
                        </span>
                      </td>

                      {/* 4. Time Remaining (Real-time live ticker!) */}
                      <td style={{ 
                        padding: '12px 10px', 
                        fontWeight: '800', 
                        fontFamily: 'monospace',
                        fontSize: '13px',
                        color: sla.slaStatus === 'Breached' ? '#ef4444' : '#f59e0b' 
                      }}>
                        {sla.timeRemainingStr}
                      </td>

                      {/* 5. SLA Status (At Risk / Breached) */}
                      <td style={{ padding: '12px 10px' }}>
                        <span style={{
                          padding: '4px 10px',
                          borderRadius: '12px',
                          fontSize: '11px',
                          fontWeight: '800',
                          background: sla.slaStatus === 'Breached' ? 'rgba(239, 68, 68, 0.2)' : 'rgba(245, 158, 11, 0.2)',
                          color: sla.slaStatus === 'Breached' ? '#ef4444' : '#f59e0b',
                          border: `1px solid ${sla.slaStatus === 'Breached' ? 'rgba(239, 68, 68, 0.4)' : 'rgba(245, 158, 11, 0.4)'}`
                        }}>
                          {sla.slaStatus === 'Breached' ? 'BREACHED' : 'AT RISK'}
                        </span>
                      </td>

                      {/* 6. Risk Level (Low / Medium / High) */}
                      <td style={{ padding: '12px 10px' }}>
                        <span style={{
                          padding: '3px 8px',
                          borderRadius: '6px',
                          fontSize: '11px',
                          fontWeight: '800',
                          background: sla.riskLevel === 'High' ? 'rgba(239, 68, 68, 0.15)' : sla.riskLevel === 'Medium' ? 'rgba(245, 158, 11, 0.15)' : 'rgba(56, 189, 248, 0.15)',
                          color: sla.riskLevel === 'High' ? '#ef4444' : sla.riskLevel === 'Medium' ? '#f59e0b' : '#38bdf8'
                        }}>
                          {sla.riskLevel.toUpperCase()}
                        </span>
                      </td>

                      {/* 7. Escalation Level */}
                      <td style={{ padding: '12px 10px' }}>
                        <span style={{
                          padding: '3px 8px',
                          borderRadius: '6px',
                          fontSize: '11px',
                          fontWeight: '700',
                          background: 'rgba(168, 85, 247, 0.15)',
                          color: '#c084fc',
                          border: '1px solid rgba(168, 85, 247, 0.3)'
                        }}>
                          {sla.escalationLevel}
                        </span>
                      </td>

                      {/* 8. Actions (View / Escalate) */}
                      <td style={{ padding: '12px 10px', textAlign: 'right' }}>
                        <div style={{ display: 'flex', gap: '6px', justifyContent: 'flex-end' }}>
                          <button 
                            onClick={() => onSelectTicket(ticket.id)}
                            style={{
                              padding: '6px 12px',
                              borderRadius: '6px',
                              background: 'var(--bg-body)',
                              border: 'var(--border-card)',
                              color: 'var(--text-main)',
                              cursor: 'pointer',
                              fontSize: '12px',
                              fontWeight: '600'
                            }}
                          >
                            View
                          </button>

                          {/* Show Escalate action ONLY for High Risk or Breached tickets */}
                          {canEscalate && (
                            <button 
                              onClick={() => handleEscalateTicket(ticket, sla.escalationLevel)}
                              style={{
                                padding: '6px 12px',
                                borderRadius: '6px',
                                background: 'linear-gradient(135deg, #10b981, #3b82f6)',
                                border: 'none',
                                color: '#ffffff',
                                cursor: 'pointer',
                                fontSize: '12px',
                                fontWeight: '700',
                                boxShadow: '0 2px 8px rgba(16, 185, 129, 0.3)'
                              }}
                              title={`Escalate along path: Engineer → Team Lead → Manager → Admin`}
                            >
                              Escalate
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

      {/* Device Allocation & Return Tracking Report Section */}
      <div style={{ background: 'var(--bg-card)', border: 'var(--border-card)', borderRadius: 'var(--radius-card)', padding: '24px', boxShadow: 'var(--shadow)', backdropFilter: 'var(--backdrop)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '14px' }}>
          <div>
            <h3 style={{ fontSize: '17px', fontWeight: '800', margin: '0 0 4px 0', letterSpacing: '-0.4px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <DevicesIcon size={20} style={{ color: 'var(--accent)' }} /> Device Allocation & Return Tracking Report
            </h3>
            <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: '12.5px' }}>
              Monitor active hardware deployments, expected return dates, and restock status.
            </p>
          </div>

          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', alignItems: 'center' }}>
            {/* Search Input */}
            <div style={{ position: 'relative', width: '220px' }}>
              <input
                type="text"
                placeholder="Search device or user..."
                value={deviceSearch}
                onChange={(e) => setDeviceSearch(e.target.value)}
                style={{
                  width: '100%',
                  padding: '7px 12px',
                  borderRadius: '8px',
                  background: 'var(--bg-body)',
                  border: 'var(--border-card)',
                  color: 'var(--text-main)',
                  fontSize: '12px'
                }}
              />
            </div>

            {/* Filter Buttons */}
            <button
              onClick={() => setDeviceFilter('all')}
              style={{
                padding: '6px 12px',
                borderRadius: '6px',
                fontSize: '12px',
                fontWeight: '600',
                cursor: 'pointer',
                background: deviceFilter === 'all' ? 'var(--accent)' : 'var(--bg-body)',
                border: 'var(--border-card)',
                color: deviceFilter === 'all' ? '#ffffff' : 'var(--text-main)'
              }}
            >
              All Records ({trackingData.length})
            </button>
            <button
              onClick={() => setDeviceFilter('overdue')}
              style={{
                padding: '6px 12px',
                borderRadius: '6px',
                fontSize: '12px',
                fontWeight: '600',
                cursor: 'pointer',
                background: deviceFilter === 'overdue' ? '#ef4444' : 'var(--bg-body)',
                border: 'var(--border-card)',
                color: deviceFilter === 'overdue' ? '#ffffff' : 'var(--text-main)'
              }}
            >
              Overdue Returns ({deviceMetrics.overdueCount})
            </button>
            <button
              onClick={() => setDeviceFilter('pending_return')}
              style={{
                padding: '6px 12px',
                borderRadius: '6px',
                fontSize: '12px',
                fontWeight: '600',
                cursor: 'pointer',
                background: deviceFilter === 'pending_return' ? '#38bdf8' : 'var(--bg-body)',
                border: 'var(--border-card)',
                color: deviceFilter === 'pending_return' ? '#ffffff' : 'var(--text-main)'
              }}
            >
              Pending Verification ({deviceMetrics.pendingReturnCount})
            </button>
          </div>
        </div>

        {/* Device Metrics Summary Bar */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '14px', marginBottom: '20px' }}>
          <div style={{ background: 'var(--bg-body)', border: 'var(--border-card)', borderRadius: '10px', padding: '14px 16px' }}>
            <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: '700', textTransform: 'uppercase' }}>Active Allocations</div>
            <div style={{ fontSize: '22px', fontWeight: '800', marginTop: '4px', color: '#c084fc' }}>{deviceMetrics.totalAllocated} Units</div>
          </div>
          <div style={{ background: 'var(--bg-body)', border: 'var(--border-card)', borderRadius: '10px', padding: '14px 16px' }}>
            <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: '700', textTransform: 'uppercase' }}>Overdue Returns</div>
            <div style={{ fontSize: '22px', fontWeight: '800', marginTop: '4px', color: deviceMetrics.overdueCount > 0 ? '#ef4444' : '#10b981' }}>{deviceMetrics.overdueCount} Units</div>
          </div>
          <div style={{ background: 'var(--bg-body)', border: 'var(--border-card)', borderRadius: '10px', padding: '14px 16px' }}>
            <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: '700', textTransform: 'uppercase' }}>Pending Verification</div>
            <div style={{ fontSize: '22px', fontWeight: '800', marginTop: '4px', color: '#38bdf8' }}>{deviceMetrics.pendingReturnCount} Units</div>
          </div>
          <div style={{ background: 'var(--bg-body)', border: 'var(--border-card)', borderRadius: '10px', padding: '14px 16px' }}>
            <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: '700', textTransform: 'uppercase' }}>Restocked / Returned</div>
            <div style={{ fontSize: '22px', fontWeight: '800', marginTop: '4px', color: '#10b981' }}>{deviceMetrics.returnedCount} Units</div>
          </div>
        </div>

        {/* Tracking Table */}
        {filteredTrackingData.length === 0 ? (
          <div style={{ padding: '30px 0', textAlign: 'center', color: 'var(--text-muted)', fontSize: '13.5px' }}>
            No hardware allocation records found matching filter/search.
          </div>
        ) : (
          <div style={{ width: '100%' }}>
            <table style={{ width: '100%', tableLayout: 'fixed', borderCollapse: 'collapse', fontSize: '13px', textAlign: 'left' }}>
              <thead>
                <tr style={{ borderBottom: 'var(--border-card)', color: 'var(--text-muted)', fontSize: '12px' }}>
                  <th style={{ width: '14%' }}>Ticket ID</th>
                  <th style={{ width: '24%' }}>Assigned Employee</th>
                  <th style={{ width: '22%' }}>Allocated Hardware Device</th>
                  <th className="col-assigned-date" style={{ width: '12%' }}>Assigned Date</th>
                  <th className="col-return-date" style={{ width: '12%' }}>Expected Return Date</th>
                  <th style={{ width: '16%' }}>Return Status</th>
                </tr>
              </thead>
              <tbody>
                {filteredTrackingData.map((item) => {
                  const statusInfo = getReturnStatusInfo(item);
                  const canVerify = currentUser?.role === 'admin' && item.ticket_status === 'return_pending_verification';

                  return (
                    <tr key={item.ticket_id} style={{ borderBottom: 'var(--border-card)' }}>
                      <td className="ticket-id-cell">
                        {formatTicketId(item.ticket_id, item.ticket_type)}
                      </td>
                      <td>
                        <div style={{ fontWeight: '600', wordBreak: 'break-word' }}>{item.requester_name || 'N/A'}</div>
                        {item.requester_email && (
                          <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: '400', wordBreak: 'break-all' }}>{item.requester_email}</div>
                        )}
                      </td>
                      <td style={{ fontWeight: '700', color: 'var(--accent)', wordBreak: 'break-word' }}>
                        {item.assigned_device_name || item.inventory_name || 'Assigned Hardware'}
                      </td>
                      <td className="col-assigned-date" style={{ color: 'var(--text-muted)', fontSize: '12px' }}>
                        {item.assigned_at ? new Date(item.assigned_at).toLocaleDateString() : 'N/A'}
                      </td>
                      <td className="col-return-date" style={{ color: 'var(--text-muted)', fontSize: '12px' }}>
                        {item.expected_return_date ? new Date(item.expected_return_date).toLocaleDateString() : 'Continuous'}
                      </td>
                      <td style={{ padding: '12px 12px', whiteSpace: 'nowrap' }}>
                        <span style={{
                          padding: '5px 12px',
                          borderRadius: '12px',
                          fontSize: '11px',
                          fontWeight: '800',
                          background: statusInfo.bg,
                          color: statusInfo.color,
                          border: statusInfo.border,
                          display: 'inline-flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          whiteSpace: 'nowrap',
                          lineHeight: '1.2'
                        }}>
                          {statusInfo.text}
                        </span>
                      </td>
                      <td style={{ padding: '12px 10px', textAlign: 'right' }}>
                        <div style={{ display: 'flex', gap: '6px', justifyContent: 'flex-end' }}>
                          <button
                            onClick={() => onSelectTicket(item.ticket_id)}
                            style={{
                              padding: '5px 10px',
                              borderRadius: '6px',
                              background: 'var(--bg-body)',
                              border: 'var(--border-card)',
                              color: 'var(--text-main)',
                              cursor: 'pointer',
                              fontSize: '12px',
                              fontWeight: '600'
                            }}
                          >
                            Details
                          </button>
                          {canVerify && (
                            <button
                              onClick={() => handleVerifyReturn(item.ticket_id)}
                              style={{
                                padding: '5px 10px',
                                borderRadius: '6px',
                                background: 'linear-gradient(135deg, #10b981, #059669)',
                                border: 'none',
                                color: '#ffffff',
                                cursor: 'pointer',
                                fontSize: '12px',
                                fontWeight: '700'
                              }}
                            >
                              Verify Restock
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

export default ExecutiveDashboard;
