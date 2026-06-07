import { prisma } from '../utils/prisma.js';

export async function getServiceViewStats({ startDate, endDate, deptId } = {}) {
  const where = { actionType: { in: ['CODE_VIEW', 'CODE_COPY'] } };

  if (startDate || endDate) {
    where.createdAt = {};
    if (startDate) where.createdAt.gte = new Date(startDate);
    if (endDate) where.createdAt.lte = new Date(endDate);
  }

  if (deptId) {
    where.targetAccount = { deptId: Number(deptId) };
  }

  const logs = await prisma.systemLog.findMany({
    where,
    select: {
      targetAccountId: true,
      targetAccountName: true,
      actionType: true,
    },
  });

  const stats = new Map();
  for (const log of logs) {
    if (!log.targetAccountId) continue;
    const key = log.targetAccountId;
    if (!stats.has(key)) {
      stats.set(key, {
        accountId: log.targetAccountId,
        accountName: log.targetAccountName,
        viewCount: 0,
        copyCount: 0,
        total: 0,
      });
    }
    const item = stats.get(key);
    if (log.actionType === 'CODE_VIEW') item.viewCount++;
    if (log.actionType === 'CODE_COPY') item.copyCount++;
    item.total++;
  }

  return Array.from(stats.values())
    .sort((a, b) => b.total - a.total)
    .slice(0, 20);
}

export async function getUserViewStats({ startDate, endDate } = {}) {
  const where = { actionType: { in: ['CODE_VIEW', 'CODE_COPY'] } };

  if (startDate || endDate) {
    where.createdAt = {};
    if (startDate) where.createdAt.gte = new Date(startDate);
    if (endDate) where.createdAt.lte = new Date(endDate);
  }

  const logs = await prisma.systemLog.findMany({
    where,
    select: {
      operatorId: true,
      operatorName: true,
      actionType: true,
    },
  });

  const stats = new Map();
  for (const log of logs) {
    if (!log.operatorId) continue;
    const key = log.operatorId;
    if (!stats.has(key)) {
      stats.set(key, {
        userId: log.operatorId,
        username: log.operatorName,
        viewCount: 0,
        copyCount: 0,
        total: 0,
      });
    }
    const item = stats.get(key);
    if (log.actionType === 'CODE_VIEW') item.viewCount++;
    if (log.actionType === 'CODE_COPY') item.copyCount++;
    item.total++;
  }

  return Array.from(stats.values())
    .sort((a, b) => b.total - a.total)
    .slice(0, 20);
}

export async function getActionStats({ startDate, endDate } = {}) {
  const where = {};

  if (startDate || endDate) {
    where.createdAt = {};
    if (startDate) where.createdAt.gte = new Date(startDate);
    if (endDate) where.createdAt.lte = new Date(endDate);
  }

  const logs = await prisma.systemLog.findMany({
    where,
    select: { actionType: true },
  });

  const stats = new Map();
  for (const log of logs) {
    stats.set(log.actionType, (stats.get(log.actionType) || 0) + 1);
  }

  return Array.from(stats.entries())
    .map(([actionType, count]) => ({ actionType, count }))
    .sort((a, b) => b.count - a.count);
}

export async function getDailyStats({ days = 7 } = {}) {
  const endDate = new Date();
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);

  const logs = await prisma.systemLog.findMany({
    where: {
      createdAt: { gte: startDate, lte: endDate },
      actionType: { in: ['CODE_VIEW', 'CODE_COPY', 'SERVICE_CREATE', 'GRANT_CREATE', 'GRANT_REVOKE'] },
    },
    select: { actionType: true, createdAt: true },
  });

  const dailyMap = new Map();
  for (let i = 0; i < days; i++) {
    const d = new Date(startDate);
    d.setDate(d.getDate() + i);
    const key = d.toISOString().slice(0, 10);
    dailyMap.set(key, { date: key, CODE_VIEW: 0, CODE_COPY: 0, SERVICE_CREATE: 0, GRANT_CREATE: 0, GRANT_REVOKE: 0 });
  }

  for (const log of logs) {
    const key = log.createdAt.toISOString().slice(0, 10);
    if (dailyMap.has(key)) {
      dailyMap.get(key)[log.actionType] = (dailyMap.get(key)[log.actionType] || 0) + 1;
    }
  }

  return Array.from(dailyMap.values());
}

export async function getSummary({ days = 30 } = {}) {
  const endDate = new Date();
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);

  const [totalAccounts, totalUsers, totalDepartments, totalGrants, totalLogs, recentLogs] = await Promise.all([
    prisma.serviceAccount.count(),
    prisma.systemUser.count({ where: { role: 'user' } }),
    prisma.department.count({ where: { status: 1 } }),
    prisma.accountGrant.count(),
    prisma.systemLog.count(),
    prisma.systemLog.count({
      where: { createdAt: { gte: startDate, lte: endDate } },
    }),
  ]);

  return {
    totalAccounts,
    totalUsers,
    totalDepartments,
    totalGrants,
    totalLogs,
    recentLogs,
    days,
  };
}