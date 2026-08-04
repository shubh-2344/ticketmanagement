import React, { useState } from 'react';
import axios from 'axios';
import './Auth.css';

function Auth({ API_URL, onAuthSuccess }) {
  const [isLogin, setIsLogin] = useState(true);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    role: 'employee'
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
    setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const endpoint = isLogin ? `${API_URL}/auth/login` : `${API_URL}/auth/signup`;
      const payload = isLogin
        ? { email: formData.email.trim(), password: formData.password }
        : { ...formData, name: formData.name.trim(), email: formData.email.trim() };

      const response = await axios.post(endpoint, payload);
      const { token, user } = response.data;

      onAuthSuccess(token, user);
    } catch (err) {
      console.error('Auth error details:', err);
      let errorMsg = err.response?.data?.error || 'Authentication failed. Please check your network connection and credentials.';

      if (!isLogin && err.response?.status === 400 && errorMsg.includes('already exists')) {
        errorMsg = 'An account with this email already exists. Please click on the "Sign In" tab above to log in.';
      }

      setError(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  const fillQuickLogin = (email) => {
    setFormData({
      name: '',
      email,
      password: 'Password123!',
      role: 'employee'
    });
    setIsLogin(true);
    setError('');
  };

  return (
    <div className="auth-container">
      <div className="auth-card">
        <div className="auth-header">
          <div className="auth-logo">🎫</div>
          <h2>Ticket & Inventory System</h2>
          <p>{isLogin ? 'Sign in to access your portal' : 'Create an account to get started'}</p>
        </div>

        <div className="auth-tabs">
          <button
            type="button"
            className={`auth-tab ${isLogin ? 'active' : ''}`}
            onClick={() => { setIsLogin(true); setError(''); }}
          >
            Sign In
          </button>
          <button
            type="button"
            className={`auth-tab ${!isLogin ? 'active' : ''}`}
            onClick={() => { setIsLogin(false); setError(''); }}
          >
            Sign Up
          </button>
        </div>

        {error && (
          <div className="auth-error-banner">
            <span>⚠️ {error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="auth-form">
          {!isLogin && (
            <div className="form-group">
              <label htmlFor="name">Full Name *</label>
              <input
                type="text"
                id="name"
                name="name"
                placeholder="e.g. Alex Morgan"
                value={formData.name}
                onChange={handleChange}
                required
              />
            </div>
          )}

          <div className="form-group">
            <label htmlFor="email">Email Address *</label>
            <input
              type="email"
              id="email"
              name="email"
              placeholder="name@company.com"
              value={formData.email}
              onChange={handleChange}
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="password">Password *</label>
            <input
              type="password"
              id="password"
              name="password"
              placeholder="••••••••"
              value={formData.password}
              onChange={handleChange}
              required
              minLength={6}
            />
          </div>

          {!isLogin && (
            <div className="form-group">
              <label htmlFor="role">Select Account Type / Role *</label>
              <select
                id="role"
                name="role"
                value={formData.role}
                onChange={handleChange}
                className="auth-select"
              >
                <option value="employee">👨‍💻 Employee (Create & Track Tickets)</option>
                <option value="manager">📋 Manager (Review & Approve Requests)</option>
                <option value="admin">⚙️ Admin (Inventory & System Management)</option>
              </select>
            </div>
          )}

          <button type="submit" className="auth-btn-primary" disabled={loading}>
            {loading ? 'Processing...' : (isLogin ? 'Sign In' : 'Create Account')}
          </button>
        </form>

        <div className="quick-demo-section">
          <p className="quick-demo-title">🔑 Quick Demo Accounts (Password: <code>Password123!</code>)</p>
          <div className="quick-demo-buttons">
            <button
              type="button"
              className="quick-btn admin"
              onClick={() => fillQuickLogin('admin@company.com')}
            >
              ⚙️ Admin
            </button>
            <button
              type="button"
              className="quick-btn manager"
              onClick={() => fillQuickLogin('manager@company.com')}
            >
              📋 Manager
            </button>
            <button
              type="button"
              className="quick-btn employee"
              onClick={() => fillQuickLogin('john@company.com')}
            >
              👨‍💻 Employee
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Auth;
