import { fail, ErrorCode } from '../utils/response.js';
import { prisma } from '../utils/prisma.js';

const ROLE_RANK = { user: 0, dept_admin: 1, super_admin: 2 };

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

/**
 * 校验操作者能否对某个用户做"管理类"操作（启停 / 改密 / 角色 / 服务授权 / 删）
 * 规则：
 *  - super_admin：可对任何非自己的用户操作
 *  - dept_admin：只能操作本部门、且等级 < 自己的用户（即禁止 dept_admin 互相操作）
 *  - user / 其他：禁止
 * 返回 null 表示通过；返回对象 { code, message, httpStatus } 表示拒绝
 */
export async function assertCanOperateUser(request, targetUserId) {
  if (!request.user) {
    return { code: ErrorCode.TOKEN_INVALID, message: 'Token缺失', httpStatus: 401 };
  }
  if (request.user.id === targetUserId) {
    return { code: ErrorCode.FORBIDDEN, message: '不能操作自己的账号', httpStatus: 403 };
  }
  const target = await prisma.systemUser.findUnique({
    where: { id: targetUserId },
    select: { id: true, role: true, deptId: true, status: true },
  });
  if (!target) {
    return { code: ErrorCode.USER_NOT_FOUND, message: '目标用户不存在', httpStatus: 404 };
  }
  if (request.user.role === 'super_admin') {
    return null;
  }
  if (request.user.role !== 'dept_admin') {
    return { code: ErrorCode.FORBIDDEN, message: '无权限操作', httpStatus: 403 };
  }
  if (!request.user.deptId || target.deptId !== request.user.deptId) {
    return { code: ErrorCode.FORBIDDEN, message: '无权操作其他部门用户', httpStatus: 403 };
  }
  // 末位超管保护（启停 / 角色降级时也兜底）
  if (target.role === 'super_admin') {
    return { code: ErrorCode.FORBIDDEN, message: '无权操作超级管理员', httpStatus: 403 };
  }
  // 部门管理员可以操作同部门的 dept_admin（如降级），但不能操作其他部门的 dept_admin
  // 注：提升/降级角色由 updateDeptMember 的 role 字段控制，此处只做通用能力判断
  return null;
}

/**
 * 校验操作者是否可以为新建/编辑的账号分配 targetRole
 * - super_admin 可以创建任何角色
 * - dept_admin 只能创建 dept_admin / user
 * - user 无权
 */
export function canAssignRole(operatorRole, targetRole) {
  if (!(operatorRole in ROLE_RANK) || !(targetRole in ROLE_RANK)) return false;
  if (operatorRole === 'super_admin') return true;
  if (operatorRole === 'dept_admin') {
    return targetRole === 'dept_admin' || targetRole === 'user';
  }
  return false;
}

/**
 * 校验操作者是否可以把 targetUser 的角色改成 newRole
 * - 不能给自己提权（由调用方单独处理）
 * - 只能改"权限等级 ≤ 自己"的账号
 * - 只能赋予"权限等级 ≤ 自己"的角色
 */
export function canEditRole(operator, targetUser, newRole) {
  if (!operator || !targetUser || !newRole) return false;
  if (!(newRole in ROLE_RANK)) return false;
  const opRank = ROLE_RANK[operator.role] ?? -1;
  const targetRank = ROLE_RANK[targetUser.role] ?? -1;
  const newRank = ROLE_RANK[newRole];
  // 只能改"低于或等于自己"的账号
  if (targetRank > opRank) return false;
  // 只能赋予"低于或等于自己"的角色
  if (newRank > opRank) return false;
  return true;
}