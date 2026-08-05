import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './CreateTicket.css';

function CreateTicket({ onSubmit, API_URL, initialDevice }) {
  const [formData, setFormData] = useState({
    title: initialDevice ? `Request: ${initialDevice.name}` : '',
    description: initialDevice ? `Requesting company device: ${initialDevice.name} (${initialDevice.description || ''})` : '',
    type: initialDevice ? 'device-request' : 'issue',
    category: initialDevice ? initialDevice.category : 'general',
    priority: 'medium',
    inventory_id: initialDevice ? initialDevice.id : '',
    manager_id: '',
    manager_name: '',
    reservation_duration: '30',
    expected_return_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
  });

  useEffect(() => {
    if (formData.reservation_duration !== 'custom') {
      const days = parseInt(formData.reservation_duration, 10) || 30;
      const calculatedDate = new Date(Date.now() + days * 24 * 60 * 60 * 1000);
      setFormData((prev) => ({
        ...prev,
        expected_return_date: calculatedDate.toISOString().split('T')[0]
      }));
    }
  }, [formData.reservation_duration]);

  const [inventoryList, setInventoryList] = useState([]);
  const [managerList, setManagerList] = useState([]);

  useEffect(() => {
    fetchInventory();
    fetchManagers();
  }, []);

  useEffect(() => {
    if (initialDevice) {
      setFormData((prev) => ({
        ...prev,
        title: `Request: ${initialDevice.name}`,
        description: `Requesting company device: ${initialDevice.name} (${initialDevice.description || ''})`,
        type: 'device-request',
        category: initialDevice.category,
        priority: 'medium',
        inventory_id: initialDevice.id
      }));
    }
  }, [initialDevice]);

  const fetchInventory = async () => {
    try {
      if (API_URL) {
        const response = await axios.get(`${API_URL}/inventory`);
        setInventoryList(response.data.filter((item) => item.quantity > 0));
      }
    } catch (err) {
      console.error('Error loading inventory for ticket creation:', err);
    }
  };

  const fetchManagers = async () => {
    try {
      if (API_URL) {
        const response = await axios.get(`${API_URL}/managers`);
        setManagerList(response.data);
        if (response.data.length > 0) {
          setFormData((prev) => ({
            ...prev,
            manager_id: response.data[0].id,
            manager_name: response.data[0].name
          }));
        }
      }
    } catch (err) {
      console.error('Error loading managers:', err);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value
    }));
  };

  const handleManagerSelect = (e) => {
    const mgrId = e.target.value;
    const selectedMgr = managerList.find((m) => m.id === mgrId);
    setFormData((prev) => ({
      ...prev,
      manager_id: mgrId,
      manager_name: selectedMgr ? selectedMgr.name : ''
    }));
  };

  const handleInventorySelect = (e) => {
    const selectedId = e.target.value;
    const selectedItem = inventoryList.find((i) => i.id === selectedId);

    if (selectedItem) {
      setFormData((prev) => ({
        ...prev,
        inventory_id: selectedId,
        category: selectedItem.category,
        title: `Request: ${selectedItem.name}`
      }));
    } else {
      setFormData((prev) => ({
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

    if (formData.type !== 'issue' && !formData.manager_id) {
      alert('Please select a manager for approval');
      return;
    }

    if (formData.type === 'device-request') {
      const selectedDate = new Date(formData.expected_return_date);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      if (selectedDate <= today) {
        alert('Expected return date must be in the future.');
        return;
      }
    }

    onSubmit(formData);
    setFormData({
      title: '',
      description: '',
      type: 'issue',
      category: 'general',
      priority: 'medium',
      inventory_id: '',
      manager_id: managerList.length > 0 ? managerList[0].id : '',
      manager_name: managerList.length > 0 ? managerList[0].name : '',
      reservation_duration: '30',
      expected_return_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
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
    issue: [
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
        {formData.type !== 'issue' && (
          <div className="form-group">
            <label htmlFor="manager_id">Assign Specific Manager for Approval *</label>
            <select
              id="manager_id"
              name="manager_id"
              value={formData.manager_id}
              onChange={handleManagerSelect}
              required
              className="manager-select-highlight"
            >
              {managerList.map((mgr) => (
                <option key={mgr.id} value={mgr.id}>
                  👤 {mgr.name} ({mgr.role.toUpperCase()} - {mgr.email})
                </option>
              ))}
            </select>
            <span className="field-hint">The assigned manager will review and approve/deny this request first.</span>
          </div>
        )}

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
              <span>🔧 Report Issue</span>
            </label>
          </div>
        </div>

        {formData.type === 'issue' && (
          <div className="admin-direct-banner" style={{ background: 'rgba(56, 189, 248, 0.1)', border: '1px solid rgba(56, 189, 248, 0.3)', padding: '14px 16px', borderRadius: '10px', marginBottom: '20px', color: '#38bdf8', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{ fontSize: '20px' }}>🛡️</span>
            <div>
              <strong style={{ display: 'block', fontSize: '13.5px', color: '#f8fafc', marginBottom: '2px' }}>Direct System Administrator Route</strong>
              <span>Issue reports submit directly to System Administrators & Specialist Engineers for immediate resolution, bypassing manager review.</span>
            </div>
          </div>
        )}

        {formData.type === 'device-request' && (
          <div className="form-group">
            <label htmlFor="inventory_id">Select Item from Company Inventory (Optional)</label>
            <select
              id="inventory_id"
              name="inventory_id"
              value={formData.inventory_id}
              onChange={handleInventorySelect}
            >
              <option value="">-- Choose Item from Catalog --</option>
              {inventoryList.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name} ({item.category}) - {item.quantity} available
                </option>
              ))}
            </select>
          </div>
        )}

        {formData.type === 'device-request' && (
          <div className="form-row">
            <div className="form-group">
              <label htmlFor="reservation_duration">Required Reservation Duration *</label>
              <select
                id="reservation_duration"
                name="reservation_duration"
                value={formData.reservation_duration}
                onChange={handleChange}
                required
              >
                <option value="7">7 Days (1 Week)</option>
                <option value="14">14 Days (2 Weeks)</option>
                <option value="30">30 Days (1 Month)</option>
                <option value="custom">Custom Return Date</option>
              </select>
            </div>

            <div className="form-group">
              <label htmlFor="expected_return_date">Expected Return Date *</label>
              <input
                type="date"
                id="expected_return_date"
                name="expected_return_date"
                value={formData.expected_return_date}
                onChange={handleChange}
                disabled={formData.reservation_duration !== 'custom'}
                required
              />
              <span className="field-hint">Date when the device will be returned to inventory.</span>
            </div>
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
              {categories[formData.type]?.map((cat) => (
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
            {formData.type === 'issue' ? 'Submit Ticket directly to Admin' : 'Submit Request to Manager'}
          </button>
        </div>
      </form>

      <div className="info-box">
        {formData.type === 'issue' ? (
          <>
            <h4>⚡ Direct Admin Support Workflow</h4>
            <ul>
              <li><strong>Stage 1:</strong> Submit issue directly to the system Administrator.</li>
              <li><strong>Stage 2:</strong> Admin resolves, sets SLA tracking, and closes the ticket.</li>
            </ul>
          </>
        ) : (
          <>
            <h4>🔄 Multi-Stage Device Request Workflow</h4>
            <ul>
              <li><strong>Stage 1:</strong> Submit request to your assigned Manager.</li>
              <li><strong>Stage 2:</strong> Manager reviews request (Approve or Deny).</li>
              <li><strong>Stage 3:</strong> If approved, Admin assigns device & hardware specifications.</li>
            </ul>
          </>
        )}
      </div>
    </div>
  );
}

export default CreateTicket;
