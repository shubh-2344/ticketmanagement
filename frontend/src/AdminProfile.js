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
  const [userSearchTerm, setUserSearchTerm] = useState('');
  const [editingUser, setEditingUser] = useState(null);

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

  const generateRandomPassword = (userId) => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789!@#$';
    let randPwd = '';
    for (let i = 0; i < 8; i++) {
      randPwd += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setResetPwdUserId(userId);
    setResetPwdValue(randPwd);
  };

  const handleAdminUpdateUser = async (e) => {
    e.preventDefault();
    if (!editingUser) return;
    try {
      const res = await axios.put(`${API_URL}/admin/users/${editingUser.id}`, {
        name: editingUser.name,
        email: editingUser.email,
        role: editingUser.role
      });
      alert(res.data.message);
      setEditingUser(null);
      fetchUsers();
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to update user');
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
    const confirmed = await window.showConfirm({
      title: 'Delete User Account',
      message: `Are you sure you want to delete user "${userName}"? They will lose access to the portal.`,
      confirmText: 'Yes, Delete User',
      cancelText: 'Cancel',
      confirmType: 'danger'
    });
    if (!confirmed) return;
    try {
      const res = await axios.delete(`${API_URL}/admin/users/${userId}`);
      alert(res.data.message);
      fetchUsers();
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to delete user');
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
          <p className="card-subtext">Full administrative control over user accounts, roles, and security credentials.</p>

          {/* Search Toolbar & User Stats */}
          <div className="user-table-toolbar">
            <input
              type="text"
              placeholder="🔍 Search users by name, email, or role..."
              value={userSearchTerm}
              onChange={(e) => setUserSearchTerm(e.target.value)}
              className="user-search-input"
            />
            <div className="user-stats-bar">
              <span className="user-stat-pill">👥 Total: {usersList.length}</span>
              <span className="user-stat-pill">🛡️ Admins: {usersList.filter(u => u.role === 'admin').length}</span>
              <span className="user-stat-pill">👔 Managers: {usersList.filter(u => u.role === 'manager').length}</span>
              <span className="user-stat-pill">👤 Users: {usersList.filter(u => u.role === 'employee').length}</span>
            </div>
          </div>

          <div className="table-responsive">
            <table className="user-manage-table">
              <thead>
                <tr>
                  <th>User Details</th>
                  <th>Role</th>
                  <th>Role Quick-Change</th>
                  <th>Actions & Password Management</th>
                </tr>
              </thead>
              <tbody>
                {usersList
                  .filter((u) =>
                    u.name.toLowerCase().includes(userSearchTerm.toLowerCase()) ||
                    u.email.toLowerCase().includes(userSearchTerm.toLowerCase()) ||
                    u.role.toLowerCase().includes(userSearchTerm.toLowerCase())
                  )
                  .map((u) => (
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
                          {/* Edit User Button */}
                          <button
                            className="btn-action-edit"
                            onClick={() => setEditingUser({ ...u })}
                            title="Edit User Details (Name, Email, Role)"
                          >
                            ✏️ Edit
                          </button>

                          {/* Reset Password Inline Form */}
                          {resetPwdUserId === u.id ? (
                            <div className="reset-inline-form">
                              <input
                                type="text"
                                placeholder="New password"
                                value={resetPwdValue}
                                onChange={(e) => setResetPwdValue(e.target.value)}
                              />
                              <button
                                className="btn-rand-pwd"
                                onClick={() => generateRandomPassword(u.id)}
                                title="Generate Secure Password"
                              >
                                🎲
                              </button>
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

                          {/* Delete User Button */}
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

      {/* EDIT USER MODAL */}
      {editingUser && (
        <div className="user-edit-overlay" onClick={() => setEditingUser(null)}>
          <div className="user-edit-modal" onClick={(e) => e.stopPropagation()}>
            <h3>✏️ Edit User Details</h3>
            <form onSubmit={handleAdminUpdateUser} className="prof-form">
              <div className="form-group">
                <label>Full Name *</label>
                <input
                  type="text"
                  value={editingUser.name}
                  onChange={(e) => setEditingUser({ ...editingUser, name: e.target.value })}
                  required
                />
              </div>

              <div className="form-group">
                <label>Email Address *</label>
                <input
                  type="email"
                  value={editingUser.email}
                  onChange={(e) => setEditingUser({ ...editingUser, email: e.target.value })}
                  required
                />
              </div>

              <div className="form-group">
                <label>Role Privilege *</label>
                <select
                  value={editingUser.role}
                  onChange={(e) => setEditingUser({ ...editingUser, role: e.target.value })}
                >
                  <option value="employee">👤 User / Employee</option>
                  <option value="manager">👔 Manager</option>
                  <option value="admin">🛡️ System Administrator</option>
                </select>
              </div>

              <div className="confirm-modal-actions" style={{ marginTop: '10px' }}>
                <button type="button" className="btn-confirm-cancel" onClick={() => setEditingUser(null)}>
                  Cancel
                </button>
                <button type="submit" className="btn-confirm-submit primary">
                  💾 Save Changes
                </button>
              </div>
            </form>
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
