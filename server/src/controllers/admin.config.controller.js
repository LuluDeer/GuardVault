import { getAllConfig, setConfig as setConfigService } from '../services/config.service.js';
import { writeLog } from '../services/log.service.js';
import { success, fail, ErrorCode } from '../utils/response.js';
import { z } from 'zod';

// 允许修改的配置项
const ALLOWED_KEYS = [
  'token_expire_hours',
  'admin_session_timeout',
  'login_fail_max',
  'login_lock_minutes',
];

/**
 * 获取所有系统配置
 */
export async function getConfig(request, reply) {
  const config = await getAllConfig();
  return success(reply, config);
}

/**
 * 更新单项系统配置
 */
export async function setConfig(request, reply) {
  const schema = z.object({
    key: z.string().min(1).max(64),
    value: z.string().min(1).max(256),
  });
  const parsed = schema.safeParse(request.body);
  if (!parsed.success) {
    return fail(reply, ErrorCode.PARAM_ERROR, '参数校验失败');
  }

  if (!ALLOWED_KEYS.includes(parsed.data.key)) {
    return fail(reply, ErrorCode.PARAM_ERROR, `不允许修改该配置项，可配置项：${ALLOWED_KEYS.join(', ')}`);
  }

  await setConfigService(parsed.data.key, parsed.data.value, request.user.username);

  await writeLog({
    operatorId: request.user.id, operatorName: request.user.username,
    actionType: 'CONFIG_UPDATE',
    actionDesc: `修改系统配置 ${parsed.data.key} = ${parsed.data.value}`,
    clientIp: request.ip, result: 1,
  });

  return success(reply);
}
