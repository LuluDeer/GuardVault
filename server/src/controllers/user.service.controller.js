import { z } from 'zod';
import * as grantService from '../services/grant.service.js';
import * as serviceService from '../services/service.service.js';
import { writeLog } from '../services/log.service.js';
import { success, fail, ErrorCode } from '../utils/response.js';

const VIEW_CODE_DEBOUNCE = new Map();

export async function getMyServices(request, reply) {
  const services = await grantService.getUserAccessibleServices(
    request.user.id,
    request.user.role,
    request.user.deptId,
  );
  return success(reply, services);
}

export async function getServiceCode(request, reply) {
  const id = parseInt(request.params.id, 10);

  const accessibleIds = await grantService.getUserAccessibleServiceIds(request.user.id, request.user.role, request.user.deptId);
  if (!accessibleIds.includes(id)) {
    writeLog({
      operatorId: request.user.id,
      operatorName: request.user.username,
      targetAccountId: id,
      actionType: 'CODE_VIEW',
      actionDesc: `尝试访问无权限的服务 ${id}`,
      clientIp: request.ip,
      result: 0,
      failReason: '无权限',
    });
    return fail(reply, ErrorCode.FORBIDDEN, '无权限访问此服务');
  }

  const service = await serviceService.getService(id);
  if (!service) {
    return fail(reply, ErrorCode.PARAM_ERROR, '服务不存在');
  }

  const now = Date.now();
  const key = `${request.user.id}_${id}`;
  const lastView = VIEW_CODE_DEBOUNCE.get(key);

  if (!lastView || now - lastView > 30000) {
    VIEW_CODE_DEBOUNCE.set(key, now);
    writeLog({
      operatorId: request.user.id,
      operatorName: request.user.username,
      targetAccountId: id,
      targetAccountName: service.name,
      actionType: 'CODE_VIEW',
      actionDesc: `查看服务 ${service.name} 的验证码`,
      clientIp: request.ip,
      result: 1,
    });
  }

  const codeResult = await serviceService.generateCodeForService(id);
  if (!codeResult) {
    return fail(reply, ErrorCode.SERVER_ERROR, '生成验证码失败');
  }

  return success(reply, {
    ...codeResult,
    serviceId: id,
    serviceName: service.name,
    digits: service.digits,
  });
}

export async function getServiceDetail(request, reply) {
  const id = parseInt(request.params.id, 10);

  const accessibleIds = await grantService.getUserAccessibleServiceIds(
    request.user.id,
    request.user.role,
    request.user.deptId,
  );
  if (!accessibleIds.includes(id)) {
    return fail(reply, ErrorCode.FORBIDDEN, '无权限访问此服务');
  }

  const service = await serviceService.getService(id);
  if (!service) {
    return fail(reply, ErrorCode.PARAM_ERROR, '服务不存在');
  }

  return success(reply, service);
}

export async function reportCopy(request, reply) {
  const schema = z.object({
    accountId: z.number().int().positive(),
  });
  const parsed = schema.safeParse(request.body);
  if (!parsed.success) {
    return fail(reply, ErrorCode.PARAM_ERROR, '参数校验失败');
  }

  const id = parsed.data.accountId;
  const accessibleIds = await grantService.getUserAccessibleServiceIds(
    request.user.id,
    request.user.role,
    request.user.deptId,
  );
  if (!accessibleIds.includes(id)) {
    return fail(reply, ErrorCode.FORBIDDEN, '无权限');
  }

  const service = await serviceService.getService(id);

  writeLog({
    operatorId: request.user.id,
    operatorName: request.user.username,
    targetAccountId: id,
    targetAccountName: service?.name,
    actionType: 'CODE_COPY',
    actionDesc: `复制服务 ${service?.name || id} 的验证码到剪贴板`,
    clientIp: request.ip,
    result: 1,
  });

  return success(reply);
}