import { app, BrowserWindow, Tray, Menu, ipcMain, nativeImage, screen } from 'electron';
import * as path from 'path';
import { spawn, ChildProcess } from 'child_process';
import * as fs from 'fs';
import * as os from 'os';

let mainWindow: BrowserWindow | null = null;
let tray: Tray | null = null;
let trayWindow: BrowserWindow | null = null;
let pythonProcess: ChildProcess | null = null;
let isQuitting = false;

const dbPath = path.join(os.homedir(), '.docksy', 'docksy.json');

function getMinimizeToTraySetting(): boolean {
  try {
    if (fs.existsSync(dbPath)) {
      const db = JSON.parse(fs.readFileSync(dbPath, 'utf8'));
      if (db.settings && db.settings.minimize_to_tray !== undefined) {
        return db.settings.minimize_to_tray === '1';
      }
    }
  } catch (e) {
    console.error("Error reading minimize_to_tray setting from DB:", e);
  }
  return true; // Default to true
}

function applySettings() {
  try {
    if (fs.existsSync(dbPath)) {
      const db = JSON.parse(fs.readFileSync(dbPath, 'utf8'));
      if (db.settings) {
        if (db.settings.launch_at_startup !== undefined) {
          const launchAtStartup = db.settings.launch_at_startup === '1';
          app.setLoginItemSettings({
            openAtLogin: launchAtStartup,
            path: app.getPath('exe'),
            args: launchAtStartup ? ['--hidden'] : []
          });
          console.log(`[Electron Settings] Applied launch_at_startup = ${launchAtStartup}`);
        }
      }
    }
  } catch (e) {
    console.error("Error reading or applying settings from DB:", e);
  }
}

// Ensure the database directory exists so we can watch it
const dbDir = path.dirname(dbPath);
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

// fs.watch moved inside single instance lock block below

// Self-contained transparent/colored base64 PNG for Tray Icon to prevent missing-file crashes
const trayIconBase64 = 
  "iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAAm0lEQVR42mNkQAIsRjQDGRgYGP5DMSMY" +
  "yFaAsTExMQkS4wKIAGM1gJGREN8h2ACm/1CMzRCsAOM/qAGMYAOYsDkEWT/WQCIDyNZhC4tBMAOIshks" +
  "8B+K/yMZAPIDQWcgG7D4P4oBYAOYkPn/UfQjG8AE5YDYAMX/EQxggvNDtgg2A/4jOwDkBoIDkBvw/z8J" +
  "GvFpILkBIQxgguP/hDEyGFAUAP4BAOCrT5cI197IAAAAAElFTkSuQmCC";

function startPythonBackend() {
  const isDev = !app.isPackaged;
  
  if (isDev) {
    const scriptPath = path.join(__dirname, '../backend/engine.py');
    console.log(`Spawning Python backend in dev mode: python ${scriptPath}`);
    pythonProcess = spawn('python', [scriptPath], {
      stdio: ['ignore', 'pipe', 'pipe'],
      windowsHide: true
    });
  } else {
    const exePath = path.join(process.resourcesPath, 'engine.exe');
    console.log(`Spawning compiled Python backend from: ${exePath}`);
    pythonProcess = spawn(exePath, [], {
      stdio: ['ignore', 'pipe', 'pipe'],
      windowsHide: true
    });
  }
  
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

function createTrayWindow() {
  const iconPath = path.join(__dirname, 'logo.png');
  trayWindow = new BrowserWindow({
    width: 320,
    height: 400,
    show: false,
    frame: false,
    fullscreenable: false,
    resizable: false,
    transparent: false,
    skipTaskbar: true,
    alwaysOnTop: true,
    icon: fs.existsSync(iconPath) ? iconPath : undefined,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false
    }
  });

  trayWindow.loadFile(path.join(__dirname, 'tray.html'));

  // Hide the window when it loses focus
  trayWindow.on('blur', () => {
    trayWindow?.hide();
  });
}

function positionTrayWindow(bounds: any) {
  if (!trayWindow) return;
  
  const { x, y, width, height } = bounds;
  const windowBounds = trayWindow.getBounds();
  const windowWidth = windowBounds.width;
  const windowHeight = windowBounds.height;
  
  // Calculate horizontal position (center under/above tray icon)
  let winX = Math.round(x + (width / 2) - (windowWidth / 2));
  
  // Calculate vertical position (above tray icon by default, assuming bottom taskbar)
  let winY = Math.round(y - windowHeight);
  
  // Adjust if tray icon is at the top of screen
  if (y < 200) {
    winY = Math.round(y + height);
  }
  
  // Bounds adjustments for screen edge overflows
  const primaryDisplay = screen.getPrimaryDisplay();
  const { width: screenWidth, height: screenHeight } = primaryDisplay.workAreaSize;
  
  if (winX + windowWidth > screenWidth) {
    winX = screenWidth - windowWidth - 10;
  }
  if (winX < 0) {
    winX = 10;
  }
  
  trayWindow.setPosition(winX, winY, false);
}

function createTray() {
  const iconPath = path.join(__dirname, 'logo.png');

  let icon = fs.existsSync(iconPath)
    ? nativeImage.createFromPath(iconPath)
    : nativeImage.createFromBuffer(Buffer.from(trayIconBase64, 'base64'));

  tray = new Tray(icon.resize({ width: 16, height: 16 }));
  tray.setToolTip('Docksy Workspace Restorer');
  
  const toggleTrayWindow = (event: any, bounds: any) => {
    if (!trayWindow) {
      createTrayWindow();
    }
    
    if (trayWindow?.isVisible()) {
      trayWindow.hide();
    } else {
      positionTrayWindow(bounds);
      trayWindow?.show();
      trayWindow?.focus();
    }
  };

  tray.on('click', toggleTrayWindow);
  tray.on('right-click', toggleTrayWindow);
  
  tray.on('double-click', () => {
    mainWindow?.show();
    mainWindow?.focus();
  });
}

function createWindow() {
  const iconPath = path.join(__dirname, 'logo.png');

  mainWindow = new BrowserWindow({
    width: 1050,
    height: 750,
    minWidth: 800,
    minHeight: 600,
    show: false,
    icon: fs.existsSync(iconPath) ? iconPath : undefined,
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
    const isHidden = process.argv.includes('--hidden') || app.getLoginItemSettings().wasOpenedAtLogin;
    if (!isHidden) {
      mainWindow?.show();
    } else {
      console.log("[Electron] Started in hidden mode (minimized to tray)");
    }
  });

  // Minimize to tray logic
  mainWindow.on('close', (event) => {
    if (!isQuitting) {
      const minimizeToTray = getMinimizeToTraySetting();
      if (minimizeToTray) {
        event.preventDefault();
        mainWindow?.hide();
      } else {
        isQuitting = true;
        app.quit();
      }
    }
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

const gotTheLock = app.requestSingleInstanceLock();

if (!gotTheLock) {
  isQuitting = true;
  app.quit();
} else {
  // Watch for settings changes dynamically
  fs.watch(dbDir, (eventType, filename) => {
    if (filename === 'docksy.json') {
      applySettings();
    }
  });

  app.on('second-instance', (event, commandLine) => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      if (!commandLine.includes('--hidden')) {
        mainWindow.show();
        mainWindow.focus();
      }
    }
  });

  app.whenReady().then(() => {
    applySettings();
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

  ipcMain.handle('open-main-window', () => {
    mainWindow?.show();
    mainWindow?.focus();
    trayWindow?.hide();
  });
}
