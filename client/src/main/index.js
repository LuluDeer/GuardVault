// Electron 主进程入口
const { app, BrowserWindow } = require('electron');
const path = require('path');
const ipcConfig = require('./ipc-config');
const ipcAuth = require('./ipc-auth');
const ipcBusiness = require('./ipc-business');
const ipcDiscovery = require('./ipc-discovery');
const tray = require('./tray');
const tokenStore = require('./token-store');
const { getConfig } = require('./app-config');
const windowManager = require('./window-manager');

// 单实例锁：第二个实例启动时直接退出，并将已有窗口带到前台
const gotLock = app.requestSingleInstanceLock();
if (!gotLock) {
  app.quit();
}

app.on('second-instance', () => {
  // 有第二个实例尝试启动时触发
  if (mainWindow) {
    if (mainWindow.isMinimized()) mainWindow.restore();
    if (!mainWindow.isVisible()) mainWindow.show();
    mainWindow.focus();
  }
});

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
      sandbox: false,
      preload: path.join(__dirname, '../preload/index.js'),
      webSecurity: process.env.NODE_ENV === 'development',
    },
  });
  windowManager.setMainWindow(mainWindow);

  // 加载页面：dev 走 vite dev server（npm run dev），prod 走构建产物
  if (process.env.VITE_DEV_SERVER_URL) {
    mainWindow.loadURL(process.env.VITE_DEV_SERVER_URL);
  } else {
    mainWindow.loadFile(path.join(__dirname, '../../dist/index.html'));
  }
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

  // 注册 IPC：先注册 config（提供 auth-expired 广播 + 窗口控制 + 心跳），
  // 再注册 auth（依赖 ipc-config 的 broadcastAuthExpired），然后业务 + 发现
  ipcConfig.register();
  ipcAuth.register();
  ipcBusiness.register();
  ipcDiscovery.register();

  // 启动心跳（net:online / net:offline）
  ipcConfig.startHeartbeat(() => mainWindow);

  // 已登录则恢复 token 定时刷新 + SSE 长连接
  if (tokenStore.readToken()) {
    ipcAuth.startTokenRefresh();
    require('./user-events').start();
  }

  tray.init({
    getWin: () => mainWindow,
    getCurrentUser: () => tokenStore.readUser(),
    getConfigFn: getConfig,
  });

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('before-quit', () => {
  app.isQuiting = true;
  ipcConfig.stopHeartbeat();
  ipcAuth.stopTokenRefresh();
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

module.exports = { mainWindow: () => mainWindow };
