import React, { useEffect, useState } from 'react';
import { useStore } from '../store/useStore';

export const Snapshots: React.FC = () => {
  const {
    snapshots,
    fetchSnapshots,
    captureSnapshot,
    deleteSnapshot,
    restoreSnapshot,
    isLoading
  } = useStore();

  const [expandedId, setExpandedId] = useState<number | null>(null);

  useEffect(() => {
    fetchSnapshots();
  }, []);

  const toggleExpand = (id: number) => {
    setExpandedId(expandedId === id ? null : id);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      <div>
        <h1 className="view-title">Snapshots</h1>
        <p className="view-subtitle">Access version history and automatic workspace saves.</p>
      </div>

      {/* Snapshot Controller Card */}
      <div className="card">
        <h2 className="card-title">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"></path><circle cx="12" cy="13" r="4"></circle></svg>
          Snapshot Control
        </h2>
        <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
          Create a point-in-time restore point manually. Automatic snapshots are captured every interval (see Settings).
        </p>
        <div>
          <button className="btn btn-primary" onClick={() => captureSnapshot()} disabled={isLoading}>
            {isLoading ? 'Capturing...' : 'Capture Snapshot Now'}
          </button>
        </div>
      </div>

      {/* Snapshots List */}
      <div>
        <h2 style={{ fontSize: '1.2rem', fontWeight: 600, marginBottom: '12px' }}>Saved History</h2>
        {snapshots.length === 0 ? (
          <div style={{ padding: '64px', textAlign: 'center', backgroundColor: 'var(--bg-card)', border: '1px dashed var(--border-color)', borderRadius: '8px', color: 'var(--text-secondary)' }}>
            No snapshots found. Capture one above or check settings to verify auto-snapshots are active.
          </div>
        ) : (
          <div className="item-list">
            {snapshots.map((s) => {
              const appCount = s.data?.windows?.length || 0;
              const tabCount = s.data?.browser_tabs?.length || 0;
              const isExpanded = expandedId === s.id;
              
              return (
                <div key={s.id} style={{ display: 'flex', flexDirection: 'column', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-sm)', backgroundColor: 'var(--bg-card)', overflow: 'hidden' }}>
                  <div className="list-item" style={{ border: 'none', borderRadius: 0, padding: '16px' }}>
                    <div style={{ cursor: 'pointer', flex: 1 }} onClick={() => toggleExpand(s.id)}>
                      <div className="list-item-title" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        {s.name}
                        {s.name === 'Auto Snapshot' && (
                          <span style={{ fontSize: '0.7rem', backgroundColor: 'var(--accent-light)', color: 'var(--accent-color)', padding: '2px 6px', borderRadius: '4px', fontWeight: 600 }}>AUTO</span>
                        )}
                      </div>
                      <div className="list-item-desc">
                        Captured: {s.timestamp} • {appCount} Apps • {tabCount} Browser Tabs
                      </div>
                    </div>
                    
                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                      <button className="btn btn-primary" onClick={() => restoreSnapshot(s.id)} disabled={isLoading}>
                        Restore
                      </button>
                      <button className="btn btn-secondary" onClick={() => toggleExpand(s.id)}>
                        {isExpanded ? 'Hide Details' : 'Details'}
                      </button>
                      <button className="btn btn-danger" onClick={() => deleteSnapshot(s.id)}>
                        Delete
                      </button>
                    </div>
                  </div>

                  {/* Expanded Detail Panel */}
                  {isExpanded && (
                    <div style={{ padding: '16px', borderTop: '1px solid var(--border-color)', backgroundColor: 'var(--bg-app)', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                      {/* Windows list */}
                      <div>
                        <h4 style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '8px' }}>Applications ({appCount})</h4>
                        {appCount === 0 ? (
                          <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>No applications captured.</p>
                        ) : (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', maxHeight: '150px', overflowY: 'auto' }}>
                            {s.data.windows.map((win, idx) => (
                              <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', padding: '4px 8px', backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: '4px' }}>
                                <span style={{ fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '300px' }} title={win.title}>{win.title}</span>
                                <span style={{ color: 'var(--text-muted)' }}>{win.exe_path.split('\\').pop()}</span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>

                      {/* Browser Tabs list */}
                      <div>
                        <h4 style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '8px' }}>Browser Tabs ({tabCount})</h4>
                        {tabCount === 0 ? (
                          <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>No browser tabs captured.</p>
                        ) : (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', maxHeight: '150px', overflowY: 'auto' }}>
                            {s.data.browser_tabs.map((tab, idx) => (
                              <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', padding: '4px 8px', backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: '4px' }}>
                                <span style={{ fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '350px' }} title={tab.title}>{tab.title}</span>
                                <span style={{ color: 'var(--accent-color)' }}>{tab.browser.toUpperCase()}</span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
