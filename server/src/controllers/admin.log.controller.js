import { z } from 'zod';
import { queryLogs as queryLogsService, exportLogs, logsToCsv, cleanExpiredLogs } from '../services/log.service.js';
import { success, fail, ErrorCode } from '../utils/response.js';
import { writeLog } from '../services/log.service.js';

const cleanupSchema = z.object({
  retentionDays: z.number().int().min(1).max(3650).optional(),
});

/**
 * 查询日志列表
 */
export async function queryLogs(request, reply) {
  const { page = 1, pageSize = 50, username, actionType, startTime, endTime, result, severity } = request.query;
  const result_ = await queryLogsService({
    page: Number(page),
    pageSize: Number(pageSize),
    username,
    actionType,
    startTime,
    endTime,
    result,
    severity,
  });
  return success(reply, result_);
}

/**
 * 导出日志为CSV（最多10000条）
 */
export async function exportLogsHandler(request, reply) {
  const { actionType, startTime, endTime, result, severity } = request.query;
  const logs = await exportLogs({ actionType, startTime, endTime, result, severity });
  const csv = logsToCsv(logs);

  const filename = `system_logs_${new Date().toISOString().slice(0, 10)}.csv`;
  reply
    .header('Content-Type', 'text/csv; charset=utf-8')
    .header('Content-Disposition', `attachment; filename="${filename}"`)
    .send(csv);
}

/**
 * 手动触发日志清理（仅 super_admin）
 *  - body.retentionDays 可选；不传则按 system_config.log_retention_days（默认 90）
 */
export async function cleanupHandler(request, reply) {
  const parsed = cleanupSchema.safeParse(request.body || {});
  if (!parsed.success) return fail(reply, ErrorCode.PARAM_ERROR, parsed.error.errors[0]?.message);
  const result = await cleanExpiredLogs(parsed.data.retentionDays);

  writeLog({
    operatorId: request.user.id,
    operatorName: request.user.username,
    actionType: 'LOG_CLEANUP',
    actionDesc: `手动清理 ${result.deleted} 条过期日志（保留 ${result.retentionDays} 天）`,
    clientIp: request.ip,
    userAgent: request.headers['user-agent'],
    result: 1,
  });

  return success(reply, result);
}
