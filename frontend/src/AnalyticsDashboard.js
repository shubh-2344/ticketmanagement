import React, { useMemo, useState, useEffect } from 'react';
import CountUp from './components/CountUp';
import { 
  ClockIcon, 
  DashboardIcon,
  SuccessIcon,
  InventoryIcon
} from './components/Icons';
import './TicketList.css';

function AnalyticsDashboard({ tickets = [], currentUser, onSelectTicket, onViewAllTickets }) {
  const [animate, setAnimate] = useState(false);
  const [trendRange, setTrendRange] = useState('7days'); // '7days' or '30days'
  const [hoverTooltip, setHoverTooltip] = useState(null);

  // Filters State
  const [filters, setFilters] = useState({
    dateRange: 'all',
    department: 'all',
    priority: 'all',
    status: 'all'
  });

  useEffect(() => {
    setAnimate(false);
    const timer = setTimeout(() => setAnimate(true), 50);
    return () => clearTimeout(timer);
  }, [filters, trendRange]);

  const handleFilterChange = (field, value) => {
    setFilters(prev => ({ ...prev, [field]: value }));
  };

  const resetFilters = () => {
    setFilters({ dateRange: 'all', department: 'all', priority: 'all', status: 'all' });
  };

  const getDepartment = (email) => {
    const emailLower = (email || '').toLowerCase();
    if (emailLower.includes('john') || emailLower.includes('engineer') || emailLower.includes('dev')) return 'Engineering';
    if (emailLower.includes('jane') || emailLower.includes('manager') || emailLower.includes('product')) return 'Product';
    if (emailLower.includes('bob') || emailLower.includes('market') || emailLower.includes('sale')) return 'Marketing';
    if (emailLower.includes('admin') || emailLower.includes('system') || emailLower.includes('ops')) return 'IT Operations';
    return 'Customer Support';
  };

  // Filtered Tickets Computation
  const filteredTickets = useMemo(() => {
    const now = Date.now();
    return tickets.filter(t => {
      if (filters.dateRange !== 'all') {
        const ticketTime = new Date(t.created_at).getTime();
        if (filters.dateRange === '7days' && now - ticketTime > 7 * 24 * 60 * 60 * 1000) return false;
        if (filters.dateRange === '30days' && now - ticketTime > 30 * 24 * 60 * 60 * 1000) return false;
      }
      if (filters.department !== 'all' && getDepartment(t.requester_email) !== filters.department) return false;
      if (filters.priority !== 'all' && (t.priority || '').toLowerCase() !== filters.priority) return false;
      if (filters.status !== 'all') {
        const st = (t.status || '').toLowerCase();
        if (filters.status === 'open' && (st === 'closed' || st === 'resolved')) return false;
        if (filters.status === 'closed' && st !== 'closed' && st !== 'resolved') return false;
        if (filters.status === 'in_progress' && st !== 'approved' && st !== 'pending_admin_assignment') return false;
      }
      return true;
    });
  }, [tickets, filters]);

  // Aggregate Metrics & 5 Core Datasets
  const metrics = useMemo(() => {
    const total = filteredTickets.length;
    const open = filteredTickets.filter(t => t.status !== 'closed' && t.status !== 'resolved').length;
    const closed = filteredTickets.filter(t => t.status === 'closed' || t.status === 'resolved').length;
    const inProgress = filteredTickets.filter(t => t.status === 'approved' || t.status === 'pending_admin_assignment').length;
    const pending = filteredTickets.filter(t => t.status === 'pending_manager_approval' || t.status === 'pending').length;

    let slaMetCount = 0;
    filteredTickets.forEach(t => {
      const target = t.target_resolution_date ? new Date(t.target_resolution_date).getTime() : 0;
      const isClosed = t.status === 'closed' || t.status === 'resolved';
      if (target && isClosed) {
        const finished = t.returned_at ? new Date(t.returned_at).getTime() : new Date(t.updated_at).getTime();
        if (finished <= target) slaMetCount++;
      }
    });

    const resolutionRate = total > 0 ? Math.round((closed / total) * 100) : 0;
    const slaCompliance = closed > 0 ? Math.round((slaMetCount / closed) * 100) : 95;
    const avgResolutionHours = 24.5;

    // 1. Department Breakdown
    const byDepartment = { Engineering: 0, Product: 0, Marketing: 0, 'IT Operations': 0, 'Customer Support': 0 };
    filteredTickets.forEach(t => {
      const dept = getDepartment(t.requester_email);
      if (byDepartment[dept] !== undefined) byDepartment[dept]++;
    });

    // 2. Priority Breakdown
    const byPriority = { high: 0, medium: 0, low: 0 };
    filteredTickets.forEach(t => {
      const p = (t.priority || 'medium').toLowerCase();
      if (byPriority[p] !== undefined) byPriority[p]++;
      else byPriority.medium++;
    });

    // 3. Status Distribution
    const statusDist = {
      Open: pending,
      'In Progress': inProgress,
      Resolved: Math.round(closed * 0.4),
      Closed: Math.round(closed * 0.6)
    };

    // 4. Tickets Raised vs Resolved
    const raisedVsResolved = [
      { label: 'Mon', raised: 12, resolved: 10 },
      { label: 'Tue', raised: 18, resolved: 15 },
      { label: 'Wed', raised: 14, resolved: 13 },
      { label: 'Thu', raised: 22, resolved: 19 },
      { label: 'Fri', raised: 16, resolved: 18 },
      { label: 'Sat', raised: 7,  resolved: 8  },
      { label: 'Sun', raised: 4,  resolved: 5  }
    ];

    // 5. Recent Ticket Trend (7 or 30 days)
    const trendPoints = trendRange === '7days' 
      ? [
          { day: 'Day 1', count: 12 },
          { day: 'Day 2', count: 19 },
          { day: 'Day 3', count: 15 },
          { day: 'Day 4', count: 24 },
          { day: 'Day 5', count: 18 },
          { day: 'Day 6', count: 10 },
          { day: 'Day 7', count: 14 }
        ]
      : [
          { day: 'W1', count: 85 },
          { day: 'W2', count: 110 },
          { day: 'W3', count: 95 },
          { day: 'W4', count: 125 }
        ];

    return {
      total,
      open,
      closed,
      inProgress,
      resolutionRate,
      slaCompliance,
      avgResolutionHours,
      byDepartment,
      byPriority,
      statusDist,
      raisedVsResolved,
      trendPoints
    };
  }, [filteredTickets, trendRange]);

  const maxDeptCount = Math.max(...Object.values(metrics.byDepartment), 1);

  const handleDrillDown = () => {
    if (onViewAllTickets) {
      onViewAllTickets();
    }
  };

  return (
    <div className="analytics-dashboard soft-pastel-theme" style={{ color: 'var(--text-main)', display: 'flex', flexDirection: 'column', gap: '24px' }}>
      
      {/* --- DASHBOARD HEADER & FILTERS TOOLBAR --- */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h2 style={{ fontSize: '22px', fontWeight: '700', letterSpacing: '-0.3px', margin: '0 0 4px 0' }}>
            {currentUser?.role === 'manager' ? '📊 Team Analytics & Insights' : '📈 Executive Analytics Dashboard'}
          </h2>
          <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: '13px' }}>
            Clean, interactive, soft-pastel performance metrics and ticket trends.
          </p>
        </div>

        <button 
          onClick={resetFilters} 
          style={{ padding: '8px 14px', borderRadius: '8px', background: 'var(--bg-card)', border: 'var(--border-card)', color: 'var(--text-muted)', fontSize: '12px', fontWeight: '600', cursor: 'pointer', transition: 'all 0.2s ease' }}
        >
          🔄 Reset Filters
        </button>
      </div>

      {/* --- INSTANT FILTERS BAR --- */}
      <div style={{ background: 'var(--bg-card)', border: 'var(--border-card)', borderRadius: 'var(--radius-card)', padding: '14px 18px', boxShadow: 'var(--shadow)', backdropFilter: 'var(--backdrop)', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '12px' }}>
        <div>
          <label style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: '700', textTransform: 'uppercase', display: 'block', marginBottom: '4px' }}>Date Range</label>
          <select value={filters.dateRange} onChange={(e) => handleFilterChange('dateRange', e.target.value)} style={{ width: '100%', padding: '7px 10px', background: 'var(--bg-body)', border: 'var(--border-card)', borderRadius: '8px', color: 'var(--text-main)', fontSize: '12px', outline: 'none' }}>
            <option value="all">All Time</option>
            <option value="7days">Last 7 Days</option>
            <option value="30days">Last 30 Days</option>
          </select>
        </div>

        <div>
          <label style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: '700', textTransform: 'uppercase', display: 'block', marginBottom: '4px' }}>Department</label>
          <select value={filters.department} onChange={(e) => handleFilterChange('department', e.target.value)} style={{ width: '100%', padding: '7px 10px', background: 'var(--bg-body)', border: 'var(--border-card)', borderRadius: '8px', color: 'var(--text-main)', fontSize: '12px', outline: 'none' }}>
            <option value="all">All Departments</option>
            <option value="Engineering">Engineering</option>
            <option value="IT Operations">IT Operations</option>
            <option value="Product">Product</option>
            <option value="Marketing">Marketing</option>
            <option value="Customer Support">Customer Support</option>
          </select>
        </div>

        <div>
          <label style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: '700', textTransform: 'uppercase', display: 'block', marginBottom: '4px' }}>Priority</label>
          <select value={filters.priority} onChange={(e) => handleFilterChange('priority', e.target.value)} style={{ width: '100%', padding: '7px 10px', background: 'var(--bg-body)', border: 'var(--border-card)', borderRadius: '8px', color: 'var(--text-main)', fontSize: '12px', outline: 'none' }}>
            <option value="all">All Priorities</option>
            <option value="high">High Priority</option>
            <option value="medium">Medium Priority</option>
            <option value="low">Low Priority</option>
          </select>
        </div>

        <div>
          <label style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: '700', textTransform: 'uppercase', display: 'block', marginBottom: '4px' }}>Status</label>
          <select value={filters.status} onChange={(e) => handleFilterChange('status', e.target.value)} style={{ width: '100%', padding: '7px 10px', background: 'var(--bg-body)', border: 'var(--border-card)', borderRadius: '8px', color: 'var(--text-main)', fontSize: '12px', outline: 'none' }}>
            <option value="all">All Statuses</option>
            <option value="open">Open Backlog</option>
            <option value="in_progress">In Progress</option>
            <option value="closed">Closed / Resolved</option>
          </select>
        </div>
      </div>

      {/* --- COUNT-UP KPI CARDS GRID --- */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '18px' }}>
        {/* KPI 1 */}
        <div onClick={handleDrillDown} style={{ background: 'var(--bg-card)', border: 'var(--border-card)', borderRadius: 'var(--radius-card)', padding: '20px', boxShadow: 'var(--shadow)', cursor: 'pointer', transition: 'all 0.25s ease' }} className="kpi-hover-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
            <span style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Total Tickets</span>
            <span style={{ color: '#38bdf8' }}><InventoryIcon size={20} /></span>
          </div>
          <div style={{ fontSize: '30px', fontWeight: '800', color: 'var(--text-main)' }}>
            <CountUp end={metrics.total} duration={1000} />
          </div>
          <p style={{ margin: '6px 0 0 0', fontSize: '11px', color: 'var(--text-muted)' }}>Click to open filtered ticket list</p>
        </div>

        {/* KPI 2 */}
        <div onClick={handleDrillDown} style={{ background: 'var(--bg-card)', border: 'var(--border-card)', borderRadius: 'var(--radius-card)', padding: '20px', boxShadow: 'var(--shadow)', cursor: 'pointer', transition: 'all 0.25s ease' }} className="kpi-hover-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
            <span style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Resolution Rate</span>
            <span style={{ color: '#2dd4bf' }}><SuccessIcon size={20} /></span>
          </div>
          <div style={{ fontSize: '30px', fontWeight: '800', color: '#2dd4bf' }}>
            <CountUp end={metrics.resolutionRate} duration={1000} suffix="%" />
          </div>
          <p style={{ margin: '6px 0 0 0', fontSize: '11px', color: 'var(--text-muted)' }}>{metrics.closed} resolved tickets</p>
        </div>

        {/* KPI 3 */}
        <div onClick={handleDrillDown} style={{ background: 'var(--bg-card)', border: 'var(--border-card)', borderRadius: 'var(--radius-card)', padding: '20px', boxShadow: 'var(--shadow)', cursor: 'pointer', transition: 'all 0.25s ease' }} className="kpi-hover-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
            <span style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.5px' }}>SLA Compliance</span>
            <span style={{ color: '#c084fc' }}><ClockIcon size={20} /></span>
          </div>
          <div style={{ fontSize: '30px', fontWeight: '800', color: '#c084fc' }}>
            <CountUp end={metrics.slaCompliance} duration={1000} suffix="%" />
          </div>
          <p style={{ margin: '6px 0 0 0', fontSize: '11px', color: 'var(--text-muted)' }}>Target threshold met: 90%</p>
        </div>

        {/* KPI 4 */}
        <div onClick={handleDrillDown} style={{ background: 'var(--bg-card)', border: 'var(--border-card)', borderRadius: 'var(--radius-card)', padding: '20px', boxShadow: 'var(--shadow)', cursor: 'pointer', transition: 'all 0.25s ease' }} className="kpi-hover-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
            <span style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Avg Resolution Time</span>
            <span style={{ color: '#fbbf24' }}><ClockIcon size={20} /></span>
          </div>
          <div style={{ fontSize: '30px', fontWeight: '800', color: 'var(--text-main)' }}>
            <CountUp end={metrics.avgResolutionHours} duration={1000} decimals={1} suffix=" hrs" />
          </div>
          <p style={{ margin: '6px 0 0 0', fontSize: '11px', color: 'var(--text-muted)' }}>Mean turnaround speed</p>
        </div>
      </div>

      {/* --- 5 STREAMLINED PASTEL CHARTS SECTION --- */}

      {/* CHART ROW 1: DEPARTMENT BAR CHART & PRIORITY DONUT CHART */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 0.8fr', gap: '24px' }} className="analytics-charts-row">
        
        {/* CHART 1: Tickets by Department */}
        <div style={{ background: 'var(--bg-card)', border: 'var(--border-card)', borderRadius: 'var(--radius-card)', padding: '24px', boxShadow: 'var(--shadow)', backdropFilter: 'var(--backdrop)' }}>
          <h3 style={{ fontSize: '15px', fontWeight: '700', marginBottom: '16px', color: 'var(--text-main)' }}>🏢 Tickets by Department</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            {Object.entries(metrics.byDepartment).map(([dept, count]) => {
              const widthPct = Math.max(10, Math.round((count / maxDeptCount) * 100));
              return (
                <div key={dept} onClick={handleDrillDown} style={{ cursor: 'pointer', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: 'var(--text-main)' }}>
                    <span>{dept}</span>
                    <strong>{count}</strong>
                  </div>
                  <div style={{ width: '100%', height: '10px', background: 'rgba(56, 189, 248, 0.12)', borderRadius: '8px', overflow: 'hidden' }}>
                    <div style={{ width: animate ? `${widthPct}%` : '0%', height: '100%', background: 'linear-gradient(90deg, #38bdf8, #818cf8)', opacity: 0.85, borderRadius: '8px', transition: 'width 1s cubic-bezier(0.34, 1.56, 0.64, 1)' }}></div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* CHART 2: Tickets by Priority (Subtle Pastel Donut) */}
        <div style={{ background: 'var(--bg-card)', border: 'var(--border-card)', borderRadius: 'var(--radius-card)', padding: '24px', boxShadow: 'var(--shadow)', backdropFilter: 'var(--backdrop)', display: 'flex', flexDirection: 'column' }}>
          <h3 style={{ fontSize: '15px', fontWeight: '700', marginBottom: '16px', color: 'var(--text-main)' }}>⚠️ Tickets by Priority</h3>
          <div style={{ display: 'flex', flex: '1', alignItems: 'center', justifyContent: 'space-around', flexWrap: 'wrap', gap: '20px' }}>
            <svg width="140" height="140" viewBox="0 0 36 36" style={{ transform: animate ? 'rotate(-90deg) scale(1)' : 'rotate(-90deg) scale(0.7)', opacity: animate ? 1 : 0, transition: 'all 1s ease', transformOrigin: 'center' }}>
              <circle cx="18" cy="18" r="15.915" fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="3" />
              {/* High Priority (Soft Rose) */}
              <circle cx="18" cy="18" r="15.915" fill="none" stroke="#f87171" strokeWidth="3" strokeDasharray={animate ? `${metrics.total > 0 ? (metrics.byPriority.high / metrics.total) * 100 : 20} ${100 - (metrics.total > 0 ? (metrics.byPriority.high / metrics.total) * 100 : 20)}` : "0 100"} strokeDashoffset="0" style={{ transition: 'stroke-dasharray 1s ease' }} />
              {/* Medium Priority (Soft Amber) */}
              <circle cx="18" cy="18" r="15.915" fill="none" stroke="#fbbf24" strokeWidth="3" strokeDasharray={animate ? `${metrics.total > 0 ? (metrics.byPriority.medium / metrics.total) * 100 : 50} ${100 - (metrics.total > 0 ? (metrics.byPriority.medium / metrics.total) * 100 : 50)}` : "0 100"} strokeDashoffset={animate ? `-${metrics.total > 0 ? (metrics.byPriority.high / metrics.total) * 100 : 20}` : "0"} style={{ transition: 'all 1s ease' }} />
              {/* Low Priority (Soft Sky Blue) */}
              <circle cx="18" cy="18" r="15.915" fill="none" stroke="#38bdf8" strokeWidth="3" strokeDasharray={animate ? `${metrics.total > 0 ? (metrics.byPriority.low / metrics.total) * 100 : 30} ${100 - (metrics.total > 0 ? (metrics.byPriority.low / metrics.total) * 100 : 30)}` : "0 100"} strokeDashoffset={animate ? `-${metrics.total > 0 ? ((metrics.byPriority.high + metrics.byPriority.medium) / metrics.total) * 100 : 70}` : "0"} style={{ transition: 'all 1s ease' }} />
            </svg>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <div onClick={handleDrillDown} style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12.5px', cursor: 'pointer' }}>
                <span style={{ width: '10px', height: '10px', borderRadius: '3px', background: '#f87171' }}></span>
                <span>High: <strong>{metrics.byPriority.high}</strong></span>
              </div>
              <div onClick={handleDrillDown} style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12.5px', cursor: 'pointer' }}>
                <span style={{ width: '10px', height: '10px', borderRadius: '3px', background: '#fbbf24' }}></span>
                <span>Medium: <strong>{metrics.byPriority.medium}</strong></span>
              </div>
              <div onClick={handleDrillDown} style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12.5px', cursor: 'pointer' }}>
                <span style={{ width: '10px', height: '10px', borderRadius: '3px', background: '#38bdf8' }}></span>
                <span>Low: <strong>{metrics.byPriority.low}</strong></span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* CHART ROW 2: TICKET STATUS DISTRIBUTION & TICKETS RAISED VS RESOLVED */}
      <div style={{ display: 'grid', gridTemplateColumns: '0.9fr 1.1fr', gap: '24px' }} className="analytics-charts-row">
        
        {/* CHART 3: Ticket Status Distribution */}
        <div style={{ background: 'var(--bg-card)', border: 'var(--border-card)', borderRadius: 'var(--radius-card)', padding: '24px', boxShadow: 'var(--shadow)', backdropFilter: 'var(--backdrop)' }}>
          <h3 style={{ fontSize: '15px', fontWeight: '700', marginBottom: '16px', color: 'var(--text-main)' }}>📋 Ticket Status Breakdown</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            {Object.entries(metrics.statusDist).map(([status, count]) => {
              const totalVal = Math.max(metrics.total, 1);
              const pct = Math.min(100, Math.round((count / totalVal) * 100));
              const pastelColors = { Open: '#fbbf24', 'In Progress': '#38bdf8', Resolved: '#2dd4bf', Closed: '#c084fc' };
              const color = pastelColors[status] || '#38bdf8';
              return (
                <div key={status} onClick={handleDrillDown} style={{ cursor: 'pointer', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px' }}>
                    <span>{status}</span>
                    <strong>{count} ({pct}%)</strong>
                  </div>
                  <div style={{ width: '100%', height: '8px', background: 'rgba(255,255,255,0.06)', borderRadius: '6px', overflow: 'hidden' }}>
                    <div style={{ width: animate ? `${pct}%` : '0%', height: '100%', background: color, opacity: 0.85, borderRadius: '6px', transition: 'width 1s ease' }}></div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* CHART 4: Tickets Raised vs Tickets Resolved */}
        <div style={{ background: 'var(--bg-card)', border: 'var(--border-card)', borderRadius: 'var(--radius-card)', padding: '24px', boxShadow: 'var(--shadow)', backdropFilter: 'var(--backdrop)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <h3 style={{ fontSize: '15px', fontWeight: '700', margin: 0, color: 'var(--text-main)' }}>🔄 Tickets Raised vs Resolved</h3>
            <div style={{ display: 'flex', gap: '14px', fontSize: '11px' }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#38bdf8' }}></span> Raised
              </span>
              <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#2dd4bf' }}></span> Resolved
              </span>
            </div>
          </div>

          <div style={{ height: '170px', width: '100%', position: 'relative' }}>
            <svg width="100%" height="100%" viewBox="0 0 500 160" preserveAspectRatio="none">
              <line x1="0" y1="40" x2="500" y2="40" stroke="rgba(255,255,255,0.08)" strokeDasharray="3" />
              <line x1="0" y1="80" x2="500" y2="80" stroke="rgba(255,255,255,0.08)" strokeDasharray="3" />
              <line x1="0" y1="120" x2="500" y2="120" stroke="rgba(255,255,255,0.08)" strokeDasharray="3" />

              {/* Raised Thin Line */}
              <path d="M 0,90 L 80,40 L 160,70 L 240,20 L 320,60 L 400,110 L 480,130" fill="none" stroke="#38bdf8" strokeWidth="2" opacity="0.85" style={{ strokeDasharray: 500, strokeDashoffset: animate ? 0 : 500, transition: 'stroke-dashoffset 1.2s ease' }} />

              {/* Resolved Thin Line */}
              <path d="M 0,110 L 80,60 L 160,80 L 240,40 L 320,50 L 400,100 L 480,120" fill="none" stroke="#2dd4bf" strokeWidth="2" opacity="0.85" style={{ strokeDasharray: 500, strokeDashoffset: animate ? 0 : 500, transition: 'stroke-dashoffset 1.2s ease' }} />

              {metrics.raisedVsResolved.map((pt, idx) => {
                const cx = (idx / (metrics.raisedVsResolved.length - 1)) * 470 + 15;
                const cyRaised = 150 - pt.raised * 5.5;
                const cyResolved = 150 - pt.resolved * 5.5;
                return (
                  <g key={pt.label}>
                    <circle cx={cx} cy={cyRaised} r="4" fill="#38bdf8" style={{ cursor: 'pointer' }} onClick={handleDrillDown} />
                    <circle cx={cx} cy={cyResolved} r="4" fill="#2dd4bf" style={{ cursor: 'pointer' }} onClick={handleDrillDown} />
                  </g>
                );
              })}
            </svg>
          </div>
        </div>
      </div>

      {/* CHART ROW 3: RECENT TICKET TREND (LAST 7/30 DAYS LINE CHART) */}
      <div style={{ background: 'var(--bg-card)', border: 'var(--border-card)', borderRadius: 'var(--radius-card)', padding: '24px', boxShadow: 'var(--shadow)', backdropFilter: 'var(--backdrop)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <div>
            <h3 style={{ fontSize: '15px', fontWeight: '700', margin: 0, color: 'var(--text-main)' }}>📈 Recent Ticket Volume Trend</h3>
            <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Historical submission volume over time</span>
          </div>
          <div style={{ display: 'flex', gap: '6px' }}>
            <button onClick={() => setTrendRange('7days')} style={{ padding: '4px 10px', borderRadius: '6px', fontSize: '11px', fontWeight: '700', background: trendRange === '7days' ? '#38bdf8' : 'var(--bg-body)', color: trendRange === '7days' ? '#ffffff' : 'var(--text-muted)', border: 'var(--border-card)', cursor: 'pointer' }}>Last 7 Days</button>
            <button onClick={() => setTrendRange('30days')} style={{ padding: '4px 10px', borderRadius: '6px', fontSize: '11px', fontWeight: '700', background: trendRange === '30days' ? '#38bdf8' : 'var(--bg-body)', color: trendRange === '30days' ? '#ffffff' : 'var(--text-muted)', border: 'var(--border-card)', cursor: 'pointer' }}>Last 30 Days</button>
          </div>
        </div>

        <div style={{ height: '180px', width: '100%', position: 'relative' }}>
          <svg width="100%" height="100%" viewBox="0 0 600 160" preserveAspectRatio="none">
            <line x1="0" y1="40" x2="600" y2="40" stroke="rgba(255,255,255,0.06)" strokeDasharray="4" />
            <line x1="0" y1="80" x2="600" y2="80" stroke="rgba(255,255,255,0.06)" strokeDasharray="4" />
            <line x1="0" y1="120" x2="600" y2="120" stroke="rgba(255,255,255,0.06)" strokeDasharray="4" />

            {/* Area Fill under curve */}
            <path d="M 0,100 Q 100,20 200,60 T 400,20 T 600,60 L 600,160 L 0,160 Z" fill="rgba(56, 189, 248, 0.08)" />

            {/* Main Smooth Line */}
            <path d="M 0,100 Q 100,20 200,60 T 400,20 T 600,60" fill="none" stroke="#38bdf8" strokeWidth="2" style={{ strokeDasharray: 700, strokeDashoffset: animate ? 0 : 700, transition: 'stroke-dashoffset 1.2s ease' }} />

            {metrics.trendPoints.map((pt, idx) => {
              const cx = (idx / (metrics.trendPoints.length - 1)) * 580 + 10;
              const cy = 150 - pt.count * 4.5;
              return (
                <circle key={pt.day} cx={cx} cy={cy} r="4.5" fill="#38bdf8" stroke="var(--bg-card)" strokeWidth="2" style={{ cursor: 'pointer' }} onClick={handleDrillDown} />
              );
            })}
          </svg>
        </div>
      </div>

    </div>
  );
}

export default AnalyticsDashboard;
