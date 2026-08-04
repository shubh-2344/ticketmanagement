import React from 'react';
import './Toast.css';

const Toast = ({ toast, onClose }) => {
  if (!toast) return null;

  return (
    <div className="tm-toast-wrapper">
      <div className={`tm-toast-card tm-toast-${toast.type || 'success'}`}>
        <div className="tm-toast-icon-box">
          {toast.type === 'error' ? '✕' : '✓'}
        </div>
        <div className="tm-toast-message-body">
          {toast.message}
        </div>
        <button
          className="tm-toast-close-btn"
          onClick={onClose}
          title="Dismiss"
          aria-label="Dismiss Notification"
        >
          ✕
        </button>
      </div>
    </div>
  );
};

export default Toast;
