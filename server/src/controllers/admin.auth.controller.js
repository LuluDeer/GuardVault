import { z } from 'zod';
import bcrypt from 'bcryptjs';
import { findUserByUsername, createUser, clearLoginFail, recordLoginFail } from '../services/user.service.js';
import { signToken, revokeToken } from '../services/auth.service.js';
import { writeLog } from '../services/log.service.js';
import { getConfig, initDefaultConfig } from '../services/config.service.js';
import { recordFailedAttempt } from '../services/ip-block.service.js';
import { validatePassword } from '../utils/password-strength.js';
import { createRefreshToken, revokeUserRefreshTokens } from '../services/refresh-token.service.js';
import { success, fail, ErrorCode } from '../utils/response.js';
import { prisma } from '../utils/prisma.js';

const loginSchema = z.object({
  username: z.string().min(1).max(32),
  password: z.string().min(1).max(128),
});

/**
 * 管理员登录
 */
export async function login(request, reply) {
  const parsed = loginSchema.safeParse(request.body);
  if (!parsed.success) {
    return fail(reply, ErrorCode.PARAM_ERROR, '参数校验失败');
  }
  const { username, password } = parsed.data;
  const clientIp = request.ip;
  const userAgent = request.headers['user-agent'] || null;

  const user = await findUserByUsername(username);

  // 用户不存在
  if (!user || !['super_admin', 'dept_admin', 'admin'].includes(user.role)) {
    return fail(reply, ErrorCode.WRONG_CREDENTIALS, '用户名或密码错误');
  }

  // 账号禁用
  if (user.status === 0) {
    return fail(reply, ErrorCode.ACCOUNT_DISABLED, '账号已被禁用');
  }

  // 从系统配置读取锁定参数
  const maxFail = parseInt(await getConfig('login_fail_max') || '5', 10);
  const lockMinutes = parseInt(await getConfig('login_lock_minutes') || '10', 10);

  // 账号锁定
  if (user.lockedUntil && user.lockedUntil > new Date()) {
    const remainMin = Math.ceil((user.lockedUntil - Date.now()) / 60000);
    return fail(reply, ErrorCode.ACCOUNT_LOCKED, `账号已被锁定，请 ${remainMin} 分钟后再试`);
  }

  // 验证密码
  const valid = await bcrypt.compare(password, user.password);
  if (!valid) {
    const { failCount, locked } = await recordLoginFail(user.id, maxFail, lockMinutes);
    await recordFailedAttempt(clientIp, username, 'admin_login');

    await writeLog({
      operatorId: user.id, operatorName: username,
      actionType: 'ADMIN_LOGIN', actionDesc: '管理员登录失败：密码错误',
      clientIp, userAgent, result: 0, failReason: '密码错误',
    });
    if (locked) {
      return fail(reply, ErrorCode.ACCOUNT_LOCKED, `密码错误超过 ${maxFail} 次，账号已被锁定 ${lockMinutes} 分钟`);
    }
    const remaining = maxFail - failCount;
    return fail(reply, ErrorCode.WRONG_CREDENTIALS, `密码错误，还可尝试 ${remaining} 次`);
  }

  // 登录成功
  await clearLoginFail(user.id, clientIp);
  await revokeUserRefreshTokens(user.id);
  const { token: refreshToken, expireAt: refreshExpireAt } = await createRefreshToken(user.id);

  const expireSeconds = parseInt(process.env.JWT_ADMIN_EXPIRE || '1800', 10);
  const token = signToken({ id: user.id, username: user.username, role: user.role }, expireSeconds);
  const expireAt = new Date(Date.now() + expireSeconds * 1000).toISOString();

  await writeLog({
    operatorId: user.id, operatorName: username,
    actionType: 'ADMIN_LOGIN', actionDesc: '管理员登录成功',
    clientIp, userAgent, result: 1,
  });

  return success(reply, { token, expireAt, role: user.role, refreshToken, refreshExpireAt: refreshExpireAt.toISOString() });
}

