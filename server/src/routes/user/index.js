import { authenticate } from '../../middlewares/authenticate.js';
import { authorize } from '../../middlewares/authorize.js';
import * as userAuthController from '../../controllers/user.auth.controller.js';
import * as userTotpController from '../../controllers/user.totp.controller.js';
import * as userPasswordController from '../../controllers/user.password.controller.js';

export default async function userRoutes(fastify) {
  // 公开接口
  fastify.post('/api/user/login', userAuthController.login);

  // 需要认证+普通用户角色
  const userPreHandler = [authenticate, authorize('user')];

  fastify.post('/api/user/logout', { preHandler: userPreHandler }, userAuthController.logout);
  fastify.get('/api/user/totp/code', { preHandler: userPreHandler }, userTotpController.getMyCode);
  fastify.put('/api/user/password', { preHandler: userPreHandler }, userPasswordController.changePassword);
}
