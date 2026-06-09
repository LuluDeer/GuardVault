import { authenticator } from 'otplib';
import crypto from 'node:crypto';

// 重要：必须使用 otplib.authenticator（带 base32 keyDecoder），不能用 otplib.totp。
// otplib@12 的 totp 类没有 keyDecoder 插件，会把 base32 字符串本身的 ASCII 字节当 HMAC 密钥，
// 算出来的 TOTP 码与 RFC 6238 标准（Google Authenticator / 微软 Authenticator 等）对不上。
//
// 关键对比（secret=FD3LNGUPE5GSHKAPWN2DUWUE3RTJZR3V, t=59366325）：
//   RFC 6238 标准:  369458
//   authenticator:  369458  ✓
//   totp (bug):     364545  ✗

// 模块级默认实例（30s/6位/SHA1），供 2FA 登录用
const defaultAuth = authenticator.clone();
defaultAuth.options = { digits: 6, step: 30, algorithm: 'sha1' };

export function generateCode(base32Secret) {
  // 每次克隆一份独立实例，避免污染默认配置（防止和 service.service.js 里的非默认配置相互覆盖）
  const a = defaultAuth.clone();
  const code = a.generate(base32Secret);
  const epoch = Math.floor(Date.now() / 1000);
  const remainSeconds = 30 - (epoch % 30);
  return { code, remainSeconds };
}

export function generateSecret() {
  const rawBytes = crypto.randomBytes(20);
  return base32Encode(rawBytes);
}

export function verifyCode(base32Secret, code) {
  try {
    const a = defaultAuth.clone();
    return a.verify({ secret: base32Secret, token: code });
  } catch {
    return false;
  }
}

function base32Encode(buffer) {
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
  let bits = 0;
  let value = 0;
  let output = '';
  for (let i = 0; i < buffer.length; i++) {
    value = (value << 8) | buffer[i];
    bits += 8;
    while (bits >= 5) {
      output += alphabet[(value >>> (bits - 5)) & 31];
      bits -= 5;
    }
  }
  if (bits > 0) {
    output += alphabet[(value << (5 - bits)) & 31];
  }
  return output;
}