/**
 * 管理员登出
 */
export async function logout(request, reply) {
  await revokeToken(request.token);
  await revokeUserRefreshTokens(request.user.id);
  await writeLog({
    operatorId: request.user.id, operatorName: request.user.username,
    actionType: 'ADMIN_LOGOUT', actionDesc: '管理员登出',
    clientIp: request.ip, result: 1,
  });
  return success(reply);
}

/**
 * 系统初始化（首次部署创建超级管理员）
 */
export async function initSystem(request, reply) {
  const count = await prisma.systemUser.count({ where: { role: 'admin' } });
  if (count > 0) {
    return fail(reply, ErrorCode.FORBIDDEN, '系统已初始化，该接口已关闭');
  }

  const schema = z.object({
    username: z.string().min(4).max(32).regex(/^[a-zA-Z0-9_]+$/),
    password: z.string().min(8).max(128),
  });
  const parsed = schema.safeParse(request.body);
  if (!parsed.success) {
    return fail(reply, ErrorCode.PARAM_ERROR, '参数校验失败：用户名4-32位字母数字下划线，密码8位以上');
  }

  const passwordCheck = validatePassword(parsed.data.password);
  if (!passwordCheck.valid) {
    return fail(reply, ErrorCode.PARAM_ERROR, passwordCheck.message);
  }

  const hash = await bcrypt.hash(parsed.data.password, 12);
  const admin = await prisma.systemUser.create({
    data: { username: parsed.data.username, password: hash, role: 'super_admin', status: 1, deptId: null },
    select: { id: true, username: true },
  });

  await initDefaultConfig();

  await writeLog({
    operatorId: admin.id, operatorName: admin.username,
    actionType: 'SYSTEM_INIT', actionDesc: '系统初始化，创建超级管理员',
    clientIp: request.ip, result: 1,
  });

  return success(reply, { message: '初始化成功', username: admin.username });
}

/**
 * 管理员修改自己的密码（修改后吊销当前Token，强制重登）
 */
const changePasswordSchema = z.object({
  oldPassword: z.string().min(1).max(128),
  newPassword: z.string().min(8).max(128),
});

export async function changePassword(request, reply) {
  const parsed = changePasswordSchema.safeParse(request.body);
  if (!parsed.success) {
    return fail(reply, ErrorCode.PARAM_ERROR, '参数校验失败：旧密码必填，新密码8位以上');
  }
  const { oldPassword, newPassword } = parsed.data;
  const adminId = request.user.id;

  const passwordCheck = validatePassword(newPassword);
  if (!passwordCheck.valid) {
    return fail(reply, ErrorCode.PARAM_ERROR, passwordCheck.message);
  }

  const user = await prisma.systemUser.findUnique({ where: { id: adminId } });
  if (!user) {
    return fail(reply, ErrorCode.USER_NOT_FOUND, '账号不存在');
  }
  const valid = await bcrypt.compare(oldPassword, user.password);
  if (!valid) {
    return fail(reply, ErrorCode.WRONG_CREDENTIALS, '原密码错误');
  }
  if (oldPassword === newPassword) {
    return fail(reply, ErrorCode.PARAM_ERROR, '新密码不能与原密码相同');
  }

  const hash = await bcrypt.hash(newPassword, 12);
  await prisma.systemUser.update({
    where: { id: adminId },
    data: { password: hash, failCount: 0, lockedUntil: null },
  });

  await revokeToken(request.token);
  await revokeUserRefreshTokens(adminId);

  await writeLog({
    operatorId: adminId, operatorName: request.user.username,
    actionType: 'ADMIN_CHANGE_PASSWORD',
    actionDesc: '管理员修改自己密码',
    clientIp: request.ip, result: 1,
  });

  return success(reply, { message: '密码已修改，请重新登录' });
}
