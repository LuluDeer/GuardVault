import { isBlocked } from '../services/ip-block.service.js';
import { fail, ErrorCode } from '../utils/response.js';

export async function ipBlockCheck(request, reply) {
  const ip = request.ip || request.raw?.remoteAddress;
  const blocked = await isBlocked(ip);
  if (blocked) {
    const expireAt = new Date(Number(blocked.expireAt));
    const remaining = Math.ceil((expireAt.getTime() - Date.now()) / 60000);
    return fail(
      reply,
      ErrorCode.FORBIDDEN,
      `IP 已被封禁：${blocked.reason}。剩余封禁时间：${remaining} 分钟`,
      403
    );
  }
}
