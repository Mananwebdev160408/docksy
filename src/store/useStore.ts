import { create } from 'zustand';

const BACKEND_URL = 'http://127.0.0.1:19082';

export interface Workspace {
  id: number;
  name: string;
  created_at: string;
  favorite: number;
  app_count?: number;
  tab_count?: number;
}

export interface Snapshot {
  id: number;
  name: string;
  timestamp: string;
  data: {
    windows: any[];
    explorer_paths: string[];
    vscode_paths: string[];
    browser_tabs: any[];
  };
}

export interface Schedule {
  id?: number;
  workspace_id: number;
  workspace_name?: string;
  trigger_type: 'time' | 'startup';
  time: string;
  days: string;
  enabled: number;
}

export interface IgnoredApp {
  id: number;
  name: string;
}

export interface Settings {
  launch_at_startup: string;
  minimize_to_tray: string;
  auto_update: string;
  notifications: string;
  auto_snapshots_enabled: string;
  snapshot_interval: string;
  restore_delay: string;
  restore_minimized: string;
  skip_already_running: string;
}

interface ToastState {
  title: string;
  message: string;
  visible: boolean;
}

interface AppStore {
  workspaces: Workspace[];
  snapshots: Snapshot[];
  schedules: Schedule[];
  ignoredApps: IgnoredApp[];
  settings: Settings;
  isLoading: boolean;
  activeTab: 'dashboard' | 'workspaces' | 'snapshots' | 'schedule' | 'settings';
  toast: ToastState;
  
  setActiveTab: (tab: AppStore['activeTab']) => void;
  showToast: (title: string, message: string) => void;
  hideToast: () => void;
  
  fetchWorkspaces: () => Promise<void>;
  saveWorkspace: (name: string) => Promise<any>;
  deleteWorkspace: (id: number) => Promise<void>;
  restoreWorkspace: (id: number) => Promise<any>;
  renameWorkspace: (id: number, name: string) => Promise<void>;
  favoriteWorkspace: (id: number, favorite: boolean) => Promise<void>;
  duplicateWorkspace: (id: number) => Promise<void>;
  
  fetchSnapshots: () => Promise<void>;
  captureSnapshot: (name?: string) => Promise<void>;
  deleteSnapshot: (id: number) => Promise<void>;
  restoreSnapshot: (id: number) => Promise<any>;
  
  fetchSchedules: () => Promise<void>;
  saveSchedule: (sched: Schedule) => Promise<void>;
  deleteSchedule: (id: number) => Promise<void>;
  
  fetchIgnoredApps: () => Promise<void>;
  addIgnoredApp: (name: string) => Promise<void>;
  removeIgnoredApp: (id: number) => Promise<void>;
  
  fetchSettings: () => Promise<void>;
  saveSettings: (settings: Partial<Settings>) => Promise<void>;
}

