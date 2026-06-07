const { app } = require('electron');
const fs = require('fs');
const path = require('path');

function getConfigPath() {
  return path.join(app.getPath('userData'), 'config.json');
}

function getConfig() {
  try {
    return JSON.parse(fs.readFileSync(getConfigPath(), 'utf8'));
  } catch {
    return { serverUrl: 'http://127.0.0.1:3000', darkMode: false, hotkey: 'Ctrl+Alt+T' };
  }
}

module.exports = { getConfig };