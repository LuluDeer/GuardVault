import { fail, ErrorCode } from '../utils/response.js';
import { prisma } from '../utils/prisma.js';

export function authorize(...roles) {
  return async function (request, reply) {
    if (!request.user) {
      return fail(reply, ErrorCode.TOKEN_INVALID, 'Token缺失', 401);
    }
    if (!roles.includes(request.user.role)) {
      return fail(reply, ErrorCode.FORBIDDEN, '无权限访问', 403);
    }
  };
}

export function authorizeDeptAdmin() {
  return async function (request, reply) {
    if (!request.user) {
      return fail(reply, ErrorCode.TOKEN_INVALID, 'Token缺失', 401);
    }
    if (request.user.role === 'super_admin') {
      return;
    }
    if (request.user.role === 'dept_admin') {
      if (!request.user.deptId) {
        return fail(reply, ErrorCode.FORBIDDEN, '部门管理员未配置部门', 403);
      }
      return;
    }
    return fail(reply, ErrorCode.FORBIDDEN, '无权限访问', 403);
  };
}

export async function checkDeptAccess(request, targetDeptId) {
  if (request.user.role === 'super_admin') {
    return true;
  }
  if (request.user.role === 'dept_admin') {
    if (!request.user.deptId) {
      return false;
    }
    return request.user.deptId === targetDeptId;
  }
  return false;
}

export async function checkUserDeptAccess(request, userId) {
  if (request.user.role === 'super_admin') {
    return true;
  }
  if (request.user.role !== 'dept_admin' || !request.user.deptId) {
    return false;
  }
  const user = await prisma.systemUser.findUnique({
    where: { id: userId },
    select: { deptId: true },
  });
  return user?.deptId === request.user.deptId;
}

export async function checkServiceDeptAccess(request, serviceId) {
  if (request.user.role === 'super_admin') {
    return true;
  }
  if (request.user.role !== 'dept_admin' || !request.user.deptId) {
    return false;
  }
  const service = await prisma.serviceAccount.findUnique({
    where: { id: serviceId },
    select: { deptId: true },
  });
  // 部门管理员可以访问：1) 同部门的服务 2) 共享服务（deptId 为空）
  return service?.deptId === request.user.deptId || service?.deptId === null;
}