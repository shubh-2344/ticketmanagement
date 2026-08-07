import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { DashboardIcon, FileTextIcon, InventoryIcon, SettingsIcon, UsersIcon, UserIcon, BriefcaseIcon, ShieldIcon } from './components/Icons';
import './AdminUserControl.css';

function AdminUserControl({ API_URL, currentViewMode, onUpdateViewMode }) {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedViewMode, setSelectedViewMode] = useState(currentViewMode || 'grid');
  const [updatingUserId, setUpdatingUserId] = useState(null);

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      const response = await axios.get(`${API_URL}/users`);
      setUsers(response.data);
    } catch (err) {
      console.error('Error fetching users:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleRoleChange = async (userId, newRole) => {
    setUpdatingUserId(userId);
    try {
      await axios.put(`${API_URL}/users/${userId}/role`, { role: newRole });
      alert(`User role successfully changed to ${newRole.toUpperCase()}!`);
      fetchUsers();
    } catch (err) {
      console.error('Error updating user role:', err);
      alert(err.response?.data?.error || 'Failed to update user role');
    } finally {
      setUpdatingUserId(null);
    }
  };

  const handleSaveGlobalView = async () => {
    try {
      await axios.put(`${API_URL}/settings`, { ticket_view_mode: selectedViewMode });
      alert(`Global Ticket View layout updated to "${selectedViewMode.toUpperCase()}" for all users!`);
      if (onUpdateViewMode) {
        onUpdateViewMode(selectedViewMode);
      }
    } catch (err) {
      console.error('Error updating global ticket view:', err);
      alert(err.response?.data?.error || 'Failed to update ticket view');
    }
  };

  return (
    <div className="admin-user-control">
      <div className="admin-section-header">
        <div>
          <h2>Admin User Control & System View Settings</h2>
          <p>Manage registered user roles (User/Employee or Manager) and set global ticket view layouts for all users.</p>
        </div>
      </div>

      {/* Global Ticket View Settings Panel */}
      <div className="admin-card global-view-card">
        <h3>Global Ticket View Configuration (Set for All Users)</h3>
        <p className="card-subtext">Choose how tickets are rendered on dashboards for all users across the system.</p>
        
        <div className="view-mode-options">
          <label className={`view-option-box ${selectedViewMode === 'grid' ? 'active' : ''}`}>
            <input
              type="radio"
              name="viewMode"
              value="grid"
              checked={selectedViewMode === 'grid'}
              onChange={() => setSelectedViewMode('grid')}
            />
            <div className="option-content">
              <span className="option-icon"><DashboardIcon size={16} /></span>
              <strong>Grid View Layout</strong>
              <small>Interactive modern cards layout</small>
            </div>
          </label>

          <label className={`view-option-box ${selectedViewMode === 'table' ? 'active' : ''}`}>
            <input
              type="radio"
              name="viewMode"
              value="table"
              checked={selectedViewMode === 'table'}
              onChange={() => setSelectedViewMode('table')}
            />
            <div className="option-content">
              <span className="option-icon"><FileTextIcon size={16} /></span>
              <strong>Table View Layout</strong>
              <small>Dense data table grid layout</small>
            </div>
          </label>

          <label className={`view-option-box ${selectedViewMode === 'compact' ? 'active' : ''}`}>
            <input
              type="radio"
              name="viewMode"
              value="compact"
              checked={selectedViewMode === 'compact'}
              onChange={() => setSelectedViewMode('compact')}
            />
            <div className="option-content">
              <span className="option-icon"><InventoryIcon size={16} /></span>
              <strong>Compact List Layout</strong>
              <small>Clean streamlined rows</small>
            </div>
          </label>
        </div>

        <button className="btn-save-global-view" onClick={handleSaveGlobalView}>
          <SettingsIcon size={16} /> Apply Ticket View Layout System-Wide
        </button>
      </div>

      {/* User Role Management Panel */}
      <div className="admin-card user-table-card">
        <h3>Registered User Roles (Promote to Manager or User)</h3>
        
        {loading ? (
          <p>Loading users...</p>
        ) : (
          <div className="table-responsive">
            <table className="user-table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Email</th>
                  <th>Current Role</th>
                  <th>Action (Set Role for User)</th>
                </tr>
              </thead>
              <tbody>
                {users.map(u => (
                  <tr key={u.id}>
                    <td>
                      <div className="user-name-cell">
                        <span className="user-avatar-sm">{u.name.charAt(0)}</span>
                        <strong>{u.name}</strong>
                      </div>
                    </td>
                    <td>{u.email}</td>
                    <td>
                      <span className={`role-badge ${u.role}`}>
                        {u.role.toUpperCase()}
                      </span>
                    </td>
                    <td>
                      <div className="role-action-group">
                        <button
                          className={`btn-role-opt ${u.role === 'employee' ? 'active' : ''}`}
                          onClick={() => handleRoleChange(u.id, 'employee')}
                          disabled={updatingUserId === u.id}
                        >
                          <UserIcon size={14} /> User (Employee)
                        </button>

                        <button
                          className={`btn-role-opt mgr ${u.role === 'manager' ? 'active' : ''}`}
                          onClick={() => handleRoleChange(u.id, 'manager')}
                          disabled={updatingUserId === u.id}
                        >
                          <BriefcaseIcon size={14} /> Manager
                        </button>

                        <button
                          className={`btn-role-opt admin ${u.role === 'admin' ? 'active' : ''}`}
                          onClick={() => handleRoleChange(u.id, 'admin')}
                          disabled={updatingUserId === u.id}
                          style={{ background: u.role === 'admin' ? 'linear-gradient(135deg, #0284c7, #7c3aed)' : 'transparent', color: u.role === 'admin' ? '#ffffff' : 'inherit' }}
                        >
                          <ShieldIcon size={14} /> System Admin Specialist
                        </button>
                      </div>
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

export default AdminUserControl;
