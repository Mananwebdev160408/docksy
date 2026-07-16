import React, { useState, useEffect } from 'react';
import { useStore, Schedule } from '../store/useStore';

const DAYS_OF_WEEK = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

export const ScheduleView: React.FC = () => {
  const {
    schedules,
    workspaces,
    fetchSchedules,
    fetchWorkspaces,
    saveSchedule,
    deleteSchedule
  } = useStore();

  const [workspaceId, setWorkspaceId] = useState<number>(0);
  const [triggerType, setTriggerType] = useState<'time' | 'startup'>('time');
  const [time, setTime] = useState('09:00');
  const [selectedDays, setSelectedDays] = useState<string[]>(['Mon', 'Tue', 'Wed', 'Thu', 'Fri']);
  const [enabled, setEnabled] = useState(true);

  useEffect(() => {
    fetchSchedules();
    fetchWorkspaces();
  }, []);

  // Initialize workspaceId when workspaces load
  useEffect(() => {
    if (workspaces.length > 0 && workspaceId === 0) {
      setWorkspaceId(workspaces[0].id);
    }
  }, [workspaces]);

  const handleDayToggle = (day: string) => {
    if (selectedDays.includes(day)) {
      setSelectedDays(selectedDays.filter(d => d !== day));
    } else {
      setSelectedDays([...selectedDays, day]);
    }
  };

  const handleShortcutDays = (type: 'everyday' | 'weekdays' | 'none') => {
    if (type === 'everyday') {
      setSelectedDays([...DAYS_OF_WEEK]);
    } else if (type === 'weekdays') {
      setSelectedDays(['Mon', 'Tue', 'Wed', 'Thu', 'Fri']);
    } else {
      setSelectedDays([]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (workspaceId === 0) return;

    const daysStr = triggerType === 'time' ? selectedDays.join(',') : '';
    const newSched: Schedule = {
      workspace_id: workspaceId,
      trigger_type: triggerType,
      time: triggerType === 'time' ? time : '',
      days: daysStr,
      enabled: enabled ? 1 : 0
    };

    await saveSchedule(newSched);
    
    // Reset state defaults
    if (workspaces.length > 0) {
      setWorkspaceId(workspaces[0].id);
    }
    setTriggerType('time');
    setTime('09:00');
    setSelectedDays(['Mon', 'Tue', 'Wed', 'Thu', 'Fri']);
    setEnabled(true);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      <div>
        <h1 className="view-title">Schedule</h1>
        <p className="view-subtitle">Automate your environment restoration by time or Windows startup.</p>
      </div>

      <div className="dashboard-grid">
        {/* Create Schedule Form */}
        <div className="card">
          <h2 className="card-title">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>
            Add Automation Trigger
          </h2>
          
          {workspaces.length === 0 ? (
            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
              You need to save at least one workspace before setting up schedules.
            </p>
          ) : (
            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div className="form-group">
                <label>Select Workspace</label>
                <select 
                  value={workspaceId} 
                  onChange={(e) => setWorkspaceId(Number(e.target.value))}
                  required
                >
                  {workspaces.map(w => (
                    <option key={w.id} value={w.id}>{w.name}</option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label>Trigger Type</label>
                <select 
                  value={triggerType} 
                  onChange={(e) => setTriggerType(e.target.value as 'time' | 'startup')}
                >
                  <option value="time">Time of Day</option>
                  <option value="startup">Windows Startup / User Login</option>
                </select>
              </div>

              {triggerType === 'time' && (
                <>
                  <div className="form-group">
                    <label>Restoration Time</label>
                    <input 
                      type="time" 
                      value={time} 
                      onChange={(e) => setTime(e.target.value)}
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label>Days of the Week</label>
                    <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginTop: '4px' }}>
                      {DAYS_OF_WEEK.map(day => {
                        const isSelected = selectedDays.includes(day);
                        return (
                          <button
                            key={day}
                            type="button"
                            className={`btn ${isSelected ? 'btn-primary' : 'btn-secondary'}`}
                            onClick={() => handleDayToggle(day)}
                            style={{ padding: '4px 10px', fontSize: '0.8rem', minWidth: '42px' }}
                          >
                            {day}
                          </button>
                        );
                      })}
                    </div>
                    <div style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
                      <button type="button" className="btn btn-secondary" onClick={() => handleShortcutDays('weekdays')} style={{ padding: '2px 8px', fontSize: '0.75rem' }}>Weekdays</button>
                      <button type="button" className="btn btn-secondary" onClick={() => handleShortcutDays('everyday')} style={{ padding: '2px 8px', fontSize: '0.75rem' }}>Everyday</button>
                      <button type="button" className="btn btn-secondary" onClick={() => handleShortcutDays('none')} style={{ padding: '2px 8px', fontSize: '0.75rem' }}>Clear</button>
                    </div>
                  </div>
                </>
              )}

              <div className="form-group" style={{ flexDirection: 'row', alignItems: 'center' }}>
                <label className="checkbox-label">
                  <input 
                    type="checkbox" 
                    checked={enabled} 
                    onChange={(e) => setEnabled(e.target.checked)}
                  />
                  Enable Trigger
                </label>
              </div>

              <button className="btn btn-primary" type="submit" style={{ marginTop: '8px' }}>
                Save Schedule
              </button>
            </form>
          )}
        </div>

        {/* Existing Schedules list */}
        <div className="card">
          <h2 className="card-title">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>
            Active Triggers
          </h2>
          {schedules.length === 0 ? (
            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', padding: '20px 0', textAlign: 'center' }}>
              No automation triggers defined yet.
            </p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', maxHeight: '400px', overflowY: 'auto' }}>
              {schedules.map((s) => (
                <div key={s.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px', border: '1px solid var(--border-color)', borderRadius: '4px', backgroundColor: 'var(--bg-app)' }}>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: '0.9rem', color: s.enabled ? 'var(--text-primary)' : 'var(--text-muted)' }}>
                      Restore: {s.workspace_name}
                    </div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '2px' }}>
                      {s.trigger_type === 'startup' ? (
                        <span>On Windows Startup</span>
                      ) : (
                        <span>Daily at {s.time} ({s.days})</span>
                      )}
                      {!s.enabled && <span style={{ marginLeft: '6px', color: 'var(--danger-color)', fontWeight: 600 }}>(DISABLED)</span>}
                    </div>
                  </div>
                  <button className="btn btn-danger" onClick={() => deleteSchedule(s.id!)} style={{ padding: '4px 8px', fontSize: '0.8rem' }}>
                    Remove
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
