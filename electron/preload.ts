import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('docksyAPI', {
  closeToTray: () => ipcRenderer.invoke('close-to-tray'),
  minimizeWindow: () => ipcRenderer.invoke('minimize-window'),
  quitApp: () => ipcRenderer.invoke('quit-app'),
  openMainWindow: () => ipcRenderer.invoke('open-main-window'),
  getBackendUrl: () => 'http://localhost:19082'
});
