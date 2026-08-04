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
    manager_name: ''
  });

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

    if (!formData.manager_id) {
      alert('Please select a manager for approval');
      return;
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
      manager_name: managerList.length > 0 ? managerList[0].name : ''
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
            Submit Request to Manager
          </button>
        </div>
      </form>

      <div className="info-box">
        <h4>🔄 Multi-Stage Ticket Workflow</h4>
        <ul>
          <li><strong>Stage 1:</strong> Submit request to your assigned Manager.</li>
          <li><strong>Stage 2:</strong> Manager reviews request (Approve or Deny).</li>
          <li><strong>Stage 3:</strong> If approved, Admin assigns device & hardware specifications.</li>
        </ul>
      </div>
    </div>
  );
}

export default CreateTicket;
