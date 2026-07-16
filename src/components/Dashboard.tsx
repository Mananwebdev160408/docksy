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
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      <div>
        <h1 className="view-title">Welcome to Docksy</h1>
        <p className="view-subtitle">Save and restore your complete Windows desktop layouts instantly.</p>
      </div>

      <div className="dashboard-grid">
        {/* Quick Save Card */}
        <div className="card">
          <h2 className="card-title">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"></path><polyline points="17 21 17 13 7 13 7 21"></polyline><polyline points="7 3 7 8 15 8"></polyline></svg>
            Quick Save Workspace
          </h2>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
            Captures all open window coordinates, paths, explorer instances, and browser tabs.
          </p>
          <form onSubmit={handleSave} style={{ display: 'flex', gap: '10px', marginTop: '8px' }}>
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
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', fontSize: '0.9rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span>Browser Extension Connection:</span>
              <span 
                style={{ 
                  fontWeight: 600, 
                  color: extensionStatus === 'connected' ? 'var(--success-color)' : 'var(--danger-color)',
                  backgroundColor: extensionStatus === 'connected' ? 'rgba(16, 124, 65, 0.08)' : 'rgba(209, 52, 56, 0.08)',
                  padding: '2px 8px',
                  borderRadius: '12px',
                  fontSize: '0.8rem'
                }}
              >
                {extensionStatus === 'connected' ? 'ACTIVE' : 'INACTIVE'}
              </span>
            </div>
            <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
              To capture and restore browser tabs, install the Docksy extension in Chrome or Edge.
            </p>
            {monitors.length > 0 && (
              <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '10px', marginTop: '6px' }}>
                <div style={{ fontWeight: 600, fontSize: '0.8rem', marginBottom: '8px', color: 'var(--text-secondary)' }}>
                  Connected Displays ({monitors.length})
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  {monitors.map((m, idx) => (
                    <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem' }}>
                      <span style={{ fontWeight: 500 }}>{m.device.replace('\\\\.\\', '')} {m.is_primary ? '(Primary)' : ''}</span>
                      <span style={{ color: 'var(--text-muted)' }}>{m.rect.right - m.rect.left}x{m.rect.bottom - m.rect.top}</span>
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
        <div className="card" style={{ borderLeft: '4px solid var(--success-color)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h3 style={{ fontSize: '1rem', fontWeight: 600 }}>Last Restoration Summary</h3>
            <button className="btn-icon" onClick={() => setRestoreResults(null)}>✕</button>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '200px', overflowY: 'auto' }}>
            {restoreResults.map((item, idx) => (
              <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', padding: '6px 0', borderBottom: '1px solid var(--border-color)' }}>
                <span style={{ fontWeight: 500 }}>{item.app}</span>
                <span style={{ 
                  color: item.status.includes('fail') || item.status.includes('Missing') ? 'var(--danger-color)' : 'var(--text-secondary)'
                }}>{item.status}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Favorites / Workspaces Quick List */}
      <div>
        <h2 style={{ fontSize: '1.2rem', fontWeight: 600, marginBottom: '12px' }}>Favorite Workspaces</h2>
        {workspaces.filter(w => w.favorite).length === 0 ? (
          <div style={{ padding: '32px', textAlign: 'center', backgroundColor: 'var(--bg-card)', border: '1px dashed var(--border-color)', borderRadius: '8px', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
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
                <div style={{ display: 'flex', gap: '8px' }}>
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
