import { prisma } from '../utils/prisma.js';
import bcrypt from 'bcryptjs';

/**
 * 获取用户列表（分页）
 */
export async function listUsers({ page = 1, pageSize = 20, keyword, status }) {
  const where = {};
  if (keyword) {
    where.username = { contains: keyword };
  }
  if (status !== undefined && status !== null && status !== '') {
    where.status = Number(status);
  }
  // 只返回普通用户
  where.role = 'user';

  const [list, total] = await Promise.all([
    prisma.systemUser.findMany({
      where,
      skip: (page - 1) * pageSize,
      take: pageSize,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        username: true,
        role: true,
        status: true,
        createdAt: true,
        lastLoginTime: true,
        totpKey: { select: { isEnable: true, resetTime: true } },
      },
    }),
    prisma.systemUser.count({ where }),
  ]);

  return {
    list: list.map(u => ({
      id: u.id,
      username: u.username,
      role: u.role,
      status: u.status,
      createdAt: u.createdAt,
      lastLoginTime: u.lastLoginTime,
      totpEnabled: u.totpKey?.isEnable === 1,
      totpResetTime: u.totpKey?.resetTime ?? null,
    })),
    total,
    page,
    pageSize,
  };
}

/**
 * 根据ID查询用户（含密码哈希）
 */
export async function findUserById(id) {
  return prisma.systemUser.findUnique({ where: { id } });
}

/**
 * 根据用户名查询用户
 */
export async function findUserByUsername(username) {
  return prisma.systemUser.findUnique({ where: { username } });
}

/**
 * 创建新用户
 */
export async function createUser({ username, password }) {
  const hash = await bcrypt.hash(password, 12);
  return prisma.systemUser.create({
    data: { username, password: hash, role: 'user', status: 1 },
    select: { id: true, username: true },
  });
}

/**
 * 更新用户信息（密码/状态）
 */
export async function updateUser(id, { password, status }) {
  const data = {};
  if (password !== undefined) {
    data.password = await bcrypt.hash(password, 12);
  }
  if (status !== undefined) {
    data.status = status;
  }
  await prisma.systemUser.update({ where: { id }, data });
}

/**
 * 删除用户（级联删除TOTP密钥）
 */
export async function deleteUser(id) {
  await prisma.systemUser.delete({ where: { id } });
}

/**
 * 记录登录失败，超限则锁定
 * @param {number} id - 用户ID
 * @param {number} maxFail - 最大失败次数
 * @param {number} lockMinutes - 锁定时长（分钟）
 */
export async function recordLoginFail(id, maxFail = 5, lockMinutes = 10) {
  const user = await prisma.systemUser.findUnique({ where: { id } });
  const newCount = (user.failCount || 0) + 1;
  const data = { failCount: newCount };
  if (newCount >= maxFail) {
    data.lockedUntil = new Date(Date.now() + lockMinutes * 60 * 1000);
  }
  await prisma.systemUser.update({ where: { id }, data });
  return { failCount: newCount, locked: newCount >= maxFail };
}

/**
 * 清除登录失败记录（登录成功后调用）
 */
export async function clearLoginFail(id, ip) {
  await prisma.systemUser.update({
    where: { id },
    data: {
      failCount: 0,
      lockedUntil: null,
      lastLoginTime: new Date(),
      lastLoginIp: ip,
    },
  });
}

/**
 * 验证密码
 */
export async function verifyPassword(plainPassword, hash) {
  return bcrypt.compare(plainPassword, hash);
}
