import { z } from 'zod';
import * as userService from '../services/user.service.js';
import { writeLog } from '../services/log.service.js';
import { success, fail, ErrorCode } from '../utils/response.js';
import { validatePassword } from '../utils/password-strength.js';
import { checkUserDeptAccess, canAssignRole, canEditRole } from '../middlewares/authorize.js';

const ROLE_ENUM = ['super_admin', 'dept_admin', 'user'];

/**
 * 获取用户列表
 */
export async function listUsers(request, reply) {
  const { page = 1, pageSize = 20, keyword, status, deptId, role } = request.query;
  const params = {
    page: Number(page),
    pageSize: Number(pageSize),
    keyword,
    status,
    deptId,
    role,
  };
  if (request.user.role === 'dept_admin' && request.user.deptId) {
    // 部门管理员自动限定到本部门
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
    role: z.enum(ROLE_ENUM).default('user'),
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

  // 角色边界：操作者只能创建自己权限能覆盖的角色
  if (!canAssignRole(request.user.role, parsed.data.role)) {
    return fail(reply, ErrorCode.FORBIDDEN, '无权创建该角色');
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
    actionType: 'USER_CREATE', actionDesc: `创建用户 ${user.username} (${user.role})`,
    clientIp: request.ip, result: 1,
  });

  return success(reply, user);
}

/**
 * 编辑用户（密码/状态/部门/角色）
 */
export async function updateUser(request, reply) {
  const id = parseInt(request.params.id, 10);
  const schema = z.object({
    password: z.string().min(8).max(128).optional(),
    status: z.number().int().min(0).max(1).optional(),
    role: z.enum(ROLE_ENUM).optional(),
    deptId: z.number().int().positive().nullable().optional(),
  }).refine(data => data.password !== undefined || data.status !== undefined || data.role !== undefined || data.deptId !== undefined, {
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

  // 部门范围（同时覆盖角色变更和部门变更场景）
  if (!(await checkUserDeptAccess(request, id))) {
    return fail(reply, ErrorCode.FORBIDDEN, '无权限操作其他部门用户');
  }

  // 角色变更校验
  if (parsed.data.role !== undefined && parsed.data.role !== target.role) {
    if (!canEditRole(request.user, target, parsed.data.role)) {
      return fail(reply, ErrorCode.FORBIDDEN, '无权将该用户改为此角色');
    }
    // 末位超管保护：如果要把一个超管降级，需保证至少还有一个启用的超管
    if (target.role === 'super_admin' && parsed.data.role !== 'super_admin') {
      const remain = await userService.countSuperAdmins(target.id);
      if (remain < 1) {
        return fail(reply, ErrorCode.FORBIDDEN, '系统至少需要保留一名启用的超级管理员');
      }
    }
  }

  // 部门变更校验：dept_admin 改自己时若部门不符要拦下
  if (parsed.data.deptId !== undefined && request.user.role === 'dept_admin') {
    const allowed = await checkUserDeptAccess(request, id);
    if (!allowed) return fail(reply, ErrorCode.FORBIDDEN, '无权操作该部门');
  }

  await userService.updateUser(id, parsed.data);

  // 描述日志
  const parts = [];
  if (parsed.data.password) parts.push('重置密码');
  if (parsed.data.status !== undefined) parts.push(parsed.data.status === 1 ? '启用' : '禁用');
  if (parsed.data.role !== undefined) parts.push(`角色 ${target.role}→${parsed.data.role}`);
  if (parsed.data.deptId !== undefined) parts.push(`变更部门`);
  const actionDesc = `${parts.join('，') || '更新'}：${target.username}`;

  await writeLog({
    operatorId: request.user.id, operatorName: request.user.username,
    targetUserId: id, targetUsername: target.username,
    actionType: parsed.data.status !== undefined
      ? (parsed.data.status === 1 ? 'USER_ENABLE' : 'USER_DISABLE')
      : (parsed.data.role !== undefined ? 'USER_ROLE_CHANGE' : 'USER_UPDATE'),
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

  // 不能删自己
  if (target.id === request.user.id) {
    return fail(reply, ErrorCode.FORBIDDEN, '不能删除自己的账号');
  }

  // 末位超管保护
  if (target.role === 'super_admin') {
    const remain = await userService.countSuperAdmins(target.id);
    if (remain < 1) {
      return fail(reply, ErrorCode.FORBIDDEN, '系统至少需要保留一名启用的超级管理员');
    }
  }

  await userService.deleteUser(id);

  await writeLog({
    operatorId: request.user.id, operatorName: request.user.username,
    targetUserId: id, targetUsername: target.username,
    actionType: 'USER_DELETE', actionDesc: `删除用户 ${target.username} (${target.role}) 及其所有数据`,
    clientIp: request.ip, result: 1,
  });

  return success(reply);
}
