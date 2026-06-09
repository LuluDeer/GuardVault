// 应用本地配置：serverUrl / darkMode / hotkey
// 持久化到 userData/config.json
const { app } = require('electron');
const fs = require('fs');
const path = require('path');

const DEFAULT_CONFIG = { serverUrl: 'http://127.0.0.1:3001', darkMode: false, hotkey: 'Ctrl+Alt+T' };

function isValidServerUrl(url) {
  if (typeof url !== 'string') return false;
  const trimmed = url.trim();
  if (!trimmed) return false;
  try {
    const u = new URL(trimmed);
    return u.protocol === 'http:' || u.protocol === 'https:';
  } catch {
    return false;
  }
}

function getConfigPath() {
  return path.join(app.getPath('userData'), 'config.json');
}

function getConfig() {
  let parsed = {};
  try {
    parsed = JSON.parse(fs.readFileSync(getConfigPath(), 'utf8'));
  } catch {}
  const merged = { ...DEFAULT_CONFIG, ...parsed };
  // serverUrl 必须是合法 http(s) URL，否则回退到默认
  if (!isValidServerUrl(merged.serverUrl)) {
    merged.serverUrl = DEFAULT_CONFIG.serverUrl;
  }
  return merged;
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

module.exports = { getConfig, saveConfig, isValidServerUrl, DEFAULT_CONFIG };
