import { authenticate } from '../../middlewares/authenticate.js';
import { authorize } from '../../middlewares/authorize.js';
import * as adminAuthController from '../../controllers/admin.auth.controller.js';
import * as userController from '../../controllers/admin.user.controller.js';
import * as totpController from '../../controllers/admin.totp.controller.js';
import * as logController from '../../controllers/admin.log.controller.js';
import * as configController from '../../controllers/admin.config.controller.js';
import * as deptController from '../../controllers/admin.department.controller.js';
import * as serviceController from '../../controllers/admin.service.controller.js';
import * as grantController from '../../controllers/admin.grant.controller.js';
import * as auditController from '../../controllers/admin.audit.controller.js';

export default async function adminRoutes(fastify) {
  fastify.post('/api/admin/login', adminAuthController.login);
  fastify.post('/api/admin/init', adminAuthController.initSystem);

  const adminPreHandler = [authenticate, authorize('super_admin', 'dept_admin')];

  fastify.post('/api/admin/logout', { preHandler: adminPreHandler }, adminAuthController.logout);
  fastify.put('/api/admin/password', { preHandler: adminPreHandler }, adminAuthController.changePassword);

  fastify.get('/api/admin/user/list', { preHandler: adminPreHandler }, userController.listUsers);
  fastify.post('/api/admin/user/create', { preHandler: adminPreHandler }, userController.createUser);
  fastify.put('/api/admin/user/:id', { preHandler: adminPreHandler }, userController.updateUser);
  fastify.delete('/api/admin/user/:id', { preHandler: adminPreHandler }, userController.deleteUser);

  fastify.post('/api/admin/totp/enable/:userId', { preHandler: adminPreHandler }, totpController.enableTotp);
  fastify.post('/api/admin/totp/disable/:userId', { preHandler: adminPreHandler }, totpController.disableTotp);
  fastify.post('/api/admin/totp/reset/:userId', { preHandler: adminPreHandler }, totpController.resetTotp);
  fastify.post('/api/admin/totp/batch-reset', { preHandler: adminPreHandler }, totpController.batchResetTotp);
  fastify.get('/api/admin/totp/code/:userId', { preHandler: adminPreHandler }, totpController.getUserCode);
  fastify.get('/api/admin/totp/secret/:userId', { preHandler: adminPreHandler }, totpController.getUserSecret);
  fastify.get('/api/admin/totp/list', { preHandler: adminPreHandler }, userController.listUsers);

  fastify.get('/api/admin/log/list', { preHandler: adminPreHandler }, logController.queryLogs);
  fastify.get('/api/admin/log/export', { preHandler: adminPreHandler }, logController.exportLogsHandler);

  fastify.get('/api/admin/config', { preHandler: adminPreHandler }, configController.getConfig);
  fastify.post('/api/admin/config', { preHandler: adminPreHandler }, configController.setConfig);

  fastify.get('/api/admin/dept/list', { preHandler: adminPreHandler }, deptController.listDepartments);
  fastify.get('/api/admin/dept/all', { preHandler: adminPreHandler }, deptController.getAllDepartments);
  fastify.get('/api/admin/dept/:id', { preHandler: adminPreHandler }, deptController.getDepartment);
  fastify.post('/api/admin/dept/create', { preHandler: adminPreHandler }, deptController.createDepartment);
  fastify.put('/api/admin/dept/:id', { preHandler: adminPreHandler }, deptController.updateDepartment);
  fastify.delete('/api/admin/dept/:id', { preHandler: adminPreHandler }, deptController.deleteDepartment);

  fastify.get('/api/admin/service/list', { preHandler: adminPreHandler }, serviceController.listServices);
  fastify.get('/api/admin/service/:id', { preHandler: adminPreHandler }, serviceController.getService);
  fastify.get('/api/admin/service/:id/secret', { preHandler: adminPreHandler }, serviceController.getServiceSecret);
  fastify.post('/api/admin/service/create', { preHandler: adminPreHandler }, serviceController.createService);
  fastify.put('/api/admin/service/:id', { preHandler: adminPreHandler }, serviceController.updateService);
  fastify.post('/api/admin/service/:id/reset-secret', { preHandler: adminPreHandler }, serviceController.resetSecret);
  fastify.delete('/api/admin/service/:id', { preHandler: adminPreHandler }, serviceController.deleteService);
  fastify.get('/api/admin/service/categories', { preHandler: adminPreHandler }, serviceController.getCategories);
  fastify.post('/api/admin/service/batch-import', { preHandler: adminPreHandler }, serviceController.batchImport);
  fastify.post('/api/admin/service/scan-create', { preHandler: adminPreHandler }, serviceController.createFromOtpauth);

  fastify.get('/api/admin/grant/list', { preHandler: adminPreHandler }, grantController.listGrants);
  fastify.get('/api/admin/grant/check', { preHandler: adminPreHandler }, grantController.getGrant);
  fastify.post('/api/admin/grant/grant', { preHandler: adminPreHandler }, grantController.grantAccess);
  fastify.post('/api/admin/grant/revoke', { preHandler: adminPreHandler }, grantController.revokeAccess);
  fastify.post('/api/admin/grant/batch-grant', { preHandler: adminPreHandler }, grantController.batchGrant);
  fastify.post('/api/admin/grant/batch-revoke', { preHandler: adminPreHandler }, grantController.batchRevoke);

  fastify.get('/api/admin/audit/summary', { preHandler: adminPreHandler }, auditController.getSummary);
  fastify.get('/api/admin/audit/service-views', { preHandler: adminPreHandler }, auditController.getServiceViewStats);
  fastify.get('/api/admin/audit/user-views', { preHandler: adminPreHandler }, auditController.getUserViewStats);
  fastify.get('/api/admin/audit/actions', { preHandler: adminPreHandler }, auditController.getActionStats);
  fastify.get('/api/admin/audit/daily', { preHandler: adminPreHandler }, auditController.getDailyStats);
}