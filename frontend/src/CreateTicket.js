import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './CreateTicket.css';

function CreateTicket({ onSubmit, API_URL }) {
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    type: 'issue',
    category: 'general',
    priority: 'medium',
    inventory_id: ''
  });

  const [inventoryList, setInventoryList] = useState([]);

  useEffect(() => {
    fetchInventory();
  }, []);

  const fetchInventory = async () => {
    try {
      if (API_URL) {
        const response = await axios.get(`${API_URL}/inventory`);
        setInventoryList(response.data.filter(item => item.quantity > 0));
      }
    } catch (err) {
      console.error('Error loading inventory for ticket creation:', err);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleInventorySelect = (e) => {
    const selectedId = e.target.value;
    const selectedItem = inventoryList.find(i => i.id === selectedId);
    
    if (selectedItem) {
      setFormData(prev => ({
        ...prev,
        inventory_id: selectedId,
        category: selectedItem.category,
        title: `Request: ${selectedItem.name}`
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        inventory_id: ''
      }));
    }
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
      priority: 'medium',
      inventory_id: ''
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

        {formData.type === 'device-request' && inventoryList.length > 0 && (
          <div className="form-group">
            <label htmlFor="inventory_id">Select from Available Admin Inventory (Optional)</label>
            <select
              id="inventory_id"
              name="inventory_id"
              value={formData.inventory_id}
              onChange={handleInventorySelect}
            >
              <option value="">-- Choose Item from Inventory --</option>
              {inventoryList.map(item => (
                <option key={item.id} value={item.id}>
                  {item.name} ({item.category}) - {item.quantity} available
                </option>
              ))}
            </select>
          </div>
        )}

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
            required
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
            required
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
              required
            >
              <option value="">Select category</option>
              {categories[formData.type]?.map(cat => (
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
        <h4>ℹ️ Request Guidelines</h4>
        <ul>
          <li>All submitted tickets will be routed according to your account role.</li>
          <li>For device requests, select an item from company inventory if available.</li>
          <li>Detailed descriptions help expedite approval.</li>
        </ul>
      </div>
    </div>
  );
}

export default CreateTicket;
