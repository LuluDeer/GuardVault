import { prisma } from '../utils/prisma.js';
import { emitGrantGranted, emitGrantRevoked } from './event-bus.js';

export async function listGrants({
  page = 1,
  pageSize = 20,
  userId,
  accountId,
} = {}) {
  const where = {};
  if (userId) where.userId = Number(userId);
  if (accountId) where.accountId = Number(accountId);

  const [list, total] = await Promise.all([
    prisma.accountGrant.findMany({
      where,
      skip: (page - 1) * pageSize,
      take: pageSize,
      orderBy: { grantedAt: 'desc' },
      select: {
        id: true,
        userId: true,
        accountId: true,
        remark: true,
        grantedAt: true,
        user: { select: { username: true, deptId: true } },
        account: { select: { name: true, category: true, deptId: true } },
        grantedBy: { select: { username: true } },
      },
    }),
    prisma.accountGrant.count({ where }),
  ]);

  return {
    list: list.map(g => ({
      ...g,
      username: g.user?.username,
      userDeptId: g.user?.deptId,
      accountName: g.account?.name,
      accountCategory: g.account?.category,
      accountDeptId: g.account?.deptId,
      grantedByName: g.grantedBy?.username,
      user: undefined,
      account: undefined,
      grantedBy: undefined,
    })),
    total,
    page,
    pageSize,
  };
}

export async function getGrant(userId, accountId) {
  return prisma.accountGrant.findUnique({
    where: { userId_accountId: { userId, accountId } },
  });
}

export async function grantAccess({ userId, accountId, grantedById, remark }) {
  const grant = await prisma.accountGrant.create({
    data: {
      userId,
      accountId,
      grantedById,
      remark: remark ?? '',
    },
    select: { id: true, userId: true, accountId: true },
  });
  emitGrantGranted(Number(userId), [{ accountId: Number(accountId) }]);
  return grant;
}

export async function revokeAccess(userId, accountId) {
  const result = await prisma.accountGrant.delete({
    where: { userId_accountId: { userId, accountId } },
  });
  emitGrantRevoked(Number(userId), [{ accountId: Number(accountId) }]);
  return result;
}

export async function batchGrant({ userIds, accountId, grantedById, remark }) {
  const results = [];
  for (const userId of userIds) {
    try {
      await prisma.accountGrant.create({
        data: {
          userId: userId,
          accountId,
          grantedById,
          remark: remark ?? '',
        },
        select: { id: true, userId: true },
      });
      results.push({ success: true, userId });
    } catch (err) {
      if (err.code === 'P2002') {
        results.push({ success: true, userId, alreadyGranted: true });
      } else {
        results.push({ success: false, userId, error: err.message });
      }
    }
  }
  // 推事件给所有被影响用户
  emitGrantGranted(
    userIds.map(Number),
    [{ accountId: Number(accountId) }],
  );
  return results;
}

export async function batchRevoke({ userIds, accountId }) {
  const results = [];
  for (const userId of userIds) {
    try {
      await prisma.accountGrant.delete({
        where: { userId_accountId: { userId, accountId } },
      });
      results.push({ success: true, userId });
    } catch (err) {
      if (err.code === 'P2025') {
        results.push({ success: true, userId, alreadyRevoked: true });
      } else {
        results.push({ success: false, userId, error: err.message });
      }
    }
  }
  // 推事件给所有被影响用户
  emitGrantRevoked(
    userIds.map(Number),
    [{ accountId: Number(accountId) }],
  );
  return results;
}

/**
 * 按部门批量授权：先展开部门下所有用户，再调用 batchGrant
 */
export async function batchGrantByDept({ deptIds, accountId, grantedById, remark }) {
  if (!deptIds?.length) return { results: [], totalUsers: 0 };
  const users = await prisma.systemUser.findMany({
    where: { deptId: { in: deptIds.map(Number) }, status: 1 },
    select: { id: true },
  });
  const userIds = users.map(u => u.id);
  const results = await batchGrant({ userIds, accountId, grantedById, remark });
  return { results, totalUsers: userIds.length };
}

/**
 * 按部门批量撤销授权
 */
export async function batchRevokeByDept({ deptIds, accountId }) {
  if (!deptIds?.length) return { results: [], totalUsers: 0 };
  const users = await prisma.systemUser.findMany({
    where: { deptId: { in: deptIds.map(Number) }, status: 1 },
    select: { id: true },
  });
  const userIds = users.map(u => u.id);
  const results = await batchRevoke({ userIds, accountId });
  return { results, totalUsers: userIds.length };
}

export async function getUserAccessibleServices(userId) {
  const grants = await prisma.accountGrant.findMany({
    where: { userId },
    include: {
      account: {
        select: {
          id: true,
          name: true,
          category: true,
          identifier: true,
          url: true,
          remark: true,
          icon: true,
          status: true,
          digits: true,
          period: true,
          algorithm: true,
          deptId: true,
        },
      },
    },
  });

  return grants
    .filter(g => g.account.status === 1)
    .map(g => g.account);
}

export async function getUserAccessibleServiceIds(userId) {
  const grants = await prisma.accountGrant.findMany({
    where: { userId },
    select: { accountId: true },
  });
  return grants.map(g => g.accountId);
}