import { z } from 'zod';
import { signToken } from '../services/auth.service.js';
import { validateRefreshToken, revokeRefreshToken, createRefreshToken } from '../services/refresh-token.service.js';
import { writeLog } from '../services/log.service.js';
import { success, fail, ErrorCode } from '../utils/response.js';

const refreshSchema = z.object({
  refreshToken: z.string().min(32),
});

/**
 * 用 refreshToken 换发新 token + 新 refreshToken
 * 管理员/普通用户共用：根据 role 选不同的过期时间
 */
export async function refresh(request, reply) {
  const parsed = refreshSchema.safeParse(request.body);
  if (!parsed.success) {
    return fail(reply, ErrorCode.PARAM_ERROR, 'refreshToken 必填');
  }

  const userInfo = await validateRefreshToken(parsed.data.refreshToken);
  if (!userInfo) {
    return fail(reply, ErrorCode.TOKEN_INVALID, 'refreshToken 无效或已过期', 401);
  }

  await revokeRefreshToken(parsed.data.refreshToken);
  const { token: newRefreshToken, expireAt: refreshExpireAt } = await createRefreshToken(userInfo.userId);

  const expireSeconds = userInfo.role === 'super_admin' || userInfo.role === 'dept_admin'
    ? parseInt(process.env.JWT_ADMIN_EXPIRE || '1800', 10)
    : parseInt(process.env.JWT_USER_EXPIRE || '7200', 10);

  const token = signToken({ id: userInfo.userId, username: userInfo.username, role: userInfo.role }, expireSeconds);
  const expireAt = new Date(Date.now() + expireSeconds * 1000).toISOString();

  writeLog({
    operatorId: userInfo.userId, operatorName: userInfo.username,
    actionType: 'TOKEN_REFRESH', actionDesc: 'Token 刷新',
    clientIp: request.ip, result: 1,
  });

  return success(reply, { token, expireAt, refreshToken: newRefreshToken, refreshExpireAt: refreshExpireAt.toISOString() });
}
