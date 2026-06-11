import { z } from 'zod';
import * as deptService from '../services/department.service.js';
import { writeLog } from '../services/log.service.js';
import { success, fail, ErrorCode } from '../utils/response.js';

export async function listDepartments(request, reply) {
  const { page = 1, pageSize = 20, keyword, status } = request.query;
  const result = await deptService.listDepartments({
    page: Number(page),
    pageSize: Number(pageSize),
    keyword,
    status,
  });
  return success(reply, result);
}

export async function getDepartment(request, reply) {
  const id = parseInt(request.params.id, 10);
  const dept = await deptService.getDepartment(id);
  if (!dept) {
    return fail(reply, ErrorCode.PARAM_ERROR, '部门不存在');
  }
  return success(reply, dept);
}

export async function createDepartment(request, reply) {
  const schema = z.object({
    name: z.string().min(1).max(64),
    code: z.string().min(1).max(32).regex(/^[a-zA-Z0-9_]+$/),
    remark: z.string().max(256).optional(),
    status: z.number().int().min(0).max(1).optional(),
    sort: z.number().int().min(0).optional(),
  });

  const parsed = schema.safeParse(request.body);
  if (!parsed.success) {
    return fail(reply, ErrorCode.PARAM_ERROR, '参数校验失败');
  }

  const dept = await deptService.createDepartment(parsed.data);

  writeLog({
    operatorId: request.user.id,
    operatorName: request.user.username,
    actionType: 'DEPT_CREATE',
    actionDesc: `创建部门 ${dept.name} (${dept.code})`,
    clientIp: request.ip,
    result: 1,
  });

  return success(reply, dept);
}

export async function updateDepartment(request, reply) {
  const id = parseInt(request.params.id, 10);
  const schema = z.object({
    name: z.string().min(1).max(64).optional(),
    code: z.string().min(1).max(32).regex(/^[a-zA-Z0-9_]+$/).optional(),
    remark: z.string().max(256).optional(),
    status: z.number().int().min(0).max(1).optional(),
    sort: z.number().int().min(0).optional(),
  }).refine(data => Object.keys(data).length > 0, {
    message: '至少提供一个更新字段',
  });

  const parsed = schema.safeParse(request.body);
  if (!parsed.success) {
    return fail(reply, ErrorCode.PARAM_ERROR, '参数校验失败');
  }

  const existing = await deptService.getDepartment(id);
  if (!existing) {
    return fail(reply, ErrorCode.PARAM_ERROR, '部门不存在');
  }

  const dept = await deptService.updateDepartment(id, parsed.data);

  writeLog({
    operatorId: request.user.id,
    operatorName: request.user.username,
    actionType: 'DEPT_UPDATE',
    actionDesc: `更新部门 ${dept.name}`,
    clientIp: request.ip,
    result: 1,
  });

  return success(reply, dept);
}

export async function deleteDepartment(request, reply) {
  const id = parseInt(request.params.id, 10);
  const existing = await deptService.getDepartment(id);
  if (!existing) {
    return fail(reply, ErrorCode.PARAM_ERROR, '部门不存在');
  }

  await deptService.deleteDepartment(id);

  writeLog({
    operatorId: request.user.id,
    operatorName: request.user.username,
    actionType: 'DEPT_DELETE',
    actionDesc: `删除部门 ${existing.name}`,
    clientIp: request.ip,
    result: 1,
  });

  return success(reply);
}

export async function getAllDepartments(request, reply) {
  const depts = await deptService.getAllDepartments();
  return success(reply, depts);
}

// ============ 部门成员管理 ============

/**
 * 获取部门成员列表（含已分配的普通用户和部门管理员）
 */
export async function listDeptMembers(request, reply) {
  const deptId = parseInt(request.params.id, 10);
  const dept = await deptService.getDepartment(deptId);
  if (!dept) return fail(reply, ErrorCode.PARAM_ERROR, '部门不存在');

  const { role } = request.query;
  const where = { deptId };
  if (role) where.role = role;
  const users = await deptService.listDeptMembers(deptId, { role });
  return success(reply, { dept, members: users });
}

/**
 * 添加成员：把若干用户分配到该部门
 */
