import { z } from 'zod';
import * as deptService from '../services/department.service.js';
import * as userService from '../services/user.service.js';
import * as serviceService from '../services/service.service.js';
import * as grantService from '../services/grant.service.js';
import { writeLog } from '../services/log.service.js';
import { success, fail, ErrorCode } from '../utils/response.js';
import { checkUserDeptAccess, checkServiceDeptAccess, assertCanOperateUser } from '../middlewares/authorize.js';

/**
 * 获取"我的部门"信息：dept_admin 看本部门，super_admin 可指定部门，普通 user 不可用
 * 不带 query.deptId 时：
 *   - dept_admin  → 自己部门
 *   - super_admin → 列出所有部门
 */
export async function getMyDeptInfo(request, reply) {
  if (request.user.role === 'dept_admin') {
    if (!request.user.deptId) return fail(reply, ErrorCode.FORBIDDEN, '部门管理员未配置部门');
    const dept = await deptService.getDepartment(request.user.deptId);
    return success(reply, { dept, role: 'dept_admin', scope: 'self' });
  }
  if (request.user.role === 'super_admin') {
    const depts = await deptService.getAllDepartments();
    return success(reply, { depts, role: 'super_admin', scope: 'all' });
  }
  return fail(reply, ErrorCode.FORBIDDEN, '仅部门管理员或超级管理员可使用该功能');
}

/**
 * 列出某部门成员（自动按当前用户权限收敛）
 *   - dept_admin：只能看自己部门
 *   - super_admin：可指定 ?deptId=
 */
export async function listDeptMembers(request, reply) {
  let deptId = parseInt(request.query.deptId, 10);
  if (request.user.role === 'dept_admin') {
    if (!request.user.deptId) return fail(reply, ErrorCode.FORBIDDEN, '部门管理员未配置部门');
    deptId = request.user.deptId; // 强制覆盖，防越权
  } else if (request.user.role !== 'super_admin') {
    return fail(reply, ErrorCode.FORBIDDEN, '仅部门管理员或超级管理员可使用该功能');
  }
  if (!deptId || Number.isNaN(deptId)) {
    return fail(reply, ErrorCode.PARAM_ERROR, '缺少 deptId');
  }
  const dept = await deptService.getDepartment(deptId);
  if (!dept) return fail(reply, ErrorCode.PARAM_ERROR, '部门不存在');

  const { role, keyword, status } = request.query;
  const users = await deptService.listDeptMembers(deptId, { role });
  let filtered = users;
  if (keyword) {
    const kw = String(keyword).toLowerCase();
    filtered = filtered.filter(u => (u.username || '').toLowerCase().includes(kw));
  }
  if (status !== undefined && status !== null && status !== '') {
    filtered = filtered.filter(u => Number(u.status) === Number(status));
  }
  return success(reply, { dept, members: filtered });
}

/**
 * 任命部门管理员：把本部门 user → dept_admin
 */
export async function appointDeptAdmin(request, reply) {
  const schema = z.object({
    userId: z.number().int().positive(),
  });
  const parsed = schema.safeParse(request.body);
  if (!parsed.success) return fail(reply, ErrorCode.PARAM_ERROR, '参数校验失败');

  // 防越权：目标用户必须在自己能管的部门
  if (!(await checkUserDeptAccess(request, parsed.data.userId))) {
    return fail(reply, ErrorCode.FORBIDDEN, '无权任命其他部门用户');
  }

  const target = await userService.findUserById(parsed.data.userId);
  if (!target) return fail(reply, ErrorCode.USER_NOT_FOUND, '用户不存在');
  if (target.role === 'super_admin') {
    return fail(reply, ErrorCode.FORBIDDEN, '不能任命超级管理员为部门管理员');
  }
  if (!target.deptId) {
    return fail(reply, ErrorCode.FORBIDDEN, '该用户尚未分配部门');
  }

  const updated = await deptService.appointDeptAdmin(parsed.data.userId, target.deptId);
  await writeLog({
    operatorId: request.user.id, operatorName: request.user.username,
    targetUserId: target.id, targetUsername: target.username,
    targetDeptId: target.deptId,
    actionType: 'DEPT_APPOINT_ADMIN',
    actionDesc: `任命 ${target.username} 为部门 #${target.deptId} 管理员（客户端发起）`,
    clientIp: request.ip, result: 1,
  });
  return success(reply, updated);
}

