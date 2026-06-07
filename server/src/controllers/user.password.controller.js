import { z } from 'zod';
import { findUserById, verifyPassword, updateUser } from '../services/user.service.js';
import { revokeToken } from '../services/auth.service.js';
import { writeLog } from '../services/log.service.js';
import { success, fail, ErrorCode } from '../utils/response.js';

/**
 * 用户修改个人密码
 */
export async function changePassword(request, reply) {
  const schema = z.object({
    oldPassword: z.string().min(1).max(128),
    newPassword: z.string().min(8).max(128).regex(/^(?=.*[a-zA-Z])(?=.*[0-9])/, '新密码需包含字母和数字'),
  });
  const parsed = schema.safeParse(request.body);
  if (!parsed.success) {
    return fail(reply, ErrorCode.PARAM_ERROR, '参数校验失败：新密码需8位以上且包含字母和数字');
  }

  const user = await findUserById(request.user.id);
  const valid = await verifyPassword(parsed.data.oldPassword, user.password);
  if (!valid) {
    await writeLog({
      operatorId: user.id, operatorName: user.username,
      actionType: 'USER_CHANGE_PASSWORD', actionDesc: '用户修改密码失败：旧密码错误',
      clientIp: request.ip, result: 0, failReason: '旧密码错误',
    });
    return fail(reply, ErrorCode.WRONG_OLD_PASSWORD, '旧密码错误');
  }

  await updateUser(user.id, { password: parsed.data.newPassword });

  // 修改密码后吊销当前Token
  revokeToken(request.token);

  await writeLog({
    operatorId: user.id, operatorName: user.username,
    actionType: 'USER_CHANGE_PASSWORD', actionDesc: '用户修改密码成功',
    clientIp: request.ip, result: 1,
  });

  return success(reply);
}
