import crypto from 'node:crypto';
import { prisma } from '../utils/prisma.js';

const RESET_TOKEN_EXPIRE_MINUTES = 30;

// 存储哈希，防止数据库泄露导致 token 被滥用
const hashToken = (t) => crypto.createHash('sha256').update(t).digest('hex');

export async function createResetToken(username) {
  const user = await prisma.systemUser.findUnique({ where: { username } });
  if (!user) {
    throw new Error('USER_NOT_FOUND');
  }

  const rawToken = crypto.randomUUID();
  const tokenHash = hashToken(rawToken);
  const expireAt = new Date(Date.now() + RESET_TOKEN_EXPIRE_MINUTES * 60 * 1000);

  await prisma.passwordResetToken.upsert({
    where: { userId: user.id },
    update: { token: tokenHash, expireAt, attempts: 0 },
    create: { userId: user.id, username, token: tokenHash, expireAt },
  });

  // 返回原始 token（仅此一次），不持久化原始值
  return { token: rawToken, expireAt, userId: user.id };
}

export async function validateResetToken(token) {
  const tokenHash = hashToken(token);
  const resetToken = await prisma.passwordResetToken.findUnique({ where: { token: tokenHash } });
  if (!resetToken) {
    throw new Error('RESET_TOKEN_NOT_FOUND');
  }
  if (resetToken.expireAt < new Date()) {
    throw new Error('RESET_TOKEN_EXPIRED');
  }
  if (resetToken.attempts >= 3) {
    throw new Error('RESET_TOKEN_LOCKED');
  }
  return resetToken;
}

export async function incrementResetAttempt(userId) {
  await prisma.passwordResetToken.update({
    where: { userId },
    data: { attempts: { increment: 1 } },
  });
}

export async function clearResetToken(userId) {
  await prisma.passwordResetToken.deleteMany({ where: { userId } });
}
