// 用户级事件流（SSE）客户端：登录后建立长连接，断线自动重连。
// 收到授权变更事件后通过 IPC 推送给渲染器与托盘。
const { EventEmitter } = require('node:events');
const http = require('node:http');
const https = require('node:https');
const { URL } = require('node:url');
const tokenStore = require('./token-store');
const { getConfig } = require('./app-config');
const { getMainWindow } = require('./window-manager');

const emitter = new EventEmitter();

let currentReq = null;
let reconnectTimer = null;
let stopped = false;
let backoffMs = 1000;

function emitToRenderer(channel, payload) {
  const win = getMainWindow();
  if (win && !win.isDestroyed()) {
    win.webContents.send(channel, payload);
  }
}

function close() {
  stopped = true;
  if (reconnectTimer) { clearTimeout(reconnectTimer); reconnectTimer = null; }
  if (currentReq) {
    try { currentReq.destroy() } catch (_) {}
    currentReq = null;
  }
}

function scheduleReconnect() {
  if (stopped) return;
  if (reconnectTimer) return;
  reconnectTimer = setTimeout(() => {
    reconnectTimer = null;
    connect();
  }, backoffMs);
  backoffMs = Math.min(backoffMs * 2, 30000); // 指数退避上限 30s
}

function connect() {
  if (stopped) return;
  const token = tokenStore.readToken();
  if (!token) { scheduleReconnect(); return; }

  let cfg;
  try { cfg = getConfig() } catch (_) { scheduleReconnect(); return; }
  let urlObj;
  try { urlObj = new URL('/api/user/events', cfg.serverUrl) } catch (_) { scheduleReconnect(); return; }

  const lib = urlObj.protocol === 'https:' ? https : http;
  const req = lib.request(
    {
      method: 'GET',
      hostname: urlObj.hostname,
      port: urlObj.port || (urlObj.protocol === 'https:' ? 443 : 80),
      path: urlObj.pathname + urlObj.search,
      headers: { Authorization: `Bearer ${token}`, Accept: 'text/event-stream' },
    },
    (res) => {
      if (res.statusCode !== 200) {
        // 401 等：不要立刻重试，先让 refreshToken 有机会换新 token
        backoffMs = Math.max(backoffMs, 5000);
        scheduleReconnect();
        return;
      }
      backoffMs = 1000; // 成功连接后重置退避
      res.setEncoding('utf8');

      let buffer = '';
      res.on('data', (chunk) => {
        buffer += chunk;
        let idx;
        while ((idx = buffer.indexOf('\n\n')) !== -1) {
          const raw = buffer.slice(0, idx);
          buffer = buffer.slice(idx + 2);
          parseEvent(raw);
        }
      });
      res.on('end', () => { scheduleReconnect() });
      res.on('error', () => { scheduleReconnect() });
    },
  );
  req.on('error', () => { scheduleReconnect() });
  req.setTimeout(0); // 长连接不超时
  req.end();
  currentReq = req;
}

function parseEvent(raw) {
  let name = 'message';
  const dataLines = [];
  for (const line of raw.split('\n')) {
    if (!line || line.startsWith(':')) continue;
    const i = line.indexOf(':');
    const field = i === -1 ? line : line.slice(0, i);
    const value = i === -1 ? '' : line.slice(i + 1).replace(/^ /, '');
    if (field === 'event') name = value;
    else if (field === 'data') dataLines.push(value);
  }
  if (!dataLines.length && name === 'message') return;
  let payload;
  try { payload = dataLines.length ? JSON.parse(dataLines.join('\n')) : null } catch (_) { payload = null }
  handleEvent(name, payload);
}

function handleEvent(name, payload) {
  if (name === 'hello') {
    emitter.emit('connected', payload);
    return;
  }
  if (name === 'grant-changed' && payload) {
    emitToRenderer('grant:changed', payload);
  }
}

function start() {
  stopped = false;
  backoffMs = 1000;
  connect();
}

module.exports = { start, close, emitter };
