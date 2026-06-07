import { queryLogs as queryLogsService } from '../services/log.service.js';
import { success } from '../utils/response.js';

/**
 * 查询日志列表
 */
export async function queryLogs(request, reply) {
  const { page = 1, pageSize = 50, username, actionType, startTime, endTime } = request.query;
  const result = await queryLogsService({
    page: Number(page),
    pageSize: Number(pageSize),
    username,
    actionType,
    startTime,
    endTime,
  });
  return success(reply, result);
}