/**
 * 列出某用户已获得的服务授权（用于客户端部门授权管理）
 */
export async function listUserGrants(request, reply) {
  const userId = parseInt(request.params.userId, 10);
  if (!(await checkUserDeptAccess(request, userId))) {
    return fail(reply, ErrorCode.FORBIDDEN, '无权查看其他部门用户的授权');
  }
  const result = await grantService.listGrants({ userId, page: 1, pageSize: 500 });
  return success(reply, { list: result.list, total: result.total });
}

/**
 * 撤销部门管理员
 */
export async function revokeDeptAdmin(request, reply) {
  const userId = parseInt(request.params.userId, 10);
  if (!(await checkUserDeptAccess(request, userId))) {
    return fail(reply, ErrorCode.FORBIDDEN, '无权操作其他部门用户');
  }
  const target = await userService.findUserById(userId);
  if (!target) return fail(reply, ErrorCode.USER_NOT_FOUND, '用户不存在');
  if (target.role !== 'dept_admin') {
    return fail(reply, ErrorCode.FORBIDDEN, '该用户不是部门管理员');
  }
  if (!target.deptId) return fail(reply, ErrorCode.PARAM_ERROR, '用户无部门信息');

  const updated = await deptService.revokeDeptAdmin(userId, target.deptId);
  await writeLog({
    operatorId: request.user.id, operatorName: request.user.username,
    targetUserId: userId, targetUsername: target.username,
    targetDeptId: target.deptId,
    actionType: 'DEPT_REVOKE_ADMIN',
    actionDesc: `撤销 ${target.username} 的部门 #${target.deptId} 管理员身份（客户端发起）`,
    clientIp: request.ip, result: 1,
  });
  return success(reply, updated);
}

/**
 * 更新部门成员（仅允许重置密码 / 启停 / 角色变更；deptId 不允许改）
 */
export async function updateDeptMember(request, reply) {
  const userId = parseInt(request.params.userId, 10);
  const deny = await assertCanOperateUser(request, userId);
  if (deny) return fail(reply, deny.code, deny.message, deny.httpStatus);
  const target = await userService.findUserById(userId);
  if (!target) return fail(reply, ErrorCode.USER_NOT_FOUND, '用户不存在');

  const schema = z.object({
    password: z.string().min(6).max(64).optional(),
    status: z.number().int().min(0).max(1).optional(),
    role: z.enum(['user', 'dept_admin']).optional(),
  }).refine(data => Object.keys(data).length > 0, { message: '至少提供一个更新字段' });

  const parsed = schema.safeParse(request.body);
  if (!parsed.success) return fail(reply, ErrorCode.PARAM_ERROR, '参数校验失败');

  // 角色权限：dept_admin 只能给 user / dept_admin；不能动 super_admin
  if (parsed.data.role) {
    if (target.role === 'super_admin') {
      return fail(reply, ErrorCode.FORBIDDEN, '不能修改超级管理员');
    }
    if (request.user.role === 'dept_admin' && parsed.data.role === 'super_admin') {
      return fail(reply, ErrorCode.FORBIDDEN, '无权赋予超级管理员角色');
    }
  }

  // 末位超管保护（即使前端绕过，也兜底）
  if (target.role === 'super_admin' && (parsed.data.status === 0 || parsed.data.role === 'dept_admin' || parsed.data.role === 'user')) {
    const remain = await userService.countSuperAdmins(target.id);
    if (remain < 1) {
      return fail(reply, ErrorCode.FORBIDDEN, '系统至少需要保留一名启用的超级管理员');
    }
  }

  await userService.updateUser(userId, parsed.data);

  const parts = [];
  if (parsed.data.password) parts.push('重置密码');
  if (parsed.data.status !== undefined) parts.push(parsed.data.status === 1 ? '启用' : '禁用');
  if (parsed.data.role !== undefined) parts.push(`角色 ${target.role}→${parsed.data.role}`);
  await writeLog({
    operatorId: request.user.id, operatorName: request.user.username,
    targetUserId: userId, targetUsername: target.username,
    actionType: parsed.data.status !== undefined
      ? (parsed.data.status === 1 ? 'USER_ENABLE' : 'USER_DISABLE')
      : (parsed.data.role !== undefined ? 'USER_ROLE_CHANGE' : 'USER_UPDATE'),
    actionDesc: `${parts.join('，') || '更新'}：${target.username}（客户端发起）`,
    clientIp: request.ip, result: 1,
  });
  return success(reply);
}

