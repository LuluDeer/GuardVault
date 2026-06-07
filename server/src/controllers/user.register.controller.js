import { z } from 'zod';
import bcrypt from 'bcryptjs';
import { writeLog } from '../services/log.service.js';
import { success, fail, ErrorCode } from '../utils/response.js';
import { prisma } from '../utils/prisma.js';
import { validatePassword } from '../utils/password-strength.js';

export async function register(request, reply) {
  const schema = z.object({
    username: z.string().min(3).max(32),
    password: z.string().min(6).max(128),
    deptId: z.number().int().positive().optional(),
  });
  const parsed = schema.safeParse(request.body);
  if (!parsed.success) {
    return fail(reply, ErrorCode.PARAM_ERROR, '参数校验失败');
  }

  const { username, password, deptId } = parsed.data;

  const existing = await prisma.systemUser.findUnique({ where: { username } });
  if (existing) {
    return fail(reply, ErrorCode.USERNAME_EXISTS, '用户名已存在');
  }

  const passwordCheck = validatePassword(password);
  if (!passwordCheck.valid) {
    return fail(reply, ErrorCode.PARAM_ERROR, passwordCheck.message);
  }

  const hash = await bcrypt.hash(password, 12);

  const user = await prisma.systemUser.create({
    data: {
      username,
      password: hash,
      role: 'user',
      status: 1,
      deptId,
    },
  });

  await writeLog({
    operatorId: null, operatorName: 'system',
    targetUserId: user.id, targetUsername: user.username,
    actionType: 'USER_REGISTER', actionDesc: `用户 ${username} 注册成功`,
    clientIp: request.ip, result: 1,
  });

  return success(reply, {
    id: user.id,
    username: user.username,
    role: user.role,
    status: user.status,
    createdAt: user.createdAt,
  });
}
