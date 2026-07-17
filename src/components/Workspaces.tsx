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
    fetchWorkspaceDetails,
    updateWorkspaceDetails,
    isLoading
  } = useStore();

  const [editId, setEditId] = useState<number | null>(null);
  const [editName, setEditName] = useState('');
  
  // Workspace Detail Editor State
  const [selectedWorkspaceForDetails, setSelectedWorkspaceForDetails] = useState<Workspace | null>(null);
  const [windowsList, setWindowsList] = useState<any[]>([]);

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

  // Workspace Detail Editor Handlers
  const handleOpenDetails = async (w: Workspace) => {
    setSelectedWorkspaceForDetails(w);
    const details = await fetchWorkspaceDetails(w.id);
    if (details) {
      setWindowsList(details.windows || []);
    }
  };

  const handleUpdateWindowField = (index: number, field: string, value: any) => {
    const updated = [...windowsList];
    updated[index] = { ...updated[index], [field]: value };
    setWindowsList(updated);
  };

  const handleRemoveWindow = (index: number) => {
    const updated = windowsList.filter((_, i) => i !== index);
    setWindowsList(updated);
  };

  const handleAddWindow = () => {
    const newWin = {
      title: 'New Application',
      exe_path: '',
      cmd_line: '',
      left: 100,
      top: 100,
      right: 900,
      bottom: 700,
      show_cmd: 1,
      virtual_desktop_name: '',
      class_name: '',
      monitor_device: '',
      monitor_rect: { left: 0, top: 0, right: 1920, bottom: 1080 }
    };
    setWindowsList([...windowsList, newWin]);
  };

  const handleSaveDetails = async () => {
    if (!selectedWorkspaceForDetails) return;
    const success = await updateWorkspaceDetails(selectedWorkspaceForDetails.id, windowsList);
    if (success) {
      setSelectedWorkspaceForDetails(null);
    }
  };

  if (selectedWorkspaceForDetails) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
        <div className="view-header">
          <div className="view-title-group">
            <h1 className="view-title">Edit Workspace: {selectedWorkspaceForDetails.name}</h1>
            <p className="view-subtitle">Manage and manually edit applications captured in this workspace.</p>
          </div>
          <div style={{ display: 'flex', gap: '12px' }}>
            <button className="btn btn-secondary" onClick={() => setSelectedWorkspaceForDetails(null)}>
              Back to List
            </button>
            <button className="btn btn-primary" onClick={handleSaveDetails} disabled={isLoading}>
              {isLoading ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {windowsList.length === 0 ? (
            <div style={{ padding: '48px', textAlign: 'center', backgroundColor: 'var(--bg-card)', border: '1px dashed var(--border-color)', borderRadius: 'var(--radius-md)', color: 'var(--text-secondary)' }}>
              No applications in this workspace yet. Add one manually below!
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              {windowsList.map((win, idx) => (
                <div key={idx} className="card" style={{ gap: '16px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-color)', paddingBottom: '12px' }}>
                    <h3 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text-primary)' }}>Application #{idx + 1}</h3>
                    <button className="btn-icon" onClick={() => handleRemoveWindow(idx)} style={{ color: 'var(--danger-color)', fontWeight: 600 }} title="Remove Application">
                      Remove
                    </button>
                  </div>
                  
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                    <div className="form-group">
                      <label>Window Title</label>
                      <input 
                        type="text" 
                        value={win.title || ''} 
                        onChange={(e) => handleUpdateWindowField(idx, 'title', e.target.value)}
                        placeholder="e.g. My Document - Notepad"
                      />
                    </div>
                    <div className="form-group">
                      <label>Executable Path</label>
                      <input 
                        type="text" 
                        value={win.exe_path || ''} 
                        onChange={(e) => handleUpdateWindowField(idx, 'exe_path', e.target.value)}
                        placeholder="e.g. C:\Windows\notepad.exe"
                      />
                    </div>
                  </div>

                  <div className="form-group">
                    <label>Command Line Arguments (Optional)</label>
                    <input 
                      type="text" 
                      value={win.cmd_line || ''} 
                      onChange={(e) => handleUpdateWindowField(idx, 'cmd_line', e.target.value)}
                      placeholder="e.g. C:\Windows\notepad.exe C:\path\to\file.txt"
                    />
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: '16px' }}>
                    <div className="form-group">
                      <label>Left (px)</label>
                      <input 
                        type="number" 
                        value={win.left ?? 0} 
                        onChange={(e) => handleUpdateWindowField(idx, 'left', Number(e.target.value))}
                      />
                    </div>
                    <div className="form-group">
                      <label>Top (px)</label>
                      <input 
                        type="number" 
                        value={win.top ?? 0} 
                        onChange={(e) => handleUpdateWindowField(idx, 'top', Number(e.target.value))}
                      />
                    </div>
                    <div className="form-group">
                      <label>Right (px)</label>
                      <input 
                        type="number" 
                        value={win.right ?? 0} 
                        onChange={(e) => handleUpdateWindowField(idx, 'right', Number(e.target.value))}
                      />
                    </div>
                    <div className="form-group">
                      <label>Bottom (px)</label>
                      <input 
                        type="number" 
                        value={win.bottom ?? 0} 
                        onChange={(e) => handleUpdateWindowField(idx, 'bottom', Number(e.target.value))}
                      />
                    </div>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                    <div className="form-group">
                      <label>Virtual Desktop Name</label>
                      <input 
                        type="text" 
                        value={win.virtual_desktop_name || ''} 
                        onChange={(e) => handleUpdateWindowField(idx, 'virtual_desktop_name', e.target.value)}
                        placeholder="e.g. Desktop 1 (Leave empty for current)"
                      />
                    </div>
                    <div className="form-group">
                      <label>Show Command (State)</label>
                      <select 
                        value={win.show_cmd ?? 1} 
                        onChange={(e) => handleUpdateWindowField(idx, 'show_cmd', Number(e.target.value))}
                      >
                        <option value="1">Normal (Restored)</option>
                        <option value="3">Maximized</option>
                        <option value="2">Minimized</option>
                      </select>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          <div style={{ display: 'flex', justifyContent: 'center', marginTop: '12px' }}>
            <button className="btn btn-secondary" onClick={handleAddWindow}>
              + Add Application Manually
            </button>
          </div>
        </div>
      </div>
    );
  }

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
                      Captured: {w.created_at} • {w.app_count || 0} Apps
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
                  <button className="btn btn-secondary" onClick={() => handleOpenDetails(w)} title="Edit Workspace details">
                    Edit Apps
                  </button>
                  <button className="btn btn-secondary" onClick={() => handleStartRename(w)} title="Rename Workspace">
                    Rename
                  </button>
                  <button className="btn btn-secondary" onClick={() => duplicateWorkspace(w.id)} title="Duplicate Workspace">
                    Duplicate
                  </button>
                  <button className="btn btn-danger" onClick={() => { if(confirm('Delete this workspace?')) deleteWorkspace(w.id); }} title="Delete Workspace">
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
