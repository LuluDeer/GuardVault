import { authenticate } from '../../middlewares/authenticate.js';
import { authorize } from '../../middlewares/authorize.js';
import * as totpController from '../../controllers/user.totp.controller.js';
import { withPreHandler } from '../_shared.js';

const userAuth = withPreHandler([authenticate, authorize('user', 'dept_admin', 'super_admin')]);

export default async function totpRoutes(fastify) {
  fastify.get(
    '/api/user/totp/code',
    userAuth('User-TOTP', '获取我自己的当前 TOTP 码'),
    totpController.getMyCode,
  );

  fastify.post(
    '/api/user/totp/verify',
    userAuth('User-TOTP', '验证 TOTP 动态码', {
      schema: {
        body: {
          type: 'object',
          required: ['code'],
          properties: { code: { type: 'string', minLength: 6, maxLength: 6 } },
        },
      },
    }),
    totpController.verifyTotp,
  );

  // 注：原实现是 GET，但 controller 内部用 request.body 校验密码——保留原行为以避免静默改 API
  fastify.get(
    '/api/user/totp/secret',
    userAuth('User-TOTP', '查看自己的 TOTP 密钥（用于重新绑定）'),
    totpController.getMySecret,
  );
}
