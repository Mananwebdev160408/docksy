import React, { useState, useEffect } from 'react';
import { useStore } from '../store/useStore';

export const SettingsView: React.FC = () => {
  const {
    settings,
    ignoredApps,
    fetchSettings,
    saveSettings,
    fetchIgnoredApps,
    addIgnoredApp,
    removeIgnoredApp
  } = useStore();

  const [newIgnoreApp, setNewIgnoreApp] = useState('');

  useEffect(() => {
    fetchSettings();
    fetchIgnoredApps();
  }, []);

  const handleToggleSetting = async (key: keyof typeof settings, checked: boolean) => {
    await saveSettings({ [key]: checked ? '1' : '0' });
  };

  const handleSelectSetting = async (key: keyof typeof settings, val: string) => {
    await saveSettings({ [key]: val });
  };

  const handleAddIgnore = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newIgnoreApp.trim()) return;
    
    let name = newIgnoreApp.trim().toLowerCase();
    if (!name.endsWith('.exe')) {
      name += '.exe';
    }
    
    await addIgnoredApp(name);
    setNewIgnoreApp('');
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      <div>
        <h1 className="view-title">Settings</h1>
        <p className="view-subtitle">Customize restoration rules, auto-snapshots, and exclude applications.</p>
      </div>

      <div className="dashboard-grid">
        {/* Left Settings Column */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          {/* General Card */}
          <div className="card">
            <h2 className="card-title">General Preferences</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  checked={settings.launch_at_startup === '1'}
                  onChange={(e) => handleToggleSetting('launch_at_startup', e.target.checked)}
                />
                Launch Docksy when Windows starts
              </label>

              <label className="checkbox-label">
                <input
                  type="checkbox"
                  checked={settings.minimize_to_tray === '1'}
                  onChange={(e) => handleToggleSetting('minimize_to_tray', e.target.checked)}
                />
                Minimize to System Tray on window close
              </label>

              <label className="checkbox-label">
                <input
                  type="checkbox"
                  checked={settings.notifications === '1'}
                  onChange={(e) => handleToggleSetting('notifications', e.target.checked)}
                />
                Show desktop notifications on restore/capture
              </label>
            </div>
          </div>

          {/* Auto Snapshots Card */}
          <div className="card">
            <h2 className="card-title">Auto Snapshot Preferences</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  checked={settings.auto_snapshots_enabled === '1'}
                  onChange={(e) => handleToggleSetting('auto_snapshots_enabled', e.target.checked)}
                />
                Enable automatic workspace snapshots
              </label>

              <div className="form-group">
                <label>Capture Interval</label>
                <select
                  value={settings.snapshot_interval}
                  onChange={(e) => handleSelectSetting('snapshot_interval', e.target.value)}
                  disabled={settings.auto_snapshots_enabled !== '1'}
                >
                  <option value="15">Every 15 minutes</option>
                  <option value="30">Every 30 minutes</option>
                  <option value="60">Every 1 hour (Default)</option>
                  <option value="120">Every 2 hours</option>
                  <option value="360">Every 6 hours</option>
                </select>
              </div>
            </div>
          </div>

          {/* Restoration Card */}
          <div className="card">
            <h2 className="card-title">Restore Engine</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div className="form-group">
                <label>Delay between launching applications (ms)</label>
                <input
                  type="number"
                  min="0"
                  step="100"
                  value={settings.restore_delay}
                  onChange={(e) => handleSelectSetting('restore_delay', e.target.value)}
                  style={{ width: '120px' }}
                />
              </div>

              <label className="checkbox-label">
                <input
                  type="checkbox"
                  checked={settings.skip_already_running === '1'}
                  onChange={(e) => handleToggleSetting('skip_already_running', e.target.checked)}
                />
                Skip relaunching apps that are already running (Reposition only)
              </label>
            </div>
          </div>
        </div>

        {/* Right Ignore Apps Column */}
        <div className="card">
          <h2 className="card-title">Ignore Applications List</h2>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
            Docksy will exclude these applications from being captured or restored. 
            Useful for background tools, chat apps, or media players.
          </p>

          <form onSubmit={handleAddIgnore} style={{ display: 'flex', gap: '10px' }}>
            <input
              type="text"
              placeholder="e.g. discord.exe, spotify.exe"
              value={newIgnoreApp}
              onChange={(e) => setNewIgnoreApp(e.target.value)}
              style={{ flex: 1 }}
              required
            />
            <button className="btn btn-primary" type="submit">Exclude</button>
          </form>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', overflowY: 'auto', maxHeight: '350px', border: '1px solid var(--border-color)', borderRadius: '4px', padding: '10px', backgroundColor: 'var(--bg-app)' }}>
            {ignoredApps.length === 0 ? (
              <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', textAlign: 'center', padding: '20px' }}>
                No applications excluded.
              </p>
            ) : (
              ignoredApps.map(app => (
                <div key={app.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 10px', border: '1px solid var(--border-color)', borderRadius: '4px', backgroundColor: 'var(--bg-card)', fontSize: '0.85rem' }}>
                  <span>{app.name}</span>
                  <button
                    type="button"
                    style={{ background: 'transparent', border: 'none', color: 'var(--danger-color)', cursor: 'pointer', fontSize: '0.8rem', padding: '2px 4px' }}
                    onClick={() => removeIgnoredApp(app.id)}
                  >
                    ✕
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
