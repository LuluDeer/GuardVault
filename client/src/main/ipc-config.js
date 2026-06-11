// IPC：本地应用配置 + 窗口/剪贴板/通知 + 自启动
// 所有请求走 doRequest（http.js），无业务逻辑
const { app, ipcMain, clipboard, dialog, Notification, BrowserWindow } = require('electron');
const { getConfig, saveConfig } = require('./app-config');
const { rebuildClient } = require('./http');
const { getAutoStart, setAutoStart } = require('./autostart');

let heartbeatTimer = null;
const HEARTBEAT_INTERVAL = 15000;
const HEARTBEAT_TIMEOUT = 3000;

function startHeartbeat(getWindow) {
  if (heartbeatTimer) return;
  heartbeatTimer = setInterval(async () => {
    try {
      const { getClient } = require('./http');
      const resp = await getClient().get('/health', { timeout: HEARTBEAT_TIMEOUT });
      if (resp.data?.status === 'ok') {
        getWindow()?.webContents.send('net:online');
      } else {
        getWindow()?.webContents.send('net:offline');
      }
    } catch {
      getWindow()?.webContents.send('net:offline');
    }
  }, HEARTBEAT_INTERVAL);
}

function stopHeartbeat() {
  if (heartbeatTimer) {
    clearInterval(heartbeatTimer);
    heartbeatTimer = null;
  }
}

let clipboardClearTimer = null;
function clearClipboardDelayed(delay = 30000) {
  if (clipboardClearTimer) clearTimeout(clipboardClearTimer);
  clipboardClearTimer = setTimeout(() => clipboard.writeText(''), delay);
}

function broadcastAuthExpired() {
  BrowserWindow.getAllWindows().forEach((win) => {
    win.webContents.send('auth:expired');
  });
}

function register() {
  // ===== 应用配置 =====
  ipcMain.handle('config:get', () => getConfig());
  ipcMain.handle('config:set', (_, config) => {
    const ok = saveConfig(config);
    if (ok) rebuildClient();  // 改 serverUrl 后必须重建 client
    return ok;
  });

  // ===== 自启动 =====
  ipcMain.handle('autostart:get', () => getAutoStart());
  ipcMain.handle('autostart:set', (_, enable) => setAutoStart(!!enable));

  // ===== 窗口控制 =====
  ipcMain.on('window:minimize', (e) => BrowserWindow.fromWebContents(e.sender)?.minimize());
  ipcMain.on('window:close', (e) => BrowserWindow.fromWebContents(e.sender)?.hide());
  ipcMain.on('window:toggle-maximize', (e) => {
    const win = BrowserWindow.fromWebContents(e.sender);
    if (!win) return;
    if (win.isMaximized()) win.unmaximize();
    else win.maximize();
  });

  // ===== 剪贴板 =====
  ipcMain.on('clipboard:write', (_, text) => {
    clipboard.writeText(String(text || ''));
    clearClipboardDelayed(30000);
  });
  ipcMain.on('clipboard:clear', () => clipboard.writeText(''));

  // ===== 应用退出 =====
  // 渲染层调用此通道，主进程弹原生确认对话框后再真正退出
  ipcMain.handle('app:quit', async () => {
    const win = BrowserWindow.getFocusedWindow() || BrowserWindow.getAllWindows()[0];
    const { response } = await dialog.showMessageBox(win || new BrowserWindow({ show: false }), {
      type: 'question',
      buttons: ['退出', '取消'],
      defaultId: 0,
      cancelId: 1,
      title: '确认退出',
      message: '确定要退出 GuardVault 客户端吗？',
      detail: '退出后将无法查看动态验证码，直到重新启动应用。',
    });
    if (response === 0) {
      app.isQuiting = true;
      app.quit();
      return true;
    }
    return false;
  });

  // ===== 通知 =====
  ipcMain.on('notify', (_, { title, body }) => {
    try {
      new Notification({ title, body, silent: false }).show();
    } catch {}
  });
}

module.exports = {
  register,
  startHeartbeat,
  stopHeartbeat,
  broadcastAuthExpired,
};
