import crypto from 'node:crypto';
import { prisma } from '../utils/prisma.js';

const CHALLENGE_EXPIRE_SECONDS = 120;

export async function createChallenge(userId, username) {
  const challengeToken = crypto.randomUUID();
  const expireAt = new Date(Date.now() + CHALLENGE_EXPIRE_SECONDS * 1000);
  await prisma.totpChallenge.upsert({
    where: { userId },
    update: { token: challengeToken, expireAt, attempts: 0 },
    create: { userId, username, token: challengeToken, expireAt },
  });
  return { challengeToken, expireAt };
}

export async function validateChallenge(userId, challengeToken, totpCode) {
  const challenge = await prisma.totpChallenge.findUnique({ where: { userId } });
  if (!challenge) {
    throw new Error('CHALLENGE_NOT_FOUND');
  }
  if (challenge.expireAt < new Date()) {
    throw new Error('CHALLENGE_EXPIRED');
  }
  if (challenge.token !== challengeToken) {
    throw new Error('CHALLENGE_INVALID');
  }
  if (challenge.attempts >= 5) {
    throw new Error('CHALLENGE_LOCKED');
  }
  await prisma.totpChallenge.update({
    where: { userId },
    data: { attempts: { increment: 1 } },
  });
  return true;
}

export async function clearChallenge(userId) {
  await prisma.totpChallenge.deleteMany({ where: { userId } });
}
