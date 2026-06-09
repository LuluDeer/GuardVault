import { prisma } from '../utils/prisma.js';

export const CATEGORIES = ['云服务', 'VPN', '代码托管', '堡垒机', '数据库', '办公', '其他'];
const CATEGORIES_KEY = 'service_categories';

// 获取服务分类（从数据库，无则返回默认值）
export async function getServiceCategories() {
  const config = await prisma.systemConfig.findUnique({
    where: { configKey: CATEGORIES_KEY },
  });
  if (config?.configValue) {
    try {
      return JSON.parse(config.configValue);
    } catch {
      return CATEGORIES;
    }
  }
  return CATEGORIES;
}

// 保存服务分类到数据库
export async function saveServiceCategories(categories) {
  await prisma.systemConfig.upsert({
    where: { configKey: CATEGORIES_KEY },
    create: { configKey: CATEGORIES_KEY, configValue: JSON.stringify(categories) },
    update: { configValue: JSON.stringify(categories) },
  });
}

export async function listDepartments({ page = 1, pageSize = 20, keyword, status } = {}) {
  const where = {};
  if (keyword) {
    where.OR = [
      { name: { contains: keyword } },
      { code: { contains: keyword } },
    ];
  }
  if (status !== undefined && status !== null && status !== '') {
    where.status = Number(status);
  }

  const [list, total] = await Promise.all([
    prisma.department.findMany({
      where,
      skip: (page - 1) * pageSize,
      take: pageSize,
      orderBy: [{ sort: 'asc' }, { createdAt: 'desc' }],
      select: {
        id: true,
        name: true,
        code: true,
        remark: true,
        status: true,
        sort: true,
        createdAt: true,
        updatedAt: true,
      },
    }),
    prisma.department.count({ where }),
  ]);

  return { list, total, page, pageSize };
}

export async function getDepartment(id) {
  return prisma.department.findUnique({
    where: { id },
    select: {
      id: true,
      name: true,
      code: true,
      remark: true,
      status: true,
      sort: true,
      createdAt: true,
      updatedAt: true,
    },
  });
}

export async function createDepartment(data) {
  return prisma.department.create({
    data: {
      name: data.name,
      code: data.code,
      remark: data.remark ?? '',
      status: data.status ?? 1,
      sort: data.sort ?? 0,
    },
    select: { id: true, name: true, code: true },
  });
}

export async function updateDepartment(id, data) {
  const updateData = {};
  if (data.name !== undefined) updateData.name = data.name;
  if (data.code !== undefined) updateData.code = data.code;
  if (data.remark !== undefined) updateData.remark = data.remark;
  if (data.status !== undefined) updateData.status = data.status;
  if (data.sort !== undefined) updateData.sort = data.sort;

  return prisma.department.update({
    where: { id },
    data: updateData,
    select: { id: true, name: true, code: true },
  });
}

export async function deleteDepartment(id) {
  return prisma.department.delete({ where: { id } });
}

export async function getAllDepartments() {
  return prisma.department.findMany({
    where: { status: 1 },
    orderBy: { sort: 'asc' },
    select: { id: true, name: true, code: true },
  });
}

// ============ 部门成员 / 管理员管理 ============

export async function listDeptMembers(deptId, { role } = {}) {
  const where = { deptId: Number(deptId) };
  if (role) where.role = role;
  return prisma.systemUser.findMany({
    where,
    orderBy: [{ role: 'asc' }, { createdAt: 'desc' }],
    select: {
      id: true, username: true, role: true, status: true,
      createdAt: true, lastLoginTime: true,
      totpKey: { select: { isEnable: true } },
    },
  });
}

export async function assignUsersToDept(userIds, deptId) {
  const result = await prisma.systemUser.updateMany({
    where: { id: { in: userIds.map(Number) } },
    data: { deptId: Number(deptId) },
  });
  return { assigned: result.count };
}

export async function removeUserFromDept(userId, deptId) {
  return prisma.systemUser.update({
    where: { id: Number(userId) },
    data: { deptId: null },
    select: { id: true, username: true },
  });
}

export async function appointDeptAdmin(userId, deptId) {
  return prisma.systemUser.update({
    where: { id: Number(userId) },
    data: { role: 'dept_admin', deptId: Number(deptId) },
    select: { id: true, username: true, role: true, deptId: true },
  });
}

export async function revokeDeptAdmin(userId, deptId) {
  const u = await prisma.systemUser.findUnique({
    where: { id: Number(userId) },
    select: { id: true, role: true, deptId: true },
  });
  if (!u || u.role !== 'dept_admin' || u.deptId !== Number(deptId)) return null;
  return prisma.systemUser.update({
    where: { id: Number(userId) },
    data: { role: 'user' },
    select: { id: true, username: true, role: true },
  });
}