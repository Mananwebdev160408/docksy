import React, { useState, useEffect } from 'react';
import { useStore } from '../store/useStore';

export const Dashboard: React.FC = () => {
  const {
    workspaces,
    saveWorkspace,
    restoreWorkspace,
    isLoading,
    fetchWorkspaces
  } = useStore();

  const [newWorkspaceName, setNewWorkspaceName] = useState('');
  const [monitors, setMonitors] = useState<any[]>([]);
  const [extensionStatus, setExtensionStatus] = useState<'connected' | 'disconnected'>('disconnected');
  const [restoreResults, setRestoreResults] = useState<any[] | null>(null);

  useEffect(() => {
    fetchWorkspaces();
    fetchSystemStatus();
    
    // Poll system status every 5 seconds
    const interval = setInterval(fetchSystemStatus, 5000);
    return () => clearInterval(interval);
  }, []);

  const fetchSystemStatus = async () => {
    try {
      const res = await fetch('http://127.0.0.1:19082/api/status');
      if (res.ok) {
        const data = await res.json();
        if (data.browsers_connected && data.browsers_connected.length > 0) {
          setExtensionStatus('connected');
        } else {
          setExtensionStatus('disconnected');
        }
        if (data.monitors) {
          setMonitors(data.monitors);
        }
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newWorkspaceName.trim()) return;
    await saveWorkspace(newWorkspaceName.trim());
    setNewWorkspaceName('');
  };

  const handleRestore = async (id: number) => {
    setRestoreResults(null);
    const res = await restoreWorkspace(id);
    if (res && res.summary) {
      setRestoreResults(res.summary);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
      <div className="view-header">
        <div className="view-title-group">
          <h1 className="view-title">Welcome to Docksy</h1>
          <p className="view-subtitle">Save and restore your complete Windows desktop layouts instantly.</p>
        </div>
      </div>

      <div className="dashboard-grid">
        {/* Quick Save Card */}
        <div className="card">
          <h2 className="card-title">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"></path><polyline points="17 21 17 13 7 13 7 21"></polyline><polyline points="7 3 7 8 15 8"></polyline></svg>
            Quick Save Workspace
          </h2>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', lineHeight: 1.4 }}>
            Captures all open window coordinates, paths, explorer instances, and browser tabs.
          </p>
          <form onSubmit={handleSave} style={{ display: 'flex', gap: '12px', marginTop: '4px' }}>
            <input
              type="text"
              placeholder="e.g. Office, DSA, Gaming"
              value={newWorkspaceName}
              onChange={(e) => setNewWorkspaceName(e.target.value)}
              style={{ flex: 1 }}
              required
              disabled={isLoading}
            />
            <button className="btn btn-primary" type="submit" disabled={isLoading || !newWorkspaceName.trim()}>
              {isLoading ? 'Saving...' : 'Save Current'}
            </button>
          </form>
        </div>

        {/* Integration Status Card */}
        <div className="card">
          <h2 className="card-title">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"></circle><line x1="2" y1="12" x2="22" y2="12"></line><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"></path></svg>
            System Status
          </h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', fontSize: '0.9rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>Browser Extension:</span>
              <span 
                style={{ 
                  fontWeight: 700, 
                  color: extensionStatus === 'connected' ? 'var(--success-color)' : 'var(--danger-color)',
                  backgroundColor: extensionStatus === 'connected' ? 'var(--success-bg)' : 'var(--danger-bg)',
                  border: `1px solid ${extensionStatus === 'connected' ? 'var(--success-color)' : 'var(--danger-color)'}`,
                  padding: '4px 12px',
                  borderRadius: '16px',
                  fontSize: '0.75rem',
                  letterSpacing: '0.5px'
                }}
              >
                {extensionStatus === 'connected' ? 'ACTIVE' : 'INACTIVE'}
              </span>
            </div>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', lineHeight: 1.4, marginTop: '-6px' }}>
              To capture browser tabs, install the Docksy extension in Chrome or Edge.
            </p>
            {monitors.length > 0 && (
              <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '16px', marginTop: '4px' }}>
                <div style={{ fontWeight: 700, fontSize: '0.8rem', marginBottom: '12px', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  Connected Displays ({monitors.length})
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {monitors.map((m, idx) => (
                    <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.8rem', padding: '8px 12px', backgroundColor: 'var(--bg-app)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-sm)' }}>
                      <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{m.device.replace('\\\\.\\', '')} {m.is_primary ? '(Primary)' : ''}</span>
                      <span style={{ color: 'var(--text-secondary)', fontFamily: 'monospace', fontSize: '0.75rem' }}>{m.rect.right - m.rect.left} × {m.rect.bottom - m.rect.top}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Restoration Results summary */}
      {restoreResults && (
        <div className="alert alert-success">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>
              <h3 style={{ fontSize: '0.95rem', fontWeight: 700 }}>Last Restoration Summary</h3>
            </div>
            <button className="btn-icon" onClick={() => setRestoreResults(null)} style={{ color: 'var(--text-secondary)' }}>✕</button>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', maxHeight: '200px', overflowY: 'auto', marginTop: '6px' }}>
            {restoreResults.map((item, idx) => (
              <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', padding: '8px 12px', backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-sm)' }}>
                <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{item.app}</span>
                <span style={{ 
                  color: item.status.includes('fail') || item.status.includes('Missing') ? 'var(--danger-color)' : 'var(--text-secondary)',
                  fontWeight: 600
                }}>{item.status}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Favorites / Workspaces Quick List */}
      <div>
        <h2 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '16px', color: 'var(--text-primary)' }}>Favorite Workspaces</h2>
        {workspaces.filter(w => w.favorite).length === 0 ? (
          <div style={{ padding: '40px', textAlign: 'center', backgroundColor: 'var(--bg-card)', border: '1px dashed var(--border-color)', borderRadius: 'var(--radius-md)', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
            No favorites yet. Toggle stars on your Workspaces tab to list them here.
          </div>
        ) : (
          <div className="item-list">
            {workspaces.filter(w => w.favorite).map((w) => (
              <div key={w.id} className="list-item">
                <div>
                  <div className="list-item-title">{w.name}</div>
                  <div className="list-item-desc">
                    Saved on {w.created_at} • {w.app_count || 0} Apps • {w.tab_count || 0} Browser Tabs
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '12px' }}>
                  <button className="btn btn-secondary" onClick={() => handleRestore(w.id)} disabled={isLoading}>
                    Restore
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
