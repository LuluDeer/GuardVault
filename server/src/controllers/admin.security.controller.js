import { blockIp, unblockIp, getBlockedIps } from '../services/ip-block.service.js';
import { writeLog } from '../services/log.service.js';
import { success, fail, ErrorCode } from '../utils/response.js';

export async function getBlockedList(request, reply) {
  const { page = 1, pageSize = 20 } = request.query;
  const result = await getBlockedIps(parseInt(page), parseInt(pageSize));
  return success(reply, result);
}

export async function manualBlock(request, reply) {
  const { ip, reason, durationMinutes = 30 } = request.body;
  if (!ip) {
    return fail(reply, ErrorCode.PARAM_ERROR, 'IP 不能为空');
  }
  const duration = durationMinutes * 60 * 1000;
  await blockIp(ip, reason || '管理员手动封禁', duration);
  writeLog({
    operatorId: request.user.id, operatorName: request.user.username,
    actionType: 'IP_BLOCK_MANUAL', actionDesc: `手动封禁 IP: ${ip}, 原因: ${reason || '未指定'}`,
    clientIp: request.ip, result: 1,
  });
  return success(reply);
}

export async function manualUnblock(request, reply) {
  const { ip } = request.body;
  if (!ip) {
    return fail(reply, ErrorCode.PARAM_ERROR, 'IP 不能为空');
  }
  await unblockIp(ip);
  writeLog({
    operatorId: request.user.id, operatorName: request.user.username,
    actionType: 'IP_UNBLOCK', actionDesc: `手动解封 IP: ${ip}`,
    clientIp: request.ip, result: 1,
  });
  return success(reply);
}
