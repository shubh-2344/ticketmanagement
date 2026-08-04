import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './App.css';
import Auth from './Auth';
import TicketList from './TicketList';
import CreateTicket from './CreateTicket';
import TicketDetail from './TicketDetail';
import ApprovalQueue from './ApprovalQueue';
import AdminInventory from './AdminInventory';

function App() {
  const [view, setView] = useState('dashboard');
  const [currentUser, setCurrentUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('token') || '');
  const [tickets, setTickets] = useState([]);
  const [selectedTicket, setSelectedTicket] = useState(null);
  const [loading, setLoading] = useState(false);

  // Dynamic API URL resolution without hardcoded static IPs
  const API_URL = process.env.REACT_APP_API_URL || 
    (window.location.hostname === 'localhost' ? 'http://localhost:5000/api' : `${window.location.origin}/api`);

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

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setToken('');
    setCurrentUser(null);
    setTickets([]);
    setSelectedTicket(null);
  };

  const handleCreateTicket = async (ticketData) => {
    try {
      await axios.post(`${API_URL}/tickets`, ticketData);
      alert('Ticket created successfully!');
      fetchTickets();
      setView('dashboard');
    } catch (error) {
      console.error('Error creating ticket:', error);
      alert(error.response?.data?.error || 'Failed to create ticket');
    }
  };

  const handleApproveTicket = async (ticketId, comment) => {
    try {
      await axios.put(`${API_URL}/tickets/${ticketId}/approve`, {
        approval_comment: comment
      });
      alert('Ticket approved successfully!');
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
      await axios.put(`${API_URL}/tickets/${ticketId}/reject`, {
        approval_comment: comment
      });
      alert('Ticket rejected successfully!');
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
      case 'admin': return 'linear-gradient(135deg, #ef4444, #b91c1c)';
      case 'manager': return 'linear-gradient(135deg, #f59e0b, #d97706)';
      default: return 'linear-gradient(135deg, #3b82f6, #1d4ed8)';
    }
  };

  return (
    <div className="app ai-theme">
      {/* Header Bar */}
      <header className="header">
        <div className="header-content">
          <div className="header-brand">
            <span className="brand-ai-icon">✨</span>
            <h1>DevSecOps <span className="gradient-text">AI Hub</span></h1>
            <span className="ai-status-pulse">● System Live</span>
          </div>

          <div className="header-right">
            <div className="user-profile-badge">
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
            className={`nav-button ${view === 'create' ? 'active' : ''}`}
            onClick={() => setView('create')}
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

          {/* ADMIN ONLY ACCESS BUTTON */}
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
            </div>
          )}
        </nav>

        <main className="main-content">
          {loading && <div className="loading-ai"><div className="spinner"></div>Loading Intelligent Portal...</div>}

          {!loading && view === 'dashboard' && (
            <TicketList
              tickets={tickets}
              currentUser={currentUser}
              onViewTicket={handleViewTicket}
            />
          )}

          {!loading && view === 'create' && (
            <CreateTicket onSubmit={handleCreateTicket} API_URL={API_URL} />
          )}

          {!loading && view === 'approvals' && (currentUser.role === 'manager' || currentUser.role === 'admin') && (
            <ApprovalQueue
              tickets={tickets.filter(t => t.status === 'pending')}
              onViewTicket={handleViewTicket}
            />
          )}

          {/* ADMIN INVENTORY VIEW & ACCESS CONTROL */}
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

          {!loading && view === 'detail' && selectedTicket && (
            <TicketDetail
              ticket={selectedTicket}
              currentUser={currentUser}
              onApprove={handleApproveTicket}
              onReject={handleRejectTicket}
              onClose={handleCloseTicket}
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
