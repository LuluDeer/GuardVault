import { prisma } from '../utils/prisma.js';
import { encrypt, decrypt } from '../utils/crypto.js';
import { generateSecret } from '../utils/totp.js';
import { CATEGORIES } from './department.service.js';

export { CATEGORIES };

export async function listServices({
  page = 1,
  pageSize = 20,
  keyword,
  category,
  deptId,
  status,
} = {}) {
  const where = {};
  if (keyword) {
    where.OR = [
      { name: { contains: keyword } },
      { identifier: { contains: keyword } },
    ];
  }
  if (category && category !== 'all') {
    where.category = category;
  }
  if (deptId) {
    where.deptId = Number(deptId);
  }
  if (status !== undefined && status !== null && status !== '') {
    where.status = Number(status);
  }

  const [list, total] = await Promise.all([
    prisma.serviceAccount.findMany({
      where,
      skip: (page - 1) * pageSize,
      take: pageSize,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        name: true,
        category: true,
        identifier: true,
        url: true,
        remark: true,
        icon: true,
        status: true,
        digits: true,
        period: true,
        algorithm: true,
        deptId: true,
        department: { select: { name: true } },
        createdBy: { select: { username: true } },
        createdAt: true,
        updatedAt: true,
      },
    }),
    prisma.serviceAccount.count({ where }),
  ]);

  return {
    list: list.map(s => ({
      ...s,
      deptName: s.department?.name,
      createdByName: s.createdBy?.username,
      department: undefined,
      createdBy: undefined,
    })),
    total,
    page,
    pageSize,
  };
}

export async function getService(id) {
  const service = await prisma.serviceAccount.findUnique({
    where: { id },
    select: {
      id: true,
      name: true,
      category: true,
      identifier: true,
      url: true,
      remark: true,
      icon: true,
      status: true,
      digits: true,
      period: true,
      algorithm: true,
      deptId: true,
      department: { select: { name: true } },
      createdBy: { select: { username: true } },
      createdAt: true,
      updatedAt: true,
    },
  });

  if (service) {
    return {
      ...service,
      deptName: service.department?.name,
      createdByName: service.createdBy?.username,
      department: undefined,
      createdBy: undefined,
    };
  }
  return null;
}

export async function getServiceWithSecret(id) {
  const service = await prisma.serviceAccount.findUnique({
    where: { id },
    select: {
      id: true,
      name: true,
      category: true,
      identifier: true,
      url: true,
      remark: true,
      icon: true,
      status: true,
      digits: true,
      period: true,
      algorithm: true,
      deptId: true,
      encryptedSecret: true,
    },
  });

  if (service) {
    const plainSecret = decrypt(service.encryptedSecret);
    return { ...service, plainSecret, encryptedSecret: undefined };
  }
  return null;
}

export async function createService(data, operatorId) {
  const secret = data.secret || generateSecret();
  const encryptedSecret = encrypt(secret);

  return prisma.serviceAccount.create({
    data: {
      name: data.name,
      category: data.category || '其他',
      identifier: data.identifier ?? '',
      url: data.url ?? '',
      remark: data.remark ?? '',
      icon: data.icon ?? '',
      encryptedSecret,
      digits: data.digits ?? 6,
      period: data.period ?? 30,
      algorithm: data.algorithm?.toUpperCase() ?? 'SHA1',
      status: data.status ?? 1,
      deptId: data.deptId,
      createdById: operatorId,
    },
    select: { id: true, name: true },
  });
}

export async function updateService(id, data) {
  const updateData = {};
  if (data.name !== undefined) updateData.name = data.name;
  if (data.category !== undefined) updateData.category = data.category;
  if (data.identifier !== undefined) updateData.identifier = data.identifier;
  if (data.url !== undefined) updateData.url = data.url;
  if (data.remark !== undefined) updateData.remark = data.remark;
  if (data.icon !== undefined) updateData.icon = data.icon;
  if (data.status !== undefined) updateData.status = data.status;
  if (data.digits !== undefined) updateData.digits = data.digits;
  if (data.period !== undefined) updateData.period = data.period;
  if (data.algorithm !== undefined) updateData.algorithm = data.algorithm.toUpperCase();
  if (data.deptId !== undefined) updateData.deptId = data.deptId;

  return prisma.serviceAccount.update({
    where: { id },
    data: updateData,
    select: { id: true, name: true },
  });
}

export async function resetSecret(id) {
  const secret = generateSecret();
  const encryptedSecret = encrypt(secret);

  await prisma.serviceAccount.update({
    where: { id },
    data: { encryptedSecret },
  });

  return { secret };
}

export async function deleteService(id) {
  return prisma.serviceAccount.delete({ where: { id } });
}

export async function generateCodeForService(id) {
  const service = await prisma.serviceAccount.findUnique({
    where: { id },
    select: {
      encryptedSecret: true,
      digits: true,
      period: true,
      algorithm: true,
    },
  });

  if (!service) return null;

  const plainSecret = decrypt(service.encryptedSecret);

  const epoch = Math.floor(Date.now() / 1000);
  const remainSeconds = service.period - (epoch % service.period);

  // 关键：必须用 authenticator（带 base32 keyDecoder），不能用 otplib.totp，否则码与
  // Google/Microsoft Authenticator 等标准客户端对不上。
  // 每次克隆独立实例，避免与其它调用（比如不同 period 的服务）共享全局 options。
  const { authenticator } = await import('otplib');
  const a = authenticator.clone();
  a.options = {
    digits: service.digits,
    step: service.period,
    algorithm: service.algorithm.toLowerCase(),
  };

  const code = a.generate(plainSecret);

  return { code, remainSeconds };
}

export async function getServiceCategories() {
  return CATEGORIES;
}