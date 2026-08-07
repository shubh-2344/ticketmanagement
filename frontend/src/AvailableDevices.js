import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { DevicesIcon, SearchIcon, CheckIcon, XIcon, PlusIcon, DashboardIcon, FileTextIcon } from './components/Icons';
import './AvailableDevices.css';

function AvailableDevices({ API_URL, onRequestDevice }) {
  const [devices, setDevices] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [viewMode, setViewMode] = useState('grid'); // 'grid' or 'list'

  useEffect(() => {
    fetchDevices();
  }, []);

  const fetchDevices = async () => {
    setLoading(true);
    try {
      const response = await axios.get(`${API_URL}/inventory`);
      setDevices(response.data);
    } catch (err) {
      console.error('Error fetching available devices:', err);
    } finally {
      setLoading(false);
    }
  };

  const categories = ['All', ...new Set(devices.map((d) => d.category))];

  const filteredDevices = devices.filter((device) => {
    const matchesSearch =
      device.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (device.description && device.description.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesCategory = selectedCategory === 'All' || device.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  return (
    <div className="available-devices-container">
      <div className="devices-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h2>Company Device Catalog</h2>
          <p>Browse available hardware equipment and request devices directly</p>
        </div>

        {/* View Mode Toggle Buttons */}
        <div style={{ display: 'flex', gap: '6px', background: 'var(--bg-card)', padding: '4px', borderRadius: '8px', border: 'var(--border-card)' }}>
          <button
            onClick={() => setViewMode('grid')}
            style={{
              padding: '6px 12px',
              borderRadius: '6px',
              border: 'none',
              fontSize: '12px',
              fontWeight: '600',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              background: viewMode === 'grid' ? 'var(--accent)' : 'transparent',
              color: viewMode === 'grid' ? '#ffffff' : 'var(--text-muted)'
            }}
          >
            <DashboardIcon size={14} /> Grid Cards
          </button>
          <button
            onClick={() => setViewMode('list')}
            style={{
              padding: '6px 12px',
              borderRadius: '6px',
              border: 'none',
              fontSize: '12px',
              fontWeight: '600',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              background: viewMode === 'list' ? 'var(--accent)' : 'transparent',
              color: viewMode === 'list' ? '#ffffff' : 'var(--text-muted)'
            }}
          >
            <FileTextIcon size={14} /> List View
          </button>
        </div>
      </div>

      {/* Filter Controls */}
      <div className="devices-controls">
        <input
          type="text"
          placeholder="Search devices by name or specification..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="search-input"
        />

        <div className="category-tabs">
          {categories.map((cat) => (
            <button
              key={cat}
              className={`cat-tab ${selectedCategory === cat ? 'active' : ''}`}
              onClick={() => setSelectedCategory(cat)}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Device Grid or List View */}
      {loading ? (
        <div className="loading-ai">
          <div className="spinner"></div>
          <span>Loading Device Catalog...</span>
        </div>
      ) : filteredDevices.length === 0 ? (
        <div className="empty-devices">
          <p>No devices found matching your search filter.</p>
        </div>
      ) : viewMode === 'grid' ? (
        <div className="devices-grid">
          {filteredDevices.map((device) => {
            const isAvailable = device.quantity > 0 && device.status === 'Available';

            return (
              <div key={device.id} className="device-card">
                <div className="device-card-header">
                  <span className="device-icon"><DevicesIcon size={24} style={{ color: 'var(--accent)' }} /></span>
                  <span className="category-tag">{device.category}</span>
                </div>

                <h3>{device.name}</h3>
                <p className="device-desc">{device.description || 'Standard company issued hardware equipment.'}</p>

                <div className="device-stock-info">
                  <span className="stock-label">Stock Status:</span>
                  <span className={`stock-badge ${isAvailable ? 'available' : 'out-of-stock'}`}>
                    {isAvailable ? `In Stock (${device.quantity} units)` : 'Out of Stock'}
                  </span>
                </div>

                <div className="device-card-footer">
                  <button
                    className={`btn-request-device ${!isAvailable ? 'disabled' : ''}`}
                    disabled={!isAvailable}
                    onClick={() => isAvailable && onRequestDevice(device)}
                  >
                    {isAvailable ? <><PlusIcon size={14} /> Request Device</> : 'Unavailable'}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* TABLE / LIST VIEW */
        <div style={{ background: 'var(--bg-card)', border: 'var(--border-card)', borderRadius: 'var(--radius-card)', overflow: 'hidden', boxShadow: 'var(--shadow)', width: '100%' }}>
          <div style={{ width: '100%' }}>
            <table style={{ width: '100%', tableLayout: 'fixed', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px', color: 'var(--text-main)' }}>
              <thead>
                <tr style={{ background: 'rgba(0,0,0,0.15)', borderBottom: 'var(--border-card)', color: 'var(--text-muted)', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  <th style={{ width: '25%' }}>Device Name</th>
                  <th className="col-category" style={{ width: '18%' }}>Category</th>
                  <th style={{ width: '32%' }}>Description</th>
                  <th style={{ width: '13%' }}>Stock Units</th>
                  <th style={{ width: '12%', textAlign: 'right' }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {filteredDevices.map((device) => {
                  const isAvailable = device.quantity > 0 && device.status === 'Available';

                  return (
                    <tr key={device.id} style={{ borderBottom: 'var(--border-card)', verticalAlign: 'middle' }}>
                      <td style={{ fontWeight: '700', wordBreak: 'break-word' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <DevicesIcon size={16} style={{ color: 'var(--accent)' }} />
                          <span>{device.name}</span>
                        </div>
                      </td>
                      <td className="col-category">
                        <span className="category-tag">{device.category}</span>
                      </td>
                      <td style={{ color: 'var(--text-muted)', wordBreak: 'break-word' }}>
                        {device.description || 'Standard company issued hardware equipment.'}
                      </td>
                      <td style={{ fontWeight: '700' }}>
                        {device.quantity} units
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        <button
                          className={`btn-request-device ${!isAvailable ? 'disabled' : ''}`}
                          disabled={!isAvailable}
                          onClick={() => isAvailable && onRequestDevice(device)}
                          style={{ padding: '6px 14px', fontSize: '12px' }}
                        >
                          {isAvailable ? <><PlusIcon size={14} /> Request Device</> : 'Unavailable'}
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

export default AvailableDevices;
