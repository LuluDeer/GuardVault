const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  request: (config) => ipcRenderer.invoke('http-request', config),
  getServerUrl: () => ipcRenderer.invoke('get-server-url'),
  setServerUrl: (url) => ipcRenderer.invoke('set-server-url', url),
  copyToClipboard: (text) => ipcRenderer.invoke('copy-clipboard', text),
  setAutoStart: (enable) => ipcRenderer.invoke('set-autostart', enable),
  getAutoStart: () => ipcRenderer.invoke('get-autostart'),
  minimizeWindow: () => ipcRenderer.invoke('minimize-window'),
  closeWindow: () => ipcRenderer.invoke('close-window'),
});