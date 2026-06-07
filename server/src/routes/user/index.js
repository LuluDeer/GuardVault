import { authenticate } from '../../middlewares/authenticate.js';
import { authorize } from '../../middlewares/authorize.js';
import { ipBlockCheck } from '../../middlewares/ip-block.js';
import * as userAuthController from '../../controllers/user.auth.controller.js';
import * as userTotpController from '../../controllers/user.totp.controller.js';
import * as userPasswordController from '../../controllers/user.password.controller.js';
import * as userServiceController from '../../controllers/user.service.controller.js';
import * as userFavoriteController from '../../controllers/user.favorite.controller.js';
import * as refreshController from '../../controllers/admin.refresh.controller.js';
import * as userRegisterController from '../../controllers/user.register.controller.js';
import * as userPasswordResetController from '../../controllers/user.password-reset.controller.js';

/**
 * 帮助函数：组装 Fastify routeOptions（带 OpenAPI schema + security）
 * - tag：OpenAPI 分组
 * - summary：说明
 * - public：是否跳过鉴权（默认 false）
 */
function route(tag, summary, opts = {}) {
  return {
    schema: {
      tags: [tag],
      summary,
      security: opts.public ? [] : [{ bearerAuth: [] }],
      ...opts.schema,
    },
    ...opts.routeOpts,
  };
}

export default async function userRoutes(fastify) {
  fastify.post(
    '/api/user/login',
    route('User-Auth', '终端用户登录', {
      public: true,
      routeOpts: { preHandler: [ipBlockCheck] },
      schema: {
        body: { $ref: 'LoginRequest#' },
        response: { 200: { $ref: 'ApiResponse#' } },
      },
    }),
    userAuthController.login,
  );

  fastify.post(
    '/api/user/register',
    route('User-Auth', '用户注册', {
      public: true,
      schema: {
        body: {
          type: 'object',
          required: ['username', 'password'],
          properties: {
            username: { type: 'string', minLength: 3, maxLength: 32 },
            password: { type: 'string', minLength: 6, maxLength: 128 },
            deptId: { type: 'integer' },
          },
        },
      },
    }),
    userRegisterController.register,
  );

  fastify.post(
    '/api/user/password/reset-request',
    route('User-Auth', '请求找回密码', {
      public: true,
      schema: {
        body: {
          type: 'object',
          required: ['username'],
          properties: { username: { type: 'string', minLength: 1, maxLength: 32 } },
        },
      },
    }),
    userPasswordResetController.requestReset,
  );

  fastify.post(
    '/api/user/password/reset',
    route('User-Auth', '重置密码', {
      public: true,
      schema: {
        body: {
          type: 'object',
          required: ['resetToken', 'newPassword'],
          properties: {
            resetToken: { type: 'string' },
            newPassword: { type: 'string', minLength: 6, maxLength: 128 },
          },
        },
      },
    }),
    userPasswordResetController.resetPassword,
  );

  const userPreHandler = [authenticate, authorize('user', 'dept_admin', 'super_admin')];

  fastify.post(
    '/api/user/logout',
    route('User-Auth', '登出（吊销当前 token）', { preHandler: userPreHandler }),
    userAuthController.logout,
  );

  fastify.get(
    '/api/user/totp/code',
    route('User-TOTP', '获取我自己的当前 TOTP 码', { preHandler: userPreHandler }),
    userTotpController.getMyCode,
  );

  fastify.post(
    '/api/user/totp/verify',
    route('User-TOTP', '验证 TOTP 动态码', {
      preHandler: userPreHandler,
      schema: {
        body: {
          type: 'object',
          required: ['code'],
          properties: { code: { type: 'string', minLength: 6, maxLength: 6 } },
        },
      },
    }),
    userTotpController.verifyTotp,
  );

  fastify.put(
    '/api/user/password',
    route('User-Auth', '修改我自己的密码', {
      preHandler: userPreHandler,
      schema: { body: { $ref: 'ChangePasswordRequest#' } },
    }),
    userPasswordController.changePassword,
  );

  // ===== Service =====
  fastify.get(
    '/api/user/service/list',
    route('User-Service', '我能访问的服务列表（分页 + 过滤）', {
      preHandler: userPreHandler,
      schema: {
        querystring: {
          type: 'object',
          properties: {
            page: { type: 'integer', default: 1 },
            pageSize: { type: 'integer', default: 50, maximum: 200 },
            keyword: { type: 'string' },
            category: { type: 'string' },
          },
        },
      },
    }),
    userServiceController.getMyServices,
  );

  fastify.get(
    '/api/user/service/:id',
    route('User-Service', '获取我能访问的某个服务详情', {
      preHandler: userPreHandler,
      schema: { params: { $ref: 'IdParam#' } },
    }),
    userServiceController.getServiceDetail,
  );

  fastify.get(
    '/api/user/service/:id/code',
    route('User-Service', '获取某服务的当前 TOTP 码（受授权校验）', {
      preHandler: userPreHandler,
      schema: { params: { $ref: 'IdParam#' } },
    }),
    userServiceController.getServiceCode,
  );

  fastify.post(
    '/api/user/service/copy-report',
    route('User-Service', '上报 TOTP 码被复制（用于审计）', {
      preHandler: userPreHandler,
      schema: { body: { $ref: 'CopyReportRequest#' } },
    }),
    userServiceController.reportCopy,
  );

  // ===== Favorite =====
  fastify.get(
    '/api/user/favorite/list',
    route('User-Favorite', '我的收藏列表（按 sortOrder 升序）', { preHandler: userPreHandler }),
    userFavoriteController.list,
  );

  fastify.post(
    '/api/user/favorite/add',
    route('User-Favorite', '添加收藏', {
      preHandler: userPreHandler,
      schema: { body: { $ref: 'AddFavoriteRequest#' } },
    }),
    userFavoriteController.add,
  );

  fastify.post(
    '/api/user/favorite/remove',
    route('User-Favorite', '取消收藏', {
      preHandler: userPreHandler,
      schema: { body: { $ref: 'RemoveFavoriteRequest#' } },
    }),
    userFavoriteController.remove,
  );

  fastify.post(
    '/api/user/favorite/reorder',
    route('User-Favorite', '重新排序收藏（按传入顺序生成 sortOrder）', {
      preHandler: userPreHandler,
      schema: { body: { $ref: 'ReorderFavoriteRequest#' } },
    }),
    userFavoriteController.reorder,
  );

  fastify.post(
    '/api/user/refresh',
    route('User-Auth', '刷新 Token', {
      public: true,
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
