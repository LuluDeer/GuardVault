import { fail, ErrorCode } from '../utils/response.js';

/**
 * 角色权限中间件工厂
 * @param {...string} roles - 允许的角色列表
 * @returns {Function} Fastify preHandler
 */
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
