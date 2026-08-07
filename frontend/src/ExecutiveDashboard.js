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
  const [managerTab, setManagerTab] = useState('awaiting'); // 'awaiting', 'approved'

  const handleManagerReview = async (ticketId, action) => {
    const isApprove = action === 'approve';
    const confirmed = await window.showConfirm({
      title: isApprove ? 'Approve Ticket Request' : 'Deny Ticket Request',
      message: `Are you sure you want to ${isApprove ? 'approve' : 'deny'} this ticket request?`,
      confirmText: isApprove ? 'Approve Request' : 'Deny Request',
      cancelText: 'Cancel',
      confirmType: isApprove ? 'success' : 'danger'
    });
    if (!confirmed) return;

    try {
      if (API_URL) {
        await axios.put(`${API_URL}/tickets/${ticketId}/review`, {
          action: isApprove ? 'approve' : 'reject',
          comment: isApprove ? 'Approved by Manager' : 'Denied by Manager'
        });
      }
      alert(`Ticket request successfully ${isApprove ? 'approved and sent to IT Admin' : 'denied'}!`);
      if (onRefresh) onRefresh();
    } catch (err) {
      console.error('Manager review error:', err);
      alert(err.response?.data?.error || 'Failed to process ticket review');
    }
  };

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

  // Manager Role-Specific Dashboard Scope
  const scopedTickets = useMemo(() => {
    if (currentUser?.role === 'manager') {
      const mgrId = currentUser.id;
      const mgrEmail = (currentUser.email || '').toLowerCase();
      const mgrDept = (currentUser.department || '').toLowerCase();

      return tickets.filter(t => {
        const isRaisedBySelf = t.requester_id === mgrId || (t.requester_email || '').toLowerCase() === mgrEmail;
        const isAssignedToMgr = t.manager_id === mgrId || t.approver_id === mgrId;
        const isSameDept = mgrDept && (t.department || '').toLowerCase() === mgrDept;

        // Category 1: Tickets approved by the Manager and currently pending with Admin for fulfillment
        const isApprovedPendingAdmin = (isAssignedToMgr || isSameDept) && (
          t.status === 'pending_admin_assignment' || 
          t.status === 'approved' || 
          t.status === 'in_progress'
        );

        // Category 2: Tickets raised by their direct team members (or raised by self)
        const isTeamMemberTicket = isAssignedToMgr || isSameDept || isRaisedBySelf;

        return isApprovedPendingAdmin || isTeamMemberTicket;
      });
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

  const deriveAllocationStatus = (item, currentTime = now) => {
    const isReturned = Boolean(item.returned_at) || item.is_returned === true || (item.ticket_type === 'device-return' && item.ticket_status === 'closed');
    const isPendingReturn = item.ticket_status === 'return_pending_verification';

    if (isReturned) {
      return {
        statusKey: 'returned',
        statusText: 'RETURNED',
        bg: 'rgba(16, 185, 129, 0.15)',
        color: '#10b981',
        border: '1px solid rgba(16, 185, 129, 0.4)',
        timeLeftText: '—',
        isReturned: true
      };
    }

    if (isPendingReturn) {
      return {
        statusKey: 'pending_return',
        statusText: 'RETURN REQUESTED',
        bg: 'rgba(245, 158, 11, 0.2)',
        color: '#f59e0b',
        border: '1px solid rgba(245, 158, 11, 0.4)',
        timeLeftText: 'Verification Pending',
        isPendingReturn: true
      };
    }

    if (item.expected_return_date) {
      const expected = new Date(item.expected_return_date).getTime();
      const diff = expected - currentTime;

      if (diff < 0) {
        const overdueDays = Math.floor(Math.abs(diff) / (1000 * 3600 * 24));
        return {
          statusKey: 'overdue',
          statusText: 'OVERDUE',
          bg: 'rgba(239, 68, 68, 0.2)',
          color: '#ef4444',
          border: '1px solid rgba(239, 68, 68, 0.4)',
          timeLeftText: overdueDays > 0 ? `${overdueDays}d overdue` : 'Overdue today',
          isOverdue: true
        };
      } else {
        const days = Math.floor(diff / (1000 * 3600 * 24));
        return {
          statusKey: 'assigned',
          statusText: 'ASSIGNED',
          bg: '#7c3aed',
          color: '#ffffff',
          border: '1px solid #6d28d9',
          timeLeftText: days > 0 ? `${days}d left` : 'Due today'
        };
      }
    }

    return {
      statusKey: 'assigned',
      statusText: 'ASSIGNED',
      bg: '#7c3aed',
      color: '#ffffff',
      border: '1px solid #6d28d9',
      timeLeftText: '—'
    };
  };

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
    let totalAllocated = 0;
    let overdueCount = 0;
    let pendingReturnCount = 0;
    let returnedCount = 0;

    trackingData.forEach(item => {
      const derived = deriveAllocationStatus(item, now);
      if (derived.isReturned) {
        returnedCount++;
      } else {
        totalAllocated++;
        if (derived.isOverdue) overdueCount++;
        if (derived.isPendingReturn) pendingReturnCount++;
      }
    });

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



  const isManager = currentUser?.role === 'manager';

  if (isManager) {
    const mgrId = currentUser.id;
    const mgrEmail = (currentUser.email || '').toLowerCase();
    const mgrDept = (currentUser.department || '').toLowerCase();

    // 1. Tickets awaiting Manager Approval
    const awaitingApprovalTickets = tickets.filter(t => {
      const isPending = t.status === 'pending_manager_approval' || t.status === 'pending';
      const isTargetMgr = t.manager_id === mgrId || t.approver_id === mgrId || (mgrDept && (t.department || '').toLowerCase() === mgrDept);
      return isPending && isTargetMgr;
    });

    // 2. Tickets approved by Manager currently pending Admin Approval/Fulfillment
    const approvedPendingAdminTickets = tickets.filter(t => {
      const isAssignedToMgr = t.manager_id === mgrId || t.approver_id === mgrId || (mgrDept && (t.department || '').toLowerCase() === mgrDept);
      const isApprovedPending = t.status === 'pending_admin_assignment' || t.status === 'approved' || t.status === 'in_progress';
      return isAssignedToMgr && isApprovedPending;
    });

    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', color: 'var(--text-main)' }}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
          <div>
            <h2 style={{ fontSize: '22px', fontWeight: '800', margin: '0 0 4px 0', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <CheckIcon size={24} style={{ color: 'var(--accent)' }} /> Manager Approval & Tracking Dashboard
            </h2>
            <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: '13px' }}>
              Review pending team requests and track tickets approved by you currently pending IT Admin fulfillment.
            </p>
          </div>
          <button
            onClick={() => {
              if (onViewAllTickets) onViewAllTickets();
            }}
            style={{ padding: '9px 18px', borderRadius: '8px', background: 'var(--accent)', border: 'none', color: '#ffffff', fontSize: '13px', fontWeight: '700', cursor: 'pointer', boxShadow: '0 4px 12px var(--accent)33' }}
          >
            Team Tickets Overview
          </button>
        </div>

        {/* Summary Metric Cards */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '16px' }}>
          <div 
            onClick={() => setManagerTab('awaiting')}
            style={{ background: 'var(--bg-card)', border: managerTab === 'awaiting' ? '2px solid var(--accent)' : 'var(--border-card)', borderRadius: '12px', padding: '20px', cursor: 'pointer' }}
          >
            <div style={{ fontSize: '11.5px', color: 'var(--text-muted)', fontWeight: '700', textTransform: 'uppercase' }}>Awaiting Your Approval</div>
            <div style={{ fontSize: '28px', fontWeight: '800', marginTop: '6px', color: '#f59e0b' }}>{awaitingApprovalTickets.length}</div>
            <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px' }}>Pending manager review & decision</div>
          </div>
          <div 
            onClick={() => setManagerTab('approved')}
            style={{ background: 'var(--bg-card)', border: managerTab === 'approved' ? '2px solid var(--accent)' : 'var(--border-card)', borderRadius: '12px', padding: '20px', cursor: 'pointer' }}
          >
            <div style={{ fontSize: '11.5px', color: 'var(--text-muted)', fontWeight: '700', textTransform: 'uppercase' }}>Approved & Pending Admin</div>
            <div style={{ fontSize: '28px', fontWeight: '800', marginTop: '6px', color: '#38bdf8' }}>{approvedPendingAdminTickets.length}</div>
            <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px' }}>Approved by you, in IT queue for fulfillment</div>
          </div>
        </div>

        {/* Tab Selection Bar */}
        <div style={{ display: 'flex', gap: '10px', borderBottom: 'var(--border-card)', paddingBottom: '12px' }}>
          <button
            onClick={() => setManagerTab('awaiting')}
            style={{
              padding: '8px 16px',
              borderRadius: '8px',
              fontSize: '13px',
              fontWeight: '700',
              cursor: 'pointer',
              background: managerTab === 'awaiting' ? 'var(--accent)' : 'var(--bg-card)',
              color: managerTab === 'awaiting' ? '#ffffff' : 'var(--text-main)',
              border: 'var(--border-card)'
            }}
          >
            (1) Awaiting Manager Approval ({awaitingApprovalTickets.length})
          </button>
          <button
            onClick={() => setManagerTab('approved')}
            style={{
              padding: '8px 16px',
              borderRadius: '8px',
              fontSize: '13px',
              fontWeight: '700',
              cursor: 'pointer',
              background: managerTab === 'approved' ? 'var(--accent)' : 'var(--bg-card)',
              color: managerTab === 'approved' ? '#ffffff' : 'var(--text-main)',
              border: 'var(--border-card)'
            }}
          >
            (2) Approved & Pending Admin Approval ({approvedPendingAdminTickets.length})
          </button>
        </div>

        {/* Table Content Section */}
        <div style={{ background: 'var(--bg-card)', border: 'var(--border-card)', borderRadius: '12px', padding: '24px' }}>
          {managerTab === 'awaiting' ? (
            awaitingApprovalTickets.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '36px 0', color: '#10b981', fontWeight: '600', fontSize: '14px' }}>
                🎉 Great job! Zero tickets awaiting manager approval.
              </div>
            ) : (
              <div className="table-responsive-container" style={{ width: '100%' }}>
                <table style={{ width: '100%', tableLayout: 'fixed', borderCollapse: 'collapse', fontSize: '13px', textAlign: 'left' }}>
                  <thead>
                    <tr style={{ borderBottom: 'var(--border-card)', color: 'var(--text-muted)', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.3px' }}>
                      <th style={{ width: '16%', whiteSpace: 'nowrap' }}>Ticket ID</th>
                      <th style={{ width: '32%' }}>Title & Details</th>
                      <th style={{ width: '22%' }}>Requester</th>
                      <th style={{ width: '12%' }}>Priority</th>
                      <th style={{ width: '18%', textAlign: 'right', whiteSpace: 'nowrap' }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {awaitingApprovalTickets.map((t) => (
                      <tr key={t.id} style={{ borderBottom: 'var(--border-card)' }}>
                        <td className="ticket-id-cell">{formatTicketId(t.id, t.type)}</td>
                        <td>
                          <div style={{ fontWeight: '700', color: 'var(--text-main)', cursor: 'pointer' }} onClick={() => onSelectTicket(t.id)}>
                            {t.title}
                          </div>
                          <div style={{ fontSize: '11.5px', color: 'var(--text-muted)', marginTop: '2px' }}>{t.category || 'General'}</div>
                        </td>
                        <td>
                          <div style={{ fontWeight: '600' }}>{t.requester_name}</div>
                          <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{t.requester_email}</div>
                        </td>
                        <td>
                          <span style={{ padding: '3px 8px', borderRadius: '6px', fontSize: '11px', fontWeight: '800', textTransform: 'uppercase', background: t.priority === 'high' ? 'rgba(239,68,68,0.15)' : 'rgba(56,189,248,0.15)', color: t.priority === 'high' ? '#ef4444' : '#38bdf8' }}>
                            {(t.priority || 'medium').toUpperCase()}
                          </span>
                        </td>
                        <td style={{ textAlign: 'right' }}>
                          <div style={{ display: 'inline-flex', gap: '6px', justifyContent: 'flex-end' }}>
                            <button
                              onClick={() => handleManagerReview(t.id, 'approve')}
                              style={{ padding: '5px 12px', borderRadius: '6px', background: 'linear-gradient(135deg, #10b981, #059669)', border: 'none', color: '#ffffff', fontSize: '12px', fontWeight: '700', cursor: 'pointer' }}
                            >
                              Approve
                            </button>
                            <button
                              onClick={() => handleManagerReview(t.id, 'reject')}
                              style={{ padding: '5px 10px', borderRadius: '6px', background: 'rgba(239, 68, 68, 0.15)', border: '1px solid rgba(239, 68, 68, 0.3)', color: '#ef4444', fontSize: '12px', fontWeight: '600', cursor: 'pointer' }}
                            >
                              Deny
                            </button>
                            <button
                              onClick={() => onSelectTicket(t.id)}
                              style={{ padding: '5px 10px', borderRadius: '6px', background: 'var(--bg-body)', border: 'var(--border-card)', color: 'var(--text-main)', fontSize: '12px', cursor: 'pointer' }}
                            >
                              View
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )
          ) : (
            approvedPendingAdminTickets.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '36px 0', color: 'var(--text-muted)', fontSize: '14px' }}>
                No approved tickets currently pending Admin fulfillment.
              </div>
            ) : (
              <div className="table-responsive-container" style={{ width: '100%' }}>
                <table style={{ width: '100%', tableLayout: 'fixed', borderCollapse: 'collapse', fontSize: '13px', textAlign: 'left' }}>
                  <thead>
                    <tr style={{ borderBottom: 'var(--border-card)', color: 'var(--text-muted)', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.3px' }}>
                      <th style={{ width: '16%', whiteSpace: 'nowrap' }}>Ticket ID</th>
                      <th style={{ width: '32%' }}>Title & Details</th>
                      <th style={{ width: '22%' }}>Requester</th>
                      <th style={{ width: '18%', whiteSpace: 'nowrap' }}>Admin Queue Status</th>
                      <th style={{ width: '12%', textAlign: 'right', whiteSpace: 'nowrap' }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {approvedPendingAdminTickets.map((t) => (
                      <tr key={t.id} style={{ borderBottom: 'var(--border-card)' }}>
                        <td className="ticket-id-cell">{formatTicketId(t.id, t.type)}</td>
                        <td>
                          <div style={{ fontWeight: '700', color: 'var(--text-main)', cursor: 'pointer' }} onClick={() => onSelectTicket(t.id)}>
                            {t.title}
                          </div>
                          <div style={{ fontSize: '11.5px', color: 'var(--text-muted)', marginTop: '2px' }}>{t.assigned_device_name || t.category || 'General'}</div>
                        </td>
                        <td>
                          <div style={{ fontWeight: '600' }}>{t.requester_name}</div>
                          <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{t.requester_email}</div>
                        </td>
                        <td>
                          <span style={{ padding: '4px 10px', borderRadius: '12px', fontSize: '11px', fontWeight: '800', background: 'rgba(56, 189, 248, 0.15)', color: '#38bdf8', border: '1px solid rgba(56, 189, 248, 0.4)', whiteSpace: 'nowrap' }}>
                            PENDING IT ADMIN SETUP
                          </span>
                        </td>
                        <td style={{ textAlign: 'right' }}>
                          <button
                            onClick={() => onSelectTicket(t.id)}
                            style={{ padding: '5px 12px', borderRadius: '6px', background: 'var(--bg-body)', border: 'var(--border-card)', color: 'var(--text-main)', fontSize: '12px', cursor: 'pointer', fontWeight: '600' }}
                          >
                            View
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )
          )}
        </div>
      </div>
    );
  }

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
          <div style={{ width: '100%' }}>
            <table style={{ width: '100%', tableLayout: 'fixed', borderCollapse: 'collapse', fontSize: '13px', textAlign: 'left' }}>
              <thead>
                <tr style={{ borderBottom: 'var(--border-card)', color: 'var(--text-muted)', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.3px' }}>
                  <th style={{ width: '15%', whiteSpace: 'nowrap' }}>Ticket ID</th>
                  <th style={{ width: '45%' }}>Ticket Title</th>
                  <th style={{ width: '12%' }}>Priority</th>
                  <th style={{ width: '16%', whiteSpace: 'nowrap' }}>SLA Status</th>
                  <th style={{ width: '12%', textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {actionableTickets.map(({ ticket, sla }) => {
                  const isHighRiskOrBreached = sla.riskLevel === 'High' || sla.slaStatus === 'Breached';
                  const canEscalate = isHighRiskOrBreached && sla.escalationLevel !== 'Admin';

                  return (
                    <tr key={ticket.id} style={{ borderBottom: 'var(--border-card)', transition: 'background 0.2s ease' }}>
                      {/* Ticket ID */}
                      <td className="ticket-id-cell">
                        {formatTicketId(ticket.id, ticket.type)}
                      </td>

                      {/* Ticket Title */}
                      <td
                        style={{ padding: '12px 10px', fontWeight: '700', color: 'var(--text-main)', cursor: 'pointer', wordBreak: 'break-word' }}
                        onClick={() => onSelectTicket(ticket.id)}
                        title="Click to view full ticket details including Time Remaining"
                      >
                        {ticket.title}
                      </td>

                      {/* Priority */}
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

                      {/* SLA Status (At Risk / Breached) */}
                      <td style={{ padding: '12px 10px' }}>
                        <span style={{
                          padding: '4px 10px',
                          borderRadius: '12px',
                          fontSize: '11px',
                          fontWeight: '800',
                          background: sla.slaStatus === 'Breached' ? 'rgba(239, 68, 68, 0.2)' : 'rgba(245, 158, 11, 0.2)',
                          color: sla.slaStatus === 'Breached' ? '#ef4444' : '#f59e0b',
                          border: `1px solid ${sla.slaStatus === 'Breached' ? 'rgba(239, 68, 68, 0.4)' : 'rgba(245, 158, 11, 0.4)'}`,
                          whiteSpace: 'nowrap'
                        }}>
                          {sla.slaStatus === 'Breached' ? 'BREACHED' : 'AT RISK'}
                        </span>
                      </td>

                      {/* Actions (View Details) */}
                      <td style={{ padding: '12px 10px', textAlign: 'right' }}>
                        <div style={{ display: 'inline-flex', gap: '6px', justifyContent: 'flex-end' }}>
                          <button
                            onClick={() => onSelectTicket(ticket.id)}
                            style={{
                              padding: '5px 12px',
                              borderRadius: '6px',
                              background: 'var(--bg-body)',
                              border: 'var(--border-card)',
                              color: 'var(--text-main)',
                              cursor: 'pointer',
                              fontSize: '12px',
                              fontWeight: '600',
                              whiteSpace: 'nowrap'
                            }}
                            title="View complete ticket information including Time Remaining"
                          >
                            View
                          </button>

                          {canEscalate && (
                            <button
                              onClick={() => handleEscalateTicket(ticket, sla.escalationLevel)}
                              style={{
                                padding: '5px 10px',
                                borderRadius: '6px',
                                background: 'linear-gradient(135deg, #a855f7, #9333ea)',
                                border: 'none',
                                color: '#ffffff',
                                cursor: 'pointer',
                                fontSize: '11.5px',
                                fontWeight: '700',
                                whiteSpace: 'nowrap'
                              }}
                              title={`Escalate to ${sla.escalationLevel === 'Engineer' ? 'Manager' : 'Administrator'}`}
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
      <div style={{ background: 'var(--bg-card)', border: 'var(--border-card)', borderRadius: 'var(--radius-card)', padding: '24px', boxShadow: 'var(--shadow)', backdropFilter: 'var(--backdrop)', width: '100%', maxWidth: '100%', boxSizing: 'border-box', overflow: 'hidden' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '14px' }}>
          <div>
            <h3 style={{ fontSize: '17px', fontWeight: '800', margin: '0 0 4px 0', letterSpacing: '-0.4px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <DevicesIcon size={20} style={{ color: 'var(--accent)' }} /> Device Allocation & Return Tracking Report
            </h3>
            <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: '12.5px' }}>
              Monitor active hardware deployments, Exp-Return dates, and restock status.
            </p>
          </div>

          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', alignItems: 'center' }}>
            {/* Search Input */}
            <div style={{ position: 'relative', width: '220px', maxWidth: '100%' }}>
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
                color: deviceFilter === 'all' ? '#ffffff' : 'var(--text-main)',
                whiteSpace: 'nowrap'
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
                color: deviceFilter === 'overdue' ? '#ffffff' : 'var(--text-main)',
                whiteSpace: 'nowrap'
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
                color: deviceFilter === 'pending_return' ? '#ffffff' : 'var(--text-main)',
                whiteSpace: 'nowrap'
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
          <div className="table-responsive-container" style={{ width: '100%', maxWidth: '100%', overflowX: 'auto', WebkitOverflowScrolling: 'touch', boxSizing: 'border-box' }}>
            <table style={{ width: '100%', tableLayout: 'fixed', borderCollapse: 'collapse', fontSize: '13px', textAlign: 'left' }}>
              <thead>
                <tr style={{ borderBottom: 'var(--border-card)', color: 'var(--text-muted)', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.3px' }}>
                  <th style={{ width: '16%', minWidth: '110px', padding: '12px 10px', whiteSpace: 'nowrap' }}>TICKET ID</th>
                  <th style={{ width: '24%', minWidth: '140px', padding: '12px 10px' }}>DEVICE</th>
                  <th style={{ width: '26%', minWidth: '160px', padding: '12px 10px' }}>ASSIGNED USER</th>
                  <th style={{ width: '14%', minWidth: '110px', padding: '12px 10px', whiteSpace: 'nowrap' }}>STATUS</th>
                  <th style={{ width: '12%', minWidth: '120px', padding: '12px 10px', whiteSpace: 'nowrap' }}>TIME LEFT</th>
                  <th style={{ width: '8%', minWidth: '80px', padding: '12px 10px', textAlign: 'right', whiteSpace: 'nowrap' }}>ACTION</th>
                </tr>
              </thead>
              <tbody>
                {filteredTrackingData.slice(0, 5).map((item) => {
                  const statusInfo = deriveAllocationStatus(item);

                  return (
                    <tr key={item.ticket_id} style={{ borderBottom: 'var(--border-card)' }}>
                      <td className="ticket-id-cell">
                        {formatTicketId(item.ticket_id, item.ticket_type)}
                      </td>
                      <td style={{ fontWeight: '700', color: 'var(--accent)', wordBreak: 'break-word' }}>
                        {item.assigned_device_name || item.inventory_name || 'Assigned Hardware'}
                      </td>
                      <td>
                        <div style={{ fontWeight: '600', wordBreak: 'break-word' }}>{item.requester_name || 'N/A'}</div>
                        {item.requester_email && (
                          <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: '400', wordBreak: 'break-all' }}>{item.requester_email}</div>
                        )}
                      </td>
                      <td style={{ padding: '12px 6px', whiteSpace: 'nowrap' }}>
                        <span style={{
                          padding: '4px 10px',
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
                          {statusInfo.statusText}
                        </span>
                      </td>
                      <td style={{ padding: '12px 6px', color: 'var(--text-muted)', fontSize: '12px', whiteSpace: 'nowrap' }}>
                        {statusInfo.timeLeftText}
                      </td>
                      <td style={{ padding: '12px 6px', textAlign: 'right' }}>
                        <button
                          onClick={() => onSelectTicket(item.ticket_id)}
                          style={{
                            padding: '5px 12px',
                            borderRadius: '6px',
                            background: 'var(--bg-body)',
                            border: 'var(--border-card)',
                            color: 'var(--text-main)',
                            cursor: 'pointer',
                            fontSize: '12px',
                            fontWeight: '600',
                            whiteSpace: 'nowrap'
                          }}
                          title="View full ticket details"
                        >
                          View
                        </button>
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
