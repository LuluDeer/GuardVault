export async function request(config) {
  return window.electronAPI.request(config);
}

export const api = {
  login: (username, password, totpCode) => window.electronAPI.login(username, password, totpCode),
  logout: () => window.electronAPI.logout(),
  getUser: () => window.electronAPI.getUser(),
  hasToken: () => window.electronAPI.hasToken(),
  changePassword: (oldPwd, newPwd) => window.electronAPI.changePassword(oldPwd, newPwd),

  getTotpCode: () => window.electronAPI.getTotpCode(),

  getServiceList: () => window.electronAPI.getServiceList(),
  getServiceDetail: (id) => window.electronAPI.getServiceDetail(id),
  getServiceCode: (id) => window.electronAPI.getServiceCode(id),
  reportCopy: (accountId) => window.electronAPI.reportCopy(accountId),

  // 收藏（通过通用 request 走，无需新 IPC）
  listFavorites: () => window.electronAPI.request({ method: 'GET', url: '/api/user/favorite/list' }),
  addFavorite: (accountId) => window.electronAPI.request({ method: 'POST', url: '/api/user/favorite/add', data: { accountId } }),
  removeFavorite: (accountId) => window.electronAPI.request({ method: 'POST', url: '/api/user/favorite/remove', data: { accountId } }),
  reorderFavorites: (orderedAccountIds) => window.electronAPI.request({ method: 'POST', url: '/api/user/favorite/reorder', data: { orderedAccountIds } }),

  request,

  getConfig: () => window.electronAPI.getConfig(),
  setConfig: (c) => window.electronAPI.setConfig(c),
  discoverServers: (opts) => window.electronAPI.discoverServers(opts),
  getAutoStart: () => window.electronAPI.getAutoStart(),
  setAutoStart: (b) => window.electronAPI.setAutoStart(b),

  copy: (text) => window.electronAPI.copyToClipboard(text),
  clearClipboard: () => window.electronAPI.clearClipboard(),
  notify: (title, body) => window.electronAPI.notify(title, body),

  minimize: () => window.electronAPI.minimize(),
  closeWindow: () => window.electronAPI.closeWindow(),
  toggleMaximize: () => window.electronAPI.toggleMaximize(),

  onAuthExpired: (cb) => window.electronAPI.onAuthExpired(cb),
  onNetOnline: (cb) => window.electronAPI.onNetOnline(cb),
  onNetOffline: (cb) => window.electronAPI.onNetOffline(cb),
  onGrantChanged: (cb) => window.electronAPI.onGrantChanged(cb),
};

export default api;