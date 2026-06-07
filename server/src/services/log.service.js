import { prisma } from '../utils/prisma.js';

// 日志保留天数（可在 system_config 表的 log_retention_days 中覆盖）
const DEFAULT_LOG_RETENTION_DAYS = 90;
// 单次最多删除条数（防长事务/锁表）
const CLEANUP_BATCH_SIZE = 5000;

/**
 * 清理过期日志
 *  - 默认保留 90 天
 *  - 优先读 system_config.log_retention_days，缺省回落到默认
 *  - 循环分批删除，避免一次 DELETE 锁大量行
 * @returns {Promise<{deleted: number, beforeDays: number, cutoff: Date}>}
 */
export async function cleanExpiredLogs(retentionDays) {
  let days = Number(retentionDays) || 0;
  if (!days) {
    // 从 DB 读配置
    const cfg = await prisma.systemConfig.findUnique({
      where: { configKey: 'log_retention_days' },
    });
    days = cfg ? Number(cfg.configValue) : DEFAULT_LOG_RETENTION_DAYS;
  }
  days = Math.max(1, Math.min(3650, days)); // 1 天 ~ 10 年

  const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
  let totalDeleted = 0;

  // 分批删除直到影响行数为 0
  // 使用 deleteMany + where，避免一次性大删除
  while (true) {
    const res = await prisma.systemLog.deleteMany({
      where: { createdAt: { lt: cutoff } },
    });
    totalDeleted += res.count;
    if (res.count < CLEANUP_BATCH_SIZE) break;
  }

  return { deleted: totalDeleted, retentionDays: days, cutoff };
}

/**
 * 启动日志清理定时任务
 *  - 默认每天凌晨 3 点执行一次
 *  - 通过 LOG_CLEANUP_CRON_HOUR 环境变量自定义（0-23）
 */
let cleanupTimer = null;
export function startLogCleanupTask(logger = console) {
  if (cleanupTimer) return; // 防止重复启动
  const hour = Number(process.env.LOG_CLEANUP_CRON_HOUR ?? 3);
  const safeHour = Math.max(0, Math.min(23, isNaN(hour) ? 3 : hour));

  function schedule() {
    const now = new Date();
    const next = new Date(now);
    next.setHours(safeHour, 0, 0, 0);
    if (next <= now) next.setDate(next.getDate() + 1);
    const ms = next.getTime() - now.getTime();
    cleanupTimer = setTimeout(async () => {
      try {
        const result = await cleanExpiredLogs();
        logger.info?.(`[log-cleanup] deleted ${result.deleted} logs older than ${result.retentionDays} days`);
      } catch (err) {
        logger.error?.(`[log-cleanup] failed: ${err.message}`);
      } finally {
        schedule();
      }
    }, ms);
  }
  schedule();
  logger.info?.(`[log-cleanup] scheduled daily at ${safeHour}:00`);
}

export function stopLogCleanupTask() {
  if (cleanupTimer) {
    clearTimeout(cleanupTimer);
    cleanupTimer = null;
  }
}

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
export async function queryLogs({ page = 1, pageSize = 50, username, actionType, startTime, endTime, result, severity }) {
  const where = {};
  if (username) {
    where.operatorName = { contains: username };
  }
  if (actionType) {
    where.actionType = actionType;
  }
  if (result !== undefined && result !== null && result !== '') {
    where.result = Number(result);
  }
  if (severity) {
    // 按严重级别归类（VIEW/COPY 为 info，LOGIN_FAIL/PASSWORD 为 warning，DELETE/RESET/DISABLE 为 critical）
    where.actionType = where.actionType || { in: severityToActionTypes(severity) };
    if (actionType) {
      // 同时指定了 actionType 与 severity 时取交集（用 AND 包装）
      where.AND = [
        { actionType },
        { actionType: { in: severityToActionTypes(severity) } },
      ];
      delete where.actionType;
    }
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
    list: list.map(log => ({ ...log, id: log.id.toString(), severity: getActionSeverity(log.actionType) })),
    total,
    page,
    pageSize,
  };
}

