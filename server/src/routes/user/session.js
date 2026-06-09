import { authenticate } from '../../middlewares/authenticate.js';
import { authorize } from '../../middlewares/authorize.js';
import * as userAuthController from '../../controllers/user.auth.controller.js';
import * as userPasswordController from '../../controllers/user.password.controller.js';
import { withPreHandler } from '../_shared.js';

const userAuth = withPreHandler([authenticate, authorize('user', 'dept_admin', 'super_admin')]);

export default async function sessionRoutes(fastify) {
  fastify.post(
    '/api/user/logout',
    userAuth('User-Auth', '用户登出（吊销当前 token）'),
    userAuthController.logout,
  );

  fastify.put(
    '/api/user/password',
    userAuth('User-Auth', '用户修改自己的密码', { schema: { body: { $ref: 'ChangePasswordRequest#' } } }),
    userPasswordController.changePassword,
  );
}
