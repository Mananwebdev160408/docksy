import { app, BrowserWindow, Tray, Menu, ipcMain, nativeImage } from 'electron';
import * as path from 'path';
import { spawn, ChildProcess } from 'child_process';

let mainWindow: BrowserWindow | null = null;
let tray: Tray | null = null;
let pythonProcess: ChildProcess | null = null;
let isQuitting = false;

// Self-contained transparent/colored base64 PNG for Tray Icon to prevent missing-file crashes
const trayIconBase64 = 
  "iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAAm0lEQVR42mNkQAIsRjQDGRgYGP5DMSMY" +
  "yFaAsTExMQkS4wKIAGM1gJGREN8h2ACm/1CMzRCsAOM/qAGMYAOYsDkEWT/WQCIDyNZhC4tBMAOIshks" +
  "8B+K/yMZAPIDQWcgG7D4P4oBYAOYkPn/UfQjG8AE5YDYAMX/EQxggvNDtgg2A/4jOwDkBoIDkBvw/z8J" +
  "GvFpILkBIQxgguP/hDEyGFAUAP4BAOCrT5cI197IAAAAAElFTkSuQmCC";

function startPythonBackend() {
  const isDev = !app.isPackaged;
  const scriptPath = isDev 
    ? path.join(__dirname, '../backend/engine.py')
    : path.join(process.resourcesPath, 'backend/engine.py');
  
  console.log(`Spawning Python backend from: ${scriptPath}`);
  
  pythonProcess = spawn('python', [scriptPath], {
    stdio: ['ignore', 'pipe', 'pipe'],
    windowsHide: true
  });
  
  pythonProcess.stdout?.on('data', (data) => {
    console.log(`[Python Stdout]: ${data.toString().trim()}`);
  });
  
  pythonProcess.stderr?.on('data', (data) => {
    console.error(`[Python Stderr]: ${data.toString().trim()}`);
  });
  
  pythonProcess.on('close', (code) => {
    console.log(`Python backend exited with code ${code}`);
  });
}

function createTray() {
  const icon = nativeImage.createFromBuffer(Buffer.from(trayIconBase64, 'base64'));
  tray = new Tray(icon.resize({ width: 16, height: 16 }));
  
  const contextMenu = Menu.buildFromTemplate([
    { 
      label: 'Open Docksy', 
      click: () => {
        mainWindow?.show();
      } 
    },
    { type: 'separator' },
    { 
      label: 'Exit', 
      click: () => {
        isQuitting = true;
        app.quit();
      } 
    }
  ]);
  
  tray.setToolTip('Docksy Workspace Restorer');
  tray.setContextMenu(contextMenu);
  
  tray.on('double-click', () => {
    mainWindow?.show();
  });
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1050,
    height: 750,
    minWidth: 800,
    minHeight: 600,
    show: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false
    },
    // Standard native Windows frame
    frame: true,
    title: 'Docksy'
  });

  const isDev = !app.isPackaged;
  if (isDev) {
    mainWindow.loadURL('http://localhost:5173');
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
  }

  // Remove default menu bar for cleaner native app aesthetic
  mainWindow.setMenuBarVisibility(false);

  mainWindow.once('ready-to-show', () => {
    mainWindow?.show();
  });

  // Minimize to tray logic
  mainWindow.on('close', (event) => {
    if (!isQuitting) {
      event.preventDefault();
      mainWindow?.hide();
    }
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

app.whenReady().then(() => {
  startPythonBackend();
  createTray();
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('will-quit', () => {
  if (pythonProcess) {
    console.log("Terminating Python sidecar engine...");
    pythonProcess.kill();
  }
});

// IPC handlers for minimizing, tray state, and platform operations
ipcMain.handle('minimize-window', () => {
  mainWindow?.minimize();
});

ipcMain.handle('close-to-tray', () => {
  mainWindow?.hide();
});

ipcMain.handle('quit-app', () => {
  isQuitting = true;
  app.quit();
});
