import crypto from 'node:crypto';
import { prisma } from '../utils/prisma.js';

const RESET_TOKEN_EXPIRE_MINUTES = 30;

export async function createResetToken(username) {
  const user = await prisma.systemUser.findUnique({ where: { username } });
  if (!user) {
    throw new Error('USER_NOT_FOUND');
  }

  const token = crypto.randomUUID();
  const expireAt = new Date(Date.now() + RESET_TOKEN_EXPIRE_MINUTES * 60 * 1000);

  await prisma.passwordResetToken.upsert({
    where: { userId: user.id },
    update: { token, expireAt, attempts: 0 },
    create: { userId: user.id, username, token, expireAt },
  });

  return { token, expireAt, userId: user.id };
}

export async function validateResetToken(token) {
  const resetToken = await prisma.passwordResetToken.findUnique({ where: { token } });
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
