import React, { useState } from 'react';
import './CreateTicket.css';

function CreateTicket({ onSubmit }) {
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    type: 'issue',
    category: 'general',
    priority: 'medium'
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    
    if (!formData.title.trim() || !formData.description.trim()) {
      alert('Please fill in all required fields');
      return;
    }

    onSubmit(formData);
    setFormData({
      title: '',
      description: '',
      type: 'issue',
      category: 'general',
      priority: 'medium'
    });
  };

  const categories = {
    'device-request': [
      'Laptop',
      'Desktop',
      'Monitor',
      'Keyboard & Mouse',
      'Headphones',
      'Phone',
      'Other'
    ],
    'issue': [
      'Access/Permission',
      'Software',
      'Hardware',
      'Network',
      'Security',
      'Performance',
      'Other'
    ]
  };

  return (
    <div className="create-ticket">
      <h2>Create New Ticket</h2>
      
      <form onSubmit={handleSubmit} className="form">
        <div className="form-group">
          <label htmlFor="type">Ticket Type *</label>
          <div className="radio-group">
            <label className="radio-label">
              <input
                type="radio"
                name="type"
                value="device-request"
                checked={formData.type === 'device-request'}
                onChange={handleChange}
              />
              <span>🖥️ Device Request</span>
            </label>
            <label className="radio-label">
              <input
                type="radio"
                name="type"
                value="issue"
                checked={formData.type === 'issue'}
                onChange={handleChange}
              />
              <span>🐛 Report Issue</span>
            </label>
          </div>
        </div>

        <div className="form-group">
          <label htmlFor="title">Title *</label>
          <input
            type="text"
            id="title"
            name="title"
            value={formData.title}
            onChange={handleChange}
            placeholder="Enter ticket title"
            maxLength={100}
          />
          <span className="char-count">{formData.title.length}/100</span>
        </div>

        <div className="form-group">
          <label htmlFor="description">Description *</label>
          <textarea
            id="description"
            name="description"
            value={formData.description}
            onChange={handleChange}
            placeholder="Provide detailed description of your request or issue"
            rows={5}
            maxLength={500}
          />
          <span className="char-count">{formData.description.length}/500</span>
        </div>

        <div className="form-row">
          <div className="form-group">
            <label htmlFor="category">Category *</label>
            <select
              id="category"
              name="category"
              value={formData.category}
              onChange={handleChange}
            >
              <option value="">Select category</option>
              {categories[formData.type].map(cat => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label htmlFor="priority">Priority</label>
            <select
              id="priority"
              name="priority"
              value={formData.priority}
              onChange={handleChange}
            >
              <option value="low">🟦 Low</option>
              <option value="medium">🟨 Medium</option>
              <option value="high">🟥 High</option>
            </select>
          </div>
        </div>

        <div className="form-actions">
          <button type="submit" className="btn btn-primary">
            Create Ticket
          </button>
        </div>
      </form>

      <div className="info-box">
        <h4>ℹ️ Before You Submit</h4>
        <ul>
          <li>Ensure all required fields are filled correctly</li>
          <li>Device requests must include specific device type</li>
          <li>Be as detailed as possible in your description</li>
          <li>Your request will be reviewed by your manager</li>
        </ul>
      </div>
    </div>
  );
}

export default CreateTicket;
