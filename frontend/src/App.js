import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './App.css';
import TicketList from './TicketList';
import CreateTicket from './CreateTicket';
import TicketDetail from './TicketDetail';
import ApprovalQueue from './ApprovalQueue';

function App() {
  const [view, setView] = useState('dashboard');
  const [currentUser, setCurrentUser] = useState(null);
  const [tickets, setTickets] = useState([]);
  const [selectedTicket, setSelectedTicket] = useState(null);
  const [loading, setLoading] = useState(false);

  const API_URL = process.env.REACT_APP_API_URL || 'http://103.81.38.251:5000/api';

  useEffect(() => {
    fetchCurrentUser();
  }, []);

  useEffect(() => {
    if (currentUser) {
      fetchTickets();
    }
  }, [currentUser]);

  const fetchCurrentUser = async () => {
    try {
      // Mock user selection - in production this would be from auth
      const userId = sessionStorage.getItem('userId') || 'user1';
      const response = await axios.get(`${API_URL}/me?userId=${userId}`);
      setCurrentUser(response.data);
      sessionStorage.setItem('userId', response.data.id);
    } catch (error) {
      console.error('Error fetching user:', error);
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

  const handleCreateTicket = async (ticketData) => {
    try {
      const response = await axios.post(`${API_URL}/tickets`, {
        ...ticketData,
        requester_id: currentUser.id,
        requester_name: currentUser.name,
        requester_email: currentUser.email
      });
      setTickets([response.data, ...tickets]);
      setView('dashboard');
      alert('Ticket created successfully!');
    } catch (error) {
      console.error('Error creating ticket:', error);
      alert('Failed to create ticket');
    }
  };

  const handleApproveTicket = async (ticketId, comment) => {
    try {
      await axios.put(`${API_URL}/tickets/${ticketId}/approve`, {
        approver_id: currentUser.id,
        approver_name: currentUser.name,
        approval_comment: comment
      });
      fetchTickets();
      setSelectedTicket(null);
      setView('dashboard');
      alert('Ticket approved successfully!');
    } catch (error) {
      console.error('Error approving ticket:', error);
      alert('Failed to approve ticket');
    }
  };

  const handleRejectTicket = async (ticketId, comment) => {
    try {
      await axios.put(`${API_URL}/tickets/${ticketId}/reject`, {
        approver_id: currentUser.id,
        approver_name: currentUser.name,
        approval_comment: comment
      });
      fetchTickets();
      setSelectedTicket(null);
      setView('dashboard');
      alert('Ticket rejected successfully!');
    } catch (error) {
      console.error('Error rejecting ticket:', error);
      alert('Failed to reject ticket');
    }
  };

  const handleCloseTicket = async (ticketId) => {
    try {
      await axios.put(`${API_URL}/tickets/${ticketId}/close`, {});
      fetchTickets();
      setSelectedTicket(null);
      setView('dashboard');
      alert('Ticket closed successfully!');
    } catch (error) {
      console.error('Error closing ticket:', error);
      alert('Failed to close ticket');
    }
  };

  const handleSwitchUser = async (userId) => {
    sessionStorage.setItem('userId', userId);
    await fetchCurrentUser();
    setView('dashboard');
  };

  const handleViewTicket = (ticket) => {
    setSelectedTicket(ticket);
    setView('detail');
  };

  if (!currentUser) {
    return <div className="loading">Loading...</div>;
  }

  return (
    <div className="app">
      <header className="header">
        <div className="header-content">
          <h1>🎫 Ticket Management System</h1>
          <div className="header-right">
            <span className="user-info">
              User: <strong>{currentUser.name}</strong> ({currentUser.role})
            </span>
            <div className="user-switcher">
              <select onChange={(e) => handleSwitchUser(e.target.value)} value={currentUser.id}>
                <option value="user1">John Doe (Employee)</option>
                <option value="user2">Jane Smith (Manager)</option>
                <option value="user3">Bob Wilson (Employee)</option>
                <option value="mgr1">Manager One (Manager)</option>
              </select>
            </div>
          </div>
        </div>
      </header>

      <div className="container">
        <nav className="sidebar">
          <button
            className={`nav-button ${view === 'dashboard' ? 'active' : ''}`}
            onClick={() => setView('dashboard')}
          >
            📊 Dashboard
          </button>
          <button
            className={`nav-button ${view === 'create' ? 'active' : ''}`}
            onClick={() => setView('create')}
          >
            ➕ Create Ticket
          </button>
          {currentUser.role === 'manager' && (
            <button
              className={`nav-button ${view === 'approvals' ? 'active' : ''}`}
              onClick={() => setView('approvals')}
            >
              ✅ Approvals
            </button>
          )}
        </nav>

        <main className="main-content">
          {loading && <div className="loading">Loading...</div>}

          {!loading && view === 'dashboard' && (
            <TicketList
              tickets={tickets}
              currentUser={currentUser}
              onViewTicket={handleViewTicket}
            />
          )}

          {!loading && view === 'create' && (
            <CreateTicket onSubmit={handleCreateTicket} />
          )}

          {!loading && view === 'approvals' && currentUser.role === 'manager' && (
            <ApprovalQueue
              tickets={tickets.filter(t => t.status === 'pending')}
              onViewTicket={handleViewTicket}
            />
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
