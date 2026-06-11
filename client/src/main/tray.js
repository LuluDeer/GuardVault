// 系统托盘菜单（跨平台）
const { Tray, Menu, app, clipboard } = require('electron');
const path = require('path');
const axios = require('axios');
const fs = require('fs');

let tray = null;
let getWindow = null;
let getUser = null;
let getConfig = null;

let cache = { services: [], codes: {}, refreshTimer: null, user: null };

function createTray() {
  // Windows 托盘必须用 .ico 格式，Linux/macOS 用 PNG
  const isWin = process.platform === 'win32';
  const iconFile = isWin ? 'icon.ico' : 'icon_512.png';
  // 打包后 build/ 目录在 extraResources 里，开发时相对 __dirname 走两级到项目根
  const candidates = [
    path.join(__dirname, '../../build/', iconFile),
    path.join(process.resourcesPath || '', iconFile),
    path.join(__dirname, '../../public/icon_512.png'), // 最终兜底
  ];

  let loaded = false;
  for (const p of candidates) {
    try {
      if (!fs.existsSync(p)) continue;
      tray = new Tray(p);
      loaded = true;
      break;
    } catch (e) {
      console.warn('Tray icon load failed:', p, e.message);
    }
  }

  if (!loaded) {
    try {
      const { nativeImage } = require('electron');
      tray = new Tray(nativeImage.createEmpty());
    } catch (e) {
      console.error('Failed to create tray:', e.message);
      return null;
    }
  }
  
  rebuildMenu();
  tray.setToolTip('GuardVault');
  tray.on('click', () => showWindow());
  tray.on('double-click', () => showWindow());
  return tray;
}

function showWindow() {
  if (!getWindow) return;
  const win = getWindow();
  if (!win) return;
  if (win.isMinimized()) win.restore();
  win.show();
  win.focus();
}

function readServerConfig() {
  if (typeof getConfig !== 'function') return { serverUrl: 'http://127.0.0.1:3001' };
  return getConfig();
}

function readToken() {
  try {
    const tokenStore = require('./token-store');
    return tokenStore.readToken();
  } catch { return null; }
}

async function refreshServices() {
  const user = typeof getUser === 'function' ? getUser() : null;
  if (!user) { cache.services = []; cache.codes = {}; return; }

  const token = readToken();
  if (!token) { cache.services = []; cache.codes = {}; return; }

  const config = readServerConfig();
  try {
    const resp = await axios.get(config.serverUrl + '/api/user/service/list', {
      headers: { Authorization: `Bearer ${token}` },
      timeout: 5000,
    });
    if (resp.data?.code === 0) {
      cache.services = resp.data.data || [];
      cache.user = user;
      const period = cache.services[0]?.period || 30;
      scheduleNextRefresh(period);
    }
  } catch (err) {
    scheduleNextRefresh(60);
  }
}

async function refreshAllCodes() {
  const token = readToken();
  if (!token) return;
  const config = readServerConfig();

  for (const service of cache.services) {
    try {
      const resp = await axios.get(`${config.serverUrl}/api/user/service/${service.id}/code`, {
        headers: { Authorization: `Bearer ${token}` },
        timeout: 5000,
      });
      if (resp.data?.code === 0) {
        cache.codes[service.id] = resp.data.data;
      }
    } catch {}
  }
}

function scheduleNextRefresh(seconds = 30) {
  if (cache.refreshTimer) clearTimeout(cache.refreshTimer);
  cache.refreshTimer = setTimeout(async () => {
    await refreshAllCodes();
    rebuildMenu();
  }, seconds * 1000);
}

function buildServiceMenuItems() {
  if (!cache.services.length) {
    return [{ label: '暂无可用服务', enabled: false }];
  }

  const items = cache.services.slice(0, 8).map((s, idx) => {
    const codeInfo = cache.codes[s.id];
    const label = codeInfo
      ? `${idx + 1}. ${s.name}  [${codeInfo.code}] (${codeInfo.remainSeconds}s)`
      : `${idx + 1}. ${s.name}  [加载中...]`;

    return {
      label,
      click: async () => {
        if (!codeInfo) return;
        clipboard.writeText(codeInfo.code);
        setTimeout(() => clipboard.writeText(''), 30000);
        try {
          await axios.post(
            `${readServerConfig().serverUrl}/api/user/service/copy-report`,
            { accountId: s.id },
            { headers: { Authorization: `Bearer ${readToken()}` } }
          );
        } catch {}
        if (tray) {
          tray.displayBalloon?.({
            title: '已复制',
            content: `${s.name}: ${codeInfo.code}`,
          });
        }
      },
    };
  });

  if (cache.services.length > 8) {
    items.push({ type: 'separator' });
    items.push({ label: `还有 ${cache.services.length - 8} 个服务...`, enabled: false });
  }

  return items;
}

function rebuildMenu() {
  if (!tray) return;
  const user = typeof getUser === 'function' ? getUser() : null;
  const status = user ? `已登录: ${user.username}` : '未登录';

  const template = [
    { label: status, enabled: false },
    { type: 'separator' },
    ...buildServiceMenuItems(),
    { type: 'separator' },
    { label: '复制第1个服务', click: () => copyFirst(), enabled: cache.services.length > 0 },
    { label: '刷新验证码', click: () => refreshAllCodes().then(rebuildMenu) },
    { type: 'separator' },
    { label: '显示主窗口', click: () => showWindow() },
    { label: '退出', click: async () => {
      const { dialog } = require('electron');
      const win = getWindow?.();
      const { response } = await dialog.showMessageBox(win || null, {
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
        if (win) win.removeAllListeners('close');
        app.quit();
      }
    } },
  ];
  tray.setContextMenu(Menu.buildFromTemplate(template));
}

function copyFirst() {
  const s = cache.services[0];
  if (!s) return;
  const codeInfo = cache.codes[s.id];
  if (!codeInfo) return;
  clipboard.writeText(codeInfo.code);
  setTimeout(() => clipboard.writeText(''), 30000);
}

function init({ getWin, getCurrentUser, getConfigFn }) {
  getWindow = getWin;
  getUser = getCurrentUser;
  getConfig = getConfigFn;
  if (tray) return tray;
  const t = createTray();
  refreshServices().then(() => refreshAllCodes()).then(rebuildMenu);
  return t;
}

function notifyUserChanged() {
  cache.services = [];
  cache.codes = {};
  refreshServices().then(() => refreshAllCodes()).then(rebuildMenu);
}

function destroy() {
  if (cache.refreshTimer) clearTimeout(cache.refreshTimer);
  if (tray) { tray.destroy(); tray = null; }
}

module.exports = { init, destroy, notifyUserChanged, rebuildMenu };