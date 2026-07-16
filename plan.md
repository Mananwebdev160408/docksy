# Implementation Plan - Docksy (Workspace Restorer)

Docksy is a Windows desktop application that lets users save, restore, and automate complete desktop workspaces. It captures running applications, their window layouts/states, monitor assignments, and browser sessions, and restores them later.

---

## User Review Required

> [!IMPORTANT]
> **Environment Choice & Architecture Rationale**
> - **Tauri/Rust vs. Electron/Python**: You mentioned installing Rust is fine if it yields better performance. However, because window enumeration and placement are low-level OS operations, both Rust and Python make the *exact same* DLL system calls to `user32.dll` and `kernel32.dll`. Under the hood, these run at identical native speeds.
> - **Zero-Installation and Build Safety**: By using **Electron + React + TypeScript** with a **Python Win32 Engine** (running as a sidecar), we avoid compiling native binary extensions or Rust packages. This eliminates the risk of compilation or linker errors on your system, since your machine already has Node.js and Python 3.13 fully installed and configured.
> - **Features Excluded (No Cloud Sync/Auth)**: Per your request, we have completely excluded Firebase Authentication, Firestore, and any cloud sync functionality. All data, workspaces, snapshots, and configurations will be stored 100% locally on your machine in a lightweight SQLite database.

---

## Open Questions

> [!WARNING]
> Please review this open detail:
> 1. **Chrome/Edge Extension**: To support restoring browser tabs, we will write a Manifest V3 extension. The extension will connect to the Python backend via WebSockets (`ws://localhost:19082`). This allows the browser extension to dynamically send open tabs and restore them on command. Is this local-server architecture acceptable?

---

## Proposed Architecture & Directory Layout

We will create a structured project inside the `docksy` workspace:

```
docksy/
├── package.json               # Electron and frontend dependencies
├── tsconfig.json              # TypeScript configuration
├── vite.config.ts             # Vite configuration for React frontend
├── src/                       # Frontend source (React + TS + Vanilla CSS)
│   ├── index.html             # Application HTML entrypoint
│   ├── main.tsx               # React application entrypoint
│   ├── App.tsx                # Main App wrapper & routing
│   ├── index.css              # Native Windows-style CSS variables and base elements
│   ├── components/            # Reusable UI components
│   │   ├── Dashboard.tsx      # Core operations (Quick Save, Restore, status)
│   │   ├── Workspaces.tsx     # List, edit, rename, delete workspaces
│   │   ├── Snapshots.tsx      # Manage auto/manual snapshots
│   │   ├── Schedule.tsx       # Manage schedules (Startup, Login, Time)
│   │   └── Settings.tsx       # Ignore lists, snapshot intervals, delay timers
│   └── store/
│       └── useStore.ts        # Zustand state store
├── electron/                  # Electron configuration
│   ├── main.ts                # Starts window and spawns Python sidecar
│   └── preload.ts             # Safe bridge for IPC
└── backend/                   # Python Win32 sidecar engine
    └── engine.py              # Main Python script (starts WebSocket / HTTP server, SQLite manager, Win32 window caller)
```

### 1. The Win32 Engine (`backend/engine.py`)
This script will run in the background (spawned by Electron). It will:
- Start a WebSocket + HTTP server on port `19082`.
- **Capture**: Switch thread to `"Default"` desktop, enumerate windows, get process path, window placement (`GetWindowPlacement`), screen bounds, monitor ID. Get File Explorer paths via COM (`Shell.Application`). Get VS Code paths via command-line query of process ID.
- **Restore**: Verify executable, launch process, wait for window, restore placement on correct monitor (with automatic fallback to primary if monitor is missing).
- **SQLite Database**: Manage `docksy.db` locally (tables: `workspaces`, `snapshots`, `ignored_apps`, `schedules`, `settings`).
- **Schedules**: Run a background thread that monitors scheduled workspace restorations (e.g. daily at 9:00 AM) and triggers them.
- **Browser Socket**: Manage connection with Chrome/Edge extension, receiving open tabs and pushing restore commands.

### 2. The Browser Extension (`browser-extension/`)
A simple directory containing:
- `manifest.json`: Manifest V3 setup.
- `background.js`: Connects to `ws://localhost:19082/browser`, tracks active tabs, and opens/closes windows when commanded.

### 3. The Desktop UI (`src/`)
A native-feeling Windows application:
- Windows 11 style UI using Vanilla CSS:
  - Clean font styling (`Segoe UI`, `Segoe Fluent Icons` or clean SVGs).
  - Light/Dark mode matching system theme.
  - Native control styling (rounded borders, neutral colors, restrained hover states, clear list boxes).
  - Left navigation pane (Dashboard, Workspaces, Snapshots, Schedule, Settings).
  - Toast notifications and progress bars during workspace restoration.

---

## Verification Plan

### Automated Tests
- Test Python Win32 bindings by running `python backend/engine.py --test-capture` and checking output JSON.
- Test Python SQLite storage operations by verifying DB creation and CRUD.

### Manual Verification
- **Window Positioning**: Open Notepad, paint, and browser windows. Save workspace. Close them. Restore workspace. Verify they return to exact coordinates, states (minimized/maximized), and monitors.
- **Monitor Swapping**: Disconnect a monitor (or simulate it in software), run restore, and verify windows are gracefully redirected to the primary display.
- **Browser Restoration**: Install the extension, open several tabs in Chrome, save workspace, close Chrome, restore, and verify Chrome launches and reopens the exact tabs.
- **Auto Snapshotting**: Set auto snapshot to 15 minutes, wait, and verify it updates the snapshot in the Snapshots tab.

