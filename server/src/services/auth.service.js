import jwt from 'jsonwebtoken';
import crypto from 'node:crypto';

// 黑名单：Map<jti, expireAt时间戳>
const blacklist = new Map();

// 每小时清理已过期的黑名单条目
setInterval(() => {
  const now = Date.now();
  for (const [jti, expireAt] of blacklist) {
    if (expireAt < now) blacklist.delete(jti);
  }
}, 3_600_000);

/**
 * 签发JWT Token
 * @param {object} payload - 载荷（不含jti，自动添加）
 * @param {number} expiresIn - 有效期（秒）
 * @returns {string} JWT token
 */
export function signToken(payload, expiresIn) {
  const jti = crypto.randomUUID();
  return jwt.sign(
    { ...payload, jti },
    process.env.JWT_SECRET,
    { expiresIn }
  );
}

/**
 * 吊销Token（加入黑名单）
 * @param {string} token
 */
export function revokeToken(token) {
  try {
    const decoded = jwt.decode(token);
    if (decoded?.jti && decoded?.exp) {
      blacklist.set(decoded.jti, decoded.exp * 1000);
    }
  } catch {
    // 忽略无效token
  }
}

/**
 * 验证Token有效性
 * @param {string} token
 * @returns {object} decoded payload
 * @throws {Error} TOKEN_REVOKED / jwt验证失败
 */
export function verifyToken(token) {
  const decoded = jwt.verify(token, process.env.JWT_SECRET);
  if (blacklist.has(decoded.jti)) {
    throw new Error('TOKEN_REVOKED');
  }
  return decoded;
}

/**
 * 从Authorization Header提取Token
 * @param {string} authHeader
 * @returns {string|null}
 */
export function extractToken(authHeader) {
  if (!authHeader || !authHeader.startsWith('Bearer ')) return null;
  return authHeader.slice(7);
}
