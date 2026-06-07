import { fail, ErrorCode } from '../utils/response.js';

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