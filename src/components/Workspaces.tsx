import React, { useState, useEffect } from 'react';
import { useStore, Workspace } from '../store/useStore';

export const Workspaces: React.FC = () => {
  const {
    workspaces,
    fetchWorkspaces,
    restoreWorkspace,
    deleteWorkspace,
    renameWorkspace,
    favoriteWorkspace,
    duplicateWorkspace,
    isLoading
  } = useStore();

  const [editId, setEditId] = useState<number | null>(null);
  const [editName, setEditName] = useState('');

  useEffect(() => {
    fetchWorkspaces();
  }, []);

  const handleStartRename = (w: Workspace) => {
    setEditId(w.id);
    setEditName(w.name);
  };

  const handleSaveRename = async (id: number) => {
    if (!editName.trim()) return;
    await renameWorkspace(id, editName.trim());
    setEditId(null);
  };

  const handleCancelRename = () => {
    setEditId(null);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
      <div className="view-header">
        <div className="view-title-group">
          <h1 className="view-title">Workspaces</h1>
          <p className="view-subtitle">Manage, duplicate, and restore your saved desktop configurations.</p>
        </div>
      </div>

      {workspaces.length === 0 ? (
        <div style={{ padding: '48px', textAlign: 'center', backgroundColor: 'var(--bg-card)', border: '1px dashed var(--border-color)', borderRadius: 'var(--radius-md)', color: 'var(--text-secondary)' }}>
          No workspaces saved yet. Capture your first one from the Dashboard!
        </div>
      ) : (
        <div className="item-list">
          {workspaces.map((w) => (
            <div key={w.id} className="list-item">
              <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flex: 1 }}>
                {/* Favorite Star */}
                <button 
                  className="btn-icon" 
                  onClick={() => favoriteWorkspace(w.id, !w.favorite)}
                  style={{ color: w.favorite ? 'var(--warning-color)' : 'var(--text-muted)' }}
                  title={w.favorite ? 'Remove Favorite' : 'Mark Favorite'}
                >
                  <svg width="20" height="20" viewBox="0 0 24 24" fill={w.favorite ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon></svg>
                </button>

                {/* Edit Form or Info */}
                {editId === w.id ? (
                  <div style={{ display: 'flex', gap: '12px', flex: 1, alignItems: 'center' }}>
                    <input
                      type="text"
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      style={{ flex: 0.5 }}
                      autoFocus
                    />
                    <button className="btn btn-primary" onClick={() => handleSaveRename(w.id)} style={{ padding: '8px 16px', fontSize: '0.85rem' }}>Save</button>
                    <button className="btn btn-secondary" onClick={handleCancelRename} style={{ padding: '8px 16px', fontSize: '0.85rem' }}>Cancel</button>
                  </div>
                ) : (
                  <div>
                    <div className="list-item-title" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      {w.name}
                    </div>
                    <div className="list-item-desc">
                      Captured: {w.created_at} • {w.app_count || 0} Apps • {w.tab_count || 0} Browser Tabs
                    </div>
                  </div>
                )}
              </div>

              {/* Actions */}
              {editId !== w.id && (
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                  <button className="btn btn-primary" onClick={() => restoreWorkspace(w.id)} disabled={isLoading}>
                    Restore
                  </button>
                  <button className="btn btn-secondary" onClick={() => handleStartRename(w)} title="Rename">
                    Rename
                  </button>
                  <button className="btn btn-secondary" onClick={() => duplicateWorkspace(w.id)} title="Duplicate">
                    Duplicate
                  </button>
                  <button className="btn btn-danger" onClick={() => { if(confirm('Delete this workspace?')) deleteWorkspace(w.id); }} title="Delete">
                    Delete
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
