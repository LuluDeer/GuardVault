import { totp } from 'otplib';
import crypto from 'node:crypto';

totp.options = { digits: 6, step: 30, algorithm: 'sha1' };

export function generateCode(base32Secret) {
  const code = totp.generate(base32Secret);
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
    return totp.verify({ secret: base32Secret, token: code });
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
