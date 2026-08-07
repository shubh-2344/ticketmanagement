import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { DevicesIcon, AlertIcon, UserIcon, CheckIcon } from './components/Icons';
import './CreateTicket.css';

function CreateTicket({ onSubmit, API_URL, initialDevice, currentUser }) {
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
    expected_return_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    serial_number: '',
    model_number: '',
    return_reason: 'Hardware Upgrade',
    assigned_device_name: ''
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
  const [assignedAssets, setAssignedAssets] = useState([]);

  useEffect(() => {
    fetchInventory();
    fetchManagers();
    fetchUserAssignedAssets();
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

  const fetchUserAssignedAssets = async () => {
    try {
      if (API_URL) {
        const response = await axios.get(`${API_URL}/user/assigned-assets`);
        setAssignedAssets(response.data);
      }
    } catch (err) {
      console.error('Error fetching user assigned assets:', err);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value
    }));
  };

  const handleTypeChange = (e) => {
    const newType = e.target.value;
    setFormData((prev) => ({
      ...prev,
      type: newType,
      category: newType === 'device-return' ? 'Hardware Return' : (newType === 'device-request' ? 'Laptop' : 'Access/Permission'),
      title: prev.title || (newType === 'device-return' ? 'Return Asset Request' : '')
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

  const handleAssignedAssetSelect = (e) => {
    const selectedTicketId = e.target.value;
    const selectedAsset = assignedAssets.find((a) => a.ticket_id === selectedTicketId);

    if (selectedAsset) {
      setFormData((prev) => ({
        ...prev,
        assigned_device_name: selectedAsset.assigned_device_name,
        inventory_id: selectedAsset.inventory_id || '',
        parent_ticket_id: selectedAsset.ticket_id,
        original_allocation_id: selectedAsset.ticket_id,
        title: `Return Asset: ${selectedAsset.assigned_device_name}`,
        model_number: selectedAsset.model_number || selectedAsset.assigned_device_name,
        serial_number: selectedAsset.serial_number || prev.serial_number
      }));
    } else {
      setFormData((prev) => ({
        ...prev,
        assigned_device_name: '',
        inventory_id: '',
        parent_ticket_id: '',
        original_allocation_id: ''
      }));
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    if (!formData.title.trim() || !formData.description.trim()) {
      alert('Please fill in all required fields');
      return;
    }

    if (formData.type === 'device-request' && !formData.manager_id) {
      alert('Please select a manager for approval');
      return;
    }

    if (formData.type === 'device-return') {
      if (!formData.serial_number.trim()) {
        alert('Asset Serial Number is required for asset return.');
        return;
      }
      if (!formData.model_number.trim()) {
        alert('Asset Model Number / Device Details are required for asset return.');
        return;
      }
      if (!formData.return_reason.trim()) {
        alert('Please select a Return Reason.');
        return;
      }
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
      expected_return_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      serial_number: '',
      model_number: '',
      return_reason: 'Hardware Upgrade',
      assigned_device_name: ''
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
    ],
    'device-return': [
      'Hardware Return',
      'Laptop Return',
      'Monitor Return',
      'Peripheral Return',
      'Other'
    ]
  };

  const isDirectToAdmin = formData.type === 'issue' || formData.type === 'device-return' || currentUser?.role === 'manager' || currentUser?.role === 'admin';

  return (
    <div className="create-ticket">
      <h2>Create New Ticket</h2>

      {currentUser?.role === 'manager' && (
        <div style={{ background: 'rgba(56, 189, 248, 0.1)', border: '1px solid rgba(56, 189, 248, 0.3)', borderRadius: '8px', padding: '12px 16px', marginBottom: '20px', color: '#38bdf8', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span>ℹ️</span> <strong>Manager Workflow:</strong> As a Manager, your ticket will be submitted directly to IT Administrator for fulfillment without additional approval layers.
        </div>
      )}

      <form onSubmit={handleSubmit} className="form">
        {!isDirectToAdmin && (
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
                  {mgr.name} ({mgr.role.toUpperCase()} - {mgr.email})
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
                onChange={handleTypeChange}
              />
              <span><DevicesIcon size={16} /> Device Request</span>
            </label>
            <label className="radio-label">
              <input
                type="radio"
                name="type"
                value="issue"
                checked={formData.type === 'issue'}
                onChange={handleTypeChange}
              />
              <span><AlertIcon size={16} /> Report Issue</span>
            </label>
            <label className="radio-label">
              <input
                type="radio"
                name="type"
                value="device-return"
                checked={formData.type === 'device-return'}
                onChange={handleTypeChange}
              />
              <span><CheckIcon size={16} /> Return Asset</span>
            </label>
          </div>
        </div>

        {/* RETURN ASSET SPECIFIC MANDATORY FIELDS */}
        {formData.type === 'device-return' && (
          <div className="return-asset-card" style={{ background: 'rgba(56, 189, 248, 0.08)', border: '1px solid rgba(56, 189, 248, 0.3)', padding: '18px', borderRadius: '10px', marginBottom: '20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <h3 style={{ margin: 0, fontSize: '15px', color: 'var(--accent)', display: 'flex', alignItems: 'center', gap: '8px' }}>
              Asset Return Information (Direct Admin Submission)
            </h3>

            {assignedAssets.length > 0 && (
              <div className="form-group">
                <label htmlFor="assigned_asset_select">Link to Allocated Asset Record (Optional)</label>
                <select
                  id="assigned_asset_select"
                  onChange={handleAssignedAssetSelect}
                >
                  <option value="">-- Choose from your allocated devices --</option>
                  {assignedAssets.map((asset) => (
                    <option key={asset.ticket_id} value={asset.ticket_id}>
                      {asset.assigned_device_name} (Assigned: {new Date(asset.assigned_at || Date.now()).toLocaleDateString()})
                    </option>
                  ))}
                </select>
                <span className="field-hint">Select a device from your active hardware allocation list to auto-fill asset details.</span>
              </div>
            )}

            <div className="form-row">
              <div className="form-group">
                <label htmlFor="serial_number">Asset Serial Number *</label>
                <input
                  type="text"
                  id="serial_number"
                  name="serial_number"
                  value={formData.serial_number}
                  onChange={handleChange}
                  placeholder="e.g. SN-998234-X"
                  required
                />
              </div>

              <div className="form-group">
                <label htmlFor="model_number">Model Number / Device Details *</label>
                <input
                  type="text"
                  id="model_number"
                  name="model_number"
                  value={formData.model_number}
                  onChange={handleChange}
                  placeholder="e.g. MacBook Pro 16 M3 Pro / Dell XPS 15"
                  required
                />
              </div>
            </div>

            <div className="form-group">
              <label htmlFor="return_reason">Reason for Return *</label>
              <select
                id="return_reason"
                name="return_reason"
                value={formData.return_reason}
                onChange={handleChange}
                required
              >
                <option value="Hardware Upgrade">Hardware Upgrade</option>
                <option value="Faulty / Damaged Hardware">Faulty / Damaged Hardware</option>
                <option value="Leaving Company / Offboarding">Leaving Company / Offboarding</option>
                <option value="Project Completed">Project Completed</option>
                <option value="No Longer Needed">No Longer Needed</option>
                <option value="Other">Other</option>
              </select>
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
            placeholder="Provide detailed description of your request, issue, or return details"
            rows={4}
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
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
            </select>
          </div>
        </div>

        <div className="form-actions">
          <button type="submit" className="btn btn-primary">
            {formData.type === 'device-return'
              ? 'Submit Asset Return directly to Admin'
              : (formData.type === 'issue' ? 'Submit Ticket directly to Admin' : 'Submit Request to Manager')}
          </button>
        </div>
      </form>

      <div className="info-box">
        {formData.type === 'device-return' ? (
          <>
            <h4>Asset Return Verification Workflow</h4>
            <ul>
              <li><strong>Stage 1:</strong> Submit Return Asset details (Serial #, Model #, Reason) directly to Admin.</li>
              <li><strong>Stage 2:</strong> Admin inspects hardware upon physical drop-off, restocks inventory, and completes the ticket.</li>
            </ul>
          </>
        ) : formData.type === 'issue' ? (
          <>
            <h4>Direct Admin Support Workflow</h4>
            <ul>
              <li><strong>Stage 1:</strong> Submit issue directly to the system Administrator.</li>
              <li><strong>Stage 2:</strong> Admin resolves, sets SLA tracking, and closes the ticket.</li>
            </ul>
          </>
        ) : (
          <>
            <h4>Multi-Stage Device Request Workflow</h4>
            <ul>
              <li><strong>Stage 1:</strong> Submit request to your assigned Manager.</li>
              <li><strong>Stage 2:</strong> Manager reviews request (Approve or Deny).</li>
              <li><strong>Stage 3:</strong> If approved, Admin assigns device & hardware specifications (Ticket closes upon assignment).</li>
            </ul>
          </>
        )}
      </div>
    </div>
  );
}

export default CreateTicket;
