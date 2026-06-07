import { queryLogs as queryLogsService, exportLogs, logsToCsv } from '../services/log.service.js';
import { success } from '../utils/response.js';

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
