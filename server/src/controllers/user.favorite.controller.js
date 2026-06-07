// 用户收藏服务：决定客户端 Ctrl+1~9 快捷键顺序
import { z } from 'zod';
import { success as ok, fail, ErrorCode } from '../utils/response.js';
import * as favoriteService from '../services/favorite.service.js';
import { writeLog } from '../services/log.service.js';
import { prisma } from '../utils/prisma.js';

async function checkGrantAccess(userId, accountId) {
  const grant = await prisma.accountGrant.findUnique({
    where: { userId_accountId: { userId, accountId } },
  });
  return !!grant;
}

const addSchema = z.object({ accountId: z.number().int().positive() });
const removeSchema = z.object({ accountId: z.number().int().positive() });
const reorderSchema = z.object({
  orderedAccountIds: z.array(z.number().int().positive()).min(1).max(20),
});

export async function list(request, reply) {
  const userId = request.user.id;
  const data = await favoriteService.listFavorites(userId);
  return ok(reply, data);
}

export async function add(request, reply) {
  const userId = request.user.id;
  const parsed = addSchema.safeParse(request.body);
  if (!parsed.success) return fail(reply, ErrorCode.PARAM_ERROR, parsed.error.errors[0]?.message);
  try {
    const row = await favoriteService.addFavorite(userId, parsed.data.accountId);
    writeLog({
      operatorId: userId,
      operatorName: request.user.username,
      actionType: 'FAVORITE_ADD',
      actionDesc: `收藏服务 #${parsed.data.accountId}`,
      clientIp: request.ip,
      userAgent: request.headers['user-agent'],
      result: 1,
      targetAccountId: parsed.data.accountId,
    });
    return ok(reply, row);
  } catch (e) {
    return fail(reply, ErrorCode.FORBIDDEN, e.message);
  }
}

export async function remove(request, reply) {
  const userId = request.user.id;
  const parsed = removeSchema.safeParse(request.body);
  if (!parsed.success) return fail(reply, ErrorCode.PARAM_ERROR, parsed.error.errors[0]?.message);
  
  if (!(await checkGrantAccess(userId, parsed.data.accountId))) {
    return fail(reply, ErrorCode.FORBIDDEN, '无此服务访问权限');
  }
  
  const result = await favoriteService.removeFavorite(userId, parsed.data.accountId);
  if (result.count > 0) {
    writeLog({
      operatorId: userId,
      operatorName: request.user.username,
      actionType: 'FAVORITE_REMOVE',
      actionDesc: `取消收藏服务 #${parsed.data.accountId}`,
      clientIp: request.ip,
      userAgent: request.headers['user-agent'],
      result: 1,
      targetAccountId: parsed.data.accountId,
    });
  }
  return ok(reply, { count: result.count });
}

export async function reorder(request, reply) {
  const userId = request.user.id;
  const parsed = reorderSchema.safeParse(request.body);
  if (!parsed.success) return fail(reply, ErrorCode.PARAM_ERROR, parsed.error.errors[0]?.message);
  
  for (const accountId of parsed.data.orderedAccountIds) {
    if (!(await checkGrantAccess(userId, accountId))) {
      return fail(reply, ErrorCode.FORBIDDEN, '无此服务访问权限');
    }
  }
  
  const result = await favoriteService.reorderFavorites(userId, parsed.data.orderedAccountIds);
  writeLog({
    operatorId: userId,
    operatorName: request.user.username,
    actionType: 'FAVORITE_REORDER',
    actionDesc: `重排收藏顺序，共 ${result.length} 条`,
    clientIp: request.ip,
    userAgent: request.headers['user-agent'],
    result: 1,
  });
  return ok(reply, { count: result.length });
}
