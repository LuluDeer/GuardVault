import { z } from 'zod';
import * as serviceService from '../services/service.service.js';
import { writeLog } from '../services/log.service.js';
import { success, fail, ErrorCode } from '../utils/response.js';
import { parseOtpauthUri } from '../utils/otpauth.js';
import { checkServiceDeptAccess } from '../middlewares/authorize.js';

export async function listServices(request, reply) {
  const { page = 1, pageSize = 20, keyword, category, deptId, status } = request.query;
  const result = await serviceService.listServices({
    page: Number(page),
    pageSize: Number(pageSize),
    keyword,
    category,
    deptId,
    status,
  });
  return success(reply, result);
}

export async function getService(request, reply) {
  const id = parseInt(request.params.id, 10);
  const service = await serviceService.getService(id);
  if (!service) {
    return fail(reply, ErrorCode.PARAM_ERROR, '服务不存在');
  }
  return success(reply, service);
}

export async function getServiceSecret(request, reply) {
  const id = parseInt(request.params.id, 10);
  const service = await serviceService.getServiceWithSecret(id);
  if (!service) {
    return fail(reply, ErrorCode.PARAM_ERROR, '服务不存在');
  }

  await writeLog({
    operatorId: request.user.id,
    operatorName: request.user.username,
    targetAccountId: id,
    targetAccountName: service.name,
    actionType: 'SERVICE_VIEW_SECRET',
    actionDesc: `查看服务 ${service.name} 的明文密钥`,
    clientIp: request.ip,
    result: 1,
  });

  return success(reply, {
    id: service.id,
    name: service.name,
    plainSecret: service.plainSecret,
    digits: service.digits,
    period: service.period,
    algorithm: service.algorithm,
  });
}

export async function createService(request, reply) {
  const schema = z.object({
    name: z.string().min(1).max(64),
    category: z.string().optional(),
    identifier: z.string().max(128).optional(),
    url: z.string().max(256).optional(),
    remark: z.string().max(256).optional(),
    icon: z.string().max(512).optional(),
    secret: z.string().optional(),
    digits: z.number().int().min(4).max(8).optional(),
    period: z.number().int().min(15).max(120).optional(),
    algorithm: z.enum(['SHA1', 'SHA256', 'SHA512']).optional(),
    status: z.number().int().min(0).max(1).optional(),
    deptId: z.number().int().positive(),
  });

  const parsed = schema.safeParse(request.body);
  if (!parsed.success) {
    return fail(reply, ErrorCode.PARAM_ERROR, '参数校验失败');
  }

  const service = await serviceService.createService(parsed.data, request.user.id);

  await writeLog({
    operatorId: request.user.id,
    operatorName: request.user.username,
    targetAccountId: service.id,
    targetAccountName: service.name,
    actionType: 'SERVICE_CREATE',
    actionDesc: `创建服务 ${service.name}`,
    clientIp: request.ip,
    result: 1,
  });

  return success(reply, service);
}

export async function updateService(request, reply) {
  const id = parseInt(request.params.id, 10);
  const schema = z.object({
    name: z.string().min(1).max(64).optional(),
    category: z.string().optional(),
    identifier: z.string().max(128).optional(),
    url: z.string().max(256).optional(),
    remark: z.string().max(256).optional(),
    icon: z.string().max(512).optional(),
    digits: z.number().int().min(4).max(8).optional(),
    period: z.number().int().min(15).max(120).optional(),
    algorithm: z.enum(['SHA1', 'SHA256', 'SHA512']).optional(),
    status: z.number().int().min(0).max(1).optional(),
    deptId: z.number().int().positive().optional(),
  }).refine(data => Object.keys(data).length > 0, {
    message: '至少提供一个更新字段',
  });

  const parsed = schema.safeParse(request.body);
  if (!parsed.success) {
    return fail(reply, ErrorCode.PARAM_ERROR, '参数校验失败');
  }

  const existing = await serviceService.getService(id);
  if (!existing) {
    return fail(reply, ErrorCode.PARAM_ERROR, '服务不存在');
  }

  if (!(await checkServiceDeptAccess(request, id))) {
    return fail(reply, ErrorCode.FORBIDDEN, '无权限操作其他部门服务');
  }

  const service = await serviceService.updateService(id, parsed.data);

  await writeLog({
    operatorId: request.user.id,
    operatorName: request.user.username,
    targetAccountId: id,
    targetAccountName: service.name,
    actionType: 'SERVICE_UPDATE',
    actionDesc: `更新服务 ${service.name}`,
    clientIp: request.ip,
    result: 1,
  });

  return success(reply, service);
}