/**
 * 部门管理员代创建服务：自动绑定到当前用户所在部门
 */
export async function createServiceForDept(request, reply) {
  if (request.user.role !== 'dept_admin' && request.user.role !== 'super_admin') {
    return fail(reply, ErrorCode.FORBIDDEN, '仅部门管理员或超级管理员可代创建服务');
  }

  const schema = z.object({
    name: z.string().min(1).max(64),
    category: z.string().max(32).optional(),
    identifier: z.string().max(128).optional(),
    url: z.string().max(256).optional(),
    remark: z.string().max(256).optional(),
    icon: z.string().max(512).optional(),
    secret: z.string().min(1).max(128).optional(),
    digits: z.number().int().min(4).max(8).optional(),
    period: z.number().int().min(15).max(120).optional(),
    algorithm: z.enum(['SHA1', 'SHA256', 'SHA512']).optional(),
  });
  const parsed = schema.safeParse(request.body);
  if (!parsed.success) return fail(reply, ErrorCode.PARAM_ERROR, '参数校验失败');

  // 部门管理员 → 强制绑定到本部门
  let deptId = null;
  if (request.user.role === 'dept_admin') {
    if (!request.user.deptId) return fail(reply, ErrorCode.FORBIDDEN, '部门管理员未配置部门');
    deptId = request.user.deptId;
  } else {
    // super_admin：可指定
    const bodyDeptId = request.body.deptId;
    if (bodyDeptId) deptId = Number(bodyDeptId);
  }

  const service = await serviceService.createService({ ...parsed.data, deptId }, request.user.id);

  // 自建服务自动授权给创建者，dept_admin 依赖授权表才能看到自己创建的服务
  await grantService.grantAccess({
    userId: request.user.id,
    accountId: service.id,
    grantedById: request.user.id,
    remark: '自建服务自动授权',
  });

  await writeLog({
    operatorId: request.user.id, operatorName: request.user.username,
    targetAccountId: service.id, targetAccountName: service.name,
    targetDeptId: deptId,
    actionType: 'SERVICE_CREATE',
    actionDesc: `代创建服务 ${service.name}（部门 #${deptId ?? 'public'}，客户端发起）`,
    clientIp: request.ip, result: 1,
  });
  return success(reply, service);
}

/**
 * 部门内可授权的服务池：本部门服务 + 共享服务
 */
export async function listGrantableServices(request, reply) {
  if (request.user.role !== 'dept_admin' && request.user.role !== 'super_admin') {
    return fail(reply, ErrorCode.FORBIDDEN, '仅部门管理员或超级管理员可使用该功能');
  }
  let deptId;
  if (request.user.role === 'dept_admin') {
    if (!request.user.deptId) return fail(reply, ErrorCode.FORBIDDEN, '部门管理员未配置部门');
    deptId = request.user.deptId;
  } else {
    deptId = parseInt(request.query.deptId, 10) || null;
  }

  const all = await serviceService.listServices({ page: 1, pageSize: 200, status: 1 });
  const visible = all.list.filter(s => {
    if (request.user.role === 'super_admin') return true;
    return s.deptId === deptId || s.deptId === null;
  });
  return success(reply, { list: visible, total: visible.length });
}

/**
 * 部门管理员授权：把某个服务授权给本部门某个用户
 */
export async function grantServiceToDeptMember(request, reply) {
  const schema = z.object({
    userId: z.number().int().positive(),
    accountId: z.number().int().positive(),
    remark: z.string().max(256).optional(),
  });
  const parsed = schema.safeParse(request.body);
  if (!parsed.success) return fail(reply, ErrorCode.PARAM_ERROR, '参数校验失败');

  const deny = await assertCanOperateUser(request, parsed.data.userId);
  if (deny) return fail(reply, deny.code, deny.message, deny.httpStatus);
  if (!(await checkServiceDeptAccess(request, parsed.data.accountId))) {
    return fail(reply, ErrorCode.FORBIDDEN, '无权操作其他部门服务');
  }
  const user = await userService.findUserById(parsed.data.userId);
  const service = await serviceService.getService(parsed.data.accountId);
  if (!user || !service) return fail(reply, ErrorCode.PARAM_ERROR, '用户或服务不存在');

  const grant = await grantService.grantAccess({
    userId: parsed.data.userId,
    accountId: parsed.data.accountId,
    remark: parsed.data.remark,
    grantedById: request.user.id,
  });
  await writeLog({
    operatorId: request.user.id, operatorName: request.user.username,
    targetUserId: user.id, targetUsername: user.username,
    targetAccountId: service.id, targetAccountName: service.name,
    actionType: 'GRANT_CREATE',
    actionDesc: `授权用户 ${user.username} 访问服务 ${service.name}（客户端发起）`,
    clientIp: request.ip, result: 1,
  });
  return success(reply, grant);
}

