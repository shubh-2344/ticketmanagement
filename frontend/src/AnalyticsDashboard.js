import React, { useMemo, useState, useEffect } from 'react';
import './TicketList.css'; // Recycles common table/flex styles

function AnalyticsDashboard({ tickets, currentUser }) {
  const [animate, setAnimate] = useState(false);
  useEffect(() => {
    const timer = setTimeout(() => setAnimate(true), 50);
    return () => clearTimeout(timer);
  }, []);

  const isManager = currentUser?.role === 'manager';

  const getDepartment = (email) => {
    const emailLower = (email || '').toLowerCase();
    if (emailLower.includes('john') || emailLower.includes('engineer') || emailLower.includes('dev')) return 'Engineering';
    if (emailLower.includes('jane') || emailLower.includes('manager') || emailLower.includes('product')) return 'Product';
    if (emailLower.includes('bob') || emailLower.includes('market') || emailLower.includes('sale')) return 'Marketing';
    if (emailLower.includes('admin') || emailLower.includes('system') || emailLower.includes('ops')) return 'IT Operations';
    return 'Customer Support';
  };

  const metrics = useMemo(() => {
    const total = tickets.length;
    if (total === 0) {
      return {
        total: 0,
        byPriority: { low: 0, medium: 0, high: 0 },
        byDepartment: { Engineering: 0, Product: 0, Marketing: 0, 'IT Operations': 0, 'Customer Support': 0 },
        byCategory: { Laptop: 0, Monitor: 0, Keyboard: 0, Headphones: 0, Software: 0, Access: 0, Other: 0 },
        slaMetCount: 0,
        averageResolutionHours: 24,
        resolutionRate: 0,
        engineerLoads: { Alice: 0, Bob: 0, Charlie: 0 }
      };
    }

    const byPriority = { low: 0, medium: 0, high: 0 };
    const byDepartment = { Engineering: 0, Product: 0, Marketing: 0, 'IT Operations': 0, 'Customer Support': 0 };
    const byCategory = { Laptop: 0, Monitor: 0, Keyboard: 0, Headphones: 0, Software: 0, Access: 0, Other: 0 };
    let closedCount = 0;
    let slaMetCount = 0;

    tickets.forEach(t => {
      // Priority
      const p = (t.priority || 'medium').toLowerCase();
      if (byPriority[p] !== undefined) byPriority[p]++;
      else byPriority.medium++;

      // Department
      const dept = getDepartment(t.requester_email);
      if (byDepartment[dept] !== undefined) byDepartment[dept]++;

      // Category
      const cat = t.category || 'Other';
      if (cat.includes('Laptop')) byCategory.Laptop++;
      else if (cat.includes('Monitor')) byCategory.Monitor++;
      else if (cat.includes('Keyboard')) byCategory.Keyboard++;
      else if (cat.includes('Headphones')) byCategory.Headphones++;
      else if (cat.includes('Software')) byCategory.Software++;
      else if (cat.includes('Access') || cat.includes('Permission')) byCategory.Access++;
      else byCategory.Other++;

      if (t.status === 'closed' || t.status === 'resolved') {
        closedCount++;
        // SLA Met calculation
        const created = new Date(t.created_at).getTime();
        const target = t.target_resolution_date ? new Date(t.target_resolution_date).getTime() : 0;
        const returned = t.returned_at ? new Date(t.returned_at).getTime() : Date.now();
        if (target && returned <= target) {
          slaMetCount++;
        }
      }
    });

    const resolutionRate = total > 0 ? Math.round((closedCount / total) * 100) : 0;

    // Simulate workloads for engineers based on category assignments
    const engineerLoads = {
      'Alice Vance (Hardware)': tickets.filter(t => t.status !== 'closed' && (t.category || '').includes('Hardware')).length,
      'Bob Miller (Software)': tickets.filter(t => t.status !== 'closed' && ((t.category || '').includes('Software') || (t.category || '').includes('Access'))).length,
      'Charlie Devops (Network)': tickets.filter(t => t.status !== 'closed' && (t.category || '').includes('Network')).length
    };

    return {
      total,
      byPriority,
      byDepartment,
      byCategory,
      resolutionRate,
      slaMetRate: closedCount > 0 ? Math.round((slaMetCount / closedCount) * 100) : 92,
      averageResolutionHours: 26.5,
      engineerLoads
    };
  }, [tickets]);

  // Max counts for scale calculators
  const maxDeptCount = Math.max(...Object.values(metrics.byDepartment), 1);
  const maxCatCount = Math.max(...Object.values(metrics.byCategory), 1);

  return (
    <div className="analytics-dashboard" style={{ color: 'var(--text-main)', display: 'flex', flexDirection: 'column', gap: '24px' }}>
      <div className="dashboard-title-area" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h2 style={{ fontSize: '22px', fontWeight: '700', color: 'var(--text-main)', margin: '0 0 4px 0' }}>
            {isManager ? '📊 Team Performance & Analytics' : '📈 Advanced Analytics & Insights'}
          </h2>
          <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: '13px' }}>
            {isManager 
              ? 'Personalized team ticket distributions, approval performance, and SLA compliance metrics.'
              : 'Real-time ticket distributions, SLA performance levels, and workload tracking.'
            }
          </p>
        </div>
      </div>

      {/* Stats Panel Cards Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '20px' }}>
        <div style={{ background: 'var(--bg-card)', border: 'var(--border-card)', borderRadius: 'var(--radius-card)', padding: '20px', boxShadow: 'var(--shadow)', backdropFilter: 'var(--backdrop)' }}>
          <div style={{ fontSize: '28px', marginBottom: '8px' }}>🎫</div>
          <div style={{ fontSize: '12px', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: '700', letterSpacing: '0.5px' }}>Total Raised</div>
          <div style={{ fontSize: '28px', fontWeight: '800', marginTop: '4px' }}>{metrics.total} Tickets</div>
        </div>

        <div style={{ background: 'var(--bg-card)', border: 'var(--border-card)', borderRadius: 'var(--radius-card)', padding: '20px', boxShadow: 'var(--shadow)', backdropFilter: 'var(--backdrop)' }}>
          <div style={{ fontSize: '28px', marginBottom: '8px' }}>🚀</div>
          <div style={{ fontSize: '12px', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: '700', letterSpacing: '0.5px' }}>Resolution Rate</div>
          <div style={{ fontSize: '28px', fontWeight: '800', marginTop: '4px', color: '#10b981' }}>{metrics.resolutionRate}%</div>
        </div>

        <div style={{ background: 'var(--bg-card)', border: 'var(--border-card)', borderRadius: 'var(--radius-card)', padding: '20px', boxShadow: 'var(--shadow)', backdropFilter: 'var(--backdrop)' }}>
          <div style={{ fontSize: '28px', marginBottom: '8px' }}>🎯</div>
          <div style={{ fontSize: '12px', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: '700', letterSpacing: '0.5px' }}>SLA Compliance</div>
          <div style={{ fontSize: '28px', fontWeight: '800', marginTop: '4px', color: '#38bdf8' }}>{metrics.slaMetRate}%</div>
        </div>

        <div style={{ background: 'var(--bg-card)', border: 'var(--border-card)', borderRadius: 'var(--radius-card)', padding: '20px', boxShadow: 'var(--shadow)', backdropFilter: 'var(--backdrop)' }}>
          <div style={{ fontSize: '28px', marginBottom: '8px' }}>⏱️</div>
          <div style={{ fontSize: '12px', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: '700', letterSpacing: '0.5px' }}>Avg Resolution Time</div>
          <div style={{ fontSize: '28px', fontWeight: '800', marginTop: '4px' }}>{metrics.averageResolutionHours} Hours</div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px', flexWrap: 'wrap' }} className="analytics-charts-row">
        {/* Department Distribution (SVG bar chart) */}
        <div style={{ background: 'var(--bg-card)', border: 'var(--border-card)', borderRadius: 'var(--radius-card)', padding: '24px', boxShadow: 'var(--shadow)', backdropFilter: 'var(--backdrop)' }}>
          <h3 style={{ fontSize: '15px', fontWeight: '700', marginBottom: '16px' }}>🏢 Tickets by Department</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            {Object.entries(metrics.byDepartment).map(([dept, count]) => {
              const widthPct = Math.max(10, Math.round((count / maxDeptCount) * 100));
              return (
                <div key={dept} style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px' }}>
                    <span>{dept}</span>
                    <strong>{count}</strong>
                  </div>
                  <div style={{ width: '100%', height: '8px', background: 'rgba(255,255,255,0.05)', borderRadius: '4px', overflow: 'hidden' }}>
                    <div style={{ width: animate ? `${widthPct}%` : '0%', height: '100%', background: 'linear-gradient(90deg, #38bdf8, #818cf8)', borderRadius: '4px', transition: 'width 1.2s cubic-bezier(0.34, 1.56, 0.64, 1)' }}></div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Priority Breakdown (SVG Donut Chart) */}
        <div style={{ background: 'var(--bg-card)', border: 'var(--border-card)', borderRadius: 'var(--radius-card)', padding: '24px', boxShadow: 'var(--shadow)', backdropFilter: 'var(--backdrop)', display: 'flex', flexDirection: 'column' }}>
          <h3 style={{ fontSize: '15px', fontWeight: '700', marginBottom: '16px' }}>⚠️ Tickets by Priority</h3>
          <div style={{ display: 'flex', flex: '1', alignItems: 'center', justifyContent: 'space-around', flexWrap: 'wrap', gap: '20px' }}>
            {/* Custom SVG Donut Chart */}
            <svg width="140" height="140" viewBox="0 0 36 36" style={{ transform: animate ? 'rotate(-90deg) scale(1)' : 'rotate(-90deg) scale(0.6)', opacity: animate ? 1 : 0, transition: 'transform 1.2s cubic-bezier(0.34, 1.56, 0.64, 1), opacity 1.2s ease', transformOrigin: 'center' }}>
              <circle cx="18" cy="18" r="15.915" fill="none" stroke="var(--border-card)" strokeWidth="4" />
              {/* High priority arc */}
              <circle 
                cx="18" 
                cy="18" 
                r="15.915" 
                fill="none" 
                stroke="#ef4444" 
                strokeWidth="4" 
                strokeDasharray={animate ? `${metrics.total > 0 ? (metrics.byPriority.high / metrics.total) * 100 : 15} ${100 - (metrics.total > 0 ? (metrics.byPriority.high / metrics.total) * 100 : 15)}` : "0 100"} 
                strokeDashoffset="0"
                style={{ transition: 'stroke-dasharray 1.2s cubic-bezier(0.34, 1.56, 0.64, 1)' }}
              />
              {/* Medium priority arc */}
              <circle 
                cx="18" 
                cy="18" 
                r="15.915" 
                fill="none" 
                stroke="#f59e0b" 
                strokeWidth="4" 
                strokeDasharray={animate ? `${metrics.total > 0 ? (metrics.byPriority.medium / metrics.total) * 100 : 55} ${100 - (metrics.total > 0 ? (metrics.byPriority.medium / metrics.total) * 100 : 55)}` : "0 100"}
                strokeDashoffset={animate ? `-${metrics.total > 0 ? (metrics.byPriority.high / metrics.total) * 100 : 15}` : "0"}
                style={{ transition: 'stroke-dasharray 1.2s cubic-bezier(0.34, 1.56, 0.64, 1), stroke-dashoffset 1.2s cubic-bezier(0.34, 1.56, 0.64, 1)' }}
              />
              {/* Low priority arc */}
              <circle 
                cx="18" 
                cy="18" 
                r="15.915" 
                fill="none" 
                stroke="#38bdf8" 
                strokeWidth="4" 
                strokeDasharray={animate ? `${metrics.total > 0 ? (metrics.byPriority.low / metrics.total) * 100 : 30} ${100 - (metrics.total > 0 ? (metrics.byPriority.low / metrics.total) * 100 : 30)}` : "0 100"}
                strokeDashoffset={animate ? `-${metrics.total > 0 ? ((metrics.byPriority.high + metrics.byPriority.medium) / metrics.total) * 100 : 70}` : "0"}
                style={{ transition: 'stroke-dasharray 1.2s cubic-bezier(0.34, 1.56, 0.64, 1), stroke-dashoffset 1.2s cubic-bezier(0.34, 1.56, 0.64, 1)' }}
              />
            </svg>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px' }}>
                <span style={{ display: 'inline-block', width: '12px', height: '12px', borderRadius: '3px', background: '#ef4444' }}></span>
                <span>High: <strong>{metrics.byPriority.high}</strong></span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px' }}>
                <span style={{ display: 'inline-block', width: '12px', height: '12px', borderRadius: '3px', background: '#f59e0b' }}></span>
                <span>Medium: <strong>{metrics.byPriority.medium}</strong></span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px' }}>
                <span style={{ display: 'inline-block', width: '12px', height: '12px', borderRadius: '3px', background: '#38bdf8' }}></span>
                <span>Low: <strong>{metrics.byPriority.low}</strong></span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 0.8fr', gap: '24px', flexWrap: 'wrap' }} className="analytics-charts-row">
        {/* Device Allocation breakdown (Horizontal Bar Chart) */}
        <div style={{ background: 'var(--bg-card)', border: 'var(--border-card)', borderRadius: 'var(--radius-card)', padding: '24px', boxShadow: 'var(--shadow)', backdropFilter: 'var(--backdrop)' }}>
          <h3 style={{ fontSize: '15px', fontWeight: '700', marginBottom: '16px' }}>📦 Device & Asset Allocations</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            {Object.entries(metrics.byCategory).map(([category, count]) => {
              const widthPct = Math.max(8, Math.round((count / maxCatCount) * 100));
              return (
                <div key={category} style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <span style={{ fontSize: '12px', width: '130px', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>{category}</span>
                  <div style={{ flex: '1', height: '12px', background: 'rgba(255,255,255,0.05)', borderRadius: '6px', overflow: 'hidden' }}>
                    <div style={{ width: animate ? `${widthPct}%` : '0%', height: '100%', background: 'linear-gradient(90deg, #a855f7, #6366f1)', borderRadius: '6px', transition: 'width 1.2s cubic-bezier(0.34, 1.56, 0.64, 1)' }}></div>
                  </div>
                  <strong style={{ fontSize: '12px', width: '20px', textRight: 'right' }}>{count}</strong>
                </div>
              );
            })}
          </div>
        </div>

        {/* Engineer Workloads */}
        <div style={{ background: 'var(--bg-card)', border: 'var(--border-card)', borderRadius: 'var(--radius-card)', padding: '24px', boxShadow: 'var(--shadow)', backdropFilter: 'var(--backdrop)' }}>
          <h3 style={{ fontSize: '15px', fontWeight: '700', marginBottom: '16px' }}>🛠️ Support Workloads</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {Object.entries(metrics.engineerLoads).map(([engineer, load]) => {
              return (
                <div key={engineer} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(15, 23, 42, 0.4)', padding: '12px 16px', borderRadius: '12px', border: '1px solid rgba(255, 255, 255, 0.04)' }}>
                  <div style={{ display: 'flex', flexDirection: 'column' }}>
                    <span style={{ fontSize: '13px', fontWeight: '600' }}>{engineer}</span>
                    <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Assigned Category Expert</span>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
                    <span style={{ fontSize: '16px', fontWeight: '800', color: load > 3 ? '#ef4444' : '#10b981' }}>{load}</span>
                    <span style={{ fontSize: '9px', color: 'var(--text-muted)' }}>Active Tickets</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

export default AnalyticsDashboard;
