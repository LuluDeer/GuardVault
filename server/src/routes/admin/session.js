import { authenticate } from '../../middlewares/authenticate.js';
import { authorize } from '../../middlewares/authorize.js';
import * as adminAuthController from '../../controllers/admin.auth.controller.js';
import { withPreHandler } from '../_shared.js';

const adminAuth = withPreHandler([authenticate, authorize('super_admin', 'dept_admin')]);

export default async function sessionRoutes(fastify) {
  fastify.post(
    '/api/admin/logout',
    adminAuth('Admin-Auth', '管理员登出（吊销当前 token）'),
    adminAuthController.logout,
  );

  fastify.put(
    '/api/admin/password',
    adminAuth('Admin-Auth', '管理员修改自己的密码', {
      schema: { body: { $ref: 'ChangePasswordRequest#' } },
    }),
    adminAuthController.changePassword,
  );
}
