// 渲染进程与主进程的桥
// 暴露安全白名单的 API，渲染进程不能直接 require Node 模块
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  // --- 配置 ---
  getConfig: () => ipcRenderer.invoke('config:get'),
  setConfig: (config) => ipcRenderer.invoke('config:set', config),

  // --- 局域网发现 ---
  discoverServers: (opts) => ipcRenderer.invoke('discover:servers', opts),

  // --- 鉴权（主进程持有 token） ---
  login: (username, password, totpCode) => ipcRenderer.invoke('auth:login', { username, password, totpCode }),
  logout: () => ipcRenderer.invoke('auth:logout'),
  getUser: () => ipcRenderer.invoke('auth:user'),
  hasToken: () => ipcRenderer.invoke('auth:hasToken'),

  // --- 业务请求（无需传 token） ---
  request: ({ method, url, data, params }) =>
    ipcRenderer.invoke('request', { method, url, data, params }),

  getTotpCode: () => ipcRenderer.invoke('totp:code'),
  changePassword: (oldPassword, newPassword) =>
    ipcRenderer.invoke('user:changePassword', { oldPassword, newPassword }),

  getServiceList: () => ipcRenderer.invoke('service:list'),
  getServiceDetail: (id) => ipcRenderer.invoke('service:detail', id),
  getServiceCode: (id) => ipcRenderer.invoke('service:code', id),
  reportCopy: (accountId) => ipcRenderer.invoke('service:copy-report', accountId),

  getAutoStart: () => ipcRenderer.invoke('autostart:get'),
  setAutoStart: (enable) => ipcRenderer.invoke('autostart:set', enable),

  copyToClipboard: (text) => ipcRenderer.send('clipboard:write', text),
  clearClipboard: () => ipcRenderer.send('clipboard:clear'),
  notify: (title, body) => ipcRenderer.send('notify', { title, body }),

  // --- 应用退出（弹原生确认对话框） ---
  quitApp: () => ipcRenderer.invoke('app:quit'),

  // --- 窗口控制 ---
  minimize: () => ipcRenderer.send('window:minimize'),
  closeWindow: () => ipcRenderer.send('window:close'),
  toggleMaximize: () => ipcRenderer.send('window:toggle-maximize'),

  // --- 事件订阅（主进程 → 渲染进程），返回注销函数避免重复注册 ---
  onAuthExpired: (cb) => {
    const handler = () => cb();
    ipcRenderer.on('auth:expired', handler);
    return () => ipcRenderer.removeListener('auth:expired', handler);
  },
  onNetOnline: (cb) => {
    const handler = () => cb();
    ipcRenderer.on('net:online', handler);
    return () => ipcRenderer.removeListener('net:online', handler);
  },
  onNetOffline: (cb) => {
    const handler = () => cb();
    ipcRenderer.on('net:offline', handler);
    return () => ipcRenderer.removeListener('net:offline', handler);
  },
  onGrantChanged: (cb) => {
    const handler = (_e, payload) => cb(payload);
    ipcRenderer.on('grant:changed', handler);
    return () => ipcRenderer.removeListener('grant:changed', handler);
  },
});
