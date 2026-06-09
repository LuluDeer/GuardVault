import { ipBlockCheck } from '../../middlewares/ip-block.js';
import * as adminAuthController from '../../controllers/admin.auth.controller.js';
import * as refreshController from '../../controllers/refresh.controller.js';
import { withPreHandler } from '../_shared.js';

const adminAuth = withPreHandler([]);  // 公开端点用

export default async function authRoutes(fastify) {
  // 公开：登录
  fastify.post(
    '/api/admin/login',
    adminAuth('Admin-Auth', '管理员登录', {
      public: true,
      routeOpts: { preHandler: [ipBlockCheck] },
      schema: {
        body: { $ref: 'LoginRequest#' },
        response: { 200: { $ref: 'ApiResponse#' } },
      },
    }),
    adminAuthController.login,
  );

  // 公开：系统初始化
  fastify.post(
    '/api/admin/init',
    adminAuth('Admin-Auth', '系统初始化（创建首个超管）', {
      public: true,
      schema: {
        body: { $ref: 'InitSystemRequest#' },
        response: { 200: { $ref: 'ApiResponse#' } },
      },
    }),
    adminAuthController.initSystem,
  );

  // 公开：刷新 token
  fastify.post(
    '/api/admin/refresh',
    adminAuth('Admin-Auth', '刷新 Token', {
      public: true,
      routeOpts: { preHandler: [ipBlockCheck] },
      schema: {
        body: {
          type: 'object',
          required: ['refreshToken'],
          properties: { refreshToken: { type: 'string' } },
        },
      },
    }),
    refreshController.refresh,
  );
}
