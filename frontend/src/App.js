import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import './App.css';
import Auth from './Auth';
import TicketList from './TicketList';
import CreateTicket from './CreateTicket';
import TicketDetail from './TicketDetail';
import ApprovalQueue from './ApprovalQueue';
import AdminInventory from './AdminInventory';
import AdminUserControl from './AdminUserControl';
import AdminProfile from './AdminProfile';
import AvailableDevices from './AvailableDevices';
import Toast from './Toast';
import AnalyticsDashboard from './AnalyticsDashboard';
import AssetLifecycleDashboard from './AssetLifecycleDashboard';
import AssignedAssetTrack from './AssignedAssetTrack';
import ExecutiveDashboard from './ExecutiveDashboard';
import OpenIncidents from './OpenIncidents';
import ClosedIncidents from './ClosedIncidents';
import NetworkBackground from './components/NetworkBackground';
import { 
  DashboardIcon, 
  DevicesIcon, 
  CreateIcon, 
  ApprovalsIcon, 
  InventoryIcon, 
  UsersIcon, 
  SettingsIcon, 
  LogoutIcon, 
  SparklesIcon,
  CheckIcon,
  LogoIcon,
  LockIcon
} from './components/Icons';

function App() {
  const [view, setViewState] = useState(() => {
    const params = new URLSearchParams(window.location.search);
    const viewParam = params.get('view');
    if (viewParam) return viewParam;
    return localStorage.getItem('ticketmanagement_active_view') || 'dashboard';
  });

  const setView = (newView) => {
    setViewState(newView);
    localStorage.setItem('ticketmanagement_active_view', newView);
  };
  const [currentUser, setCurrentUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('token') || '');
  const [authLoading, setAuthLoading] = useState(!!localStorage.getItem('token'));
  const [tickets, setTickets] = useState([]);
  const [globalSettings, setGlobalSettings] = useState(null);
  const [selectedTicket, setSelectedTicket] = useState(null);
  const [selectedTicketId, setSelectedTicketId] = useState(() => {
    const params = new URLSearchParams(window.location.search);
    const ticketIdParam = params.get('ticketId');
    if (ticketIdParam) return ticketIdParam;
    return localStorage.getItem('ticketmanagement_selected_ticket_id') || null;
  });
  const [selectedDeviceForRequest, setSelectedDeviceForRequest] = useState(null);
  const [sourceView, setSourceView] = useState(() => {
    return sessionStorage.getItem('ticketmanagement_source_view') || null;
  });
  const [ticketViewMode, setTicketViewMode] = useState('grid');
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState(null);
  const [confirmConfig, setConfirmConfig] = useState(null);

  const showToast = useCallback((message, type = 'success') => {
    if (!message) return;
    const id = Date.now();
    setToast({ id, message, type });
    setTimeout(() => {
      setToast((current) => (current?.id === id ? null : current));
    }, 3000);
  }, []);

  const [globalViewMode, setGlobalViewMode] = useState(() => {
    return localStorage.getItem('ticketmanagement_view_mode') || 'grid';
  });

  const handleGlobalViewModeChange = (newMode) => {
    setGlobalViewMode(newMode);
    localStorage.setItem('ticketmanagement_view_mode', newMode);
  };

  const [globalDensity, setGlobalDensity] = useState(() => {
    return localStorage.getItem('ticketmanagement_ui_density') || 'density-default';
  });

  const handleGlobalDensityChange = (newDensity) => {
    setGlobalDensity(newDensity);
    localStorage.setItem('ticketmanagement_ui_density', newDensity);
  };

  const showConfirm = useCallback(({ title = 'Confirm Action', message = 'Are you sure you want to proceed?', confirmText = 'Confirm', cancelText = 'Cancel', confirmType = 'danger' }) => {
    return new Promise((resolve) => {
      setConfirmConfig({
        title,
        message,
        confirmText,
        cancelText,
        confirmType,
        onConfirm: () => {
          setConfirmConfig(null);
          resolve(true);
        },
        onCancel: () => {
          setConfirmConfig(null);
          resolve(false);
        }
      });
    });
  }, []);

  useEffect(() => {
    window.showToast = showToast;
    window.showConfirm = showConfirm;
    window.alert = (message) => {
      if (!message) return;
      const str = String(message);
      const isError = /fail|error|denied|reject|required|invalid|must|cannot|select|provide|fill/i.test(str);
      showToast(str, isError ? 'error' : 'success');
    };
  }, [showToast, showConfirm]);

  // Dynamic API URL resolution targeting backend API endpoint
  const getApiUrl = () => {
    const hostname = window.location.hostname || 'localhost';

    // If accessing via domain or non-localhost (e.g. servicedesk.securelayer7.com via Caddy), use relative path /api
    if (hostname !== 'localhost' && hostname !== '127.0.0.1') {
      return '/api';
    }

    if (process.env.REACT_APP_API_URL && process.env.REACT_APP_API_URL.length > 0) {
      return process.env.REACT_APP_API_URL;
    }

    const protocol = window.location.protocol;
    return `${protocol}//${hostname}:5000/api`;
  };

  const API_URL = getApiUrl();

  // Synchronize browser history and URL with React routing state
  useEffect(() => {
    if (!sessionStorage.getItem('ticketmanagement_history_count')) {
      sessionStorage.setItem('ticketmanagement_history_count', '1');
    }
  }, []);

  useEffect(() => {
    // Ensure URL reflects current view on initial mount
    const initialParams = new URLSearchParams(window.location.search);
    if (!initialParams.get('view')) {
      const defaultParams = new URLSearchParams();
      defaultParams.set('view', view);
      const newUrl = `${window.location.pathname}?${defaultParams.toString()}`;
      if (window.history && typeof window.history.replaceState === 'function') {
        window.history.replaceState({ view }, '', newUrl);
      }
    }
  }, []);

  // Synchronize browser history and URL with React routing state
  useEffect(() => {
    if (!window.history || typeof window.history.pushState !== 'function') return;
    const params = new URLSearchParams(window.location.search);
    const currentViewInUrl = params.get('view') || 'dashboard';
    const currentTicketIdInUrl = params.get('ticketId');

    const isSame = (currentViewInUrl === view) && 
                   (view !== 'detail' || String(currentTicketIdInUrl) === String(selectedTicketId));

    if (!isSame) {
      const newParams = new URLSearchParams();
      newParams.set('view', view);
      if (view === 'detail' && selectedTicketId) {
        newParams.set('ticketId', String(selectedTicketId));
      }
      
      const newUrl = `${window.location.pathname}?${newParams.toString()}`;
      window.history.pushState({ view, ticketId: selectedTicketId }, '', newUrl);
      
      const count = Number(sessionStorage.getItem('ticketmanagement_history_count') || 0);
      sessionStorage.setItem('ticketmanagement_history_count', String(count + 1));
    }
  }, [view, selectedTicketId]);

  useEffect(() => {
    const handlePopState = (event) => {
      const params = new URLSearchParams(window.location.search);
      const viewParam = params.get('view') || 'dashboard';
      const ticketIdParam = params.get('ticketId');

      setViewState(viewParam);
      localStorage.setItem('ticketmanagement_active_view', viewParam);

      if (ticketIdParam) {
        setSelectedTicketId(ticketIdParam);
        localStorage.setItem('ticketmanagement_selected_ticket_id', String(ticketIdParam));
        
        const found = tickets.find(t => String(t.id) === String(ticketIdParam));
        if (found) {
          setSelectedTicket(found);
        } else {
          axios.get(`${API_URL}/tickets/${ticketIdParam}`)
            .then(res => setSelectedTicket(res.data))
            .catch(err => console.error('Error fetching popstate ticket:', err));
        }
      } else {
        setSelectedTicketId(null);
        setSelectedTicket(null);
        localStorage.removeItem('ticketmanagement_selected_ticket_id');
      }
    };

    window.addEventListener('popstate', handlePopState);
    return () => {
      window.removeEventListener('popstate', handlePopState);
    };
  }, [tickets, API_URL]);

  // Keep track of last visited list/view as fallback
  useEffect(() => {
    if (view && view !== 'detail') {
      localStorage.setItem('ticketmanagement_fallback_view', view);
    }
  }, [view]);

  // Fetch ticket details if direct page entry or refresh occurs
  useEffect(() => {
    if (selectedTicketId && !selectedTicket && API_URL) {
      const found = tickets.find(t => String(t.id) === String(selectedTicketId));
      if (found) {
        setSelectedTicket(found);
      } else {
        axios.get(`${API_URL}/tickets/${selectedTicketId}`)
          .then(res => {
            setSelectedTicket(res.data);
          })
          .catch(err => {
            console.error('Error fetching initial ticket detail:', err);
          });
      }
    }
  }, [selectedTicketId, selectedTicket, tickets, API_URL]);



  // Configure Axios global Authorization header
  useEffect(() => {
    if (token) {
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      fetchCurrentUser();
    } else {
      delete axios.defaults.headers.common['Authorization'];
      setCurrentUser(null);
      setAuthLoading(false);
    }
  }, [token]);

  useEffect(() => {
    fetchGlobalSettings();
  }, []);

  useEffect(() => {
    if (currentUser && token) {
      fetchTickets(false);
    }
  }, [currentUser, token]);

  useEffect(() => {
    if (tickets.length > 0 && selectedTicketId && !selectedTicket) {
      const found = tickets.find(t => String(t.id) === String(selectedTicketId));
      if (found) {
        setSelectedTicket(found);
      }
    }
  }, [tickets, selectedTicketId, selectedTicket]);

  const fetchCurrentUser = async () => {
    setAuthLoading(true);
    try {
      const response = await axios.get(`${API_URL}/auth/me`);
      setCurrentUser(response.data);
    } catch (error) {
      console.error('Error verifying user token:', error);
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      delete axios.defaults.headers.common['Authorization'];
      setToken('');
      setCurrentUser(null);
    } finally {
      setAuthLoading(false);
    }
  };

  const fetchGlobalSettings = async () => {
    try {
      const response = await axios.get(`${API_URL}/settings`);
      setGlobalSettings(response.data);
      if (response.data && response.data.ticket_view_mode) {
        setTicketViewMode(response.data.ticket_view_mode);
      }
    } catch (error) {
      console.error('Error fetching global settings:', error);
    }
  };

  useEffect(() => {
    if (globalSettings) {
      const root = document.documentElement;
      if (globalSettings.branding_primary_color) {
        root.style.setProperty('--accent', globalSettings.branding_primary_color);
      } else {
        root.style.removeProperty('--accent');
      }
      if (globalSettings.branding_secondary_color) {
        root.style.setProperty('--accent-secondary', globalSettings.branding_secondary_color);
      } else {
        root.style.removeProperty('--accent-secondary');
      }
      if (globalSettings.branding_favicon_url) {
        let link = document.querySelector("link[rel~='icon']");
        if (link) link.href = globalSettings.branding_favicon_url;
      }
    }
  }, [globalSettings]);

  const fetchTickets = async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const response = await axios.get(`${API_URL}/tickets`);
      setTickets(response.data);
    } catch (error) {
      console.error('Error fetching tickets:', error);
    } finally {
      if (!silent) setLoading(false);
    }
  };

  const handleAuthSuccess = (newToken, user) => {
    localStorage.setItem('token', newToken);
    localStorage.setItem('user', JSON.stringify(user));
    setToken(newToken);
    setCurrentUser(user);
    setView('dashboard');
  };

  const handleLogout = async () => {
    const confirmed = await showConfirm({
      title: 'Confirm Logout',
      message: 'Are you sure you want to log out of your session?',
      confirmText: 'Logout',
      cancelText: 'Cancel',
      confirmType: 'warning'
    });
    if (!confirmed) return;

    localStorage.removeItem('token');
    localStorage.removeItem('user');
    localStorage.removeItem('ticketmanagement_selected_ticket_id');
    localStorage.removeItem('ticketmanagement_active_view');
    localStorage.removeItem('ticketmanagement_fallback_view');
    sessionStorage.removeItem('ticketmanagement_history_count');
    
    // Clear URL query parameters
    window.history.replaceState({}, '', window.location.pathname);

    setToken('');
    setCurrentUser(null);
    setAuthLoading(false);
    setTickets([]);
    setSelectedTicket(null);
    setSelectedTicketId(null);
    setSelectedDeviceForRequest(null);
  };

  const handleCreateTicket = async (ticketData) => {
    try {
      await axios.post(`${API_URL}/tickets`, ticketData);
      alert('Ticket created successfully!');
      setSelectedDeviceForRequest(null);
      await fetchTickets(true);
      if (currentUser?.role === 'employee' || currentUser?.role === 'manager') {
        setView('my-tickets');
      } else {
        setView('tickets');
      }
    } catch (error) {
      console.error('Error creating ticket:', error);
      alert(error.response?.data?.error || 'Failed to create ticket');
    }
  };

  const handleRequestDeviceFromCatalog = (device) => {
    setSelectedDeviceForRequest(device);
    setView('create');
  };

  const handleApproveTicket = async (ticketId, comment) => {
    try {
      await axios.put(`${API_URL}/tickets/${ticketId}/manager-review`, {
        action: 'approve',
        approval_comment: comment
      });
      alert('Ticket approved! Sent to Admin for device assignment.');
      await fetchTickets(true);
      setSelectedTicket(prev => prev && prev.id === ticketId ? { ...prev, status: 'approved', approval_comment: comment } : prev);
    } catch (error) {
      console.error('Error approving ticket:', error);
      alert(error.response?.data?.error || 'Failed to approve ticket');
    }
  };

  const handleRejectTicket = async (ticketId, comment) => {
    try {
      await axios.put(`${API_URL}/tickets/${ticketId}/manager-review`, {
        action: 'reject',
        approval_comment: comment
      });
      alert('Ticket denied.');
      await fetchTickets(true);
      setSelectedTicket(prev => prev && prev.id === ticketId ? { ...prev, status: 'rejected', approval_comment: comment } : prev);
    } catch (error) {
      console.error('Error rejecting ticket:', error);
      alert(error.response?.data?.error || 'Failed to reject ticket');
    }
  };

  const handleCloseTicket = async (ticketId) => {
    try {
      await axios.put(`${API_URL}/tickets/${ticketId}/close`, {});
      alert('Ticket closed successfully!');
      await fetchTickets(true);
      setSelectedTicket(prev => prev && prev.id === ticketId ? { ...prev, status: 'closed' } : prev);
    } catch (error) {
      console.error('Error closing ticket:', error);
      alert(error.response?.data?.error || 'Failed to close ticket');
    }
  };

  const handleAdminUpdateTicket = async (ticketId, updatedData) => {
    try {
      const response = await axios.put(`${API_URL}/tickets/${ticketId}`, updatedData);
      alert('Ticket updated successfully by Admin!');
      setSelectedTicket(response.data.ticket);
      fetchTickets();
    } catch (error) {
      console.error('Admin update ticket error:', error);
      alert(error.response?.data?.error || 'Failed to update ticket');
    }
  };

  const handleAdminDeleteTicket = async (ticketId) => {
    try {
      await axios.delete(`${API_URL}/tickets/${ticketId}`);
      alert('Ticket deleted successfully.');
      setSelectedTicket(null);
      await fetchTickets(true);
      if (currentUser?.role === 'employee' || currentUser?.role === 'manager') {
        setView('my-tickets');
      } else {
        setView('tickets-list');
      }
    } catch (error) {
      console.error('Admin delete ticket error:', error);
      alert(error.response?.data?.error || 'Failed to delete ticket');
    }
  };

  const handleViewTicket = (ticket) => {
    // Capture current view as source before navigating to detail
    const currentSource = view;
    setSourceView(currentSource);
    sessionStorage.setItem('ticketmanagement_source_view', currentSource);

    setSelectedTicket(ticket);
    if (ticket && ticket.id) {
      setSelectedTicketId(ticket.id);
      localStorage.setItem('ticketmanagement_selected_ticket_id', String(ticket.id));
    }
    setView('detail');
  };

  const handleViewTicketById = (ticketId) => {
    // Capture current view as source before navigating to detail
    const currentSource = view;
    setSourceView(currentSource);
    sessionStorage.setItem('ticketmanagement_source_view', currentSource);

    setSelectedTicketId(ticketId);
    localStorage.setItem('ticketmanagement_selected_ticket_id', String(ticketId));
    const foundTicket = tickets.find(t => String(t.id) === String(ticketId));
    if (foundTicket) {
      setSelectedTicket(foundTicket);
      setView('detail');
    } else {
      axios.get(`${API_URL}/tickets/${ticketId}`)
        .then(res => {
          setSelectedTicket(res.data);
          setView('detail');
        })
        .catch(err => {
          console.error('Error fetching ticket detail:', err);
          alert('Could not open ticket details.');
        });
    }
  };

  // 1. Show Splash Screen while validating session/token on page refresh
  if (authLoading) {
    return (
      <div className="auth-splash-screen" style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        height: '100vh',
        width: '100vw',
        background: '#0f172a',
        color: '#f8fafc',
        fontFamily: 'system-ui, -apple-system, sans-serif',
        zIndex: 99999
      }}>
        <div className="spinner" style={{
          width: '44px',
          height: '44px',
          border: '3px solid rgba(56, 189, 248, 0.2)',
          borderTopColor: '#38bdf8',
          borderRadius: '50%',
          animation: 'spin 0.8s linear infinite',
          marginBottom: '20px'
        }}></div>
        <h2 style={{ fontSize: '18px', fontWeight: '700', margin: '0 0 8px 0', letterSpacing: '-0.3px', color: '#f8fafc' }}>
          Ticket Management System
        </h2>
        <p style={{ fontSize: '13px', color: '#94a3b8', margin: 0 }}>
          Verifying secure session...
        </p>
      </div>
    );
  }

  // 2. Render Auth screen if not authenticated
  if (!token || !currentUser) {
    return <Auth API_URL={API_URL} onAuthSuccess={handleAuthSuccess} globalSettings={globalSettings} />;
  }

  const getRoleBadgeColor = (role) => {
    switch (role) {
      case 'admin':
        return 'linear-gradient(90deg, #38bdf8 0%, #a855f7 50%, #f472b6 100%)';
      case 'manager':
        return 'linear-gradient(135deg, #f59e0b, #d97706)';
      default:
        return 'linear-gradient(135deg, #3b82f6, #1d4ed8)';
    }
  };

  const activeTheme = globalSettings?.global_theme || 'theme-enterprise-dark';

  return (
    <div className={`app ai-theme ${activeTheme} ${globalDensity}`}>
      <NetworkBackground opacity={0.07} />

      {/* Top-Left Reusable Toast Notification */}
      <Toast toast={toast} onClose={() => setToast(null)} />

      {/* Enhanced Confirmation Dialog Modal */}
      {confirmConfig && (
        <div className="confirm-modal-overlay" onClick={confirmConfig.onCancel}>
          <div className="confirm-modal-box" onClick={(e) => e.stopPropagation()}>
            <div className={`confirm-icon-badge ${confirmConfig.confirmType}`}>
              {confirmConfig.confirmType === 'danger' ? '!' : '!'}
            </div>
            <h3 className="confirm-modal-title">{confirmConfig.title}</h3>
            <p className="confirm-modal-message">{confirmConfig.message}</p>
            <div className="confirm-modal-actions">
              <button className="btn-confirm-cancel" onClick={confirmConfig.onCancel}>
                {confirmConfig.cancelText}
              </button>
              <button className={`btn-confirm-submit ${confirmConfig.confirmType}`} onClick={confirmConfig.onConfirm}>
                {confirmConfig.confirmText}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Header Bar */}
      <header className="header">
        <div className="header-content">
          <div className="header-brand">
            {globalSettings?.branding_logo_url ? (
              <img src={globalSettings.branding_logo_url} alt="Portal Logo" className="header-logo-img" style={{ maxHeight: '36px', width: 'auto', borderRadius: '4px' }} />
            ) : (
              <LogoIcon size={32} style={{ color: 'var(--accent)', marginRight: '8px' }} />
            )}
            <h1>
              Ticket Management
            </h1>
          </div>

          <div className="header-right">
            <div
              className="user-profile-badge clickable-profile"
              onClick={() => {
                if (currentUser.role === 'admin') {
                  setView('admin-profile');
                }
              }}
              title={currentUser.role === 'admin' ? "Click to open Admin Profile & Password Settings" : ""}
            >
              <span className="user-avatar">{currentUser.name.charAt(0)}</span>
              <div className="user-info-text">
                <span className="user-name">{currentUser.name}</span>
                <span className="user-email">{currentUser.email}</span>
              </div>
              <span
                className="role-pill"
                style={{ background: getRoleBadgeColor(currentUser.role) }}
              >
                {currentUser.role.toUpperCase()}
              </span>
            </div>
            <button className="btn-logout" onClick={handleLogout} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <LogoutIcon size={16} /> Logout
            </button>
          </div>
        </div>
      </header>

      {/* Main App Container */}
      <div className="container">
        <nav className="sidebar">
          <div className="nav-section-title">MAIN MENU</div>

          {/* Executive Dashboard Link (Admins & Managers) */}
          {(currentUser.role === 'admin' || currentUser.role === 'manager') && (
            <button
              className={`nav-button ${view === 'dashboard' ? 'active' : ''}`}
              onClick={() => setView('dashboard')}
            >
              <span className="nav-icon"><DashboardIcon size={18} /></span>
              <span>Dashboard</span>
            </button>
          )}

          {/* All Tickets Link (ADMIN ONLY) */}
          {currentUser.role === 'admin' && (
            <button
              className={`nav-button ${view === 'tickets-list' ? 'active' : ''}`}
              onClick={() => setView('tickets-list')}
            >
              <span className="nav-icon"><InventoryIcon size={18} /></span>
              <span>All Tickets</span>
            </button>
          )}

          {/* Assigned Asset Track Link (ADMIN & MANAGER ONLY - MAIN MENU) */}
          {(currentUser.role === 'admin' || currentUser.role === 'manager') && (
            <button
              className={`nav-button ${view === 'assigned-asset-track' ? 'active' : ''}`}
              onClick={() => setView('assigned-asset-track')}
            >
              <span className="nav-icon"><DevicesIcon size={18} style={{ color: '#38bdf8' }} /></span>
              <span>Assigned Asset Track</span>
            </button>
          )}

          {/* My Tickets Link (MANAGER & EMPLOYEE) */}
          {(currentUser.role === 'manager' || currentUser.role === 'employee') && (
            <button
              className={`nav-button ${view === 'my-tickets' || (currentUser.role === 'employee' && view === 'dashboard') ? 'active' : ''}`}
              onClick={() => setView('my-tickets')}
            >
              <span className="nav-icon"><InventoryIcon size={18} /></span>
              <span>My Tickets</span>
            </button>
          )}

          <button
            className={`nav-button ${view === 'devices' ? 'active' : ''}`}
            onClick={() => setView('devices')}
          >
            <span className="nav-icon"><DevicesIcon size={18} /></span>
            <span>Available Devices</span>
          </button>

          <button
            className={`nav-button ${view === 'create' ? 'active' : ''}`}
            onClick={() => {
              setSelectedDeviceForRequest(null);
              setView('create');
            }}
          >
            <span className="nav-icon"><CreateIcon size={18} /></span>
            <span>Create Ticket</span>
          </button>


          {(currentUser.role === 'manager' || currentUser.role === 'admin') && (
            <button
              className={`nav-button ${view === 'approvals' ? 'active' : ''}`}
              onClick={() => setView('approvals')}
            >
              <span className="nav-icon"><ApprovalsIcon size={18} /></span>
              <span>Approvals Queue</span>
            </button>
          )}

          <button
            className={`nav-button ${view === 'open-incidents' ? 'active' : ''}`}
            onClick={() => setView('open-incidents')}
          >
            <span className="nav-icon"><InventoryIcon size={18} /></span>
            <span>Open Incidents</span>
          </button>


          {/* ADMIN ONLY NAVIGATION GROUP */}
          {currentUser.role === 'admin' && (
            <div className="admin-nav-group">
              <div className="nav-section-title">ADMINISTRATOR</div>
              <button
                className={`nav-button admin-btn ${view === 'closed-incidents' ? 'active' : ''}`}
                onClick={() => setView('closed-incidents')}
              >
                <span className="nav-icon"><CheckIcon size={18} /></span>
                <span>Closed Incidents</span>
                <span className="admin-tag">ADMIN</span>
              </button>

              <button
                className={`nav-button admin-btn ${view === 'analytics' ? 'active' : ''}`}
                onClick={() => setView('analytics')}
              >
                <span className="nav-icon"><SparklesIcon size={18} style={{ color: '#38bdf8' }} /></span>
                <span>Analytics Insights</span>
                <span className="admin-tag">ADMIN</span>
              </button>

              <button
                className={`nav-button admin-btn ${view === 'inventory' ? 'active' : ''}`}
                onClick={() => setView('inventory')}
              >
                <span className="nav-icon"><InventoryIcon size={18} /></span>
                <span>Inventory Control</span>
                <span className="admin-tag">ADMIN</span>
              </button>

              <button
                className={`nav-button admin-btn ${view === 'asset-lifecycle' ? 'active' : ''}`}
                onClick={() => setView('asset-lifecycle')}
              >
                <span className="nav-icon"><DevicesIcon size={18} /></span>
                <span>Asset Lifecycle</span>
                <span className="admin-tag">ADMIN</span>
              </button>

              <button
                className={`nav-button admin-btn ${view === 'users' ? 'active' : ''}`}
                onClick={() => setView('users')}
              >
                <span className="nav-icon"><UsersIcon size={18} /></span>
                <span>User & View Control</span>
                <span className="admin-tag">ADMIN</span>
              </button>

              <button
                className={`nav-button admin-btn ${view === 'admin-profile' ? 'active' : ''}`}
                onClick={() => setView('admin-profile')}
              >
                <span className="nav-icon"><SettingsIcon size={18} /></span>
                <span>Admin Profile & Pwd</span>
                <span className="admin-tag">ADMIN</span>
              </button>
            </div>
          )}
        </nav>

        <main className="main-content">
          {loading ? (
            <div className="loading-ai">
              <div className="spinner"></div>Loading Intelligent Portal...
            </div>
          ) : (
            <div key={view} className="fade-in-up">
              {view === 'dashboard' && (
                (currentUser.role === 'admin' || currentUser.role === 'manager') ? (
                  <ExecutiveDashboard 
                    tickets={tickets} 
                    currentUser={currentUser}
                    onSelectTicket={handleViewTicketById} 
                    onViewAllTickets={() => setView('tickets-list')} 
                    onViewInventory={() => setView('inventory')} 
                    API_URL={API_URL}
                    onRefresh={fetchTickets}
                  />
                ) : (
                  <TicketList
                    tickets={tickets}
                    currentUser={currentUser}
                    onViewTicket={handleViewTicket}
                    viewMode={ticketViewMode}
                  />
                )
              )}

              {view === 'tickets-list' && (
                <TicketList
                  tickets={tickets}
                  currentUser={currentUser}
                  onViewTicket={handleViewTicket}
                  viewMode={globalViewMode}
                  onViewModeChange={handleGlobalViewModeChange}
                />
              )}

              {view === 'my-tickets' && (
                <TicketList
                  tickets={tickets.filter(t => t.requester_id === currentUser.id || (t.requester_email || '').toLowerCase() === (currentUser.email || '').toLowerCase())}
                  currentUser={currentUser}
                  onViewTicket={handleViewTicket}
                  viewMode={globalViewMode || ticketViewMode}
                  onViewModeChange={handleGlobalViewModeChange}
                />
              )}

              {view === 'devices' && (
                <AvailableDevices
                  API_URL={API_URL}
                  onRequestDevice={handleRequestDeviceFromCatalog}
                />
              )}

              {view === 'create' && (
                <CreateTicket
                  onSubmit={handleCreateTicket}
                  API_URL={API_URL}
                  initialDevice={selectedDeviceForRequest}
                  currentUser={currentUser}
                />
              )}

              {view === 'approvals' && (currentUser.role === 'manager' || currentUser.role === 'admin') && (
                <ApprovalQueue
                  tickets={tickets}
                  currentUser={currentUser}
                  onViewTicket={handleViewTicket}
                  onRefresh={fetchTickets}
                  API_URL={API_URL}
                  viewMode={globalViewMode}
                  onViewModeChange={handleGlobalViewModeChange}
                />
              )}

              {view === 'open-incidents' && (
                <OpenIncidents
                  tickets={tickets}
                  currentUser={currentUser}
                  onViewTicket={handleViewTicket}
                  onRefresh={fetchTickets}
                  API_URL={API_URL}
                  viewMode={globalViewMode}
                  onViewModeChange={handleGlobalViewModeChange}
                />
              )}


              {view === 'assigned-asset-track' && (
                (currentUser.role === 'admin' || currentUser.role === 'manager') ? (
                  <AssignedAssetTrack
                    API_URL={API_URL}
                    onSelectTicket={handleViewTicketById}
                  />
                ) : (
                  <div className="access-denied-card">
                    <div className="denied-icon"><LockIcon size={36} /></div>
                    <h2>Access Restricted</h2>
                    <p>Only Administrator and Manager accounts can access the Assigned Asset Track view.</p>
                    <button className="btn-return-home" onClick={() => setView('dashboard')}>
                      Return to Dashboard
                    </button>
                  </div>
                )
              )}

              {view === 'inventory' && (
                currentUser.role === 'admin' ? (
                  <AdminInventory API_URL={API_URL} />
                ) : (
                  <div className="access-denied-card">
                    <div className="denied-icon"><LockIcon size={36} /></div>
                    <h2>Access Restricted</h2>
                    <p>Normal user accounts do not have administrator permissions to access Inventory Control.</p>
                    <button className="btn-return-home" onClick={() => setView('dashboard')}>
                      Return to Dashboard
                    </button>
                  </div>
                )
              )}

              {view === 'users' && (
                currentUser.role === 'admin' ? (
                  <AdminUserControl
                    API_URL={API_URL}
                    currentViewMode={ticketViewMode}
                    onUpdateViewMode={(newMode) => setTicketViewMode(newMode)}
                  />
                ) : (
                  <div className="access-denied-card">
                    <div className="denied-icon"><LockIcon size={36} /></div>
                    <h2>Access Restricted</h2>
                    <p>Normal user accounts do not have administrator permissions.</p>
                    <button className="btn-return-home" onClick={() => setView('dashboard')}>
                      Return to Dashboard
                    </button>
                  </div>
                )
              )}

              {view === 'admin-profile' && (
                currentUser.role === 'admin' ? (
                  <AdminProfile
                    API_URL={API_URL}
                    currentUser={currentUser}
                    onProfileUpdated={fetchCurrentUser}
                    uiDensity={globalDensity}
                    onDensityChange={handleGlobalDensityChange}
                  />
                ) : (
                  <div className="access-denied-card">
                    <div className="denied-icon"><LockIcon size={36} /></div>
                    <h2>Access Restricted</h2>
                    <p>Only administrators can access Admin Profile settings.</p>
                    <button className="btn-return-home" onClick={() => setView('dashboard')}>
                      Return to Dashboard
                    </button>
                  </div>
                )
              )}

              {view === 'analytics' && (
                currentUser.role === 'admin' ? (
                  <AnalyticsDashboard 
                    tickets={tickets} 
                    currentUser={currentUser} 
                    API_URL={API_URL}
                    onRefresh={fetchTickets}
                    onSelectTicket={handleViewTicketById}
                    onViewAllTickets={() => setView('tickets-list')}
                  />
                ) : (
                  <div className="access-denied-card">
                    <div className="denied-icon"><LockIcon size={36} /></div>
                    <h2>Access Restricted</h2>
                    <p>Only administrators can access Analytics Insights.</p>
                    <button className="btn-return-home" onClick={() => setView('dashboard')}>
                      Return to Dashboard
                    </button>
                  </div>
                )
              )}

              {view === 'closed-incidents' && (
                currentUser.role === 'admin' ? (
                  <ClosedIncidents
                    tickets={tickets}
                    currentUser={currentUser}
                    onViewTicket={handleViewTicket}
                    onRefresh={fetchTickets}
                    API_URL={API_URL}
                    viewMode={globalViewMode}
                    onViewModeChange={handleGlobalViewModeChange}
                  />
                ) : (
                  <div className="access-denied-card">
                    <div className="denied-icon"><LockIcon size={36} /></div>
                    <h2>Access Restricted</h2>
                    <p>Only administrators can access the Closed Incidents archive.</p>
                    <button className="btn-return-home" onClick={() => setView('dashboard')}>
                      Return to Dashboard
                    </button>
                  </div>
                )
              )}

              {view === 'asset-lifecycle' && (
                currentUser.role === 'admin' ? (
                  <AssetLifecycleDashboard API_URL={API_URL} onSelectTicket={handleViewTicketById} />
                ) : (
                  <div className="access-denied-card">
                    <div className="denied-icon"><LockIcon size={36} /></div>
                    <h2>Access Restricted</h2>
                    <p>Only administrators can access the Asset Lifecycle Tracking Dashboard.</p>
                    <button className="btn-return-home" onClick={() => setView('dashboard')}>
                      Return to Dashboard
                    </button>
                  </div>
                )
              )}

              {view === 'detail' && selectedTicket && (
                <TicketDetail
                  ticket={selectedTicket}
                  currentUser={currentUser}
                  onApprove={handleApproveTicket}
                  onReject={handleRejectTicket}
                  onClose={handleCloseTicket}
                  onAdminUpdate={handleAdminUpdateTicket}
                  onAdminDelete={handleAdminDeleteTicket}
                  API_URL={API_URL}
                  onBack={() => {
                    setSelectedTicket(null);
                    setSelectedTicketId(null);
                    localStorage.removeItem('ticketmanagement_selected_ticket_id');

                    // Try browser history back if we have pushed states
                    const historyCount = Number(sessionStorage.getItem('ticketmanagement_history_count') || 0);
                    if (historyCount > 1) {
                      window.history.back();
                      return;
                    }

                    // Fallback: navigate to the exact source page the user came from
                    const savedSource = sourceView || sessionStorage.getItem('ticketmanagement_source_view');
                    if (savedSource && savedSource !== 'detail') {
                      setView(savedSource);
                    } else {
                      // Ultimate fallback based on role
                      const fallback = localStorage.getItem('ticketmanagement_fallback_view');
                      if (fallback && fallback !== 'detail') {
                        setView(fallback);
                      } else if (currentUser?.role === 'employee' || currentUser?.role === 'manager') {
                        setView('my-tickets');
                      } else {
                        setView('dashboard');
                      }
                    }
                    sessionStorage.removeItem('ticketmanagement_source_view');
                    setSourceView(null);
                  }}
                />
              )}

              {view === 'detail' && !selectedTicket && (
                <div style={{ background: 'var(--bg-card)', border: 'var(--border-card)', borderRadius: 'var(--radius-card)', padding: '60px', textAlign: 'center', color: 'var(--text-muted)' }}>
                  <h3 style={{ margin: '0 0 8px 0', fontSize: '18px', color: 'var(--text-main)' }}>Ticket No Longer Available</h3>
                  <p style={{ margin: 0, fontSize: '13px' }}>The selected ticket record was removed or is unavailable.</p>
                  <button onClick={() => setView(currentUser?.role === 'admin' ? 'dashboard' : 'my-tickets')} style={{ marginTop: '20px', padding: '8px 18px', borderRadius: '8px', background: 'var(--accent)', border: 'none', color: '#ffffff', fontSize: '13px', fontWeight: '600', cursor: 'pointer' }}>
                    Return to Tickets
                  </button>
                </div>
              )}
            </div>
          )}
        </main>
      </div>
    </div>
  );
}

export default App;
