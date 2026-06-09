// IPC：业务 API（服务列表/详情/动态码/复制上报、通用 request 转发）
// 渲染端通过 request 通道发起的任意业务调用都在这里做 URL 收口
const { ipcMain } = require('electron');
const { doRequest } = require('./http');

function register() {
  // 通用通道：渲染端封装的方法列表里，凡是不在专用 handler 里的都走这里
  ipcMain.handle('request', async (_, { method, url, data, params }) => {
    return doRequest({ method, url, data, params });
  });

  // 服务（账号）相关
  ipcMain.handle('service:list', async () => doRequest({ method: 'GET', url: '/api/user/service/list' }));
  ipcMain.handle('service:detail', async (_, id) => doRequest({ method: 'GET', url: `/api/user/service/${id}` }));
  ipcMain.handle('service:code', async (_, id) => doRequest({ method: 'GET', url: `/api/user/service/${id}/code` }));
  ipcMain.handle('service:copy-report', async (_, accountId) => doRequest({
    method: 'POST',
    url: '/api/user/service/copy-report',
    data: { accountId },
  }));
}

module.exports = { register };
