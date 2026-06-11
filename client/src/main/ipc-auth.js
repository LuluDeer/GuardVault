// IPC：登录、登出、查询用户信息、获取 TOTP 码、修改密码
// 负责 token/refreshToken 的安全存取与定时刷新
const { ipcMain } = require('electron');
const tokenStore = require('./token-store');
const { doRequest } = require('./http');
const { broadcastAuthExpired } = require('./ipc-config');
const tray = require('./tray');
const userEvents = require('./user-events');

const REFRESH_INTERVAL = 15 * 60 * 1000;  // 15min，管理员 Token 有效期 30min，需在过期前刷新
let tokenRefreshTimer = null;

async function refreshToken() {
  const rt = tokenStore.readRefreshToken();
  if (!rt) return;
  const result = await doRequest({
    method: 'POST',
    url: '/api/user/refresh',
    data: { refreshToken: rt },
  });
  if (result.code === 0 && result.data?.token) {
    tokenStore.saveToken(result.data.token);
    if (result.data.refreshToken) {
      tokenStore.saveRefreshToken(result.data.refreshToken);
    }
    // token 换新后托盘可能用旧 token 失败，刷新一下
    tray.notifyUserChanged();
  } else {
    tokenStore.clearToken();
    tokenStore.clearUser();
    tokenStore.clearRefreshToken();
    broadcastAuthExpired();
    tray.notifyUserChanged();
  }
}

function startTokenRefresh() {
  if (tokenRefreshTimer) clearInterval(tokenRefreshTimer);
  tokenRefreshTimer = setInterval(refreshToken, REFRESH_INTERVAL);
}

function stopTokenRefresh() {
  if (tokenRefreshTimer) {
    clearInterval(tokenRefreshTimer);
    tokenRefreshTimer = null;
  }
}

function register() {
  // 登录
  ipcMain.handle('auth:login', async (_, { username, password, totpCode }) => {
    const result = await doRequest({
      method: 'POST',
      url: '/api/user/login',
      data: totpCode ? { username, password, totpCode } : { username, password },
    });
    if (result.code === 0 && result.data?.token) {
      tokenStore.saveToken(result.data.token);
      tokenStore.saveUser(result.data.user);
      if (result.data.refreshToken) {
        tokenStore.saveRefreshToken(result.data.refreshToken);
      }
      startTokenRefresh();
      // 登录成功 → 通知托盘刷新服务列表
      tray.notifyUserChanged();
      // 建立 SSE 长连接，授权变更实时推送
      userEvents.start();
    }
    return result;
  });

  // 登出
  ipcMain.handle('auth:logout', async () => {
    stopTokenRefresh();
    userEvents.close();
    const result = await doRequest({ method: 'POST', url: '/api/user/logout' });
    tokenStore.clearToken();
    tokenStore.clearUser();
    tokenStore.clearRefreshToken();
    // 登出 → 清空托盘缓存
    tray.notifyUserChanged();
    return result;
  });

  ipcMain.handle('auth:user', () => tokenStore.readUser());
  ipcMain.handle('auth:hasToken', () => !!tokenStore.readToken());

  // 用户改密（成功后清凭据，强制重新登录）
  ipcMain.handle('user:changePassword', async (_, { oldPassword, newPassword }) => {
    const result = await doRequest({
      method: 'PUT',
      url: '/api/user/password',
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

  // 当前用户 TOTP 码
  ipcMain.handle('totp:code', async () => doRequest({ method: 'GET', url: '/api/user/totp/code' }));
}

module.exports = { register, startTokenRefresh, stopTokenRefresh };
