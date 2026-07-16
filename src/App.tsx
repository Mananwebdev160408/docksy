import React from 'react';
import { useStore } from './store/useStore';
import { Dashboard } from './components/Dashboard';
import { Workspaces } from './components/Workspaces';
import { Snapshots } from './components/Snapshots';
import { ScheduleView } from './components/Schedule';
import { SettingsView } from './components/Settings';

export const App: React.FC = () => {
  const { activeTab, setActiveTab, toast, isLoading } = useStore();

  const renderView = () => {
    switch (activeTab) {
      case 'dashboard':
        return <Dashboard />;
      case 'workspaces':
        return <Workspaces />;
      case 'snapshots':
        return <Snapshots />;
      case 'schedule':
        return <ScheduleView />;
      case 'settings':
        return <SettingsView />;
      default:
        return <Dashboard />;
    }
  };

  return (
    <div className="app-container">
      {/* Sidebar Navigation */}
      <aside className="sidebar">
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
          <div className="sidebar-logo">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><line x1="9" y1="3" x2="9" y2="21"></line></svg>
            <h1>Docksy</h1>
          </div>
          
          <nav>
            <ul className="nav-links">
              <li>
                <button 
                  className={`nav-item ${activeTab === 'dashboard' ? 'active' : ''}`}
                  onClick={() => setActiveTab('dashboard')}
                  style={{ width: '100%', background: 'transparent', border: 'none', textAlign: 'left' }}
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="7" height="9"></rect><rect x="14" y="3" width="7" height="5"></rect><rect x="14" y="12" width="7" height="9"></rect><rect x="3" y="16" width="7" height="5"></rect></svg>
                  Dashboard
                </button>
              </li>
              <li>
                <button 
                  className={`nav-item ${activeTab === 'workspaces' ? 'active' : ''}`}
                  onClick={() => setActiveTab('workspaces')}
                  style={{ width: '100%', background: 'transparent', border: 'none', textAlign: 'left' }}
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polygon points="12 2 2 7 12 12 22 7 12 2"></polygon><polyline points="2 17 12 22 22 17"></polyline><polyline points="2 12 12 17 22 12"></polyline></svg>
                  Workspaces
                </button>
              </li>
              <li>
                <button 
                  className={`nav-item ${activeTab === 'snapshots' ? 'active' : ''}`}
                  onClick={() => setActiveTab('snapshots')}
                  style={{ width: '100%', background: 'transparent', border: 'none', textAlign: 'left' }}
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>
                  Snapshots
                </button>
              </li>
              <li>
                <button 
                  className={`nav-item ${activeTab === 'schedule' ? 'active' : ''}`}
                  onClick={() => setActiveTab('schedule')}
                  style={{ width: '100%', background: 'transparent', border: 'none', textAlign: 'left' }}
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>
                  Schedule
                </button>
              </li>
              <li>
                <button 
                  className={`nav-item ${activeTab === 'settings' ? 'active' : ''}`}
                  onClick={() => setActiveTab('settings')}
                  style={{ width: '100%', background: 'transparent', border: 'none', textAlign: 'left' }}
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="3"></circle><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"></path></svg>
                  Settings
                </button>
              </li>
            </ul>
          </nav>
        </div>

        <div className="sidebar-footer">
          <div>Docksy Desktop</div>
          <div>v1.0.0 (Local Only)</div>
        </div>
      </aside>

      {/* Main Content Pane */}
      <main className="main-content">
        {/* Loading Overlay */}
        {isLoading && (
          <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', background: 'rgba(0,0,0,0.25)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 10000 }}>
            <div style={{ background: 'var(--bg-card)', padding: '24px 48px', borderRadius: '8px', boxShadow: 'var(--shadow-md)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px' }}>
              <div style={{ width: '40px', height: '40px', border: '4px solid var(--accent-light)', borderTopColor: 'var(--accent-color)', borderRadius: '50%', animation: 'spin 1s linear infinite' }}></div>
              <span style={{ fontSize: '0.95rem', fontWeight: 500 }}>Running Capture / Restore Engine...</span>
            </div>
            <style>{`
              @keyframes spin {
                to { transform: rotate(360deg); }
              }
            `}</style>
          </div>
        )}

        <div className="view-container">
          {renderView()}
        </div>
      </main>

      {/* Toast Notification Container */}
      {toast.visible && (
        <div className="toast">
          <div className="toast-title">{toast.title}</div>
          <div className="toast-message">{toast.message}</div>
        </div>
      )}
    </div>
  );
};
