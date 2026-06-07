import { prisma } from '../utils/prisma.js';
import { success } from '../utils/response.js';

export async function getSecurityStatus(request, reply) {
  const now = new Date();
  const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

  const [
    activeUsers,
    activeAdmins,
    todayLoginAttempts,
    todayLoginFailures,
    todayBlockedIps,
    activeBlockedIps,
    totalServices,
    totalGrants,
    todayLogs,
    thisWeekLogs,
  ] = await Promise.all([
    prisma.systemUser.count({ where: { status: 1, role: 'user' } }),
    prisma.systemUser.count({ where: { status: 1, role: { in: ['super_admin', 'dept_admin'] } } }),
    prisma.loginAttempt.count({ where: { createdAt: { gte: oneDayAgo } } }),
    prisma.systemLog.count({
      where: { actionType: { in: ['ADMIN_LOGIN', 'USER_LOGIN'] }, result: 0, createdAt: { gte: oneDayAgo } },
    }),
    prisma.ipBlock.count({ where: { createdAt: { gte: oneDayAgo } } }),
    prisma.ipBlock.count({ where: { expireAt: { gt: BigInt(Date.now()) } } }),
    prisma.serviceAccount.count({ where: { status: 1 } }),
    prisma.accountGrant.count(),
    prisma.systemLog.count({ where: { createdAt: { gte: oneDayAgo } } }),
    prisma.systemLog.count({ where: { createdAt: { gte: oneWeekAgo } } }),
  ]);

  const status = {
    users: {
      total: activeUsers,
      admins: activeAdmins,
    },
    security: {
      todayLoginAttempts,
      todayLoginFailures,
      todayBlockedIps,
      activeBlockedIps,
      loginFailureRate: todayLoginAttempts > 0 ? Math.round((todayLoginFailures / todayLoginAttempts) * 100) : 0,
    },
    data: {
      services: totalServices,
      grants: totalGrants,
    },
    logs: {
      today: todayLogs,
      thisWeek: thisWeekLogs,
    },
    timestamp: now.toISOString(),
  };

  return success(reply, status);
}
