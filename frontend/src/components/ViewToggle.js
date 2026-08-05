import React from 'react';

function ViewToggle({ viewMode = 'grid', onViewModeChange }) {
  return (
    <div style={{ display: 'inline-flex', background: 'var(--bg-body)', padding: '3px', borderRadius: '8px', border: 'var(--border-card)' }}>
      <button
        onClick={() => onViewModeChange('grid')}
        style={{
          padding: '6px 12px',
          borderRadius: '6px',
          fontSize: '12px',
          fontWeight: '600',
          background: viewMode === 'grid' ? 'var(--accent, #38bdf8)' : 'transparent',
          color: viewMode === 'grid' ? '#ffffff' : 'var(--text-muted)',
          border: 'none',
          cursor: 'pointer',
          transition: 'all 0.2s ease',
          display: 'flex',
          alignItems: 'center',
          gap: '6px'
        }}
      >
        <span>Card View</span>
      </button>

      <button
        onClick={() => onViewModeChange('table')}
        style={{
          padding: '6px 12px',
          borderRadius: '6px',
          fontSize: '12px',
          fontWeight: '600',
          background: viewMode === 'table' ? 'var(--accent, #38bdf8)' : 'transparent',
          color: viewMode === 'table' ? '#ffffff' : 'var(--text-muted)',
          border: 'none',
          cursor: 'pointer',
          transition: 'all 0.2s ease',
          display: 'flex',
          alignItems: 'center',
          gap: '6px'
        }}
      >
        <span>List View</span>
      </button>
    </div>
  );
}

export default ViewToggle;
