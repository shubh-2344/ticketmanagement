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

function App() {
  const [view, setView] = useState('dashboard');
  const [currentUser, setCurrentUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('token') || '');
  const [tickets, setTickets] = useState([]);
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

  // Dynamic API URL resolution targeting backend port 5000
  const getApiUrl = () => {
    if (process.env.REACT_APP_API_URL && process.env.REACT_APP_API_URL !== '/api') {
      return process.env.REACT_APP_API_URL;
    }
    const protocol = window.location.protocol;
    const hostname = window.location.hostname || 'localhost';
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
    }
  }, [token]);

  useEffect(() => {
    if (currentUser && token) {
      fetchTickets();
      fetchGlobalSettings();
    }
  }, [currentUser, token]);

  const fetchCurrentUser = async () => {
    try {
      const response = await axios.get(`${API_URL}/auth/me`);
      setCurrentUser(response.data);
    } catch (error) {
      console.error('Error verifying user token:', error);
      handleLogout();
    }
  };

  const fetchGlobalSettings = async () => {
    try {
      const response = await axios.get(`${API_URL}/settings`);
      if (response.data && response.data.ticket_view_mode) {
        setTicketViewMode(response.data.ticket_view_mode);
      }
    } catch (error) {
      console.error('Error fetching global settings:', error);
    }
  };

  const fetchTickets = async () => {
    setLoading(true);
    try {
      const response = await axios.get(`${API_URL}/tickets`);
      setTickets(response.data);
    } catch (error) {
      console.error('Error fetching tickets:', error);
    } finally {
      setLoading(false);
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

  // Render Auth screen if not authenticated
  if (!token || !currentUser) {
    return <Auth API_URL={API_URL} onAuthSuccess={handleAuthSuccess} />;
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

  return (
    <div className="app ai-theme">
      {/* Top-Left Reusable Toast Notification */}
      <Toast toast={toast} onClose={() => setToast(null)} />

      {/* Enhanced Confirmation Dialog Modal */}
      {confirmConfig && (
        <div className="confirm-modal-overlay" onClick={confirmConfig.onCancel}>
          <div className="confirm-modal-box" onClick={(e) => e.stopPropagation()}>
            <div className={`confirm-icon-badge ${confirmConfig.confirmType}`}>
              {confirmConfig.confirmType === 'danger' ? '🗑️' : confirmConfig.confirmType === 'warning' ? '⚠️' : '❓'}
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
            <img src="/logo.png" alt="Portal Logo" className="header-logo-img" />
            <h1>
              Ticket Management
            </h1>
            <span className="ai-status-pulse">● System Live</span>
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
            <button className="btn-logout" onClick={handleLogout}>
              🚪 Logout
            </button>
          </div>
        </div>
      </header>

      {/* Main App Container */}
      <div className="container">
        <nav className="sidebar">
          <div className="nav-section-title">MAIN MENU</div>
          <button
            className={`nav-button ${view === 'dashboard' ? 'active' : ''}`}
            onClick={() => setView('dashboard')}
          >
            <span className="nav-icon">📊</span>
            <span>{currentUser.role === 'employee' ? 'My Tickets' : 'All Tickets'}</span>
          </button>

          <button
            className={`nav-button ${view === 'devices' ? 'active' : ''}`}
            onClick={() => setView('devices')}
          >
            <span className="nav-icon">💻</span>
            <span>Available Devices</span>
          </button>

          <button
            className={`nav-button ${view === 'create' ? 'active' : ''}`}
            onClick={() => {
              setSelectedDeviceForRequest(null);
              setView('create');
            }}
          >
            <span className="nav-icon">➕</span>
            <span>Create Ticket</span>
          </button>

          {(currentUser.role === 'manager' || currentUser.role === 'admin') && (
            <button
              className={`nav-button ${view === 'approvals' ? 'active' : ''}`}
              onClick={() => setView('approvals')}
            >
              <span className="nav-icon">✅</span>
              <span>Approvals Queue</span>
            </button>
          )}

          {/* ADMIN ONLY NAVIGATION GROUP */}
          {currentUser.role === 'admin' && (
            <div className="admin-nav-group">
              <div className="nav-section-title">ADMINISTRATOR</div>
              <button
                className={`nav-button admin-btn ${view === 'inventory' ? 'active' : ''}`}
                onClick={() => setView('inventory')}
              >
                <span className="nav-icon">📦</span>
                <span>Inventory Control</span>
                <span className="admin-tag">ADMIN</span>
              </button>

              <button
                className={`nav-button admin-btn ${view === 'users' ? 'active' : ''}`}
                onClick={() => setView('users')}
              >
                <span className="nav-icon">👥</span>
                <span>User & View Control</span>
                <span className="admin-tag">ADMIN</span>
              </button>

              <button
                className={`nav-button admin-btn ${view === 'admin-profile' ? 'active' : ''}`}
                onClick={() => setView('admin-profile')}
              >
                <span className="nav-icon">⚙️</span>
                <span>Admin Profile & Pwd</span>
                <span className="admin-tag">ADMIN</span>
              </button>
            </div>
          )}
        </nav>

        <main className="main-content">
          {loading && (
            <div className="loading-ai">
              <div className="spinner"></div>Loading Intelligent Portal...
            </div>
          )}

          {!loading && view === 'dashboard' && (
            <TicketList
              tickets={tickets}
              currentUser={currentUser}
              onViewTicket={handleViewTicket}
              viewMode={ticketViewMode}
            />
          )}

          {!loading && view === 'devices' && (
            <AvailableDevices
              API_URL={API_URL}
              onRequestDevice={handleRequestDeviceFromCatalog}
            />
          )}

          {!loading && view === 'create' && (
            <CreateTicket
              onSubmit={handleCreateTicket}
              API_URL={API_URL}
              initialDevice={selectedDeviceForRequest}
            />
          )}

          {!loading && view === 'approvals' && (currentUser.role === 'manager' || currentUser.role === 'admin') && (
            <ApprovalQueue
              tickets={tickets}
              currentUser={currentUser}
              onViewTicket={handleViewTicket}
              onRefresh={fetchTickets}
              API_URL={API_URL}
            />
          )}

          {/* ADMIN INVENTORY VIEW */}
          {!loading && view === 'inventory' && (
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

          {/* ADMIN USER & VIEW CONTROL */}
          {!loading && view === 'users' && (
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

          {/* ADMIN PROFILE & SETTINGS MENU */}
          {!loading && view === 'admin-profile' && (
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

          {!loading && view === 'detail' && selectedTicket && (
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
        </main>
      </div>
    </div>
  );
}

export default App;
