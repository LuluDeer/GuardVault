import { authenticate } from '../../middlewares/authenticate.js';
import { authorize } from '../../middlewares/authorize.js';
import * as totpController from '../../controllers/admin.totp.controller.js';
import * as userController from '../../controllers/admin.user.controller.js';
import { withPreHandler } from '../_shared.js';

const adminAuth = withPreHandler([authenticate, authorize('super_admin', 'dept_admin')]);

const userIdParam = {
  type: 'object',
  properties: { userId: { type: 'integer' } },
  required: ['userId'],
};

export default async function totpRoutes(fastify) {
  fastify.post(
    '/api/admin/totp/enable/:userId',
    adminAuth('Admin-TOTP', '为指定用户开启 TOTP（生成 secret）', { schema: { params: userIdParam } }),
    totpController.enableTotp,
  );

  fastify.post(
    '/api/admin/totp/disable/:userId',
    adminAuth('Admin-TOTP', '关闭指定用户的 TOTP', { schema: { params: userIdParam } }),
    totpController.disableTotp,
  );

  fastify.post(
    '/api/admin/totp/reset/:userId',
    adminAuth('Admin-TOTP', '重置指定用户的 TOTP（保留账号，重新生成 secret）', { schema: { params: userIdParam } }),
    totpController.resetTotp,
  );

  fastify.post(
    '/api/admin/totp/batch-reset',
    adminAuth('Admin-TOTP', '批量重置 TOTP', { schema: { body: { $ref: 'BatchResetTotpRequest#' } } }),
    totpController.batchResetTotp,
  );

  fastify.get(
    '/api/admin/totp/code/:userId',
    adminAuth('Admin-TOTP', '查看指定用户的当前 TOTP 码（代理登录/重置场景）', { schema: { params: userIdParam } }),
    totpController.getUserCode,
  );

  // 高危：管理员查看用户明文 secret 需要二次密码确认，用 POST 携带 body
  fastify.post(
    '/api/admin/totp/secret/:userId',
    adminAuth('Admin-TOTP', '查看指定用户的明文 TOTP secret（高危）', { schema: { params: userIdParam } }),
    totpController.getUserSecret,
  );

  fastify.get(
    '/api/admin/totp/list',
    adminAuth('Admin-TOTP', '已开启 TOTP 的用户列表（复用 user 列表）'),
    userController.listUsers,
  );
}
