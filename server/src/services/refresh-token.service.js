import crypto from 'node:crypto';
import { prisma } from '../utils/prisma.js';

const REFRESH_EXPIRE_DAYS = parseInt(process.env.REFRESH_TOKEN_EXPIRE_DAYS || '7');

// 存储哈希，防止数据库泄露导致 refresh token 被冒用
const hashToken = (t) => crypto.createHash('sha256').update(t).digest('hex');

let swept = false;

async function sweepExpired() {
  await prisma.refreshToken.deleteMany({
    where: { expireAt: { lt: new Date() } },
  });
}

export async function createRefreshToken(userId) {
  const rawToken = crypto.randomBytes(64).toString('hex');
  const tokenHash = hashToken(rawToken);
  const expireAt = new Date(Date.now() + REFRESH_EXPIRE_DAYS * 24 * 60 * 60 * 1000);
  await prisma.refreshToken.create({
    data: { token: tokenHash, userId, expireAt },
  });
  // 返回原始 token（仅此一次），不持久化原始值
  return { token: rawToken, expireAt };
}

export async function revokeRefreshToken(token) {
  await prisma.refreshToken.deleteMany({ where: { token: hashToken(token) } });
}

export async function revokeUserRefreshTokens(userId) {
  await prisma.refreshToken.deleteMany({ where: { userId } });
}

export async function validateRefreshToken(token) {
  const record = await prisma.refreshToken.findFirst({
    where: { token: hashToken(token), expireAt: { gt: new Date() } },
    include: { user: true },
  });
  if (!record) return null;
  return { userId: record.userId, username: record.user.username, role: record.user.role };
}

if (!swept) {
  swept = true;
  sweepExpired().catch((err) => console.error('[RefreshToken] sweep error:', err.message));
}

setInterval(() => {
  sweepExpired().catch(() => {});
}, 60_000);
