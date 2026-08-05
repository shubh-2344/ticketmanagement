import React, { useState, useMemo } from 'react';
import axios from 'axios';
import './Auth.css';

const generateStars = (count) => {
  const shadows = [];
  for (let i = 0; i < count; i++) {
    const x = Math.floor(Math.random() * 2000);
    const y = Math.floor(Math.random() * 2000);
    shadows.push(`${x}px ${y}px #FFF`);
  }
  return shadows.join(', ');
};

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

  const starStyles = useMemo(() => {
    const s1 = generateStars(700);
    const s2 = generateStars(200);
    const s3 = generateStars(100);
    return `
      #stars {
        box-shadow: ${s1};
      }
      #stars::after {
        box-shadow: ${s1};
      }
      #stars2 {
        box-shadow: ${s2};
      }
      #stars2::after {
        box-shadow: ${s2};
      }
      #stars3 {
        box-shadow: ${s3};
      }
      #stars3::after {
        box-shadow: ${s3};
      }
    `;
  }, []);

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

    const endpoint = isLogin ? `${API_URL}/auth/login` : `${API_URL}/auth/signup`;
    const payload = isLogin
      ? { email: formData.email, password: formData.password }
      : formData;

    try {
      const response = await axios.post(endpoint, payload);
      const { token, user } = response.data;
      onAuthSuccess(token, user);
    } catch (err) {
      console.error('Auth error:', err);
      setError(err.response?.data?.error || 'Authentication failed. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-container">
      <style dangerouslySetInnerHTML={{ __html: starStyles }} />
      <div id="stars"></div>
      <div id="stars2"></div>
      <div id="stars3"></div>
      <div className="auth-card">
        <div className="auth-header">
          <img src="/logo.png" alt="Portal Logo" className="auth-logo-img" />
          <h2>Ticket Management</h2>
          <p>{isLogin ? 'Sign in to access your dashboard' : 'Register a new account'}</p>
        </div>

        <div className="auth-tabs">
          <button
            className={`auth-tab ${isLogin ? 'active' : ''}`}
            onClick={() => { setIsLogin(true); setError(''); }}
          >
            Login
          </button>
          <button
            className={`auth-tab ${!isLogin ? 'active' : ''}`}
            onClick={() => { setIsLogin(false); setError(''); }}
          >
            Sign Up
          </button>
        </div>

        {error && <div className="auth-error-banner">⚠️ {error}</div>}

        <form onSubmit={handleSubmit} className="auth-form">
          {!isLogin && (
            <div className="form-group">
              <label>Full Name</label>
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleChange}
                placeholder="John Doe"
                required
              />
            </div>
          )}

          <div className="form-group">
            <label>Email Address</label>
            <input
              type="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              placeholder="user@company.com"
              required
            />
          </div>

          <div className="form-group">
            <label>Password</label>
            <input
              type="password"
              name="password"
              value={formData.password}
              onChange={handleChange}
              placeholder="••••••••"
              required
            />
          </div>

          {!isLogin && (
            <div className="form-group">
              <label>Account Role</label>
              <select
                name="role"
                value={formData.role}
                onChange={handleChange}
                className="auth-select"
              >
                <option value="employee">User / Employee</option>
                <option value="manager">Manager</option>
              </select>
            </div>
          )}

          <button type="submit" className="auth-btn-primary" disabled={loading}>
            {loading ? 'Processing...' : (isLogin ? 'Sign In' : 'Create Account')}
          </button>
        </form>
      </div>
    </div>
  );
}

export default Auth;
