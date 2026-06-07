import { totp } from 'otplib';
import crypto from 'node:crypto';

// RFC6238标准配置
totp.options = { digits: 6, step: 30, algorithm: 'sha1' };

/**
 * 生成当前TOTP动态码
 * @param {string} base32Secret - Base32编码的密钥明文
 * @returns {{ code: string, remainSeconds: number }}
 */
export function generateCode(base32Secret) {
  const code = totp.generate(base32Secret);
  const epoch = Math.floor(Date.now() / 1000);
  const remainSeconds = 30 - (epoch % 30);
  return { code, remainSeconds };
}

/**
 * 生成新的TOTP密钥（20字节，Base32编码）
 * @returns {string} Base32编码的密钥
 */
export function generateSecret() {
  // 20字节 = 160bit，符合RFC4226标准
  const rawBytes = crypto.randomBytes(20);
  return base32Encode(rawBytes);
}

/**
 * Base32编码（RFC4648）
 * @param {Buffer} buffer
 * @returns {string}
 */
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
