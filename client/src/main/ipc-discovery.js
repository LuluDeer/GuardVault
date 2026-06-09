// IPC: 局域网服务端发现 + 单点 ping
const { ipcMain } = require('electron');
const { discoverServers } = require('./discovery');

function register() {
  ipcMain.handle('discover:servers', async (_e, opts) => {
    try {
      const list = await discoverServers(opts || {});
      return { ok: true, list };
    } catch (err) {
      return { ok: false, message: err.message || 'discover failed', list: [] };
    }
  });
}

module.exports = { register };
