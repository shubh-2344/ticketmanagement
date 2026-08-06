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
  LogoIcon
} from './components/Icons';

function App() {
  const [view, setView] = useState('dashboard');
  const [currentUser, setCurrentUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('token') || '');
  const [authLoading, setAuthLoading] = useState(!!localStorage.getItem('token'));
  const [tickets, setTickets] = useState([]);
  const [globalSettings, setGlobalSettings] = useState(null);
  const [selectedTicket, setSelectedTicket] = useState(null);
  const [selectedDeviceForRequest, setSelectedDeviceForRequest] = useState(null);
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
    setToken('');
    setCurrentUser(null);
    setAuthLoading(false);
    setTickets([]);
    setSelectedTicket(null);
    setSelectedDeviceForRequest(null);
  };

  const handleCreateTicket = async (ticketData) => {
    try {
      await axios.post(`${API_URL}/tickets`, ticketData);
      alert('Ticket created successfully and sent to manager for approval!');
      setSelectedDeviceForRequest(null);
      fetchTickets();
      setView('dashboard');
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
      fetchTickets();
      setSelectedTicket(null);
      setView('dashboard');
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
      fetchTickets();
      setSelectedTicket(null);
      setView('dashboard');
    } catch (error) {
      console.error('Error rejecting ticket:', error);
      alert(error.response?.data?.error || 'Failed to reject ticket');
    }
  };

  const handleCloseTicket = async (ticketId) => {
    try {
      await axios.put(`${API_URL}/tickets/${ticketId}/close`, {});
      alert('Ticket closed successfully!');
      fetchTickets();
      setSelectedTicket(null);
      setView('dashboard');
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
      alert('Ticket deleted successfully by Admin.');
      setSelectedTicket(null);
      fetchTickets();
      setView('dashboard');
    } catch (error) {
      console.error('Admin delete ticket error:', error);
      alert(error.response?.data?.error || 'Failed to delete ticket');
    }
  };

  const handleViewTicket = (ticket) => {
    setSelectedTicket(ticket);
    setView('detail');
  };

  const handleViewTicketById = (ticketId) => {
    const foundTicket = tickets.find(t => t.id === ticketId);
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
    <div className={`app ai-theme ${activeTheme}`}>
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

          {/* My Tickets Link (EMPLOYEE ONLY) */}
          {currentUser.role === 'employee' && (
            <button
              className={`nav-button ${view === 'dashboard' ? 'active' : ''}`}
              onClick={() => setView('dashboard')}
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
            <>
              <button
                className={`nav-button ${view === 'approvals' ? 'active' : ''}`}
                onClick={() => setView('approvals')}
              >
                <span className="nav-icon"><ApprovalsIcon size={18} /></span>
                <span>Approvals Queue</span>
              </button>

              <button
                className={`nav-button ${view === 'open-incidents' ? 'active' : ''}`}
                onClick={() => setView('open-incidents')}
              >
                <span className="nav-icon"><InventoryIcon size={18} /></span>
                <span>Open Incidents</span>
              </button>
            </>
          )}

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

              {view === 'open-incidents' && (currentUser.role === 'manager' || currentUser.role === 'admin') && (
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

              {view === 'inventory' && (
                currentUser.role === 'admin' ? (
                  <AdminInventory API_URL={API_URL} />
                ) : (
                  <div className="access-denied-card">
                    <div className="denied-icon">🔒</div>
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
                    <div className="denied-icon">🔒</div>
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
                  />
                ) : (
                  <div className="access-denied-card">
                    <div className="denied-icon">🔒</div>
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
                    <div className="denied-icon">🔒</div>
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
                    <div className="denied-icon">🔒</div>
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
                    <div className="denied-icon">🔒</div>
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
                    setView('dashboard');
                  }}
                />
              )}
            </div>
          )}
        </main>
      </div>
    </div>
  );
}

export default App;
