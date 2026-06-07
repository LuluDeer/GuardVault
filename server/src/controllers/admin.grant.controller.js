import { z } from 'zod';
import * as grantService from '../services/grant.service.js';
import * as serviceService from '../services/service.service.js';
import * as userService from '../services/user.service.js';
import { writeLog } from '../services/log.service.js';
import { success, fail, ErrorCode } from '../utils/response.js';

export async function listGrants(request, reply) {
  const { page = 1, pageSize = 20, userId, accountId } = request.query;
  const result = await grantService.listGrants({
    page: Number(page),
    pageSize: Number(pageSize),
    userId,
    accountId,
  });
  return success(reply, result);
}

export async function getGrant(request, reply) {
  const { userId, accountId } = request.query;
  if (!userId || !accountId) {
    return fail(reply, ErrorCode.PARAM_ERROR, '缺少参数');
  }
  const grant = await grantService.getGrant(Number(userId), Number(accountId));
  return success(reply, grant ? { granted: true } : { granted: false });
}

export async function grantAccess(request, reply) {
  const schema = z.object({
    userId: z.number().int().positive(),
    accountId: z.number().int().positive(),
    remark: z.string().max(256).optional(),
  });

  const parsed = schema.safeParse(request.body);
  if (!parsed.success) {
    return fail(reply, ErrorCode.PARAM_ERROR, '参数校验失败');
  }

  const user = await userService.findUserById(parsed.data.userId);
  if (!user) {
    return fail(reply, ErrorCode.USER_NOT_FOUND, '用户不存在');
  }

  const service = await serviceService.getService(parsed.data.accountId);
  if (!service) {
    return fail(reply, ErrorCode.PARAM_ERROR, '服务不存在');
  }

  const grant = await grantService.grantAccess({
    ...parsed.data,
    grantedById: request.user.id,
  });

  await writeLog({
    operatorId: request.user.id,
    operatorName: request.user.username,
    targetUserId: user.id,
    targetUsername: user.username,
    targetAccountId: service.id,
    targetAccountName: service.name,
    actionType: 'GRANT_CREATE',
    actionDesc: `授权用户 ${user.username} 访问服务 ${service.name}`,
    clientIp: request.ip,
    result: 1,
  });

  return success(reply, grant);
}

export async function revokeAccess(request, reply) {
  const schema = z.object({
    userId: z.number().int().positive(),
    accountId: z.number().int().positive(),
  });

  const parsed = schema.safeParse(request.body);
  if (!parsed.success) {
    return fail(reply, ErrorCode.PARAM_ERROR, '参数校验失败');
  }

  const user = await userService.findUserById(parsed.data.userId);
  if (!user) {
    return fail(reply, ErrorCode.USER_NOT_FOUND, '用户不存在');
  }

  const service = await serviceService.getService(parsed.data.accountId);
  if (!service) {
    return fail(reply, ErrorCode.PARAM_ERROR, '服务不存在');
  }

  await grantService.revokeAccess(parsed.data.userId, parsed.data.accountId);

  await writeLog({
    operatorId: request.user.id,
    operatorName: request.user.username,
    targetUserId: user.id,
    targetUsername: user.username,
    targetAccountId: service.id,
    targetAccountName: service.name,
    actionType: 'GRANT_REVOKE',
    actionDesc: `撤销用户 ${user.username} 对服务 ${service.name} 的访问权限`,
    clientIp: request.ip,
    result: 1,
  });

  return success(reply);
}

export async function batchGrant(request, reply) {
  const schema = z.object({
    userIds: z.array(z.number().int().positive()),
    accountId: z.number().int().positive(),
    remark: z.string().max(256).optional(),
  });

  const parsed = schema.safeParse(request.body);
  if (!parsed.success) {
    return fail(reply, ErrorCode.PARAM_ERROR, '参数校验失败');
  }

  const service = await serviceService.getService(parsed.data.accountId);
  if (!service) {
    return fail(reply, ErrorCode.PARAM_ERROR, '服务不存在');
  }

  const results = await grantService.batchGrant({
    ...parsed.data,
    grantedById: request.user.id,
  });

  const successCount = results.filter(r => r.success).length;
  await writeLog({
    operatorId: request.user.id,
    operatorName: request.user.username,
    targetAccountId: service.id,
    targetAccountName: service.name,
    actionType: 'GRANT_BATCH',
    actionDesc: `批量授权 ${successCount}/${parsed.data.userIds.length} 用户访问服务 ${service.name}`,
    clientIp: request.ip,
    result: 1,
  });

  return success(reply, { results, successCount, total: parsed.data.userIds.length });
}

export async function batchRevoke(request, reply) {
  const schema = z.object({
    userIds: z.array(z.number().int().positive()),
    accountId: z.number().int().positive(),
  });

  const parsed = schema.safeParse(request.body);
  if (!parsed.success) {
    return fail(reply, ErrorCode.PARAM_ERROR, '参数校验失败');
  }

  const service = await serviceService.getService(parsed.data.accountId);
  if (!service) {
    return fail(reply, ErrorCode.PARAM_ERROR, '服务不存在');
  }

  const results = await grantService.batchRevoke(parsed.data);

  const successCount = results.filter(r => r.success).length;
  await writeLog({
    operatorId: request.user.id,
    operatorName: request.user.username,
    targetAccountId: service.id,
    targetAccountName: service.name,
    actionType: 'GRANT_BATCH_REVOKE',
    actionDesc: `批量撤销 ${successCount}/${parsed.data.userIds.length} 用户对服务 ${service.name} 的访问权限`,
    clientIp: request.ip,
    result: 1,
  });

  return success(reply, { results, successCount, total: parsed.data.userIds.length });
}