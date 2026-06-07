import { prisma } from '../utils/prisma.js';

export const CATEGORIES = ['云服务', 'VPN', '代码托管', '堡垒机', '数据库', '办公', '其他'];

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
      orderBy: { sort: 'asc', createdAt: 'desc' },
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