export async function addDeptMembers(request, reply) {
  const deptId = parseInt(request.params.id, 10);
  const schema = z.object({
    userIds: z.array(z.number().int().positive()).min(1).max(500),
  });
  const parsed = schema.safeParse(request.body);
  if (!parsed.success) {
    return fail(reply, ErrorCode.PARAM_ERROR, '参数校验失败');
  }
  const dept = await deptService.getDepartment(deptId);
  if (!dept) return fail(reply, ErrorCode.PARAM_ERROR, '部门不存在');

  const result = await deptService.assignUsersToDept(parsed.data.userIds, deptId);
  writeLog({
    operatorId: request.user.id, operatorName: request.user.username,
    actionType: 'DEPT_ADD_MEMBERS', targetDeptId: deptId, targetDeptName: dept.name,
    actionDesc: `向部门 ${dept.name} 添加 ${result.assigned} 名成员`,
    clientIp: request.ip, result: 1,
  });
  return success(reply, { ...result, deptName: dept.name });
}

/**
 * 移除成员：把用户 deptId 置空
 */
export async function removeDeptMember(request, reply) {
  const deptId = parseInt(request.params.id, 10);
  const userId = parseInt(request.params.userId, 10);
  const dept = await deptService.getDepartment(deptId);
  if (!dept) return fail(reply, ErrorCode.PARAM_ERROR, '部门不存在');

  await deptService.removeUserFromDept(userId, deptId);
  writeLog({
    operatorId: request.user.id, operatorName: request.user.username,
    targetUserId: userId, targetDeptId: deptId, targetDeptName: dept.name,
    actionType: 'DEPT_REMOVE_MEMBER',
    actionDesc: `从部门 ${dept.name} 移除成员 #${userId}`,
    clientIp: request.ip, result: 1,
  });
  return success(reply);
}

// ============ 部门管理员管理 ============

/**
 * 任命部门管理员：把用户的 role 改为 dept_admin，并绑定该部门
 */
export async function appointDeptAdmin(request, reply) {
  const deptId = parseInt(request.params.id, 10);
  const schema = z.object({ userId: z.number().int().positive() });
  const parsed = schema.safeParse(request.body);
  if (!parsed.success) return fail(reply, ErrorCode.PARAM_ERROR, '参数校验失败');

  const dept = await deptService.getDepartment(deptId);
  if (!dept) return fail(reply, ErrorCode.PARAM_ERROR, '部门不存在');

  const updated = await deptService.appointDeptAdmin(parsed.data.userId, deptId);
  if (!updated) return fail(reply, ErrorCode.USER_NOT_FOUND, '用户不存在');

  writeLog({
    operatorId: request.user.id, operatorName: request.user.username,
    targetUserId: parsed.data.userId, targetUsername: updated.username,
    targetDeptId: deptId, targetDeptName: dept.name,
    actionType: 'DEPT_APPOINT_ADMIN',
    actionDesc: `任命 ${updated.username} 为部门 ${dept.name} 管理员`,
    clientIp: request.ip, result: 1,
  });
  return success(reply, { userId: updated.id, username: updated.username, role: updated.role, deptId: updated.deptId });
}

/**
 * 撤销部门管理员：role 改回 user，保持 deptId 不变
 */
export async function revokeDeptAdmin(request, reply) {
  const deptId = parseInt(request.params.id, 10);
  const userId = parseInt(request.params.userId, 10);
  const dept = await deptService.getDepartment(deptId);
  if (!dept) return fail(reply, ErrorCode.PARAM_ERROR, '部门不存在');

  const updated = await deptService.revokeDeptAdmin(userId, deptId);
  if (!updated) return fail(reply, ErrorCode.USER_NOT_FOUND, '用户不存在或非该部门管理员');

  writeLog({
    operatorId: request.user.id, operatorName: request.user.username,
    targetUserId: userId, targetUsername: updated.username,
    targetDeptId: deptId, targetDeptName: dept.name,
    actionType: 'DEPT_REVOKE_ADMIN',
    actionDesc: `撤销 ${updated.username} 的部门 ${dept.name} 管理员身份`,
    clientIp: request.ip, result: 1,
  });
  return success(reply, { userId: updated.id, username: updated.username, role: updated.role });
}