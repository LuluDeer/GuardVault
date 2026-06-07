const { app, ipcMain, clipboard, Notification } = require('electron');
const axios = require('axios');
const fs = require('fs');
const path = require('path');
const tokenStore = require('./token-store');
const { getAutoStart, setAutoStart } = require('./autostart');
const { getConfig } = require('./ipc-config');

function getConfigPath() {
  return path.join(app.getPath('userData'), 'config.json');
}

function getConfig() {
  try {
    return JSON.parse(fs.readFileSync(getConfigPath(), 'utf8'));
  } catch {
    return { serverUrl: 'http://127.0.0.1:3000', darkMode: false, hotkey: 'Ctrl+Alt+T' };
  }
}

function saveConfig(config) {
  try {
    const p = getConfigPath();
    const dir = path.dirname(p);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(p, JSON.stringify(config, null, 2));
    return true;
  } catch {
    return false;
  }
}

let httpClient = axios.create({
  baseURL: getConfig().serverUrl,
  timeout: 10000,
  validateStatus: () => true,
});

function updateHttpClientBaseURL() {
  httpClient = axios.create({
    baseURL: getConfig().serverUrl,
    timeout: 10000,
    validateStatus: () => true,
  });
  httpClient.interceptors.request.use((config) => {
    const token = tokenStore.readToken();
    if (token) {
      config.headers = config.headers || {};
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  });
  httpClient.interceptors.response.use((resp) => {
    if (resp.data && resp.data.code === 1005) {
      tokenStore.clearToken();
      tokenStore.clearUser();
      tokenStore.clearRefreshToken();
      const { BrowserWindow } = require('electron');
      BrowserWindow.getAllWindows().forEach(win => {
        win.webContents.send('auth:expired');
      });
    }
    return resp;
  });
}

updateHttpClientBaseURL();

async function doRequest({ method, url, data, params }) {
  const resp = await httpClient.request({ method, url, data, params });
  return resp.data;
}

let heartbeatTimer = null;
function startHeartbeat(getWindow) {
  if (heartbeatTimer) return;
  heartbeatTimer = setInterval(async () => {
    try {
      const resp = await axios.get(getConfig().serverUrl + '/health', { timeout: 3000 });
      if (resp.data?.status === 'ok') {
        getWindow()?.webContents.send('net:online');
      } else {
        getWindow()?.webContents.send('net:offline');
      }
    } catch {
      getWindow()?.webContents.send('net:offline');
    }
  }, 15000);
}

function stopHeartbeat() {
  if (heartbeatTimer) {
    clearInterval(heartbeatTimer);
    heartbeatTimer = null;
  }
}

let tokenRefreshTimer = null;
async function refreshToken() {
  const refreshToken = tokenStore.readRefreshToken();
  if (!refreshToken) return;
  try {
    const result = await doRequest({
      method: 'POST',
      url: '/api/user/refresh',
      data: { refreshToken },
    });
    if (result.code === 0 && result.data?.token) {
      tokenStore.saveToken(result.data.token);
      if (result.data.refreshToken) {
        tokenStore.saveRefreshToken(result.data.refreshToken);
      }
    }
  } catch {
    tokenStore.clearToken();
    tokenStore.clearUser();
    tokenStore.clearRefreshToken();
    const { BrowserWindow } = require('electron');
    BrowserWindow.getAllWindows().forEach(win => {
      win.webContents.send('auth:expired');
    });
  }
}

function startTokenRefresh(getWindow) {
  if (tokenRefreshTimer) clearInterval(tokenRefreshTimer);
  tokenRefreshTimer = setInterval(refreshToken, 60 * 60 * 1000);
}

function stopTokenRefresh() {
  if (tokenRefreshTimer) {
    clearInterval(tokenRefreshTimer);
    tokenRefreshTimer = null;
  }
}

let clipboardClearTimer = null;
function clearClipboardDelayed(delay = 30000) {
  if (clipboardClearTimer) clearTimeout(clipboardClearTimer);
  clipboardClearTimer = setTimeout(() => {
    clipboard.writeText('');
  }, delay);
}

function registerIpc(getWindow) {
  ipcMain.handle('config:get', () => getConfig());
  ipcMain.handle('config:set', (_, config) => {
    const result = saveConfig(config);
    updateHttpClientBaseURL();
    return result;
  });

  ipcMain.handle('auth:login', async (_, { username, password, totpCode }) => {
    const result = await doRequest({
      method: 'POST', url: '/api/user/login',
      data: totpCode ? { username, password, totpCode } : { username, password },
    });
    if (result.code === 0 && result.data?.token) {
      tokenStore.saveToken(result.data.token);
      tokenStore.saveUser(result.data.user);
      if (result.data.refreshToken) {
        tokenStore.saveRefreshToken(result.data.refreshToken);
      }
      startTokenRefresh(getWindow);
    }
    return result;
  });

  ipcMain.handle('auth:logout', async () => {
    stopTokenRefresh();
    const result = await doRequest({ method: 'POST', url: '/api/user/logout' });
    tokenStore.clearToken();
    tokenStore.clearUser();
    tokenStore.clearRefreshToken();
    return result;
  });

  ipcMain.handle('auth:user', () => tokenStore.readUser());
  ipcMain.handle('auth:hasToken', () => !!tokenStore.readToken());

  ipcMain.handle('request', async (_, { method, url, data, params }) => {
    return doRequest({ method, url, data, params });
  });

  ipcMain.handle('totp:code', async () => doRequest({ method: 'GET', url: '/api/user/totp/code' }));

  ipcMain.handle('user:changePassword', async (_, { oldPassword, newPassword }) => {
    const result = await doRequest({
      method: 'PUT', url: '/api/user/password',
      data: { oldPassword, newPassword },
    });
    if (result.code === 0) {
      stopTokenRefresh();
      tokenStore.clearToken();
      tokenStore.clearUser();
      tokenStore.clearRefreshToken();
    }
    return result;
  });

  ipcMain.handle('autostart:get', () => getAutoStart());
  ipcMain.handle('autostart:set', (_, enable) => setAutoStart(!!enable));

  ipcMain.handle('service:list', async () => doRequest({ method: 'GET', url: '/api/user/service/list' }));
  ipcMain.handle('service:detail', async (_, id) => doRequest({ method: 'GET', url: `/api/user/service/${id}` }));
  ipcMain.handle('service:code', async (_, id) => doRequest({ method: 'GET', url: `/api/user/service/${id}/code` }));
  ipcMain.handle('service:copy-report', async (_, accountId) => doRequest({
    method: 'POST', url: '/api/user/service/copy-report',
    data: { accountId },
  }));

  ipcMain.on('window:minimize', () => getWindow()?.minimize());
  ipcMain.on('window:close', () => getWindow()?.hide());
  ipcMain.on('window:toggle-maximize', () => {
    if (!getWindow()) return;
    if (getWindow().isMaximized()) getWindow().unmaximize();
    else getWindow().maximize();
  });

  ipcMain.on('clipboard:write', (_, text) => {
    clipboard.writeText(String(text || ''));
    clearClipboardDelayed(30000);
  });

  ipcMain.on('clipboard:clear', () => clipboard.writeText(''));

  ipcMain.on('notify', (_, { title, body }) => {
    try {
      new Notification({ title, body, silent: false }).show();
    } catch {}
  });

  startHeartbeat(getWindow);

  if (tokenStore.readToken()) {
    startTokenRefresh(getWindow);
  }
}

function initIpc(getWindow) {
  registerIpc(getWindow);
  return { stopHeartbeat, stopTokenRefresh };
}

module.exports = { initIpc };
