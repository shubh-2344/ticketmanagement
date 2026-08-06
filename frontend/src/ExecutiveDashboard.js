import React, { useMemo, useState, useEffect } from 'react';
import axios from 'axios';
import CountUp from './components/CountUp';
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
  CheckIcon
} from './components/Icons';

function ExecutiveDashboard({ tickets, currentUser, onSelectTicket, onViewAllTickets, onViewInventory, API_URL, onRefresh }) {
  const [animate, setAnimate] = useState(false);
  const [now, setNow] = useState(Date.now());

  const [totalDevices, setTotalDevices] = useState(0);

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
      : (new Date(t.created_at).getTime() + (t.priority === 'high' ? 24 : t.priority === 'low' ? 72 : 48) * 3600000);
    
    const diff = target - currentTime;
    const isClosed = t.status === 'closed' || t.status === 'resolved' || t.status === 'approved';

    let slaStatus = 'Normal';
    if (diff <= 0) {
      slaStatus = 'Breached';
    } else if (diff <= 12 * 3600 * 1000) {
      slaStatus = 'At Risk';
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
    const open = scopedTickets.filter(t => t.status !== 'closed' && t.status !== 'resolved').length;
    const closed = scopedTickets.filter(t => t.status === 'closed' || t.status === 'resolved').length;
    
    let slaBreached = 0;
    let slaAtRisk = 0;

    scopedTickets.forEach(t => {
      if (t.status !== 'closed' && t.status !== 'resolved') {
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

  // Actionable Tickets Filter for SLA Risk Monitor: Show ONLY 'At Risk' or 'Breached' tickets
  const actionableTickets = useMemo(() => {
    return scopedTickets
      .map(t => ({ ticket: t, sla: getTicketSLAInfo(t, now) }))
      .filter(({ ticket, sla }) => !sla.isClosed && (sla.slaStatus === 'At Risk' || sla.slaStatus === 'Breached'));
  }, [scopedTickets, now]);

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
      title: '⚡ Escalate Ticket',
      message: `Are you sure you want to escalate "${ticket.title}" to ${nextLevel} level (${nextEngineer})?`,
      confirmText: `Escalate to ${nextLevel}`,
      cancelText: 'Cancel',
      confirmType: 'success' // Blue/green confirmation theme
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

  const isManager = currentUser?.role === 'manager';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '28px', color: 'var(--text-main)' }}>
      {/* Top Welcome Title Banner */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
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
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <h3 style={{ fontSize: '16px', fontWeight: '800', margin: 0, letterSpacing: '-0.3px', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <AlertIcon size={18} style={{ color: '#ef4444' }} /> SLA Risk Monitor
            </h3>
            <span style={{ fontSize: '11px', background: 'rgba(239, 68, 68, 0.15)', color: '#ef4444', border: '1px solid rgba(239, 68, 68, 0.3)', padding: '2px 8px', borderRadius: '12px', fontWeight: '700' }}>
              {actionableTickets.length} Actionable
            </span>
          </div>
          <span style={{ fontSize: '12px', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '4px' }}>
            <ClockIcon size={14} /> Live Real-Time Updates
          </span>
        </div>
        
        {actionableTickets.length === 0 ? (
          <div style={{ padding: '28px 0', textAlign: 'center', color: '#10b981', fontSize: '14px', fontWeight: '600' }}>
            Zero active SLA risk or breached tickets. System SLA healthy!
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px', textAlign: 'left' }}>
              <thead>
                <tr style={{ borderBottom: 'var(--border-card)', color: 'var(--text-muted)', fontSize: '12px' }}>
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
    </div>
  );
}

export default ExecutiveDashboard;