export const useStore = create<AppStore>((set, get) => ({
  workspaces: [],
  snapshots: [],
  schedules: [],
  ignoredApps: [],
  settings: {
    launch_at_startup: '0',
    minimize_to_tray: '1',
    auto_update: '0',
    notifications: '1',
    auto_snapshots_enabled: '1',
    snapshot_interval: '60',
    restore_delay: '1000',
    restore_minimized: '1',
    skip_already_running: '1'
  },
  isLoading: false,
  activeTab: 'dashboard',
  toast: { title: '', message: '', visible: false },

  setActiveTab: (activeTab) => set({ activeTab }),

  showToast: (title, message) => {
    set({ toast: { title, message, visible: true } });
    setTimeout(() => {
      get().hideToast();
    }, 4000);
  },

  hideToast: () => set((state) => ({ toast: { ...state.toast, visible: false } })),

  fetchWorkspaces: async () => {
    try {
      const res = await fetch(`${BACKEND_URL}/api/workspaces`);
      if (res.ok) {
        const data = await res.json();
        set({ workspaces: data });
      }
    } catch (e) {
      console.error('Error fetching workspaces:', e);
    }
  },

  saveWorkspace: async (name) => {
    set({ isLoading: true });
    try {
      const res = await fetch(`${BACKEND_URL}/api/workspaces`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name })
      });
      const data = await res.json();
      await get().fetchWorkspaces();
      get().showToast('Workspace Saved', `Successfully captured "${name}"!`);
      return data;
    } catch (e) {
      console.error(e);
      get().showToast('Error', 'Failed to capture workspace.');
    } finally {
      set({ isLoading: false });
    }
  },

  deleteWorkspace: async (id) => {
    try {
      const res = await fetch(`${BACKEND_URL}/api/workspaces?id=${id}`, {
        method: 'DELETE'
      });
      if (res.ok) {
        await get().fetchWorkspaces();
        get().showToast('Workspace Deleted', 'Workspace has been removed.');
      }
    } catch (e) {
      console.error(e);
    }
  },

  restoreWorkspace: async (id) => {
    set({ isLoading: true });
    try {
      const workspaceName = get().workspaces.find(w => w.id === id)?.name || 'Workspace';
      get().showToast('Restoring Workspace', `Launching applications for "${workspaceName}"...`);
      const res = await fetch(`${BACKEND_URL}/api/workspaces/restore`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id })
      });
      const data = await res.json();
      get().showToast('Restore Complete', `Restored applications successfully.`);
      return data;
    } catch (e) {
      console.error(e);
      get().showToast('Restore Failed', 'Error restoring workspace.');
    } finally {
      set({ isLoading: false });
    }
  },

  renameWorkspace: async (id, name) => {
    try {
      const res = await fetch(`${BACKEND_URL}/api/workspaces/rename`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, name })
      });
      if (res.ok) {
        await get().fetchWorkspaces();
        get().showToast('Rename Success', `Workspace renamed to "${name}".`);
      }
    } catch (e) {
      console.error(e);
    }
  },

  favoriteWorkspace: async (id, favorite) => {
    try {
      const res = await fetch(`${BACKEND_URL}/api/workspaces/favorite`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, favorite: favorite ? 1 : 0 })
      });
      if (res.ok) {
        await get().fetchWorkspaces();
      }
    } catch (e) {
      console.error(e);
    }
  },

  duplicateWorkspace: async (id) => {
    try {
      const res = await fetch(`${BACKEND_URL}/api/workspaces/duplicate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id })
      });
      if (res.ok) {
        await get().fetchWorkspaces();
        get().showToast('Workspace Duplicated', 'Duplicated successfully.');
      }
    } catch (e) {
      console.error(e);
    }
  },

  fetchSnapshots: async () => {
    try {
      const res = await fetch(`${BACKEND_URL}/api/snapshots`);
      if (res.ok) {
        const data = await res.json();
        set({ snapshots: data });
      }
    } catch (e) {
      console.error(e);
    }
  },

  captureSnapshot: async (name = 'Manual Snapshot') => {
    set({ isLoading: true });
    try {
      const res = await fetch(`${BACKEND_URL}/api/snapshots/capture`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name })
      });
      if (res.ok) {
        await get().fetchSnapshots();
        get().showToast('Snapshot Taken', 'Current workspace saved to history.');
      }
    } catch (e) {
      console.error(e);
    } finally {
      set({ isLoading: false });
    }
  },

  deleteSnapshot: async (id) => {
    try {
      const res = await fetch(`${BACKEND_URL}/api/snapshots?id=${id}`, {
        method: 'DELETE'
      });
      if (res.ok) {
        await get().fetchSnapshots();
        get().showToast('Snapshot Deleted', 'Snapshot removed from history.');
      }
    } catch (e) {
      console.error(e);
    }
  },

  restoreSnapshot: async (id) => {
    set({ isLoading: true });
    try {
      get().showToast('Restoring Snapshot', 'Launching apps from snapshot...');
      const res = await fetch(`${BACKEND_URL}/api/snapshots/restore`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id })
      });
      const data = await res.json();
      get().showToast('Restore Complete', 'Snapshot restored successfully.');
      return data;
    } catch (e) {
      console.error(e);
      get().showToast('Restore Failed', 'Failed to restore snapshot.');
    } finally {
      set({ isLoading: false });
    }
  },

  fetchSchedules: async () => {
    try {
      const res = await fetch(`${BACKEND_URL}/api/schedules`);
      if (res.ok) {
        const data = await res.json();
        set({ schedules: data });
      }
    } catch (e) {
      console.error(e);
    }
  },

  saveSchedule: async (sched) => {
    try {
      const res = await fetch(`${BACKEND_URL}/api/schedules`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(sched)
      });
      if (res.ok) {
        await get().fetchSchedules();
        get().showToast('Schedule Saved', 'Workspace schedule updated.');
      }
    } catch (e) {
      console.error(e);
    }
  },

  deleteSchedule: async (id) => {
    try {
      const res = await fetch(`${BACKEND_URL}/api/schedules?id=${id}`, {
        method: 'DELETE'
      });
      if (res.ok) {
        await get().fetchSchedules();
        get().showToast('Schedule Removed', 'Schedule has been deleted.');
      }
    } catch (e) {
      console.error(e);
    }
  },

  fetchIgnoredApps: async () => {
    try {
      const res = await fetch(`${BACKEND_URL}/api/ignored`);
      if (res.ok) {
        const data = await res.json();
        set({ ignoredApps: data });
      }
    } catch (e) {
      console.error(e);
    }
  },

  addIgnoredApp: async (name) => {
    try {
      const res = await fetch(`${BACKEND_URL}/api/ignored`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name })
      });
      if (res.ok) {
        await get().fetchIgnoredApps();
        get().showToast('App Excluded', `"${name}" added to ignore list.`);
      }
    } catch (e) {
      console.error(e);
    }
  },

  removeIgnoredApp: async (id) => {
    try {
      const res = await fetch(`${BACKEND_URL}/api/ignored?id=${id}`, {
        method: 'DELETE'
      });
      if (res.ok) {
        await get().fetchIgnoredApps();
        get().showToast('App Included', 'App removed from ignore list.');
      }
    } catch (e) {
      console.error(e);
    }
  },

  fetchSettings: async () => {
    try {
      const res = await fetch(`${BACKEND_URL}/api/settings`);
      if (res.ok) {
        const data = await res.json();
        set({ settings: data });
      }
    } catch (e) {
      console.error(e);
    }
  },

  saveSettings: async (newSettings) => {
    try {
      const res = await fetch(`${BACKEND_URL}/api/settings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newSettings)
      });
      if (res.ok) {
        await get().fetchSettings();
        get().showToast('Settings Saved', 'Configuration updated successfully.');
      }
    } catch (e) {
      console.error(e);
    }
  }
}));
