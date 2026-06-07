import * as totpService from '../services/totp.service.js';
import { writeLog } from '../services/log.service.js';
import { success, fail, ErrorCode } from '../utils/response.js';

/**
 * 用户获取个人动态码
 */
export async function getMyCode(request, reply) {
  const userId = request.user.id;

  try {
    const codeResult = await totpService.getUserCode(userId);

    await writeLog({
      operatorId: userId, operatorName: request.user.username,
      actionType: 'USER_GET_CODE', actionDesc: '用户获取个人动态验证码',
      clientIp: request.ip, result: 1,
    });

    return success(reply, codeResult);
  } catch (err) {
    if (err.message === 'TOTP_NOT_ENABLED') {
      return fail(reply, ErrorCode.TOTP_NOT_ENABLED, '2FA权限未开通，请联系管理员');
    }
    throw err;
  }
}
