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

  // ===== 客户端部门管理（部门管理员 / 超级管理员） =====
  getMyDeptInfo: () => window.electronAPI.request({ method: 'GET', url: '/api/user/dept/info' }),
  listDeptMembers: (params) => window.electronAPI.request({ method: 'GET', url: '/api/user/dept/members', params }),
  appointDeptAdmin: (userId) => window.electronAPI.request({ method: 'POST', url: '/api/user/dept/appoint', data: { userId } }),
  revokeDeptAdmin: (userId) => window.electronAPI.request({ method: 'POST', url: `/api/user/dept/revoke/${userId}`, data: {} }),
  updateDeptMember: (userId, data) => window.electronAPI.request({ method: 'PATCH', url: `/api/user/dept/member/${userId}`, data }),
  createDeptService: (data) => window.electronAPI.request({ method: 'POST', url: '/api/user/dept/service/create', data }),
  listGrantableServices: (params) => window.electronAPI.request({ method: 'GET', url: '/api/user/dept/services', params }),
  grantServiceToDeptMember: (userId, accountId, remark) => window.electronAPI.request({ method: 'POST', url: '/api/user/dept/service/grant', data: { userId, accountId, remark } }),
  revokeServiceFromDeptMember: (userId, accountId) => window.electronAPI.request({ method: 'POST', url: '/api/user/dept/service/revoke', data: { userId, accountId } }),
  createDeptMember: (data) => window.electronAPI.request({ method: 'POST', url: '/api/user/dept/member/create', data }),
  listUserGrants: (userId) => window.electronAPI.request({ method: 'GET', url: `/api/user/dept/grants/${userId}` }),

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