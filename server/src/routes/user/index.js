import { authenticate } from '../../middlewares/authenticate.js';
import { authorize } from '../../middlewares/authorize.js';
import * as userAuthController from '../../controllers/user.auth.controller.js';
import * as userTotpController from '../../controllers/user.totp.controller.js';
import * as userPasswordController from '../../controllers/user.password.controller.js';
import * as userServiceController from '../../controllers/user.service.controller.js';

export default async function userRoutes(fastify) {
  fastify.post('/api/user/login', userAuthController.login);

  const userPreHandler = [authenticate, authorize('user', 'dept_admin', 'super_admin')];

  fastify.post('/api/user/logout', { preHandler: userPreHandler }, userAuthController.logout);
  fastify.get('/api/user/totp/code', { preHandler: userPreHandler }, userTotpController.getMyCode);
  fastify.put('/api/user/password', { preHandler: userPreHandler }, userPasswordController.changePassword);

  fastify.get('/api/user/service/list', { preHandler: userPreHandler }, userServiceController.getMyServices);
  fastify.get('/api/user/service/:id', { preHandler: userPreHandler }, userServiceController.getServiceDetail);
  fastify.get('/api/user/service/:id/code', { preHandler: userPreHandler }, userServiceController.getServiceCode);
  fastify.post('/api/user/service/copy-report', { preHandler: userPreHandler }, userServiceController.reportCopy);
}