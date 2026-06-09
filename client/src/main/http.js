// 统一 HTTP 客户端：基于 axios，自动注入 Bearer Token、监听 1005 触发 auth:expired
// 调用方只关心 doRequest({ method, url, data, params })，所有响应统一是 ApiResponse 包装
const axios = require('axios');
const tokenStore = require('./token-store');
const { getConfig } = require('./app-config');

let httpClient = null;

function buildClient() {
  const c = axios.create({
    baseURL: getConfig().serverUrl,
    timeout: 10000,
    // 不让 axios 抛 4xx/5xx，统一在业务层判断 resp.data.code
    validateStatus: () => true,
  });

  c.interceptors.request.use((cfg) => {
    const token = tokenStore.readToken();
    if (token) {
      cfg.headers = cfg.headers || {};
      cfg.headers.Authorization = `Bearer ${token}`;
    }
    return cfg;
  });

  c.interceptors.response.use((resp) => {
    if (resp.data && resp.data.code === 1005) {
      // Token 失效：清空凭据 + 通知所有窗口跳登录
      tokenStore.clearToken();
      tokenStore.clearUser();
      tokenStore.clearRefreshToken();
      const { BrowserWindow } = require('electron');
      BrowserWindow.getAllWindows().forEach((win) => {
        win.webContents.send('auth:expired');
      });
    }
    return resp;
  });

  return c;
}

function getClient() {
  if (!httpClient) httpClient = buildClient();
  return httpClient;
}

/** serverUrl 变更后调用：重建 client（新 baseURL） */
function rebuildClient() {
  httpClient = buildClient();
  return httpClient;
}

async function doRequest({ method, url, data, params }) {
  try {
    const resp = await getClient().request({ method, url, data, params });
    return resp.data;
  } catch (err) {
    // 网络/URL 错误：包装成业务响应，避免 IPC invoke reject 抛到渲染端
    return { code: -1, message: err.message || '网络请求失败' };
  }
}

module.exports = { doRequest, rebuildClient };
