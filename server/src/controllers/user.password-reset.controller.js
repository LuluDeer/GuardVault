import { z } from 'zod';
import bcrypt from 'bcryptjs';
import { writeLog } from '../services/log.service.js';
import { success, fail, ErrorCode } from '../utils/response.js';
import { prisma } from '../utils/prisma.js';
import { validatePassword } from '../utils/password-strength.js';
import {
  createResetToken,
  validateResetToken,
  incrementResetAttempt,
  clearResetToken,
} from '../services/password-reset.service.js';
import { revokeUserRefreshTokens } from '../services/refresh-token.service.js';

export async function requestReset(request, reply) {
  const schema = z.object({
    username: z.string().min(1).max(32),
  });
  const parsed = schema.safeParse(request.body);
  if (!parsed.success) {
    return fail(reply, ErrorCode.PARAM_ERROR, '参数校验失败');
  }

  const { username } = parsed.data;

  try {
    const { token, expireAt } = await createResetToken(username);

    await writeLog({
      operatorId: null, operatorName: 'system',
      targetUsername: username,
      actionType: 'PASSWORD_RESET_REQUEST',
      actionDesc: `用户 ${username} 请求找回密码`,
      clientIp: request.ip, result: 1,
    });

    return success(reply, {
      message: '验证码已发送（实际项目中应通过邮件/短信发送）',
      resetToken: token,
      expireAt: expireAt.toISOString(),
    });
  } catch (err) {
    if (err.message === 'USER_NOT_FOUND') {
      return fail(reply, ErrorCode.USER_NOT_FOUND, '用户不存在');
    }
    throw err;
  }
}

export async function resetPassword(request, reply) {
  const schema = z.object({
    resetToken: z.string().min(1),
    newPassword: z.string().min(6).max(128),
  });
  const parsed = schema.safeParse(request.body);
  if (!parsed.success) {
    return fail(reply, ErrorCode.PARAM_ERROR, '参数校验失败');
  }

  const { resetToken, newPassword } = parsed.data;

  let resetData;
  try {
    resetData = await validateResetToken(resetToken);
  } catch (err) {
    if (err.message === 'RESET_TOKEN_NOT_FOUND') {
      return fail(reply, ErrorCode.PARAM_ERROR, '重置链接无效');
    }
    if (err.message === 'RESET_TOKEN_EXPIRED') {
      return fail(reply, ErrorCode.TOKEN_INVALID, '重置链接已过期');
    }
    if (err.message === 'RESET_TOKEN_LOCKED') {
      return fail(reply, ErrorCode.ACCOUNT_LOCKED, '验证失败次数过多，请重新申请');
    }
    throw err;
  }

  const passwordCheck = validatePassword(newPassword);
  if (!passwordCheck.valid) {
    await incrementResetAttempt(resetData.userId);
    return fail(reply, ErrorCode.PARAM_ERROR, passwordCheck.message);
  }

  const hash = await bcrypt.hash(newPassword, 12);

  await prisma.systemUser.update({
    where: { id: resetData.userId },
    data: { password: hash, failCount: 0, lockedUntil: null },
  });

  await revokeUserRefreshTokens(resetData.userId);
  await clearResetToken(resetData.userId);

  await writeLog({
    operatorId: null, operatorName: 'system',
    targetUserId: resetData.userId, targetUsername: resetData.username,
    actionType: 'PASSWORD_RESET',
    actionDesc: `用户 ${resetData.username} 密码重置成功`,
    clientIp: request.ip, result: 1,
  });

  return success(reply, { message: '密码重置成功，请重新登录' });
}
