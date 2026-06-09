import { z } from 'zod';
import * as userService from '../services/user.service.js';
import { writeLog } from '../services/log.service.js';
import { success, fail, ErrorCode } from '../utils/response.js';
import { validatePassword } from '../utils/password-strength.js';
import { checkUserDeptAccess } from '../middlewares/authorize.js';

/**
 * 获取用户列表
 */
export async function listUsers(request, reply) {
  const { page = 1, pageSize = 20, keyword, status, deptId } = request.query;
  const params = {
    page: Number(page),
    pageSize: Number(pageSize),
    keyword,
    status,
    deptId,
  };
  if (request.user.role === 'dept_admin' && request.user.deptId) {
    params.deptId = request.user.deptId;
  }
  const result = await userService.listUsers(params);
  return success(reply, result);
}

/**
 * 新增用户
 */
export async function createUser(request, reply) {
  const schema = z.object({
    username: z.string().min(4).max(32).regex(/^[a-zA-Z0-9_]+$/),
    password: z.string().min(6).max(128),
    deptId: z.number().int().positive().nullable().optional(),
  });
  const parsed = schema.safeParse(request.body);
  if (!parsed.success) {
    return fail(reply, ErrorCode.PARAM_ERROR, '参数校验失败：用户名4-32位字母数字下划线，密码8位以上');
  }

  const passwordCheck = validatePassword(parsed.data.password);
  if (!passwordCheck.valid) {
    return fail(reply, ErrorCode.PARAM_ERROR, passwordCheck.message);
  }

  const existing = await userService.findUserByUsername(parsed.data.username);
  if (existing) {
    return fail(reply, ErrorCode.USERNAME_EXISTS, '用户名已存在');
  }

  if (parsed.data.deptId && request.user.role === 'dept_admin') {
    const allowed = await checkUserDeptAccess(request, parsed.data.deptId);
    if (!allowed) return fail(reply, ErrorCode.FORBIDDEN, '无权操作该部门');
  }

  const user = await userService.createUser(parsed.data);

  await writeLog({
    operatorId: request.user.id, operatorName: request.user.username,
    targetUserId: user.id, targetUsername: user.username,
    actionType: 'USER_CREATE', actionDesc: `创建用户 ${user.username}`,
    clientIp: request.ip, result: 1,
  });

  return success(reply, user);
}

/**
 * 编辑用户（密码/状态）
 */
export async function updateUser(request, reply) {
  const id = parseInt(request.params.id, 10);
  const schema = z.object({
    password: z.string().min(8).max(128).optional(),
    status: z.number().int().min(0).max(1).optional(),
  }).refine(data => data.password !== undefined || data.status !== undefined, {
    message: '至少提供一个更新字段',
  });

  const parsed = schema.safeParse(request.body);
  if (!parsed.success) {
    return fail(reply, ErrorCode.PARAM_ERROR, '参数校验失败');
  }

  if (parsed.data.password) {
    const passwordCheck = validatePassword(parsed.data.password);
    if (!passwordCheck.valid) {
      return fail(reply, ErrorCode.PARAM_ERROR, passwordCheck.message);
    }
  }

  const target = await userService.findUserById(id);
  if (!target) {
    return fail(reply, ErrorCode.USER_NOT_FOUND, '用户不存在');
  }

  if (!(await checkUserDeptAccess(request, id))) {
    return fail(reply, ErrorCode.FORBIDDEN, '无权限操作其他部门用户');
  }

  await userService.updateUser(id, parsed.data);

  const actionDesc = parsed.data.password ? `重置用户 ${target.username} 密码` :
    `${parsed.data.status === 1 ? '启用' : '禁用'}用户 ${target.username}`;

  await writeLog({
    operatorId: request.user.id, operatorName: request.user.username,
    targetUserId: id, targetUsername: target.username,
    actionType: parsed.data.status !== undefined ? (parsed.data.status === 1 ? 'USER_ENABLE' : 'USER_DISABLE') : 'USER_UPDATE',
    actionDesc, clientIp: request.ip, result: 1,
  });

  return success(reply);
}

/**
 * 删除用户
 */
export async function deleteUser(request, reply) {
  const id = parseInt(request.params.id, 10);
  const target = await userService.findUserById(id);
  if (!target) {
    return fail(reply, ErrorCode.USER_NOT_FOUND, '用户不存在');
  }

  if (!(await checkUserDeptAccess(request, id))) {
    return fail(reply, ErrorCode.FORBIDDEN, '无权限操作其他部门用户');
  }

  await userService.deleteUser(id);

  await writeLog({
    operatorId: request.user.id, operatorName: request.user.username,
    targetUserId: id, targetUsername: target.username,
    actionType: 'USER_DELETE', actionDesc: `删除用户 ${target.username} 及其所有数据`,
    clientIp: request.ip, result: 1,
  });

  return success(reply);
}
