import { verifyToken, extractToken } from '../services/auth.service.js';
import { fail, ErrorCode } from '../utils/response.js';

/**
 * JWT认证中间件
 * 验证请求头中的Bearer Token，将decoded payload注入 request.user
 */
export async function authenticate(request, reply) {
  const token = extractToken(request.headers.authorization);
  if (!token) {
    return fail(reply, ErrorCode.TOKEN_INVALID, 'Token缺失或格式错误', 401);
  }
  try {
    const decoded = await verifyToken(token);
    request.user = decoded;
    // 存储原始token，供登出时使用
    request.token = token;
  } catch (err) {
    const msg = err.message === 'TOKEN_REVOKED' ? 'Token已失效，请重新登录' : 'Token无效或已过期';
    return fail(reply, ErrorCode.TOKEN_INVALID, msg, 401);
  }
}
