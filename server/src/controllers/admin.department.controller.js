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

  await writeLog({
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

  await writeLog({
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

  await writeLog({
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