import React, { useState, useEffect } from 'react';
import axios from 'axios';
import formatTicketId from './utils/formatTicketId';
import { KeyIcon, PlusIcon, UsersIcon, SettingsIcon, DownloadIcon, EditIcon, TrashIcon, RefreshIcon, XIcon, FileTextIcon, BarChartIcon, DevicesIcon } from './components/Icons';
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

  const [brandingData, setBrandingData] = useState({
    global_theme: '',
    branding_primary_color: '',
    branding_secondary_color: '',
    branding_logo_url: '',
    branding_favicon_url: '',
    branding_login_background_url: ''
  });

  useEffect(() => {
    fetchUsers();
    fetchBrandingSettings();
  }, []);

  const fetchBrandingSettings = async () => {
    try {
      const response = await axios.get(`${API_URL}/settings`);
      setBrandingData({
        global_theme: response.data.global_theme || '',
        branding_primary_color: response.data.branding_primary_color || '',
        branding_secondary_color: response.data.branding_secondary_color || '',
        branding_logo_url: response.data.branding_logo_url || '',
        branding_favicon_url: response.data.branding_favicon_url || '',
        branding_login_background_url: response.data.branding_login_background_url || ''
      });
    } catch (err) {
      console.error('Error fetching settings in profile:', err);
    }
  };

  const handleBrandingSave = async (e) => {
    e.preventDefault();
    try {
      await axios.put(`${API_URL}/settings`, brandingData);
      alert('Global Branding & Theme settings updated successfully!');
      window.location.reload();
    } catch (err) {
      console.error('Error saving branding settings:', err);
      alert(err.response?.data?.error || 'Failed to save settings');
    }
  };

  const handleResetBranding = async () => {
    const confirmed = window.confirm('Are you sure you want to reset all custom colors and logos back to system defaults?');
    if (!confirmed) return;
    try {
      await axios.put(`${API_URL}/settings`, {
        global_theme: '',
        branding_primary_color: '',
        branding_secondary_color: '',
        branding_logo_url: '',
        branding_favicon_url: '',
        branding_login_background_url: ''
      });
      alert('Global Branding & Theme settings reset successfully!');
      window.location.reload();
    } catch (err) {
      console.error('Error resetting branding settings:', err);
      alert(err.response?.data?.error || 'Failed to reset settings');
    }
  };

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

  const [restoreFile, setRestoreFile] = useState(null);

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

  const handleExportFormattedData = async (dataType, format) => {
    const formatName = format.toUpperCase();
    const confirmed = await window.showConfirm({
      title: `Export ${dataType} as ${formatName}`,
      message: `Are you sure you want to download the ${dataType} report in ${formatName} format?`,
      confirmText: `Download ${formatName}`,
      cancelText: 'Cancel',
      confirmType: 'success'
    });
    if (!confirmed) return;

    try {
      const res = await axios.get(`${API_URL}/admin/export-data`);
      const payload = res.data;
      let fileContent = '';
      let fileType = 'text/plain';
      let extension = format.toLowerCase();

      if (format === 'csv' || format === 'excel' || format === 'xlsx') {
        extension = format === 'csv' ? 'csv' : 'xlsx';
        fileType = format === 'csv' ? 'text/csv' : 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';

        if (dataType === 'Tickets & Incidents') {
          fileContent = "ID,Title,Type,Status,Priority,Category,Requester,Created_At\n" +
            (payload.tickets || []).map(t => 
              `"${formatTicketId(t.id, t.type)}","${(t.title || '').replace(/"/g, '""')}","${t.type || 'issue'}","${t.status}","${t.priority}","${t.category}","${t.requester_name}","${t.created_at}"`
            ).join("\n");
        } else if (dataType === 'Hardware Inventory') {
          fileContent = "ID,Name,Category,Quantity,Available,Status,Description\n" +
            (payload.inventory || []).map(i => 
              `"${i.id}","${(i.name || '').replace(/"/g, '""')}","${i.category}","${i.quantity}","${i.quantity > 0 ? 'Yes' : 'No'}","${i.status || 'Active'}","${(i.description || '').replace(/"/g, '""')}"`
            ).join("\n");
        } else {
          fileContent = "ID,Name,Email,Role,Created_At\n" +
            (payload.users || []).map(u => 
              `"${u.id}","${(u.name || '').replace(/"/g, '""')}","${u.email}","${u.role}","${u.created_at}"`
            ).join("\n");
        }
      } else {
        extension = 'pdf';
        fileType = 'application/pdf';
        fileContent = `%PDF-1.4\n1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n% ${dataType} PDF Report Export\nGenerated on: ${new Date().toLocaleString()}\n`;
      }

      const blob = new Blob([fileContent], { type: fileType });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${dataType.toLowerCase().replace(/[^a-z0-9]/g, '_')}_report_${new Date().toISOString().slice(0, 10)}.${extension}`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Export error:', err);
      alert('Failed to generate export file.');
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
          <KeyIcon size={16} /> Change Password
        </button>
        <button
          className={`prof-tab ${activeTab === 'create-user' ? 'active' : ''}`}
          onClick={() => setActiveTab('create-user')}
        >
          <PlusIcon size={16} /> Create User / Admin
        </button>
        <button
          className={`prof-tab ${activeTab === 'manage-users' ? 'active' : ''}`}
          onClick={() => setActiveTab('manage-users')}
        >
          <UsersIcon size={16} /> User Management & Passwords
        </button>
        <button
          className={`prof-tab ${activeTab === 'branding' ? 'active' : ''}`}
          onClick={() => setActiveTab('branding')}
        >
          <SettingsIcon size={16} /> Branding & Themes
        </button>
        <button
          className={`prof-tab ${activeTab === 'backup' ? 'active' : ''}`}
          onClick={() => setActiveTab('backup')}
        >
          <DownloadIcon size={16} /> Backup & Data Export
        </button>
      </div>

      {/* TAB 1: CHANGE PASSWORD */}
      {activeTab === 'password' && (
        <div className="prof-card">
          <h3>Change Your Admin Password</h3>
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
                            <EditIcon size={14} /> Edit
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
                                <RefreshIcon size={14} />
                              </button>
                              <button className="btn-save-pwd" onClick={() => handleAdminResetPassword(u.id)}>
                                Save
                              </button>
                              <button className="btn-cancel-pwd" onClick={() => setResetPwdUserId(null)}>
                                <XIcon size={14} />
                              </button>
                            </div>
                          ) : (
                            <button
                              className="btn-action-reset"
                              onClick={() => { setResetPwdUserId(u.id); setResetPwdValue(''); }}
                            >
                              <KeyIcon size={14} /> Reset Pwd
                            </button>
                          )}

                          {/* Delete User Button */}
                          {u.id !== currentUser.id && (
                            <button
                              className="btn-action-del"
                              onClick={() => handleDeleteUser(u.id, u.name)}
                            >
                              <TrashIcon size={14} /> Delete
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

      {/* TAB: BRANDING & THEME CONFIGURATION */}
      {activeTab === 'branding' && (
        <div className="prof-card">
          <h3>🎨 Global System Branding & Themes</h3>
          <p className="card-subtext">Configure corporate colors, logos, and the global theme preset applied for all users.</p>

          <form onSubmit={handleBrandingSave} className="prof-form" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            
            <div className="form-group">
              <label>Global Application Theme Preset</label>
              <select
                value={brandingData.global_theme}
                onChange={(e) => setBrandingData({ ...brandingData, global_theme: e.target.value })}
                style={{ padding: '10px', background: 'rgba(15, 23, 42, 0.6)', border: '1px solid rgba(255,255,255,0.1)', color: '#ffffff', width: '100%', borderRadius: '8px' }}
              >
                <option value="">Enterprise Dark (Default)</option>
                <option value="theme-enterprise-light">Enterprise Light (White Theme)</option>
                <option value="theme-azure-blue">Azure Blue</option>
                <option value="theme-midnight-navy">Midnight Navy</option>
                <option value="theme-carbon-black">Carbon Black</option>
                <option value="theme-glassmorphism">Glassmorphism</option>
                <option value="theme-cyber-blue">Cyber Blue</option>
                <option value="theme-material-enterprise">Material Enterprise</option>
                <option value="theme-high-contrast">High-Contrast Accessibility Theme</option>
              </select>
              <span className="field-hint" style={{ fontSize: '11px', color: 'var(--text-muted)' }}>The selected theme is applied globally for all logged-in portal users.</span>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
              <div className="form-group">
                <label>Custom Brand Primary Accent Color</label>
                <div style={{ display: 'flex', gap: '10px' }}>
                  <input
                    type="color"
                    value={brandingData.branding_primary_color || '#4f46e5'}
                    onChange={(e) => setBrandingData({ ...brandingData, branding_primary_color: e.target.value })}
                    style={{ width: '40px', height: '40px', padding: 0, border: 'none', background: 'none', cursor: 'pointer' }}
                  />
                  <input
                    type="text"
                    value={brandingData.branding_primary_color}
                    onChange={(e) => setBrandingData({ ...brandingData, branding_primary_color: e.target.value })}
                    placeholder="#4f46e5"
                    style={{ flex: '1', padding: '10px', background: 'rgba(15, 23, 42, 0.6)', border: '1px solid rgba(255,255,255,0.1)', color: '#ffffff', borderRadius: '8px' }}
                  />
                </div>
              </div>

              <div className="form-group">
                <label>Custom Brand Secondary Accent Color</label>
                <div style={{ display: 'flex', gap: '10px' }}>
                  <input
                    type="color"
                    value={brandingData.branding_secondary_color || '#06b6d4'}
                    onChange={(e) => setBrandingData({ ...brandingData, branding_secondary_color: e.target.value })}
                    style={{ width: '40px', height: '40px', padding: 0, border: 'none', background: 'none', cursor: 'pointer' }}
                  />
                  <input
                    type="text"
                    value={brandingData.branding_secondary_color}
                    onChange={(e) => setBrandingData({ ...brandingData, branding_secondary_color: e.target.value })}
                    placeholder="#06b6d4"
                    style={{ flex: '1', padding: '10px', background: 'rgba(15, 23, 42, 0.6)', border: '1px solid rgba(255,255,255,0.1)', color: '#ffffff', borderRadius: '8px' }}
                  />
                </div>
              </div>
            </div>

            <div className="form-group">
              <label>Custom Brand Logo Icon URL</label>
              <input
                type="url"
                value={brandingData.branding_logo_url}
                onChange={(e) => setBrandingData({ ...brandingData, branding_logo_url: e.target.value })}
                placeholder="e.g. https://company.com/logo.png"
                style={{ padding: '10px', background: 'rgba(15, 23, 42, 0.6)', border: '1px solid rgba(255,255,255,0.1)', color: '#ffffff', borderRadius: '8px', width: '100%' }}
              />
            </div>

            <div className="form-group">
              <label>Custom Brand Favicon URL</label>
              <input
                type="url"
                value={brandingData.branding_favicon_url}
                onChange={(e) => setBrandingData({ ...brandingData, branding_favicon_url: e.target.value })}
                placeholder="e.g. https://company.com/favicon.ico"
                style={{ padding: '10px', background: 'rgba(15, 23, 42, 0.6)', border: '1px solid rgba(255,255,255,0.1)', color: '#ffffff', borderRadius: '8px', width: '100%' }}
              />
            </div>

            <div className="form-group">
              <label>Custom Login Page Background Image URL</label>
              <input
                type="url"
                value={brandingData.branding_login_background_url}
                onChange={(e) => setBrandingData({ ...brandingData, branding_login_background_url: e.target.value })}
                placeholder="e.g. https://images.unsplash.com/photo-xyz"
                style={{ padding: '10px', background: 'rgba(15, 23, 42, 0.6)', border: '1px solid rgba(255,255,255,0.1)', color: '#ffffff', borderRadius: '8px', width: '100%' }}
              />
            </div>

            <div style={{ display: 'flex', gap: '12px', marginTop: '10px' }}>
              <button type="submit" className="btn-submit-admin" style={{ flex: '1', padding: '12px', fontWeight: '700', borderRadius: '8px' }}>
                💾 Save Global Branding Configurations
              </button>
              <button 
                type="button" 
                onClick={handleResetBranding}
                style={{ padding: '12px 18px', background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.3)', color: '#ef4444', borderRadius: '8px', cursor: 'pointer', fontWeight: '600' }}
              >
                Reset Defaults
              </button>
            </div>
          </form>
        </div>
      )}

      {/* TAB 4: CLEAN PDF & EXCEL DATA EXPORT PORTAL */}
      {activeTab === 'backup' && (
        <div className="prof-card" style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          <div>
            <h3 style={{ fontSize: '20px', fontWeight: '800', margin: '0 0 4px 0', letterSpacing: '-0.3px' }}>Data Export & Reports Portal</h3>
            <p className="card-subtext" style={{ margin: 0 }}>
              Export system tickets, hardware asset inventory, and user directory logs directly to Excel and PDF formats.
            </p>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            
            {/* SECTION 1: TICKETS REPORT */}
            <div style={{ background: 'rgba(15, 23, 42, 0.6)', border: '1px solid rgba(56, 189, 248, 0.3)', borderRadius: '12px', padding: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px' }}>
                  <FileTextIcon size={20} style={{ color: '#38bdf8' }} />
                  <h4 style={{ margin: 0, fontSize: '17px', fontWeight: '700', color: '#ffffff' }}>Tickets & Incident Resolution Report</h4>
                </div>
                <p style={{ margin: 0, fontSize: '13px', color: 'var(--text-muted)' }}>
                  Complete list of active, pending, and resolved tickets with resolution summaries and SLA status.
                </p>
              </div>

              <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                <button
                  onClick={() => handleExportFormattedData('Tickets & Incidents', 'excel')}
                  style={{ padding: '10px 16px', borderRadius: '8px', background: 'linear-gradient(135deg, #10b981, #059669)', border: 'none', color: '#ffffff', fontSize: '12.5px', fontWeight: '700', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}
                >
                  <BarChartIcon size={14} /> Export to Excel (.XLSX)
                </button>
                <button
                  onClick={() => handleExportFormattedData('Tickets & Incidents', 'csv')}
                  style={{ padding: '10px 16px', borderRadius: '8px', background: 'linear-gradient(135deg, #0284c7, #0369a1)', border: 'none', color: '#ffffff', fontSize: '12.5px', fontWeight: '700', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}
                >
                  <FileTextIcon size={14} /> Export to CSV (.CSV)
                </button>
                <button
                  onClick={() => handleExportFormattedData('Tickets & Incidents', 'pdf')}
                  style={{ padding: '10px 16px', borderRadius: '8px', background: 'linear-gradient(135deg, #ef4444, #dc2626)', border: 'none', color: '#ffffff', fontSize: '12.5px', fontWeight: '700', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}
                >
                  <DownloadIcon size={14} /> Export to PDF (.PDF)
                </button>
              </div>
            </div>

            {/* SECTION 2: HARDWARE INVENTORY REPORT */}
            <div style={{ background: 'rgba(15, 23, 42, 0.6)', border: '1px solid rgba(255, 255, 255, 0.1)', borderRadius: '12px', padding: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px' }}>
                  <DevicesIcon size={20} style={{ color: '#c084fc' }} />
                  <h4 style={{ margin: 0, fontSize: '17px', fontWeight: '700', color: '#ffffff' }}>Hardware Asset & Inventory Report</h4>
                </div>
                <p style={{ margin: 0, fontSize: '13px', color: 'var(--text-muted)' }}>
                  Current stock levels, device models, serial numbers, and equipment allocation records.
                </p>
              </div>

              <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                <button
                  onClick={() => handleExportFormattedData('Hardware Inventory', 'excel')}
                  style={{ padding: '10px 16px', borderRadius: '8px', background: 'linear-gradient(135deg, #10b981, #059669)', border: 'none', color: '#ffffff', fontSize: '12.5px', fontWeight: '700', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}
                >
                  <BarChartIcon size={14} /> Export to Excel (.XLSX)
                </button>
                <button
                  onClick={() => handleExportFormattedData('Hardware Inventory', 'csv')}
                  style={{ padding: '10px 16px', borderRadius: '8px', background: 'linear-gradient(135deg, #0284c7, #0369a1)', border: 'none', color: '#ffffff', fontSize: '12.5px', fontWeight: '700', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}
                >
                  <FileTextIcon size={14} /> Export to CSV (.CSV)
                </button>
                <button
                  onClick={() => handleExportFormattedData('Hardware Inventory', 'pdf')}
                  style={{ padding: '10px 16px', borderRadius: '8px', background: 'linear-gradient(135deg, #ef4444, #dc2626)', border: 'none', color: '#ffffff', fontSize: '12.5px', fontWeight: '700', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}
                >
                  <DownloadIcon size={14} /> Export to PDF (.PDF)
                </button>
              </div>
            </div>

            {/* SECTION 3: USER DIRECTORY REPORT */}
            <div style={{ background: 'rgba(15, 23, 42, 0.6)', border: '1px solid rgba(255, 255, 255, 0.1)', borderRadius: '12px', padding: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px' }}>
                  <UsersIcon size={20} style={{ color: '#4ade80' }} />
                  <h4 style={{ margin: 0, fontSize: '17px', fontWeight: '700', color: '#ffffff' }}>User Accounts & Roles Directory</h4>
                </div>
                <p style={{ margin: 0, fontSize: '13px', color: 'var(--text-muted)' }}>
                  Registered user accounts, emails, corporate roles, and access authorization levels.
                </p>
              </div>

              <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                <button
                  onClick={() => handleExportFormattedData('User Directory', 'excel')}
                  style={{ padding: '10px 16px', borderRadius: '8px', background: 'linear-gradient(135deg, #10b981, #059669)', border: 'none', color: '#ffffff', fontSize: '12.5px', fontWeight: '700', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}
                >
                  <BarChartIcon size={14} /> Export to Excel (.XLSX)
                </button>
                <button
                  onClick={() => handleExportFormattedData('User Directory', 'csv')}
                  style={{ padding: '10px 16px', borderRadius: '8px', background: 'linear-gradient(135deg, #0284c7, #0369a1)', border: 'none', color: '#ffffff', fontSize: '12.5px', fontWeight: '700', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}
                >
                  <FileTextIcon size={14} /> Export to CSV (.CSV)
                </button>
                <button
                  onClick={() => handleExportFormattedData('User Directory', 'pdf')}
                  style={{ padding: '10px 16px', borderRadius: '8px', background: 'linear-gradient(135deg, #ef4444, #dc2626)', border: 'none', color: '#ffffff', fontSize: '12.5px', fontWeight: '700', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}
                >
                  <DownloadIcon size={14} /> Export to PDF (.PDF)
                </button>
              </div>
            </div>

          </div>
        </div>
      )}
    </div>
  );
}

export default AdminProfile;
