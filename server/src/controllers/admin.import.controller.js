import { z } from 'zod';
import { parseOtpMigrationUrl, buildOtpauthUrl } from '../utils/otp-migration.js';
import { parseOtpauthUri } from '../utils/otpauth.js';
import { createService } from '../services/service.service.js';
import { prisma } from '../utils/prisma.js';
import { addLog } from '../services/audit.service.js';
import { success, fail, ErrorCode } from '../utils/response.js';

export async function parseMigrationUrl(req, reply) {
  const schema = z.object({
    url: z.string().startsWith('otpauth-migration://', 'URL格式错误，应以 otpauth-migration:// 开头'),
  });

  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    return fail(reply, ErrorCode.PARAM_ERROR, '参数校验失败');
  }

  const result = parseOtpMigrationUrl(parsed.data.url);

  if (!result.valid) {
    return fail(reply, ErrorCode.PARAM_ERROR, result.error);
  }

  return success(reply, result.data.map((otp, index) => ({
    id: index + 1,
    ...otp,
    otpauthUrl: buildOtpauthUrl(otp),
  })));
}

export async function previewImport(req, reply) {
  const schema = z.object({
    items: z.array(z.object({
      name: z.string().optional(),
      issuer: z.string().optional(),
      secret: z.string().optional(),
      type: z.string().optional(),
      digits: z.number().int().optional(),
      algorithm: z.string().optional(),
    })),
  });

  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    return fail(reply, ErrorCode.PARAM_ERROR, '参数校验失败');
  }

  const previewItems = parsed.data.items.map((item, index) => ({
    id: index + 1,
    name: item.name || '未知服务',
    issuer: item.issuer || '',
    secret: item.secret || '',
    type: item.type || 'totp',
    digits: item.digits || 6,
    algorithm: item.algorithm || 'SHA1',
    isValid: validateOtpItem(item),
    category: guessCategory(item.issuer || item.name),
  }));

  return success(reply, previewItems);
}

export async function confirmImport(req, reply) {
  const schema = z.object({
    items: z.array(z.object({
      selected: z.boolean().optional(),
      name: z.string().optional(),
      issuer: z.string().optional(),
      secret: z.string().optional(),
      category: z.string().optional(),
      digits: z.number().int().optional(),
      algorithm: z.string().optional(),
    })),
    deptId: z.number().int().positive(),
  });

  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    return fail(reply, ErrorCode.PARAM_ERROR, '参数校验失败');
  }

  const { items, deptId } = parsed.data;
  const { user } = req;

  const dept = await prisma.department.findUnique({ where: { id: deptId } });
  if (!dept) {
    return fail(reply, ErrorCode.PARAM_ERROR, '部门不存在');
  }

  const selectedItems = items.filter(item => item.selected && item.secret);
  if (selectedItems.length === 0) {
    return fail(reply, ErrorCode.PARAM_ERROR, '未选择任何服务');
  }

  const serviceNames = selectedItems.map(item => item.name);
  const existingServices = await prisma.serviceAccount.findMany({
    where: {
      deptId,
      name: { in: serviceNames },
    },
    select: { name: true },
  });

  const existingNames = new Set(existingServices.map(s => s.name));

  const results = [];
  let successCount = 0;
  let failCount = 0;

  for (const item of selectedItems) {
    if (existingNames.has(item.name)) {
      results.push({
        name: item.name,
        success: false,
        reason: '已存在同名服务',
      });
      failCount++;
      continue;
    }

    try {
      const serviceData = {
        name: item.name || '未知服务',
        category: item.category || guessCategory(item.issuer || item.name),
        identifier: item.issuer || '',
        secret: item.secret,
        digits: item.digits || 6,
        period: item.type === 'hotp' ? 0 : 30,
        algorithm: item.algorithm || 'SHA1',
        deptId,
      };

      const created = await createService(serviceData, user.id);

      await addLog({
        operatorId: user.id,
        operatorName: user.username,
        actionType: 'IMPORT_SERVICE',
        actionDesc: `导入服务: ${serviceData.name}`,
        clientIp: req.ip,
        result: 1,
      });

      results.push({
        name: item.name,
        success: true,
        serviceId: created.id,
      });
      successCount++;
    } catch (error) {
      results.push({
        name: item.name,
        success: false,
        reason: error.message,
      });
      failCount++;
    }
  }

  return success(reply, {
    results,
    successCount,
    failCount,
  });
}

export async function parseOtpauthUrl(req, reply) {
  const schema = z.object({
    url: z.string(),
  });

  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    return fail(reply, ErrorCode.PARAM_ERROR, '参数校验失败');
  }

  if (parsed.data.url.startsWith('otpauth-migration://')) {
    return parseMigrationUrl(req, reply);
  }

  const result = parseOtpauthUri(parsed.data.url);

  if (!result.valid) {
    return fail(reply, ErrorCode.PARAM_ERROR, result.error);
  }

  return success(reply, [{
    id: 1,
    name: result.data.account,
    issuer: result.data.issuer,
    secret: result.data.secret,
    type: 'totp',
    digits: result.data.digits,
    algorithm: result.data.algorithm,
    otpauthUrl: parsed.data.url,
  }]);
}

function validateOtpItem(item) {
  if (!item.secret) return false;
  if (!/^[A-Z2-7]+=*$/.test(item.secret.toUpperCase())) return false;
  return true;
}

function guessCategory(name) {
  const categoryMap = [
    { keywords: ['aws', 'amazon', 'ec2', 's3'], category: '云服务' },
    { keywords: ['azure', 'microsoft'], category: '云服务' },
    { keywords: ['google', 'gcp'], category: '云服务' },
    { keywords: ['aliyun', 'alibaba', '阿里云'], category: '云服务' },
    { keywords: ['tencent', '腾讯云'], category: '云服务' },
    { keywords: ['huawei', '华为云'], category: '云服务' },
    { keywords: ['github', 'gitlab', 'bitbucket'], category: '代码托管' },
    { keywords: ['vpn', 'openvpn', 'wireguard'], category: 'VPN' },
    { keywords: ['ssh', '堡垒机', 'jump'], category: '堡垒机' },
    { keywords: ['mysql', 'postgres', 'mongodb', 'redis', 'database'], category: '数据库' },
    { keywords: ['slack', 'wechat', 'dingtalk', 'feishu', '钉钉', '飞书'], category: '办公' },
    { keywords: ['okta', 'azuread', 'adfs', 'ldap'], category: '身份认证' },
  ];

  const lowerName = (name || '').toLowerCase();
  for (const { keywords, category } of categoryMap) {
    if (keywords.some(k => lowerName.includes(k))) {
      return category;
    }
  }
  return '其他';
}