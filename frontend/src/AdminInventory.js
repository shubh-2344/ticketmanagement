import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { InventoryIcon, PlusIcon, DevicesIcon, AlertIcon, SearchIcon, EditIcon, TrashIcon, XIcon, CategoryDeviceIcon } from './components/Icons';
import './AdminInventory.css';

function AdminInventory({ API_URL }) {
  const [inventory, setInventory] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');

  const [formData, setFormData] = useState({
    name: '',
    category: 'Laptop',
    quantity: 1,
    status: 'Available',
    description: ''
  });

  const categories = [
    'Laptop',
    'Desktop',
    'Monitor',
    'Keyboard & Mouse',
    'Headphones',
    'Phone',
    'Networking',
    'Accessories',
    'Other'
  ];

  const statuses = ['Available', 'Low Stock', 'Out of Stock', 'Maintenance'];

  useEffect(() => {
    fetchInventory();
  }, []);

  const fetchInventory = async () => {
    setLoading(true);
    try {
      const response = await axios.get(`${API_URL}/inventory`);
      setInventory(response.data);
      setError('');
    } catch (err) {
      console.error('Error fetching inventory:', err);
      setError('Failed to load inventory items.');
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value
    }));
  };

  const handleOpenAdd = () => {
    setEditingItem(null);
    setFormData({
      name: '',
      category: 'Laptop',
      quantity: 1,
      status: 'Available',
      description: ''
    });
    setShowAddModal(true);
  };

  const handleOpenEdit = (item) => {
    setEditingItem(item);
    setFormData({
      name: item.name,
      category: item.category,
      quantity: item.quantity,
      status: item.status,
      description: item.description || ''
    });
    setShowAddModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingItem) {
        await axios.put(`${API_URL}/inventory/${editingItem.id}`, formData);
        alert('Inventory item updated successfully!');
      } else {
        await axios.post(`${API_URL}/inventory`, formData);
        alert('Inventory item added successfully!');
      }
      setShowAddModal(false);
      fetchInventory();
    } catch (err) {
      console.error('Error saving inventory:', err);
      alert(err.response?.data?.error || 'Failed to save inventory item');
    }
  };

  const handleDelete = async (id, name) => {
    const confirmed = await window.showConfirm({
      title: 'Remove Inventory Item',
      message: `Are you sure you want to delete "${name}" from inventory?`,
      confirmText: 'Yes, Remove Item',
      cancelText: 'Cancel',
      confirmType: 'danger'
    });
    if (!confirmed) return;
    try {
      await axios.delete(`${API_URL}/inventory/${id}`);
      fetchInventory();
      alert('Inventory item removed.');
    } catch (err) {
      console.error('Error deleting item:', err);
      alert(err.response?.data?.error || 'Failed to delete item.');
    }
  };

  const filteredInventory = inventory.filter((item) =>
    item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.category.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const totalQuantity = inventory.reduce((sum, item) => sum + (parseInt(item.quantity, 10) || 0), 0);
  const outOfStockCount = inventory.filter((item) => item.quantity <= 0 || item.status === 'Out of Stock').length;

  return (
    <div className="admin-inventory">
      <div className="inventory-header">
        <div>
          <h2>Admin Inventory Management</h2>
          <p>Add, monitor, and manage company IT hardware & equipment</p>
        </div>
        <button className="btn-add-item" onClick={handleOpenAdd}>
          <PlusIcon size={16} /> Add New Item
        </button>
      </div>

      {/* Metric Cards */}
      <div className="inventory-metrics">
        <div className="metric-card">
          <div className="metric-icon" style={{ background: 'rgba(56, 189, 248, 0.15)', color: '#0284c7', border: '1px solid rgba(56, 189, 248, 0.3)' }}>
            <DevicesIcon size={22} style={{ color: '#0284c7' }} />
          </div>
          <div className="metric-info">
            <span className="metric-value">{inventory.length}</span>
            <span className="metric-label">Total Unique Models</span>
          </div>
        </div>

        <div className="metric-card">
          <div className="metric-icon" style={{ background: 'rgba(34, 197, 94, 0.15)', color: '#16a34a', border: '1px solid rgba(34, 197, 94, 0.3)' }}>
            <InventoryIcon size={22} style={{ color: '#16a34a' }} />
          </div>
          <div className="metric-info">
            <span className="metric-value">{totalQuantity}</span>
            <span className="metric-label">Total In Stock Units</span>
          </div>
        </div>

        <div className="metric-card warning">
          <div className="metric-icon" style={{ background: 'rgba(239, 68, 68, 0.15)', color: '#dc2626', border: '1px solid rgba(239, 68, 68, 0.3)' }}>
            <AlertIcon size={22} style={{ color: '#dc2626' }} />
          </div>
          <div className="metric-info">
            <span className="metric-value">{outOfStockCount}</span>
            <span className="metric-label">Out of Stock Items</span>
          </div>
        </div>
      </div>

      {/* Search & Filter */}
      <div className="inventory-controls">
        <input
          type="text"
          placeholder="Search inventory by name or category..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="search-input"
        />
      </div>

      {error && <div className="error-box">{error}</div>}

      {/* Inventory Table */}
      {loading ? (
        <div className="loading-state">Loading inventory data...</div>
      ) : filteredInventory.length === 0 ? (
        <div className="empty-inventory">
          <p>No inventory items found. Click "Add New Item" to create one!</p>
        </div>
      ) : (
        <div className="table-responsive">
          <table className="inventory-table">
            <thead>
              <tr>
                <th>Item Name</th>
                <th>Category</th>
                <th>Quantity</th>
                <th>Status</th>
                <th>Description</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredInventory.map((item) => (
                <tr key={item.id}>
                  <td className="font-semibold">
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <div style={{ width: '34px', height: '34px', borderRadius: '8px', background: 'var(--bg-body)', display: 'flex', alignItems: 'center', justifyContent: 'center', border: 'var(--border-card)' }}>
                        <CategoryDeviceIcon category={item.category} size={18} />
                      </div>
                      <span>{item.name}</span>
                    </div>
                  </td>
                  <td>
                    <span className="category-pill">{item.category}</span>
                  </td>
                  <td>
                    <strong className={item.quantity <= 0 ? 'text-red' : 'text-green'}>
                      {item.quantity} units
                    </strong>
                  </td>
                  <td>
                    <span
                      className={`status-badge-inv ${item.status.toLowerCase().replace(/\s+/g, '-')}`}
                    >
                      {item.status}
                    </span>
                  </td>
                  <td className="description-col">{item.description || 'N/A'}</td>
                  <td>
                    <div className="action-btns">
                      <button className="btn-edit" onClick={() => handleOpenEdit(item)}>
                        <EditIcon size={14} /> Edit
                      </button>
                      <button className="btn-delete" onClick={() => handleDelete(item.id, item.name)}>
                        <TrashIcon size={14} /> Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Add/Edit Modal */}
      {showAddModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h3>{editingItem ? 'Edit Inventory Item' : 'Add Inventory Item'}</h3>
              <button className="modal-close" onClick={() => setShowAddModal(false)}>
                <XIcon size={16} />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="modal-form">
              <div className="form-group">
                <label>Item Name *</label>
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  placeholder="e.g. MacBook Pro 16 Inch"
                  required
                />
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Category *</label>
                  <select name="category" value={formData.category} onChange={handleInputChange}>
                    {categories.map((cat) => (
                      <option key={cat} value={cat}>
                        {cat}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label>Quantity *</label>
                  <input
                    type="number"
                    name="quantity"
                    value={formData.quantity}
                    onChange={handleInputChange}
                    min="0"
                    required
                  />
                </div>
              </div>

              <div className="form-group">
                <label>Status *</label>
                <select name="status" value={formData.status} onChange={handleInputChange}>
                  {statuses.map((st) => (
                    <option key={st} value={st}>
                      {st}
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label>Description / Specifications</label>
                <textarea
                  name="description"
                  value={formData.description}
                  onChange={handleInputChange}
                  rows="3"
                  placeholder="Specs, warranty info, or asset tags"
                />
              </div>

              <div className="modal-actions">
                <button type="button" className="btn-cancel" onClick={() => setShowAddModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn-save">
                  {editingItem ? 'Update Item' : 'Save Item'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default AdminInventory;
