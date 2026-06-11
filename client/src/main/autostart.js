const { app } = require('electron');
const { spawnSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const os = require('os');

const APP_NAME = 'TOTPClient';

function getDesktopFilePath() {
  return path.join(os.homedir(), '.config', 'autostart', `${APP_NAME}.desktop`);
}

function getExecLine() {
  // 开发模式下 process.execPath 指向 electron 可执行文件 + 项目路径
  // 打包后指向 AppImage / exe，参数不同
  if (app.isPackaged) {
    return process.execPath;
  }
  return `${process.execPath} ${path.resolve(app.getAppPath())}`;
}

function getAutoStartLinux() {
  try {
    return fs.existsSync(getDesktopFilePath());
  } catch {
    return false;
  }
}

function setAutoStartLinux(enable) {
  try {
    const filePath = getDesktopFilePath();
    if (!enable) {
      if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
      return true;
    }
    const dir = path.dirname(filePath);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    const content = [
      '[Desktop Entry]',
      'Type=Application',
      `Name=${APP_NAME}`,
      `Exec=${getExecLine()}`,
      'X-GNOME-Autostart-enabled=true',
      'NoDisplay=false',
      '',
    ].join('\n');
    fs.writeFileSync(filePath, content, { mode: 0o644 });
    return true;
  } catch {
    return false;
  }
}

function getAutoStartWindows() {
  try {
    const result = spawnSync('reg', [
      'query',
      'HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Run',
      '/v',
      APP_NAME,
    ]);
    return result.status === 0;
  } catch {
    return false;
  }
}

function setAutoStartWindows(enable) {
  try {
    const regPath = 'HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Run';
    if (enable) {
      const r = spawnSync('reg', [
        'add', regPath, '/v', APP_NAME, '/t', 'REG_SZ',
        '/d', `"${getExecLine()}"`, '/f',
      ]);
      return r.status === 0;
    }
    spawnSync('reg', ['delete', regPath, '/v', APP_NAME, '/f']);
    return true;
  } catch {
    return false;
  }
}

function getAutoStartMac() {
  try {
    return app.getLoginItemSettings().openAtLogin;
  } catch {
    return false;
  }
}

function setAutoStartMac(enable) {
  try {
    app.setLoginItemSettings({ openAtLogin: enable });
    return true;
  } catch {
    return false;
  }
}

function getAutoStart() {
  if (process.platform === 'win32') return getAutoStartWindows();
  if (process.platform === 'linux') return getAutoStartLinux();
  if (process.platform === 'darwin') return getAutoStartMac();
  return false;
}

function setAutoStart(enable) {
  if (process.platform === 'win32') return setAutoStartWindows(enable);
  if (process.platform === 'linux') return setAutoStartLinux(enable);
  if (process.platform === 'darwin') return setAutoStartMac(enable);
  return false;
}

module.exports = { getAutoStart, setAutoStart };
