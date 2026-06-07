import { z } from 'zod';
import bcrypt from 'bcryptjs';
import { findUserByUsername } from '../services/user.service.js';
import { signToken, revokeToken } from '../services/auth.service.js';
import { writeLog } from '../services/log.service.js';
import { getConfig } from '../services/config.service.js';
import { success, fail, ErrorCode } from '../utils/response.js';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * 用户登录
 */
export async function login(request, reply) {
  const schema = z.object({
    username: z.string().min(1).max(32),
    password: z.string().min(1).max(128),
  });
  const parsed = schema.safeParse(request.body);
  if (!parsed.success) {
    return fail(reply, ErrorCode.PARAM_ERROR, '参数校验失败');
  }
  const { username, password } = parsed.data;
  const clientIp = request.ip;
  const userAgent = request.headers['user-agent'] || null;

  const user = await findUserByUsername(username);

  if (!user || user.role !== 'user') {
    return fail(reply, ErrorCode.WRONG_CREDENTIALS, '用户名或密码错误');
  }

  if (user.status === 0) {
    return fail(reply, ErrorCode.ACCOUNT_DISABLED, '账号已被禁用');
  }

  // 从系统配置读取锁定参数
  const maxFail = parseInt(await getConfig('login_fail_max') || '5', 10);
  const lockMinutes = parseInt(await getConfig('login_lock_minutes') || '10', 10);

  if (user.lockedUntil && user.lockedUntil > new Date()) {
    const remainMin = Math.ceil((user.lockedUntil - Date.now()) / 60000);
    return fail(reply, ErrorCode.ACCOUNT_LOCKED, `账号已被锁定，请 ${remainMin} 分钟后再试`);
  }

  const valid = await bcrypt.compare(password, user.password);
  if (!valid) {
    const newCount = (user.failCount || 0) + 1;
    const data = { failCount: newCount };
    if (newCount >= maxFail) {
      data.lockedUntil = new Date(Date.now() + lockMinutes * 60 * 1000);
    }
    await prisma.systemUser.update({ where: { id: user.id }, data });

    await writeLog({
      operatorId: user.id, operatorName: username,
      actionType: 'USER_LOGIN', actionDesc: '用户登录失败：密码错误',
      clientIp, userAgent, result: 0, failReason: '密码错误',
    });
    const remaining = maxFail - newCount;
    const msg = remaining > 0 ? `密码错误，还可尝试 ${remaining} 次` : '密码错误，账号已被锁定';
    return fail(reply, ErrorCode.WRONG_CREDENTIALS, msg);
  }

  await prisma.systemUser.update({
    where: { id: user.id },
    data: { failCount: 0, lockedUntil: null, lastLoginTime: new Date(), lastLoginIp: clientIp },
  });

  // 从系统配置读取Token有效期
  const tokenHours = parseInt(await getConfig('token_expire_hours') || '2', 10);
  const expireSeconds = tokenHours * 3600;
  const token = signToken({ id: user.id, username: user.username, role: user.role }, expireSeconds);
  const expireAt = new Date(Date.now() + expireSeconds * 1000).toISOString();

  // 检查TOTP状态
  const totpKey = await prisma.userTotpKey.findUnique({ where: { userId: user.id }, select: { isEnable: true } });
  const totpEnabled = totpKey?.isEnable === 1;

  await writeLog({
    operatorId: user.id, operatorName: username,
    actionType: 'USER_LOGIN', actionDesc: '用户登录成功',
    clientIp, userAgent, result: 1,
  });

  return success(reply, { token, expireAt, totpEnabled });
}

/**
 * 用户登出
 */
export async function logout(request, reply) {
  revokeToken(request.token);
  await writeLog({
    operatorId: request.user.id, operatorName: request.user.username,
    actionType: 'USER_LOGOUT', actionDesc: '用户登出',
    clientIp: request.ip, result: 1,
  });
  return success(reply);
}
