import { authenticate } from '../../middlewares/authenticate.js';
import { authorize } from '../../middlewares/authorize.js';
import * as adminAuthController from '../../controllers/admin.auth.controller.js';
import * as userController from '../../controllers/admin.user.controller.js';
import * as totpController from '../../controllers/admin.totp.controller.js';
import * as logController from '../../controllers/admin.log.controller.js';
import * as configController from '../../controllers/admin.config.controller.js';

export default async function adminRoutes(fastify) {
  // 公开接口（无需认证）
  fastify.post('/api/admin/login', adminAuthController.login);

  // 需要认证+管理员角色的接口
  const adminPreHandler = [authenticate, authorize('admin')];

  fastify.post('/api/admin/logout', { preHandler: adminPreHandler }, adminAuthController.logout);

  // 用户管理
  fastify.get('/api/admin/user/list', { preHandler: adminPreHandler }, userController.listUsers);
  fastify.post('/api/admin/user/create', { preHandler: adminPreHandler }, userController.createUser);
  fastify.put('/api/admin/user/:id', { preHandler: adminPreHandler }, userController.updateUser);
  fastify.delete('/api/admin/user/:id', { preHandler: adminPreHandler }, userController.deleteUser);

  // TOTP管理
  fastify.post('/api/admin/totp/enable/:userId', { preHandler: adminPreHandler }, totpController.enableTotp);
  fastify.post('/api/admin/totp/disable/:userId', { preHandler: adminPreHandler }, totpController.disableTotp);
  fastify.post('/api/admin/totp/reset/:userId', { preHandler: adminPreHandler }, totpController.resetTotp);
  fastify.post('/api/admin/totp/batch-reset', { preHandler: adminPreHandler }, totpController.batchResetTotp);
  fastify.get('/api/admin/totp/code/:userId', { preHandler: adminPreHandler }, totpController.getUserCode);

  // TOTP用户列表（复用用户列表接口）
  fastify.get('/api/admin/totp/list', { preHandler: adminPreHandler }, userController.listUsers);

  // 日志
  fastify.get('/api/admin/log/list', { preHandler: adminPreHandler }, logController.queryLogs);

  // 系统配置
  fastify.get('/api/admin/config', { preHandler: adminPreHandler }, configController.getConfig);
  fastify.post('/api/admin/config', { preHandler: adminPreHandler }, configController.setConfig);

  // 系统初始化
  fastify.post('/api/admin/init', adminAuthController.initSystem);
}
