import { prisma } from '../utils/prisma.js';
import { writeLog } from './log.service.js';

const DEFAULT_BLOCK_DURATION = 30 * 60 * 1000;
const DEFAULT_MAX_FAILED_ATTEMPTS = 10;

let swept = false;

async function sweepExpired() {
  await prisma.ipBlock.deleteMany({
    where: { expireAt: { lt: BigInt(Date.now()) } },
  });
}

export async function blockIp(ip, reason, duration = DEFAULT_BLOCK_DURATION) {
  if (!ip) return;
  const expireAt = BigInt(Date.now() + duration);
  try {
    await prisma.ipBlock.upsert({
      where: { ip },
      update: { expireAt, reason, updatedAt: new Date() },
      create: { ip, expireAt, reason },
    });
    await writeLog({
      operatorId: null, operatorName: 'SYSTEM',
      actionType: 'IP_BLOCK', actionDesc: reason,
      clientIp: ip, result: 1,
    });
  } catch {
    // ignore
  }
}

export async function unblockIp(ip) {
  if (!ip) return;
  await prisma.ipBlock.deleteMany({ where: { ip } });
}

export async function isBlocked(ip) {
  if (!ip) return false;
  const record = await prisma.ipBlock.findFirst({
    where: { ip, expireAt: { gt: BigInt(Date.now()) } },
  });
  return record || null;
}

export async function getBlockedIps(page = 1, pageSize = 20) {
  const skip = (page - 1) * pageSize;
  const [records, total] = await Promise.all([
    prisma.ipBlock.findMany({
      skip,
      take: pageSize,
      orderBy: { createdAt: 'desc' },
    }),
    prisma.ipBlock.count(),
  ]);
  return { list: records, total, page, pageSize };
}

export async function recordFailedAttempt(ip, username, resource = 'login') {
  if (!ip) return;
  const now = new Date();
  const windowStart = new Date(Date.now() - 60 * 1000);
  const count = await prisma.loginAttempt.count({
    where: { ip, createdAt: { gte: windowStart } },
  });
  await prisma.loginAttempt.create({
    data: { ip, username, resource, attemptNumber: count + 1 },
  });
  const maxAttempts = parseInt(process.env.MAX_LOGIN_ATTEMPTS) || DEFAULT_MAX_FAILED_ATTEMPTS;
  if (count + 1 >= maxAttempts) {
    const blockMinutes = parseInt(process.env.BLOCK_DURATION_MINUTES) || 30;
    await blockIp(ip, `暴力破解检测: ${resource} 失败 ${count + 1} 次`, blockMinutes * 60 * 1000);
    return { blocked: true, attempts: count + 1, maxAttempts };
  }
  return { blocked: false, attempts: count + 1, maxAttempts };
}

export async function cleanupOldAttempts(retentionMinutes = 60) {
  const cutoff = new Date(Date.now() - retentionMinutes * 60 * 1000);
  await prisma.loginAttempt.deleteMany({ where: { createdAt: { lt: cutoff } } });
}

if (!swept) {
  swept = true;
  sweepExpired().catch((err) => console.error('[IP-Block] sweep error:', err.message));
}

setInterval(() => {
  sweepExpired().catch(() => {});
  cleanupOldAttempts().catch(() => {});
}, 60_000);
