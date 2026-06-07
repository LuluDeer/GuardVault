import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * 写入操作日志
 * @param {object} params
 */
export async function writeLog({
  operatorId,
  operatorName,
  targetUserId = null,
  targetUsername = null,
  actionType,
  actionDesc,
  clientIp,
  userAgent = null,
  result = 1,
  failReason = null,
}) {
  try {
    await prisma.systemLog.create({
      data: {
        operatorId,
        operatorName,
        targetUserId,
        targetUsername,
        actionType,
        actionDesc,
        clientIp,
        userAgent,
        result,
        failReason,
      },
    });
  } catch (err) {
    // 日志写入失败不影响主业务，仅记录到进程日志
    console.error('[LogService] Failed to write log:', err.message);
  }
}

/**
 * 查询日志列表（分页+筛选）
 */
export async function queryLogs({ page = 1, pageSize = 50, username, actionType, startTime, endTime }) {
  const where = {};
  if (username) {
    where.operatorName = { contains: username };
  }
  if (actionType) {
    where.actionType = actionType;
  }
  if (startTime || endTime) {
    where.createdAt = {};
    if (startTime) where.createdAt.gte = new Date(startTime);
    if (endTime) where.createdAt.lte = new Date(endTime);
  }

  const [list, total] = await Promise.all([
    prisma.systemLog.findMany({
      where,
      skip: (page - 1) * pageSize,
      take: pageSize,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        operatorName: true,
        targetUsername: true,
        actionType: true,
        actionDesc: true,
        clientIp: true,
        userAgent: true,
        result: true,
        failReason: true,
        createdAt: true,
      },
    }),
    prisma.systemLog.count({ where }),
  ]);

  return {
    list: list.map(log => ({ ...log, id: log.id.toString() })),
    total,
    page,
    pageSize,
  };
}
