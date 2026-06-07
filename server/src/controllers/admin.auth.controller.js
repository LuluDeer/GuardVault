import { z } from 'zod';
import bcrypt from 'bcryptjs';
import { findUserByUsername, createUser } from '../services/user.service.js';
import { signToken, revokeToken } from '../services/auth.service.js';
import { writeLog } from '../services/log.service.js';
import { initDefaultConfig } from '../services/config.service.js';
import { success, fail, ErrorCode } from '../utils/response.js';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

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
  if (!user || user.role !== 'admin') {
    return fail(reply, ErrorCode.WRONG_CREDENTIALS, '用户名或密码错误');
  }

  // 账号禁用
  if (user.status === 0) {
    return fail(reply, ErrorCode.ACCOUNT_DISABLED, '账号已被禁用');
  }

  // 账号锁定
  if (user.lockedUntil && user.lockedUntil > new Date()) {
    const remainMin = Math.ceil((user.lockedUntil - Date.now()) / 60000);
    return fail(reply, ErrorCode.ACCOUNT_LOCKED, `账号已被锁定，请 ${remainMin} 分钟后再试`);
  }

  // 验证密码
  const valid = await bcrypt.compare(password, user.password);
  if (!valid) {
    // 记录失败次数
    const newCount = (user.failCount || 0) + 1;
    const maxFail = 5;
    const lockMinutes = 10;
    const data = { failCount: newCount };
    if (newCount >= maxFail) {
      data.lockedUntil = new Date(Date.now() + lockMinutes * 60 * 1000);
    }
    await prisma.systemUser.update({ where: { id: user.id }, data });

    await writeLog({
      operatorId: user.id, operatorName: username,
      actionType: 'ADMIN_LOGIN', actionDesc: '管理员登录失败：密码错误',
      clientIp, userAgent, result: 0, failReason: '密码错误',
    });
    return fail(reply, ErrorCode.WRONG_CREDENTIALS, '用户名或密码错误');
  }

  // 登录成功
  await prisma.systemUser.update({
    where: { id: user.id },
    data: { failCount: 0, lockedUntil: null, lastLoginTime: new Date(), lastLoginIp: clientIp },
  });

  const expireSeconds = parseInt(process.env.JWT_ADMIN_EXPIRE || '1800', 10);
  const token = signToken({ id: user.id, username: user.username, role: user.role }, expireSeconds);
  const expireAt = new Date(Date.now() + expireSeconds * 1000).toISOString();

  await writeLog({
    operatorId: user.id, operatorName: username,
    actionType: 'ADMIN_LOGIN', actionDesc: '管理员登录成功',
    clientIp, userAgent, result: 1,
  });

  return success(reply, { token, expireAt });
}

/**
 * 管理员登出
 */
export async function logout(request, reply) {
  revokeToken(request.token);
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
    password: z.string().min(8).max(128).regex(/^(?=.*[a-zA-Z])(?=.*[0-9])/),
  });
  const parsed = schema.safeParse(request.body);
  if (!parsed.success) {
    return fail(reply, ErrorCode.PARAM_ERROR, '参数校验失败：用户名4-32位字母数字下划线，密码8位以上含字母和数字');
  }

  const hash = await bcrypt.hash(parsed.data.password, 12);
  const admin = await prisma.systemUser.create({
    data: { username: parsed.data.username, password: hash, role: 'admin', status: 1 },
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
