const { app } = require('electron');
const { spawnSync } = require('child_process');
const path = require('path');

function getAutoStart() {
  try {
    const result = spawnSync('reg', [
      'query',
      'HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Run',
      '/v',
      'TOTPClient'
    ]);
    
    return result.status === 0;
  } catch {
    return false;
  }
}

function setAutoStart(enable) {
  try {
    const exePath = process.execPath;
    const regPath = 'HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Run';
    
    if (enable) {
      spawnSync('reg', [
        'add',
        regPath,
        '/v',
        'TOTPClient',
        '/t',
        'REG_SZ',
        '/d',
        `"${exePath}"`,
        '/f'
      ]);
    } else {
      spawnSync('reg', [
        'delete',
        regPath,
        '/v',
        'TOTPClient',
        '/f'
      ]);
    }
    
    return true;
  } catch {
    return false;
  }
}

function initAutoStart() {
}

module.exports = { getAutoStart, setAutoStart, initAutoStart };