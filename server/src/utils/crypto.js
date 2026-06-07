import crypto from 'node:crypto';

// Master Key从环境变量读取（32字节，hex编码64字符）
function getMasterKey() {
  const key = process.env.TOTP_MASTER_KEY;
  if (!key || key.length !== 64) {
    throw new Error('TOTP_MASTER_KEY must be a 64-character hex string (32 bytes)');
  }
  return Buffer.from(key, 'hex');
}

/**
 * AES-256-GCM 加密
 * @param {string} plainText - 明文
 * @returns {string} iv:authTag:ciphertext 格式字符串
 */
export function encrypt(plainText) {
  const masterKey = getMasterKey();
  const iv = crypto.randomBytes(12); // 96bit GCM标准IV
  const cipher = crypto.createCipheriv('aes-256-gcm', masterKey, iv);
  const encrypted = Buffer.concat([cipher.update(plainText, 'utf8'), cipher.final()]);
  const authTag = cipher.getAuthTag();
  return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted.toString('hex')}`;
}

/**
 * AES-256-GCM 解密
 * @param {string} stored - iv:authTag:ciphertext 格式字符串
 * @returns {string} 明文
 */
export function decrypt(stored) {
  const masterKey = getMasterKey();
  const [ivHex, authTagHex, dataHex] = stored.split(':');
  if (!ivHex || !authTagHex || !dataHex) {
    throw new Error('Invalid encrypted data format');
  }
  const decipher = crypto.createDecipheriv('aes-256-gcm', masterKey, Buffer.from(ivHex, 'hex'));
  decipher.setAuthTag(Buffer.from(authTagHex, 'hex'));
  const decrypted = Buffer.concat([
    decipher.update(Buffer.from(dataHex, 'hex')),
    decipher.final()
  ]);
  return decrypted.toString('utf8');
}