/**
 * 严重级别 -> 操作类型集合
 */
function severityToActionTypes(severity) {
  const map = {
    info: ['CODE_VIEW', 'CODE_COPY', 'SERVICE_VIEW_SECRET', 'ADMIN_VIEW_CODE', 'USER_GET_CODE', 'LOGIN', 'USER_LOGIN'],
    warning: ['LOGIN_FAIL', 'PASSWORD_CHANGE', 'USER_CHANGE_PASSWORD', 'SERVICE_UPDATE', 'GRANT_REVOKE', 'CONFIG_UPDATE'],
    error: ['CREATE_USER_FAILED', 'LOGIN_FAIL'],
    critical: ['DELETE_USER', 'SERVICE_DELETE', 'DEPT_DELETE', 'DISABLE_TOTP', 'TOTP_RESET', 'GRANT_REVOKE_BATCH', 'SYSTEM_INIT', 'DELETE_SERVICE', 'RESET_TOTP'],
  };
  return map[severity] || [];
}

function getActionSeverity(actionType) {
  if (!actionType) return 'info';
  const upper = actionType.toUpperCase();
  // critical 优先：包含 DELETE / RESET / DISABLE / REVOKE / SYSTEM_INIT 的归为 critical
  if (['DELETE', 'RESET', 'DISABLE', 'REVOKE', 'SYSTEM_INIT'].some(k => upper.includes(k))) return 'critical';
  // warning：失败、密码相关
  if (upper.includes('FAIL') || ['PASSWORD_CHANGE', 'USER_CHANGE_PASSWORD'].some(k => upper.includes(k))) return 'warning';
  // error：登录失败
  if (upper.includes('LOGIN_FAIL') || upper.includes('FAILED')) return 'error';
  // info：普通查询类
  if (['VIEW', 'COPY', 'GET_CODE', 'LOGIN', 'CREATE', 'GRANT', 'IMPORT'].some(k => upper.includes(k))) return 'info';
  return 'info';
}

/**
 * 流式查询日志（不分页），用于CSV导出
 */
export async function exportLogs({ actionType, startTime, endTime, result, severity } = {}) {
  const where = {};
  if (actionType) where.actionType = actionType;
  if (result !== undefined && result !== null && result !== '') where.result = Number(result);
  if (severity) {
    const types = severityToActionTypes(severity);
    if (actionType) {
      where.AND = [{ actionType }, { actionType: { in: types } }];
    } else {
      where.actionType = { in: types };
    }
  }
  if (startTime || endTime) {
    where.createdAt = {};
    if (startTime) where.createdAt.gte = new Date(startTime);
    if (endTime) where.createdAt.lte = new Date(endTime);
  }
  return prisma.systemLog.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    take: 10000, // 单次最多导出1万条，防止内存爆炸
    select: {
      id: true, operatorName: true, targetUsername: true,
      actionType: true, actionDesc: true, clientIp: true,
      result: true, failReason: true, createdAt: true,
    },
  });
}

/**
 * CSV 字段转义：含逗号/引号/换行的字段加双引号，内部双引号转义为两个
 */
function csvEscape(value) {
  if (value === null || value === undefined) return '';
  const str = String(value);
  if (/[",\n\r]/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

/**
 * 把日志数组转成 CSV 字符串
 */
export function logsToCsv(logs) {
  const headers = ['ID', '时间', '操作人', '操作对象', '操作类型', '操作描述', '客户端IP', '结果', '失败原因', '严重级别'];
  const lines = [headers.join(',')];
  for (const log of logs) {
    lines.push([
      log.id,
      log.createdAt?.toISOString?.() || '',
      csvEscape(log.operatorName),
      csvEscape(log.targetUsername),
      log.actionType,
      csvEscape(log.actionDesc),
      log.clientIp,
      log.result === 1 ? '成功' : '失败',
      csvEscape(log.failReason),
      getActionSeverity(log.actionType),
    ].join(','));
  }
  // 加 BOM，让 Excel 直接识别 UTF-8
  return '\uFEFF' + lines.join('\r\n');
}
