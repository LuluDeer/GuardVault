import jwt from 'jsonwebtoken';
import crypto from 'node:crypto';
import { revokeJti, isRevoked } from './token-blacklist.service.js';

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
 * 吊销Token（加入黑名单，持久化到 MySQL）
 * @param {string} token
 */
export async function revokeToken(token) {
  try {
    const decoded = jwt.decode(token);
    if (decoded?.jti && decoded?.exp) {
      await revokeJti(decoded.jti, decoded.exp * 1000);
    }
  } catch {
    // 忽略无效 token
  }
}

/**
 * 验证Token有效性
 * @param {string} token
 * @returns {object} decoded payload
 * @throws {Error} TOKEN_REVOKED / jwt验证失败
 */
export async function verifyToken(token) {
  const decoded = jwt.verify(token, process.env.JWT_SECRET);
  if (await isRevoked(decoded.jti)) {
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
