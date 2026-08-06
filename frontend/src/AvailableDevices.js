import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { DevicesIcon, SearchIcon, CheckIcon, XIcon, PlusIcon } from './components/Icons';
import './AvailableDevices.css';

function AvailableDevices({ API_URL, onRequestDevice }) {
  const [devices, setDevices] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');

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
      <div className="devices-header">
        <div>
          <h2>Company Device Catalog</h2>
          <p>Browse available hardware equipment and request devices directly</p>
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

      {/* Device Grid */}
      {loading ? (
        <div className="loading-ai">
          <div className="spinner"></div>
          <span>Loading Device Catalog...</span>
        </div>
      ) : filteredDevices.length === 0 ? (
        <div className="empty-devices">
          <p>No devices found matching your search filter.</p>
        </div>
      ) : (
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
      )}
    </div>
  );
}

export default AvailableDevices;