export async function resetSecret(request, reply) {
  const id = parseInt(request.params.id, 10);
  const existing = await serviceService.getService(id);
  if (!existing) {
    return fail(reply, ErrorCode.PARAM_ERROR, '服务不存在');
  }

  if (!(await checkServiceDeptAccess(request, id))) {
    return fail(reply, ErrorCode.FORBIDDEN, '无权限操作其他部门服务');
  }

  const result = await serviceService.resetSecret(id);

  await writeLog({
    operatorId: request.user.id,
    operatorName: request.user.username,
    targetAccountId: id,
    targetAccountName: existing.name,
    actionType: 'SERVICE_RESET_SECRET',
    actionDesc: `重置服务 ${existing.name} 的密钥`,
    clientIp: request.ip,
    result: 1,
  });

  return success(reply, result);
}

export async function deleteService(request, reply) {
  const id = parseInt(request.params.id, 10);
  const existing = await serviceService.getService(id);
  if (!existing) {
    return fail(reply, ErrorCode.PARAM_ERROR, '服务不存在');
  }

  if (!(await checkServiceDeptAccess(request, id))) {
    return fail(reply, ErrorCode.FORBIDDEN, '无权限操作其他部门服务');
  }

  await serviceService.deleteService(id);

  await writeLog({
    operatorId: request.user.id,
    operatorName: request.user.username,
    targetAccountId: id,
    targetAccountName: existing.name,
    actionType: 'SERVICE_DELETE',
    actionDesc: `删除服务 ${existing.name}`,
    clientIp: request.ip,
    result: 1,
  });

  return success(reply);
}

export async function getCategories(request, reply) {
  const categories = await serviceService.getServiceCategories();
  return success(reply, categories);
}

export async function createFromOtpauth(request, reply) {
  const schema = z.object({
    uri: z.string().min(1),
    name: z.string().min(1).max(64).optional(),
    category: z.string().optional(),
    deptId: z.number().int().positive(),
    url: z.string().max(256).optional(),
    remark: z.string().max(256).optional(),
  });

  const parsed = schema.safeParse(request.body);
  if (!parsed.success) {
    return fail(reply, ErrorCode.PARAM_ERROR, '参数校验失败');
  }

  const parseResult = parseOtpauthUri(parsed.data.uri);
  if (!parseResult.valid) {
    return fail(reply, ErrorCode.PARAM_ERROR, parseResult.error);
  }

  const { issuer, account, secret, algorithm, digits, period } = parseResult.data;
  const name = parsed.data.name || (issuer ? `${issuer}${account ? ' - ' + account : ''}` : (account || '扫码录入的服务'));

  try {
    const service = await serviceService.createService({
      name,
      category: parsed.data.category || '其他',
      identifier: account,
      url: parsed.data.url || '',
      remark: parsed.data.remark || (issuer ? `来源：${issuer}` : '扫码录入'),
      secret,
      algorithm,
      digits,
      period,
      deptId: parsed.data.deptId,
      status: 1,
    }, request.user.id);

    await writeLog({
      operatorId: request.user.id,
      operatorName: request.user.username,
      targetAccountId: service.id,
      targetAccountName: service.name,
      actionType: 'SERVICE_CREATE_SCAN',
      actionDesc: `扫码录入服务 ${service.name}`,
      clientIp: request.ip,
      result: 1,
    });

    return success(reply, service);
  } catch (err) {
    return fail(reply, ErrorCode.SERVER_ERROR, err.message);
  }
}

export async function batchImport(request, reply) {
  const schema = z.object({
    services: z.array(z.object({
      name: z.string().min(1).max(64),
      category: z.string().optional(),
      identifier: z.string().max(128).optional(),
      url: z.string().max(256).optional(),
      remark: z.string().max(256).optional(),
      secret: z.string().optional(),
      digits: z.number().int().min(4).max(8).optional(),
      period: z.number().int().min(15).max(120).optional(),
      algorithm: z.enum(['SHA1', 'SHA256', 'SHA512']).optional(),
      status: z.number().int().min(0).max(1).optional(),
      deptId: z.number().int().positive(),
    })),
  });

  const parsed = schema.safeParse(request.body);
  if (!parsed.success) {
    return fail(reply, ErrorCode.PARAM_ERROR, '参数校验失败');
  }

  const results = [];
  for (const serviceData of parsed.data.services) {
    try {
      const service = await serviceService.createService(serviceData, request.user.id);
      results.push({ success: true, name: serviceData.name, id: service.id });

      await writeLog({
        operatorId: request.user.id,
        operatorName: request.user.username,
        targetAccountId: service.id,
        targetAccountName: service.name,
        actionType: 'SERVICE_CREATE',
        actionDesc: `批量导入创建服务 ${service.name}`,
        clientIp: request.ip,
        result: 1,
      });
    } catch (err) {
      results.push({ success: false, name: serviceData.name, error: err.message });
    }
  }

  const successCount = results.filter(r => r.success).length;
  await writeLog({
    operatorId: request.user.id,
    operatorName: request.user.username,
    actionType: 'SERVICE_BATCH_IMPORT',
    actionDesc: `批量导入服务：成功 ${successCount} 个，失败 ${results.length - successCount} 个`,
    clientIp: request.ip,
    result: successCount > 0 ? 1 : 0,
  });

  return success(reply, { results, successCount, total: results.length });
}