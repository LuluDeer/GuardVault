// 主进程 Token 安全存储：使用 Electron safeStorage 加密，跨平台安全
//   Windows: DPAPI
//   Linux:   libsecret / kwallet
//   macOS:   Keychain
const { safeStorage } = require('electron');
const fs = require('fs');
const path = require('path');
const { app } = require('electron');

const TOKEN_FILE = 'token.bin';
const USER_FILE = 'user.json';

function getPath(name) {
  return path.join(app.getPath('userData'), name);
}

// ===== Token 加密存取 =====
function saveToken(token) {
  try {
    if (!safeStorage.isEncryptionAvailable()) {
      // 极端环境（无 libsecret）降级为明文 + 警告
      console.warn('[Token] safeStorage 不可用，降级明文存储');
      fs.writeFileSync(getPath(TOKEN_FILE), token);
      return true;
    }
    const encrypted = safeStorage.encryptString(token);
    fs.writeFileSync(getPath(TOKEN_FILE), encrypted);
    return true;
  } catch (err) {
    console.error('[Token] save error:', err.message);
    return false;
  }
}

function readToken() {
  try {
    const buf = fs.readFileSync(getPath(TOKEN_FILE));
    if (!buf.length) return null;
    // 探测是否加密数据：safeStorage 加密后是随机字节，明文是 ASCII
    // 简单降级：尝试解密失败则当明文
    if (safeStorage.isEncryptionAvailable()) {
      try {
        return safeStorage.decryptString(buf);
      } catch {
        // 老版本存的明文
        return buf.toString();
      }
    }
    return buf.toString();
  } catch {
    return null;
  }
}

function clearToken() {
  try { fs.unlinkSync(getPath(TOKEN_FILE)); } catch {}
}

// ===== 用户信息（无敏感，明文）=====
function saveUser(user) {
  try {
    fs.writeFileSync(getPath(USER_FILE), JSON.stringify(user));
    return true;
  } catch { return false; }
}

function readUser() {
  try {
    return JSON.parse(fs.readFileSync(getPath(USER_FILE), 'utf8'));
  } catch { return null; }
}

function clearUser() {
  try { fs.unlinkSync(getPath(USER_FILE)); } catch {}
}

module.exports = { saveToken, readToken, clearToken, saveUser, readUser, clearUser };
