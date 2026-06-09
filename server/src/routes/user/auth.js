import { ipBlockCheck } from '../../middlewares/ip-block.js';
import * as userAuthController from '../../controllers/user.auth.controller.js';
import * as userRegisterController from '../../controllers/user.register.controller.js';
import * as resetController from '../../controllers/user.password-reset.controller.js';
import * as refreshController from '../../controllers/refresh.controller.js';
import { withPreHandler } from '../_shared.js';

const userAuth = withPreHandler([]);  // 公开端点用

export default async function authRoutes(fastify) {
  // 公开：登录
  fastify.post(
    '/api/user/login',
    userAuth('User-Auth', '用户登录', {
      public: true,
      routeOpts: { preHandler: [ipBlockCheck] },
      schema: { body: { $ref: 'LoginRequest#' } },
    }),
    userAuthController.login,
  );

  // 公开：注册
  fastify.post(
    '/api/user/register',
    userAuth('User-Auth', '用户自助注册', {
      public: true,
      schema: {
        body: {
          type: 'object',
          required: ['username', 'password'],
          properties: {
            username: { type: 'string', minLength: 4, maxLength: 32, pattern: '^[a-zA-Z0-9_]+$' },
            password: { type: 'string', minLength: 6, maxLength: 128 },
            deptId: { type: 'integer', minimum: 1 },
          },
        },
      },
    }),
    userRegisterController.register,
  );

  // 公开：申请密码重置
  fastify.post(
    '/api/user/password/reset-request',
    userAuth('User-Auth', '请求找回密码', {
      public: true,
      routeOpts: { preHandler: [ipBlockCheck] },
      schema: {
        body: {
          type: 'object',
          required: ['username'],
          properties: { username: { type: 'string', minLength: 1, maxLength: 32 } },
        },
      },
    }),
    resetController.requestReset,
  );

  // 公开：提交新密码
  fastify.post(
    '/api/user/password/reset',
    userAuth('User-Auth', '重置密码', {
      public: true,
      routeOpts: { preHandler: [ipBlockCheck] },
      schema: {
        body: {
          type: 'object',
          required: ['resetToken', 'newPassword'],
          properties: {
            resetToken: { type: 'string' },
            newPassword: { type: 'string', minLength: 8, maxLength: 128 },
          },
        },
      },
    }),
    resetController.resetPassword,
  );

  // 公开：刷新 token
  fastify.post(
    '/api/user/refresh',
    userAuth('User-Auth', '刷新 Token', {
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
