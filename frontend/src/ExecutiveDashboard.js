import React, { useMemo, useState, useEffect } from 'react';
import { 
  SparklesIcon, 
  ClockIcon, 
  AlertIcon, 
  DevicesIcon, 
  DashboardIcon,
  SuccessIcon
} from './components/Icons';

function ExecutiveDashboard({ tickets, currentUser, onSelectTicket, onViewAllTickets, onViewInventory }) {
  const [animate, setAnimate] = useState(false);
  useEffect(() => {
    const timer = setTimeout(() => setAnimate(true), 50);
    return () => clearTimeout(timer);
  }, []);
  const metrics = useMemo(() => {
    const total = tickets.length;
    const open = tickets.filter(t => t.status !== 'closed' && t.status !== 'resolved').length;
    const closed = tickets.filter(t => t.status === 'closed' || t.status === 'resolved').length;
    
    // SLA Met / Breached calculation
    let slaBreached = 0;
    let slaAtRisk = 0;
    const now = Date.now();

    tickets.forEach(t => {
      if (t.status !== 'closed' && t.status !== 'resolved') {
        const target = t.target_resolution_date ? new Date(t.target_resolution_date).getTime() : 0;
        if (target) {
          if (now > target) {
            slaBreached++;
          } else if (target - now < 12 * 60 * 60 * 1000) {
            // Less than 12 hours remaining
            slaAtRisk++;
          }
        }
      }
    });

    const slaCompliance = closed > 0 
      ? Math.round((tickets.filter(t => {
          if (t.status !== 'closed' && t.status !== 'resolved') return false;
          const target = t.target_resolution_date ? new Date(t.target_resolution_date).getTime() : 0;
          const returned = t.returned_at ? new Date(t.returned_at).getTime() : Date.now();
          return !target || returned <= target;
        }).length / closed) * 100)
      : 94; // Mock fallback

    // Category breakdown
    const categories = { Laptop: 0, Monitor: 0, Software: 0, Access: 0, Other: 0 };
    tickets.forEach(t => {
      const cat = t.category || 'Other';
      if (cat.includes('Laptop')) categories.Laptop++;
      else if (cat.includes('Monitor')) categories.Monitor++;
      else if (cat.includes('Software')) categories.Software++;
      else if (cat.includes('Access') || cat.includes('Permission')) categories.Access++;
      else categories.Other++;
    });

    // Asset utilization rate
    const totalDevices = 120; // Simulated fleet total
    const assignedDevices = tickets.filter(t => t.assigned_device_name && t.status !== 'closed').length;
    const utilization = Math.min(100, Math.round((assignedDevices / totalDevices) * 100));

    // Dynamic Activity Feed
    const feed = tickets
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
  }, [tickets]);

  const isManager = currentUser?.role === 'manager';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '28px', color: 'var(--text-main)' }}>
      {/* Top Welcome Title Banner */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h2 style={{ fontSize: '24px', fontWeight: '800', letterSpacing: '-0.5px', margin: '0 0 4px 0' }}>
            {isManager ? '👔 Manager Team Dashboard' : '💼 Executive Command Center'}
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
          <div style={{ fontSize: '32px', fontWeight: '800' }}>{metrics.open} Open</div>
          <p style={{ margin: '8px 0 0 0', fontSize: '11px', color: 'var(--text-muted)' }}>From {metrics.total} total submitted tickets</p>
        </div>

        {/* KPI 2 */}
        <div style={{ background: 'var(--bg-card)', border: 'var(--border-card)', borderRadius: 'var(--radius-card)', padding: '20px', boxShadow: 'var(--shadow)', backdropFilter: 'var(--backdrop)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
            <span style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.5px' }}>SLA Compliance</span>
            <span style={{ color: '#10b981' }}><SuccessIcon size={22} /></span>
          </div>
          <div style={{ fontSize: '32px', fontWeight: '800', color: '#10b981' }}>{metrics.slaCompliance}%</div>
          <p style={{ margin: '8px 0 0 0', fontSize: '11px', color: 'var(--text-muted)' }}>Target threshold met: 90%</p>
        </div>

        {/* KPI 3 */}
        <div style={{ background: 'var(--bg-card)', border: 'var(--border-card)', borderRadius: 'var(--radius-card)', padding: '20px', boxShadow: 'var(--shadow)', backdropFilter: 'var(--backdrop)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
            <span style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.5px' }}>SLA Breach Alerts</span>
            <span style={{ color: '#ef4444' }}><ClockIcon size={22} /></span>
          </div>
          <div style={{ fontSize: '32px', fontWeight: '800', color: metrics.slaBreached > 0 ? '#ef4444' : 'var(--text-main)' }}>
            {metrics.slaBreached} Overdue
          </div>
          <p style={{ margin: '8px 0 0 0', fontSize: '11px', color: '#f59e0b' }}>⚠️ {metrics.slaAtRisk} critical risk tickets</p>
        </div>

        {/* KPI 4 */}
        <div style={{ background: 'var(--bg-card)', border: 'var(--border-card)', borderRadius: 'var(--radius-card)', padding: '20px', boxShadow: 'var(--shadow)', backdropFilter: 'var(--backdrop)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
            <span style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Fleet Utilization</span>
            <span style={{ color: 'var(--accent-secondary, #06b6d4)' }}><DevicesIcon size={22} /></span>
          </div>
          <div style={{ fontSize: '32px', fontWeight: '800', color: 'var(--accent-secondary, #06b6d4)' }}>
            {metrics.utilization}%
          </div>
          <div style={{ width: '100%', height: '5px', background: 'rgba(255,255,255,0.06)', borderRadius: '3px', marginTop: '12px', overflow: 'hidden' }}>
            <div style={{ width: animate ? `${metrics.utilization}%` : '0%', height: '100%', background: 'var(--accent-secondary, #06b6d4)', transition: 'width 1.2s cubic-bezier(0.34, 1.56, 0.64, 1)' }}></div>
          </div>
        </div>
      </div>

      {/* Dashboard Analytics & Feed row */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 0.8fr', gap: '24px', flexWrap: 'wrap' }} className="executive-grid-row">
        
        {/* Device Allocation breakdown */}
        <div style={{ background: 'var(--bg-card)', border: 'var(--border-card)', borderRadius: 'var(--radius-card)', padding: '24px', boxShadow: 'var(--shadow)', backdropFilter: 'var(--backdrop)', display: 'flex', flexDirection: 'column', gap: '18px' }}>
          <h3 style={{ fontSize: '15px', fontWeight: '700', margin: 0 }}>🖥️ Fleet Device Allocations</h3>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            {Object.entries(metrics.categories).map(([cat, count]) => {
              const maxCount = Math.max(...Object.values(metrics.categories), 1);
              const percentage = Math.round((count / maxCount) * 100);
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
            <h3 style={{ fontSize: '15px', fontWeight: '700', margin: 0 }}>⚡ Live Activity Feed</h3>
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

      {/* Mini SLA and Urgent warnings section */}
      <div style={{ background: 'var(--bg-card)', border: 'var(--border-card)', borderRadius: 'var(--radius-card)', padding: '24px', boxShadow: 'var(--shadow)', backdropFilter: 'var(--backdrop)' }}>
        <h3 style={{ fontSize: '15px', fontWeight: '700', marginBottom: '16px' }}>🚨 SLA Breach Risk Warnings</h3>
        
        {tickets.filter(t => t.status !== 'closed' && t.priority === 'high').length === 0 ? (
          <div style={{ padding: '20px 0', textAlign: 'center', color: '#10b981', fontSize: '13px' }}>
            🎉 Zero High Priority backlog items. SLA healthy!
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px', textAlign: 'left' }}>
              <thead>
                <tr style={{ borderBottom: 'var(--border-card)', color: 'var(--text-muted)' }}>
                  <th style={{ padding: '10px 8px' }}>Ticket Title</th>
                  <th style={{ padding: '10px 8px' }}>Requester</th>
                  <th style={{ padding: '10px 8px' }}>Target Resolution</th>
                  <th style={{ padding: '10px 8px' }}>Status</th>
                  <th style={{ padding: '10px 8px', textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {tickets.filter(t => t.status !== 'closed' && t.priority === 'high').slice(0, 3).map(t => (
                  <tr key={t.id} style={{ borderBottom: 'var(--border-card)' }}>
                    <td style={{ padding: '12px 8px', fontWeight: '600' }}>{t.title}</td>
                    <td style={{ padding: '12px 8px' }}>{t.requester_name}</td>
                    <td style={{ padding: '12px 8px', color: '#ef4444' }}>{new Date(t.target_resolution_date).toLocaleString()}</td>
                    <td style={{ padding: '12px 8px' }}>
                      <span style={{ background: 'rgba(239, 68, 68, 0.15)', color: '#ef4444', padding: '3px 8px', borderRadius: '10px', fontSize: '10px', fontWeight: '700' }}>
                        {t.status.toUpperCase()}
                      </span>
                    </td>
                    <td style={{ padding: '12px 8px', textAlign: 'right' }}>
                      <button 
                        onClick={() => onSelectTicket(t.id)}
                        style={{ padding: '4px 8px', borderRadius: '4px', background: 'var(--bg-body)', border: 'var(--border-card)', color: 'var(--text-main)', cursor: 'pointer', fontSize: '11px' }}
                      >
                        Inspect
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

export default ExecutiveDashboard;
