import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './AdminProfile.css';

function AdminProfile({ API_URL, currentUser, onProfileUpdated }) {
  const [activeTab, setActiveTab] = useState('password');

  // Change Password State
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [passwordMsg, setPasswordMsg] = useState({ text: '', isError: false });

  // Create User State
  const [createUserData, setCreateUserData] = useState({
    name: '',
    email: '',
    password: '',
    role: 'employee'
  });
  const [createUserMsg, setCreateUserMsg] = useState({ text: '', isError: false });

  // User Management State
  const [usersList, setUsersList] = useState([]);
  const [resetPwdUserId, setResetPwdUserId] = useState(null);
  const [resetPwdValue, setResetPwdValue] = useState('');

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      const response = await axios.get(`${API_URL}/users`);
      setUsersList(response.data);
    } catch (err) {
      console.error('Error fetching users:', err);
    }
  };

  const handlePasswordSubmit = async (e) => {
    e.preventDefault();
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      setPasswordMsg({ text: 'New passwords do not match', isError: true });
      return;
    }

    try {
      await axios.put(`${API_URL}/auth/change-password`, {
        currentPassword: passwordData.currentPassword,
        newPassword: passwordData.newPassword
      });
      setPasswordMsg({ text: 'Password updated successfully!', isError: false });
      setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
    } catch (err) {
      setPasswordMsg({ text: err.response?.data?.error || 'Failed to update password', isError: true });
    }
  };

  const handleCreateUserSubmit = async (e) => {
    e.preventDefault();
    try {
      const res = await axios.post(`${API_URL}/admin/users`, createUserData);
      setCreateUserMsg({ text: res.data.message, isError: false });
      setCreateUserData({ name: '', email: '', password: '', role: 'employee' });
      fetchUsers();
    } catch (err) {
      setCreateUserMsg({ text: err.response?.data?.error || 'Failed to create user', isError: true });
    }
  };

  const handleRoleChange = async (userId, newRole) => {
    try {
      await axios.put(`${API_URL}/users/${userId}/role`, { role: newRole });
      alert(`User role updated to ${newRole.toUpperCase()}`);
      fetchUsers();
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to update role');
    }
  };

  const handleAdminResetPassword = async (userId) => {
    if (!resetPwdValue || resetPwdValue.length < 6) {
      alert('Password must be at least 6 characters');
      return;
    }
    try {
      const res = await axios.put(`${API_URL}/admin/users/${userId}/reset-password`, {
        newPassword: resetPwdValue
      });
      alert(res.data.message);
      setResetPwdUserId(null);
      setResetPwdValue('');
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to reset password');
    }
  };

  const handleDeleteUser = async (userId, userName) => {
    if (window.confirm(`Are you sure you want to delete user "${userName}"?`)) {
      try {
        const res = await axios.delete(`${API_URL}/admin/users/${userId}`);
        alert(res.data.message);
        fetchUsers();
      } catch (err) {
        alert(err.response?.data?.error || 'Failed to delete user');
      }
    }
  };

  const handleExportData = async () => {
    try {
      const res = await axios.get(`${API_URL}/admin/export-data`);
      const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(res.data, null, 2));
      const downloadAnchor = document.createElement('a');
      downloadAnchor.setAttribute("href", dataStr);
      downloadAnchor.setAttribute("download", `ticket_system_backup_${new Date().toISOString().slice(0, 10)}.json`);
      document.body.appendChild(downloadAnchor);
      downloadAnchor.click();
      downloadAnchor.remove();
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to export data');
    }
  };

  return (
    <div className="admin-profile-container">
      <div className="profile-header">
        <div className="admin-avatar-lg">
          {currentUser.name.charAt(0)}
        </div>
        <div>
          <h2>⚙️ Admin Profile & System Settings</h2>
          <p>{currentUser.name} ({currentUser.email}) • <span className="role-tag-admin">SYSTEM ADMINISTRATOR</span></p>
        </div>
      </div>

      <div className="admin-profile-tabs">
        <button
          className={`prof-tab ${activeTab === 'password' ? 'active' : ''}`}
          onClick={() => setActiveTab('password')}
        >
          🔑 Change Password
        </button>
        <button
          className={`prof-tab ${activeTab === 'create-user' ? 'active' : ''}`}
          onClick={() => setActiveTab('create-user')}
        >
          ➕ Create User / Admin
        </button>
        <button
          className={`prof-tab ${activeTab === 'manage-users' ? 'active' : ''}`}
          onClick={() => setActiveTab('manage-users')}
        >
          👥 User Management & Passwords
        </button>
        <button
          className={`prof-tab ${activeTab === 'backup' ? 'active' : ''}`}
          onClick={() => setActiveTab('backup')}
        >
          📊 Backup & Data Export
        </button>
      </div>

      {/* TAB 1: CHANGE PASSWORD */}
      {activeTab === 'password' && (
        <div className="prof-card">
          <h3>🔑 Change Your Admin Password</h3>
          <p className="card-subtext">Update your login security credentials.</p>

          {passwordMsg.text && (
            <div className={`status-msg-banner ${passwordMsg.isError ? 'error' : 'success'}`}>
              {passwordMsg.isError ? '⚠️ ' : '✅ '}{passwordMsg.text}
            </div>
          )}

          <form onSubmit={handlePasswordSubmit} className="prof-form">
            <div className="form-group">
              <label>Current Password</label>
              <input
                type="password"
                value={passwordData.currentPassword}
                onChange={(e) => setPasswordData({ ...passwordData, currentPassword: e.target.value })}
                required
              />
            </div>

            <div className="form-group">
              <label>New Password (min 6 characters)</label>
              <input
                type="password"
                value={passwordData.newPassword}
                onChange={(e) => setPasswordData({ ...passwordData, newPassword: e.target.value })}
                required
              />
            </div>

            <div className="form-group">
              <label>Confirm New Password</label>
              <input
                type="password"
                value={passwordData.confirmPassword}
                onChange={(e) => setPasswordData({ ...passwordData, confirmPassword: e.target.value })}
                required
              />
            </div>

            <button type="submit" className="btn-submit-admin">
              🔒 Update Password
            </button>
          </form>
        </div>
      )}

      {/* TAB 2: CREATE USER / ADMIN */}
      {activeTab === 'create-user' && (
        <div className="prof-card">
          <h3>➕ Create New User / Manager / Admin Account</h3>
          <p className="card-subtext">Register a new system user with any assigned privilege level.</p>

          {createUserMsg.text && (
            <div className={`status-msg-banner ${createUserMsg.isError ? 'error' : 'success'}`}>
              {createUserMsg.isError ? '⚠️ ' : '✅ '}{createUserMsg.text}
            </div>
          )}

          <form onSubmit={handleCreateUserSubmit} className="prof-form">
            <div className="form-group">
              <label>Full Name *</label>
              <input
                type="text"
                value={createUserData.name}
                onChange={(e) => setCreateUserData({ ...createUserData, name: e.target.value })}
                placeholder="Jane Doe"
                required
              />
            </div>

            <div className="form-group">
              <label>Email Address *</label>
              <input
                type="email"
                value={createUserData.email}
                onChange={(e) => setCreateUserData({ ...createUserData, email: e.target.value })}
                placeholder="user@company.com"
                required
              />
            </div>

            <div className="form-group">
              <label>Initial Password *</label>
              <input
                type="password"
                value={createUserData.password}
                onChange={(e) => setCreateUserData({ ...createUserData, password: e.target.value })}
                placeholder="••••••••"
                required
              />
            </div>

            <div className="form-group">
              <label>Assigned System Role *</label>
              <select
                value={createUserData.role}
                onChange={(e) => setCreateUserData({ ...createUserData, role: e.target.value })}
              >
                <option value="employee">👤 User / Employee</option>
                <option value="manager">👔 Manager</option>
                <option value="admin">🛡️ System Administrator</option>
              </select>
            </div>

            <button type="submit" className="btn-submit-admin">
              🚀 Create Account
            </button>
          </form>
        </div>
      )}

      {/* TAB 3: USER MANAGEMENT & RESET PASSWORDS */}
      {activeTab === 'manage-users' && (
        <div className="prof-card">
          <h3>👥 Manage All Registered Users & Reset Passwords</h3>
          <p className="card-subtext">Full administrative control over user accounts and passwords.</p>

          <div className="table-responsive">
            <table className="user-manage-table">
              <thead>
                <tr>
                  <th>User</th>
                  <th>Role</th>
                  <th>Change Role</th>
                  <th>Reset Password / Delete</th>
                </tr>
              </thead>
              <tbody>
                {usersList.map((u) => (
                  <tr key={u.id}>
                    <td>
                      <div className="user-info-cell">
                        <strong>{u.name}</strong>
                        <small>{u.email}</small>
                      </div>
                    </td>
                    <td>
                      <span className={`role-badge ${u.role}`}>
                        {u.role.toUpperCase()}
                      </span>
                    </td>
                    <td>
                      <select
                        value={u.role}
                        onChange={(e) => handleRoleChange(u.id, e.target.value)}
                        className="table-role-select"
                      >
                        <option value="employee">User (Employee)</option>
                        <option value="manager">Manager</option>
                        <option value="admin">Administrator</option>
                      </select>
                    </td>
                    <td>
                      <div className="action-row-flex">
                        {resetPwdUserId === u.id ? (
                          <div className="reset-inline-form">
                            <input
                              type="password"
                              placeholder="New password"
                              value={resetPwdValue}
                              onChange={(e) => setResetPwdValue(e.target.value)}
                            />
                            <button className="btn-save-pwd" onClick={() => handleAdminResetPassword(u.id)}>
                              Save
                            </button>
                            <button className="btn-cancel-pwd" onClick={() => setResetPwdUserId(null)}>
                              ✖
                            </button>
                          </div>
                        ) : (
                          <button
                            className="btn-action-reset"
                            onClick={() => { setResetPwdUserId(u.id); setResetPwdValue(''); }}
                          >
                            🔑 Reset Pwd
                          </button>
                        )}

                        {u.id !== currentUser.id && (
                          <button
                            className="btn-action-del"
                            onClick={() => handleDeleteUser(u.id, u.name)}
                          >
                            🗑️ Delete
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 4: BACKUP & DATA EXPORT */}
      {activeTab === 'backup' && (
        <div className="prof-card">
          <h3>📊 System Backup & Data Export</h3>
          <p className="card-subtext">Download complete system JSON backups including tickets, inventory, and users.</p>

          <div className="backup-box">
            <div className="backup-info">
              <span className="backup-icon">💾</span>
              <div>
                <h4>System Database Export (.JSON)</h4>
                <p>Generates a complete snapshot of all active tickets, multi-stage approval logs, company inventory stock, and user records.</p>
              </div>
            </div>

            <button className="btn-submit-admin" onClick={handleExportData}>
              📥 Download Complete System Backup
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default AdminProfile;
