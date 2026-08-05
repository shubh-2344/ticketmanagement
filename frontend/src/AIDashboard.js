import React, { useState, useEffect } from 'react';
import axios from 'axios';

function AIDashboard({ API_URL, onSelectTicket }) {
  const [analysisData, setAnalysisData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filterMode, setFilterMode] = useState('all');

  useEffect(() => {
    fetchDiagnostics();
  }, []);

  const fetchDiagnostics = async () => {
    setLoading(true);
    try {
      const response = await axios.get(`${API_URL}/ai/analyze-tickets`);
      setAnalysisData(response.data);
      setError('');
    } catch (err) {
      console.error('Error fetching AI analytics:', err);
      setError('AI Diagnostics endpoint failed to respond. Ensure the backend server is running.');
    } finally {
      setLoading(false);
    }
  };

  const handleDismissDuplicate = (ticketId) => {
    if (!analysisData) return;
    
    // Simulate dismissing a duplicate check in UI
    const updatedAnalysis = analysisData.analysis.map(item => {
      if (item.ticket_id === ticketId) {
        return { ...item, isPotentialDuplicate: false };
      }
      return item;
    });

    // Recompute duplicate count summary
    const newDuplicateCount = updatedAnalysis.filter(a => a.status !== 'closed' && a.isPotentialDuplicate).length;

    setAnalysisData({
      analysis: updatedAnalysis,
      summary: {
        ...analysisData.summary,
        totalDuplicates: newDuplicateCount
      }
    });

    alert('Duplicate warning dismissed. AI model catalog updated.');
  };

  if (loading) {
    return (
      <div className="loading-ai" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '300px', color: '#c084fc' }}>
        <div className="spinner" style={{ width: '40px', height: '40px', border: '3px solid rgba(192, 132, 252, 0.2)', borderTopColor: '#c084fc', borderRadius: '50%', animation: 'spin 1s linear infinite' }}></div>
        <p style={{ marginTop: '16px', fontSize: '14px' }}>AI Copilot analyzing ticket workloads & SLA breaches...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ color: '#f43f5e', background: 'rgba(244, 63, 94, 0.1)', border: '1px solid rgba(244, 63, 94, 0.2)', padding: '20px', borderRadius: '12px', margin: '20px 0' }}>
        <h3>🤖 AI Model Connection Failed</h3>
        <p>{error}</p>
      </div>
    );
  }

  const { analysis, summary } = analysisData;

  const getFilteredAnalysis = () => {
    if (filterMode === 'all') return analysis;
    if (filterMode === 'risks') return analysis.filter(a => a.status !== 'closed' && (a.slaRisk === 'critical' || a.slaRisk === 'breached'));
    if (filterMode === 'duplicates') return analysis.filter(a => a.status !== 'closed' && a.isPotentialDuplicate);
    return analysis;
  };

  const getRiskColor = (risk) => {
    switch (risk) {
      case 'breached': return '#ef4444';
      case 'critical': return '#f97316';
      case 'medium': return '#eab308';
      default: return '#10b981';
    }
  };

  return (
    <div style={{ color: 'var(--text-main)', display: 'flex', flexDirection: 'column', gap: '24px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h2 style={{ fontSize: '22px', fontWeight: '700', color: 'var(--text-main)', margin: '0 0 4px 0' }}>🤖 AI Copilot Intelligent Insights</h2>
          <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: '13px' }}>Automatic prioritization, category assignment, duplication filters, and agent workload optimizer.</p>
        </div>
      </div>

      {/* AI Summary KPIs */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '20px' }}>
        <div style={{ background: 'rgba(99, 102, 241, 0.08)', border: '1px dashed rgba(99, 102, 241, 0.3)', borderRadius: 'var(--radius-card)', padding: '20px', boxShadow: 'var(--shadow)', backdropFilter: 'var(--backdrop)' }}>
          <div style={{ fontSize: '12px', color: '#a5b4fc', textTransform: 'uppercase', fontWeight: '700', letterSpacing: '0.5px' }}>Open Tickets (AI Analyzed)</div>
          <div style={{ fontSize: '32px', fontWeight: '800', marginTop: '6px' }}>{summary.totalOpen} Tickets</div>
        </div>

        <div style={{ background: 'rgba(249, 115, 22, 0.08)', border: '1px dashed rgba(249, 115, 22, 0.3)', borderRadius: 'var(--radius-card)', padding: '20px', boxShadow: 'var(--shadow)', backdropFilter: 'var(--backdrop)' }}>
          <div style={{ fontSize: '12px', color: '#fdba74', textTransform: 'uppercase', fontWeight: '700', letterSpacing: '0.5px' }}>SLA Critical Risk</div>
          <div style={{ fontSize: '32px', fontWeight: '800', marginTop: '6px', color: '#f97316' }}>{summary.totalHighRisk} Tickets</div>
        </div>

        <div style={{ background: 'rgba(239, 68, 68, 0.08)', border: '1px dashed rgba(239, 68, 68, 0.3)', borderRadius: 'var(--radius-card)', padding: '20px', boxShadow: 'var(--shadow)', backdropFilter: 'var(--backdrop)' }}>
          <div style={{ fontSize: '12px', color: '#fca5a5', textTransform: 'uppercase', fontWeight: '700', letterSpacing: '0.5px' }}>SLA Breached</div>
          <div style={{ fontSize: '32px', fontWeight: '800', marginTop: '6px', color: '#ef4444' }}>{summary.totalBreached} Tickets</div>
        </div>

        <div style={{ background: 'rgba(192, 132, 252, 0.08)', border: '1px dashed rgba(192, 132, 252, 0.3)', borderRadius: 'var(--radius-card)', padding: '20px', boxShadow: 'var(--shadow)', backdropFilter: 'var(--backdrop)' }}>
          <div style={{ fontSize: '12px', color: '#d8b4fe', textTransform: 'uppercase', fontWeight: '700', letterSpacing: '0.5px' }}>Duplicate Alerts</div>
          <div style={{ fontSize: '32px', fontWeight: '800', marginTop: '6px', color: '#c084fc' }}>{summary.totalDuplicates} Matches</div>
        </div>
      </div>

      {/* Filter Tabs */}
      <div style={{ display: 'flex', gap: '12px' }}>
        <button 
          onClick={() => setFilterMode('all')} 
          style={{ padding: '8px 16px', borderRadius: '8px', fontSize: '13px', cursor: 'pointer', background: filterMode === 'all' ? 'var(--accent)' : 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: '#ffffff' }}
        >
          All Scanned Items ({analysis.length})
        </button>
        <button 
          onClick={() => setFilterMode('risks')} 
          style={{ padding: '8px 16px', borderRadius: '8px', fontSize: '13px', cursor: 'pointer', background: filterMode === 'risks' ? '#f97316' : 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: '#ffffff' }}
        >
          SLA Danger Warnings ({summary.totalHighRisk + summary.totalBreached})
        </button>
        <button 
          onClick={() => setFilterMode('duplicates')} 
          style={{ padding: '8px 16px', borderRadius: '8px', fontSize: '13px', cursor: 'pointer', background: filterMode === 'duplicates' ? '#c084fc' : 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: '#ffffff' }}
        >
          Duplicate Matches ({summary.totalDuplicates})
        </button>
      </div>

      {/* AI Diagnosis Cards List */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        {getFilteredAnalysis().map(item => (
          <div 
            key={item.ticket_id} 
            style={{ 
              background: 'var(--bg-card)', 
              border: item.isPotentialDuplicate ? '1px dashed #c084fc' : 'var(--border-card)', 
              borderRadius: 'var(--radius-card)', 
              padding: '24px', 
              boxShadow: 'var(--shadow)', 
              backdropFilter: 'var(--backdrop)',
              display: 'flex',
              flexDirection: 'column',
              gap: '14px'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '12px' }}>
              <div>
                <h3 style={{ fontSize: '16px', fontWeight: '700', margin: '0 0 4px 0', cursor: 'pointer' }} onClick={() => onSelectTicket(item.ticket_id)}>
                  {item.title}
                </h3>
                <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Requester: {item.requester_name} | ID: {item.ticket_id}</span>
              </div>
              <div style={{ display: 'flex', gap: '8px' }}>
                <span style={{
                  padding: '4px 8px',
                  borderRadius: '12px',
                  fontSize: '10px',
                  fontWeight: '700',
                  backgroundColor: `rgba(56, 189, 248, 0.15)`,
                  color: '#38bdf8',
                  border: '1px solid rgba(56, 189, 248, 0.3)'
                }}>
                  🏷️ {item.aiCategory}
                </span>

                <span style={{
                  padding: '4px 8px',
                  borderRadius: '12px',
                  fontSize: '10px',
                  fontWeight: '700',
                  backgroundColor: getRiskColor(item.slaRisk) + '20',
                  color: getRiskColor(item.slaRisk),
                  border: `1px solid ${getRiskColor(item.slaRisk)}50`
                }}>
                  SLA: {item.slaRisk.toUpperCase()}
                </span>
              </div>
            </div>

            <div style={{ background: 'rgba(15, 23, 42, 0.4)', padding: '12px 16px', borderRadius: '8px', fontSize: '13px', borderLeft: '3px solid #818cf8' }}>
              <strong>AI Analysis Summary:</strong> {item.aiSummary}
            </div>

            {item.isPotentialDuplicate && (
              <div style={{ background: 'rgba(192, 132, 252, 0.08)', padding: '12px 16px', borderRadius: '8px', fontSize: '12px', border: '1px solid rgba(192, 132, 252, 0.25)', color: '#d8b4fe', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span>⚠️ <strong>AI Duplicate Alert:</strong> Matches ticket content closely with duplicate ticket ID. Dismiss if verified.</span>
                <button 
                  onClick={() => handleDismissDuplicate(item.ticket_id)}
                  style={{ padding: '4px 10px', background: '#c084fc', border: 'none', borderRadius: '4px', color: '#000000', fontWeight: '700', cursor: 'pointer', fontSize: '11px' }}
                >
                  Dismiss Alert
                </button>
              </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px', borderTop: '1px solid rgba(255,255,255,0.04)', paddingTop: '12px' }}>
              <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                Queue Recommendation: <strong style={{ color: '#c084fc' }}>{item.recommendedEngineer}</strong>
              </span>
              <button 
                onClick={() => onSelectTicket(item.ticket_id)}
                style={{ padding: '6px 12px', borderRadius: '6px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: '#ffffff', cursor: 'pointer', fontSize: '12px' }}
              >
                Inspect Ticket Detail →
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default AIDashboard;
