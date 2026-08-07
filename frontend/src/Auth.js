import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import './Auth.css';
import { LogoIcon, UserIcon, MailIcon, LockIcon, ClockIcon, AlertIcon, SuccessIcon } from './components/Icons';

function Auth({ API_URL, onAuthSuccess, globalSettings }) {
  const [isLogin, setIsLogin] = useState(true);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: ''
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // Enterprise Segmented OTP Verification States
  const [showOtpScreen, setShowOtpScreen] = useState(false);
  const [otpEmail, setOtpEmail] = useState('');
  const [otpDigits, setOtpDigits] = useState(['', '', '', '', '', '']);
  const [otpSuccessMessage, setOtpSuccessMessage] = useState('');
  const [isVerifiedSuccess, setIsVerifiedSuccess] = useState(false);
  const [timerSeconds, setTimerSeconds] = useState(300); // 5-minute countdown (300 seconds)

  const inputRefs = useRef([]);

  // Live 5-minute Countdown Timer Effect
  useEffect(() => {
    let interval = null;
    if (showOtpScreen && timerSeconds > 0) {
      interval = setInterval(() => {
        setTimerSeconds((prev) => prev - 1);
      }, 1000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [showOtpScreen, timerSeconds]);

  // Auto-focus first digit box when OTP verification view mounts
  useEffect(() => {
    if (showOtpScreen && inputRefs.current[0]) {
      setTimeout(() => {
        inputRefs.current[0]?.focus();
      }, 120);
    }
  }, [showOtpScreen]);

  const formatTimer = (totalSec) => {
    const mins = Math.floor(totalSec / 60);
    const secs = totalSec % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

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
    setOtpSuccessMessage('');
    setLoading(true);

    const endpoint = isLogin ? `${API_URL}/auth/login` : `${API_URL}/auth/signup`;
    const payload = isLogin
      ? { email: formData.email, password: formData.password }
      : { name: formData.name, email: formData.email, password: formData.password };

    try {
      const response = await axios.post(endpoint, payload);
      if (isLogin) {
        // Direct Login without OTP verification
        const { token, user } = response.data;
        onAuthSuccess(token, user);
      } else if (response.data.requireOtp) {
        // Signup triggers same-page 6-digit OTP verification screen
        setShowOtpScreen(true);
        setOtpEmail(response.data.email || formData.email);
        setOtpDigits(['', '', '', '', '', '']);
        setTimerSeconds(300);
        setOtpSuccessMessage(response.data.message || "We've sent a 6-digit verification code to your email address. Please enter the code below to verify your account.");
      } else {
        const { token, user } = response.data;
        onAuthSuccess(token, user);
      }
    } catch (err) {
      console.error('Auth error:', err);
      setError(err.response?.data?.error || 'Authentication failed. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  // Segmented digit change handler
  const handleDigitChange = (index, value) => {
    const numericValue = value.replace(/[^0-9]/g, '');
    if (!numericValue) {
      const newDigits = [...otpDigits];
      newDigits[index] = '';
      setOtpDigits(newDigits);
      return;
    }

    const digit = numericValue[numericValue.length - 1];
    const newDigits = [...otpDigits];
    newDigits[index] = digit;
    setOtpDigits(newDigits);
    setError('');

    // Auto-focus next box
    if (index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  // Keyboard navigation handler (Backspace & Arrow keys)
  const handleDigitKeyDown = (index, e) => {
    if (e.key === 'Backspace') {
      if (!otpDigits[index] && index > 0) {
        const newDigits = [...otpDigits];
        newDigits[index - 1] = '';
        setOtpDigits(newDigits);
        inputRefs.current[index - 1]?.focus();
      }
    } else if (e.key === 'ArrowLeft' && index > 0) {
      inputRefs.current[index - 1]?.focus();
    } else if (e.key === 'ArrowRight' && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  // Paste handler for 6-digit OTP codes
  const handleDigitPaste = (e) => {
    e.preventDefault();
    const pastedText = e.clipboardData.getData('text').replace(/[^0-9]/g, '').slice(0, 6);
    if (!pastedText) return;

    const newDigits = ['', '', '', '', '', ''];
    for (let i = 0; i < pastedText.length; i++) {
      newDigits[i] = pastedText[i];
    }
    setOtpDigits(newDigits);
    setError('');

    const nextIndex = Math.min(pastedText.length, 5);
    inputRefs.current[nextIndex]?.focus();
  };

  const handleVerifyOtp = async (e) => {
    e.preventDefault();
    const fullOtp = otpDigits.join('');
    if (fullOtp.length !== 6) {
      setError('Please enter all 6 digits of the OTP code.');
      return;
    }

    setError('');
    setOtpSuccessMessage('');
    setLoading(true);

    try {
      const response = await axios.post(`${API_URL}/auth/verify-otp`, {
        email: otpEmail,
        otp: fullOtp
      });
      const { token, user, message } = response.data;

      setIsVerifiedSuccess(true);
      setOtpSuccessMessage(message || 'Account activated successfully!');

      setTimeout(() => {
        if (token && user) {
          onAuthSuccess(token, user);
        } else {
          setShowOtpScreen(false);
          setIsLogin(true);
          setIsVerifiedSuccess(false);
        }
      }, 1500);
    } catch (err) {
      console.error('Verify OTP error:', err);
      setError(err.response?.data?.error || 'OTP verification failed. Please check the 6-digit code.');
    } finally {
      setLoading(false);
    }
  };

  const handleResendOtp = async () => {
    if (timerSeconds > 0) return;

    setError('');
    setOtpSuccessMessage('');
    setLoading(true);

    try {
      const response = await axios.post(`${API_URL}/auth/resend-otp`, {
        email: otpEmail
      });
      setTimerSeconds(300); // Reset 5-minute timer
      setOtpDigits(['', '', '', '', '', '']);
      setOtpSuccessMessage(response.data.message || 'A fresh 6-digit verification code has been sent to your email.');
      setTimeout(() => {
        inputRefs.current[0]?.focus();
      }, 100);
    } catch (err) {
      console.error('Resend OTP error:', err);
      setError(err.response?.data?.error || 'Failed to resend verification code.');
    } finally {
      setLoading(false);
    }
  };

  const containerStyle = globalSettings?.branding_login_background_url
    ? { backgroundImage: `url(${globalSettings.branding_login_background_url})`, backgroundSize: 'cover', backgroundPosition: 'center' }
    : {};

  const isOtpComplete = otpDigits.join('').length === 6;

  return (
    <div className={`auth-container ${globalSettings?.global_theme || 'theme-enterprise-dark'}`} style={containerStyle}>
      <svg className="network-background" viewBox="0 0 1920 1080" preserveAspectRatio="xMidYMid slice" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <filter id="glow-cyan" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="6" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
          <filter id="glow-purple" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="6" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* --- Background Circuit Board Traces (dimmed lines) --- */}
        <path d="M 50,100 L 300,100 L 380,180 L 380,300 L 420,340 L 520,340 L 520,480" stroke="rgba(56, 189, 248, 0.12)" strokeWidth="2" fill="none" />
        <path d="M 50,550 L 150,550 L 220,620 L 350,620 L 400,670 L 400,770" stroke="rgba(56, 189, 248, 0.12)" strokeWidth="2" fill="none" />
        <path d="M 1870,100 L 1700,100 L 1600,200 L 1600,300 L 1500,400 L 1400,400 L 1400,480" stroke="rgba(56, 189, 248, 0.12)" strokeWidth="2" fill="none" />
        <path d="M 1870,550 L 1750,550 L 1680,620 L 1500,620 L 1450,670 L 1450,770" stroke="rgba(56, 189, 248, 0.12)" strokeWidth="2" fill="none" />
        <path d="M 50,900 L 250,900 L 320,830 L 500,830 L 580,750 L 700,750" stroke="rgba(56, 189, 248, 0.12)" strokeWidth="2" fill="none" />
        <path d="M 1870,900 L 1650,900 L 1580,830 L 1400,830 L 1320,750 L 1220,750" stroke="rgba(56, 189, 248, 0.12)" strokeWidth="2" fill="none" />

        {/* --- Connecting Device Traces with Blinking Signal flows --- */}
        {/* Top-Left Server to Desktop Monitor */}
        <path d="M 215,240 L 215,480" stroke="rgba(56, 189, 248, 0.15)" strokeWidth="2" fill="none" />
        <path className="pulse-path" d="M 215,240 L 215,480" stroke="#00f0ff" strokeWidth="2.5" fill="none" filter="url(#glow-cyan)" />

        {/* Desktop Monitor to Bottom-Left CPU */}
        <path d="M 215,550 L 215,770" stroke="rgba(56, 189, 248, 0.15)" strokeWidth="2" fill="none" />
        <path className="pulse-path" d="M 215,550 L 215,770" stroke="#818cf8" strokeWidth="2.5" fill="none" filter="url(#glow-purple)" />

        {/* Cloud database to Mid-Right Database */}
        <path d="M 1650,150 L 1650,480" stroke="rgba(56, 189, 248, 0.15)" strokeWidth="2" fill="none" />
        <path className="pulse-path" d="M 1650,150 L 1650,480" stroke="#00f0ff" strokeWidth="2.5" fill="none" filter="url(#glow-cyan)" />

        {/* Mid-Right Database to Laptop */}
        <path d="M 1650,550 L 1650,770" stroke="rgba(56, 189, 248, 0.15)" strokeWidth="2" fill="none" />
        <path className="pulse-path" d="M 1650,550 L 1650,770" stroke="#818cf8" strokeWidth="2.5" fill="none" filter="url(#glow-purple)" />

        {/* Central Bypass (underneath Login Card) */}
        <path d="M 215,530 L 700,530 L 800,630 L 1120,630 L 1220,530 L 1650,530" stroke="rgba(56, 189, 248, 0.08)" strokeWidth="2" fill="none" />
        <path className="pulse-path" d="M 215,530 L 700,530 L 800,630 L 1120,630 L 1220,530 L 1650,530" stroke="#38bdf8" strokeWidth="2" fill="none" filter="url(#glow-cyan)" />

        {/* --- Circuit Board Nodes (circles) --- */}
        <circle cx="300" cy="100" r="3" fill="#38bdf8" />
        <circle cx="380" cy="180" r="3" fill="#38bdf8" />
        <circle cx="220" cy="620" r="3" fill="#38bdf8" />
        <circle cx="1700" cy="100" r="3" fill="#38bdf8" />
        <circle cx="1600" cy="200" r="3" fill="#38bdf8" />
        <circle cx="1680" cy="620" r="3" fill="#38bdf8" />
        <circle cx="320" cy="830" r="3" fill="#38bdf8" />
        <circle cx="1580" cy="830" r="3" fill="#38bdf8" />

        {/* --- Devices Layout --- */}
        {/* 1. Top-Left Server Racks */}
        <g transform="translate(180, 140)">
          <rect x="0" y="0" width="70" height="90" rx="10" fill="none" stroke="#38bdf8" strokeWidth="2" />
          <rect x="10" y="12" width="50" height="18" rx="4" fill="none" stroke="#38bdf8" strokeWidth="1.5" />
          <circle cx="20" cy="21" r="2" fill="#10b981" className="led-blink" />
          <circle cx="28" cy="21" r="2" fill="#10b981" />
          <rect x="10" y="36" width="50" height="18" rx="4" fill="none" stroke="#38bdf8" strokeWidth="1.5" />
          <circle cx="20" cy="45" r="2" fill="#10b981" />
          <circle cx="28" cy="45" r="2" fill="#ef4444" className="led-blink-delayed" />
          <rect x="10" y="60" width="50" height="18" rx="4" fill="none" stroke="#38bdf8" strokeWidth="1.5" />
          <circle cx="20" cy="69" r="2" fill="#10b981" />
          <circle cx="28" cy="69" r="2" fill="#10b981" />
        </g>

        {/* 2. Top-Right Cloud Database */}
        <g transform="translate(1620, 110)">
          <path d="M 15,25 C 8,25 2,19 2,12 C 2,5 8,0 15,0 C 18,0 20,1 23,3 C 27,-2 37,-2 41,3 C 44,2 47,2 50,5 C 56,5 60,10 60,16 C 60,23 55,28 47,28 L 15,28 Z" fill="none" stroke="#38bdf8" strokeWidth="2" />
          <path d="M 22,20 L 22,10 M 22,10 L 19,13 M 22,10 L 25,13" fill="none" stroke="#00f0ff" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M 32,10 L 32,20 M 32,20 L 29,17 M 32,20 L 35,17" fill="none" stroke="#00f0ff" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </g>

        {/* 3. Mid-Right Database Cylinder */}
        <g transform="translate(1620, 480)">
          <ellipse cx="30" cy="20" rx="25" ry="8" fill="none" stroke="#38bdf8" strokeWidth="2" />
          <path d="M 5,20 L 5,35 A 25,8 0 0 0 55,35 L 55,20" fill="none" stroke="#38bdf8" strokeWidth="2" />
          <path d="M 5,35 L 5,50 A 25,8 0 0 0 55,50 L 55,35" fill="none" stroke="#38bdf8" strokeWidth="2" />
          <path d="M 5,50 L 5,65 A 25,8 0 0 0 55,65 L 55,50" fill="none" stroke="#38bdf8" strokeWidth="2" />
          <line x1="15" y1="28" x2="25" y2="28" stroke="#00f0ff" strokeWidth="1.5" />
          <line x1="15" y1="43" x2="25" y2="43" stroke="#00f0ff" strokeWidth="1.5" />
          <line x1="15" y1="58" x2="25" y2="58" stroke="#00f0ff" strokeWidth="1.5" />
        </g>

        {/* 4. Bottom-Right Laptop */}
        <g transform="translate(1600, 770)">
          <rect x="10" y="5" width="60" height="42" rx="4" fill="none" stroke="#38bdf8" strokeWidth="2" />
          <path d="M 2,47 L 78,47 L 72,55 L 8,55 Z" fill="none" stroke="#38bdf8" strokeWidth="2" strokeLinejoin="round" />
          <line x1="18" y1="51" x2="62" y2="51" stroke="#00f0ff" strokeWidth="1.5" />
        </g>

        {/* 5. Bottom-Left CPU Chip */}
        <g transform="translate(180, 770)">
          <rect x="12" y="12" width="46" height="46" rx="6" fill="none" stroke="#38bdf8" strokeWidth="2" />
          <rect x="22" y="22" width="26" height="26" rx="3" fill="none" stroke="#38bdf8" strokeWidth="1.5" />
          <line x1="20" y1="4" x2="20" y2="12" stroke="#38bdf8" strokeWidth="2" />
          <line x1="30" y1="4" x2="30" y2="12" stroke="#38bdf8" strokeWidth="2" />
          <line x1="40" y1="4" x2="40" y2="12" stroke="#38bdf8" strokeWidth="2" />
          <line x1="50" y1="4" x2="50" y2="12" stroke="#38bdf8" strokeWidth="2" />
          <line x1="20" y1="58" x2="20" y2="66" stroke="#38bdf8" strokeWidth="2" />
          <line x1="30" y1="58" x2="30" y2="66" stroke="#38bdf8" strokeWidth="2" />
          <line x1="40" y1="58" x2="40" y2="66" stroke="#38bdf8" strokeWidth="2" />
          <line x1="50" y1="58" x2="50" y2="66" stroke="#38bdf8" strokeWidth="2" />
          <line x1="4" y1="20" x2="12" y2="20" stroke="#38bdf8" strokeWidth="2" />
          <line x1="4" y1="30" x2="12" y2="30" stroke="#38bdf8" strokeWidth="2" />
          <line x1="4" y1="40" x2="12" y2="40" stroke="#38bdf8" strokeWidth="2" />
          <line x1="4" y1="50" x2="12" y2="50" stroke="#38bdf8" strokeWidth="2" />
          <line x1="58" y1="20" x2="66" y2="20" stroke="#38bdf8" strokeWidth="2" />
          <line x1="58" y1="30" x2="66" y2="30" stroke="#38bdf8" strokeWidth="2" />
          <line x1="58" y1="40" x2="66" y2="40" stroke="#38bdf8" strokeWidth="2" />
          <line x1="58" y1="50" x2="66" y2="50" stroke="#38bdf8" strokeWidth="2" />
          <rect x="26" y="26" width="18" height="18" fill="rgba(0, 240, 255, 0.15)" />
        </g>

        {/* 6. Mid-Left Desktop Monitor */}
        <g transform="translate(180, 480)">
          <rect x="5" y="5" width="60" height="42" rx="4" fill="none" stroke="#38bdf8" strokeWidth="2" />
          <path d="M 30,47 L 40,47 L 43,58 L 27,58 Z" fill="none" stroke="#38bdf8" strokeWidth="2" />
          <line x1="20" y1="58" x2="50" y2="58" stroke="#38bdf8" strokeWidth="2" />
          <circle cx="35" cy="26" r="8" fill="none" stroke="#00f0ff" strokeWidth="1.5" />
        </g>

        {/* 7. Rotating Gear Left */}
        <g transform="translate(120, 340)" className="gear-spin">
          <circle cx="20" cy="20" r="12" fill="none" stroke="#38bdf8" strokeWidth="2" />
          <circle cx="20" cy="20" r="4" fill="none" stroke="#38bdf8" strokeWidth="1.5" />
          <path d="M 20,2 L 20,8 M 20,32 L 20,38 M 2,20 L 8,20 M 32,20 L 38,20 M 7,7 L 12,12 M 28,28 L 33,33 M 33,7 L 28,12 M 7,33 L 12,28" stroke="#38bdf8" strokeWidth="2" strokeLinecap="round" />
        </g>

        {/* 8. Rotating Gear Right */}
        <g transform="translate(1330, 830)" className="gear-spin-reverse">
          <circle cx="20" cy="20" r="12" fill="none" stroke="#38bdf8" strokeWidth="2" />
          <circle cx="20" cy="20" r="4" fill="none" stroke="#38bdf8" strokeWidth="1.5" />
          <path d="M 20,2 L 20,8 M 20,32 L 20,38 M 2,20 L 8,20 M 32,20 L 38,20 M 7,7 L 12,12 M 28,28 L 33,33 M 33,7 L 28,12 M 7,33 L 12,28" stroke="#38bdf8" strokeWidth="2" strokeLinecap="round" />
        </g>

        {/* 9. Wi-Fi Indicator */}
        <g transform="translate(160, 650)">
          <circle cx="10" cy="23" r="2.5" fill="#38bdf8" />
          <path d="M 5,18 A 8,8 0 0 1 15,18" fill="none" stroke="#38bdf8" strokeWidth="1.5" />
          <path d="M 1,14 A 13,13 0 0 1 19,14" fill="none" stroke="#38bdf8" strokeWidth="1.5" />
          <path d="M -3,10 A 18,18 0 0 1 23,10" fill="none" stroke="#38bdf8" strokeWidth="1.5" />
        </g>

        {/* --- Moving Live Signals (Data Packets) --- */}
        <circle r="4" fill="#00f0ff" filter="url(#glow-cyan)">
          <animateMotion dur="5s" repeatCount="indefinite" path="M 215,240 L 215,480" />
        </circle>
        <circle r="4" fill="#818cf8" filter="url(#glow-purple)">
          <animateMotion dur="4s" repeatCount="indefinite" path="M 215,550 L 215,770" />
        </circle>
        <circle r="4" fill="#00f0ff" filter="url(#glow-cyan)">
          <animateMotion dur="5s" repeatCount="indefinite" path="M 1650,150 L 1650,480" />
        </circle>
        <circle r="4" fill="#818cf8" filter="url(#glow-purple)">
          <animateMotion dur="4s" repeatCount="indefinite" path="M 1650,550 L 1650,770" />
        </circle>
        <circle r="5" fill="#00f0ff" filter="url(#glow-cyan)">
          <animateMotion dur="8s" repeatCount="indefinite" path="M 215,530 L 700,530 L 800,630 L 1120,630 L 1220,530 L 1650,530" />
        </circle>
      </svg>
      <div className="auth-card">
        <div className="auth-header">
          {globalSettings?.branding_logo_url ? (
            <img src={globalSettings.branding_logo_url} alt="Company Logo" style={{ maxHeight: '56px', width: 'auto', marginBottom: '12px', borderRadius: '6px' }} />
          ) : (
            <LogoIcon size={44} style={{ color: 'var(--accent, #38bdf8)', marginBottom: '12px' }} />
          )}
          <h2>Ticket & Inventory</h2>
          <p className="auth-subtitle">Management System</p>
          <p className="auth-tagline">Track. Manage. Optimize.</p>
        </div>

        {showOtpScreen ? (
          <div className="otp-verification-section">
            <div style={{ textAlign: 'center', marginBottom: '16px' }}>
              <h3 style={{ color: 'var(--accent, #38bdf8)', margin: '0 0 6px 0', fontSize: '18px', fontWeight: '800' }}>
                Email OTP Verification
              </h3>
              <p style={{ fontSize: '12px', color: 'var(--text-muted)', margin: 0, lineHeight: '1.5' }}>
                We've sent a 6-digit verification code to your email address:<br />
                <strong style={{ color: 'var(--text-main)', fontSize: '13px' }}>{otpEmail}</strong>
              </p>
            </div>

            {otpSuccessMessage && (
              <div className="otp-success-banner">
                <SuccessIcon size={16} />
                <span>{otpSuccessMessage}</span>
              </div>
            )}

            {error && <div className="auth-error-banner"><AlertIcon size={16} /> {error}</div>}

            <form onSubmit={handleVerifyOtp} className="auth-form">
              <div className="form-group" style={{ marginBottom: '12px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <label style={{ fontSize: '11.5px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                    Enter 6-Digit Code
                  </label>
                  <div className={`otp-timer-badge ${timerSeconds === 0 ? 'expired' : ''}`}>
                    <ClockIcon size={14} />
                    <span>{timerSeconds > 0 ? formatTimer(timerSeconds) : 'Expired'}</span>
                  </div>
                </div>

                {/* 6 Individual Segmented Input Boxes */}
                <div className="otp-digits-container" onPaste={handleDigitPaste}>
                  {otpDigits.map((digit, idx) => (
                    <input
                      key={idx}
                      ref={(el) => (inputRefs.current[idx] = el)}
                      type="text"
                      inputMode="numeric"
                      maxLength="1"
                      value={digit}
                      onChange={(e) => handleDigitChange(idx, e.target.value)}
                      onKeyDown={(e) => handleDigitKeyDown(idx, e)}
                      className={`otp-digit-box ${digit ? 'filled' : ''} ${isVerifiedSuccess ? 'success' : ''}`}
                      disabled={loading || isVerifiedSuccess}
                      autoComplete="off"
                    />
                  ))}
                </div>
              </div>

              <button type="submit" className="auth-btn-primary" disabled={loading || !isOtpComplete || isVerifiedSuccess}>
                {loading ? 'Verifying Code...' : (isVerifiedSuccess ? 'Verified! Redirecting...' : 'Verify OTP & Activate')}
              </button>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '18px' }}>
                <button
                  type="button"
                  onClick={handleResendOtp}
                  disabled={loading || timerSeconds > 0 || isVerifiedSuccess}
                  className="auth-btn-secondary-link"
                >
                  <MailIcon size={14} /> {timerSeconds > 0 ? `Resend (${formatTimer(timerSeconds)})` : 'Resend OTP Code'}
                </button>
                <button
                  type="button"
                  onClick={() => { setShowOtpScreen(false); setError(''); setOtpSuccessMessage(''); setIsVerifiedSuccess(false); }}
                  disabled={loading || isVerifiedSuccess}
                  className="auth-btn-secondary-link"
                >
                  Back to Signup
                </button>
              </div>
            </form>
          </div>
        ) : (
          <>
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

            {error && <div className="auth-error-banner"><AlertIcon size={16} /> {error}</div>}

            <form onSubmit={handleSubmit} className="auth-form">
              {!isLogin && (
                <div className="form-group">
                  <label>Full Name</label>
                  <div className="input-with-icon">
                    <span className="input-icon"><UserIcon size={16} /></span>
                    <input
                      type="text"
                      name="name"
                      value={formData.name}
                      onChange={handleChange}
                      placeholder="John Doe"
                      required
                    />
                  </div>
                </div>
              )}

              <div className="form-group">
                <label>Email Address</label>
                <div className="input-with-icon">
                  <span className="input-icon"><MailIcon size={16} /></span>
                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    placeholder="user@company.com"
                    required
                  />
                </div>
              </div>

              <div className="form-group">
                <label>Password</label>
                <div className="input-with-icon">
                  <span className="input-icon"><LockIcon size={16} /></span>
                  <input
                    type="password"
                    name="password"
                    value={formData.password}
                    onChange={handleChange}
                    placeholder="••••••••"
                    required
                  />
                </div>
              </div>

              <button type="submit" className="auth-btn-primary" disabled={loading}>
                {loading ? 'Processing...' : (isLogin ? 'Sign In' : 'Create Account')}
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  );
}

export default Auth;