/**
 * 部门管理员撤销授权
 */
export async function revokeServiceFromDeptMember(request, reply) {
  const schema = z.object({
    userId: z.number().int().positive(),
    accountId: z.number().int().positive(),
  });
  const parsed = schema.safeParse(request.body);
  if (!parsed.success) return fail(reply, ErrorCode.PARAM_ERROR, '参数校验失败');

  const deny = await assertCanOperateUser(request, parsed.data.userId);
  if (deny) return fail(reply, deny.code, deny.message, deny.httpStatus);
  if (!(await checkServiceDeptAccess(request, parsed.data.accountId))) {
    return fail(reply, ErrorCode.FORBIDDEN, '无权操作其他部门服务');
  }
  await grantService.revokeAccess(parsed.data.userId, parsed.data.accountId);
  await writeLog({
    operatorId: request.user.id, operatorName: request.user.username,
    targetUserId: parsed.data.userId, targetAccountId: parsed.data.accountId,
    actionType: 'GRANT_REVOKE',
    actionDesc: `撤销用户 #${parsed.data.userId} 对服务 #${parsed.data.accountId} 的授权（客户端发起）`,
    clientIp: request.ip, result: 1,
  });
  return success(reply);
}

/**
 * 部门管理员代创建本部门成员（仅可创建 user 角色，强制绑定本部门）
 */
export async function createDeptMember(request, reply) {
  if (request.user.role !== 'dept_admin' && request.user.role !== 'super_admin') {
    return fail(reply, ErrorCode.FORBIDDEN, '仅部门管理员或超级管理员可创建成员');
  }

  // 客户端部门管理员场景：dept 强制绑本部门；super_admin 场景：可指定
  let deptId;
  if (request.user.role === 'dept_admin') {
    if (!request.user.deptId) return fail(reply, ErrorCode.FORBIDDEN, '部门管理员未配置部门');
    deptId = request.user.deptId;
  } else {
    deptId = request.body.deptId ? Number(request.body.deptId) : null;
    if (!deptId) return fail(reply, ErrorCode.PARAM_ERROR, '缺少 deptId');
  }

  const schema = z.object({
    username: z.string().min(3).max(32).regex(/^[a-zA-Z0-9_]+$/, '仅字母数字下划线'),
    password: z.string().min(6).max(64),
    role: z.enum(['user', 'dept_admin']).default('user'),
  });
  const parsed = schema.safeParse(request.body);
  if (!parsed.success) {
    return fail(reply, ErrorCode.PARAM_ERROR, '参数校验失败：用户名3-32位字母数字下划线，密码≥6位');
  }

  // 部门管理员只能创建 user
  if (request.user.role === 'dept_admin' && parsed.data.role !== 'user') {
    return fail(reply, ErrorCode.FORBIDDEN, '部门管理员只能创建普通用户');
  }

  const existing = await userService.findUserByUsername(parsed.data.username);
  if (existing) return fail(reply, ErrorCode.USERNAME_EXISTS, '用户名已存在');

  const newUser = await userService.createUser({
    username: parsed.data.username,
    password: parsed.data.password,
    role: parsed.data.role,
    deptId,
  });

  await writeLog({
    operatorId: request.user.id, operatorName: request.user.username,
    targetUserId: newUser.id, targetUsername: newUser.username,
    targetDeptId: deptId,
    actionType: 'USER_CREATE',
    actionDesc: `代创建用户 ${newUser.username} (${newUser.role}) 至部门 #${deptId}（客户端发起）`,
    clientIp: request.ip, result: 1,
  });
  return success(reply, newUser);
}
