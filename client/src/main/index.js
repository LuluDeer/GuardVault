// Electron 主进程入口
const { app, BrowserWindow } = require('electron');
const path = require('path');
const { initIpc } = require('./ipc');
const tray = require('./tray');
const tokenStore = require('./token-store');

let mainWindow = null;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 900,
    height: 700,
    minWidth: 850,
    minHeight: 600,
    frame: false,
    resizable: true,
    maximizable: true,
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      preload: path.join(__dirname, '../preload/index.js'),
    },
  });

  mainWindow.loadFile(path.join(__dirname, '../../index.html'));
  mainWindow.setMenu(null);

  mainWindow.on('close', (event) => {
    // 关闭窗口不退出，最小化到托盘
    if (!app.isQuiting) {
      event.preventDefault();
      mainWindow.hide();
    }
  });
}

app.whenReady().then(() => {
  createWindow();
  initIpc(() => mainWindow);
  const { getConfig } = require('./ipc-config');
  tray.init({
    getWin: () => mainWindow,
    getCurrentUser: () => tokenStore.readUser(),
    getConfigFn: getConfig,
  });

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('before-quit', () => { app.isQuiting = true; });

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

module.exports = { mainWindow: () => mainWindow };
