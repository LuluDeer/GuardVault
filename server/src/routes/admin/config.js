import { authenticate } from '../../middlewares/authenticate.js';
import { authorize } from '../../middlewares/authorize.js';
import * as configController from '../../controllers/admin.config.controller.js';
import { withPreHandler } from '../_shared.js';

const adminAuth = withPreHandler([authenticate, authorize('super_admin', 'dept_admin')]);

export default async function configRoutes(fastify) {
  fastify.get(
    '/api/admin/config',
    adminAuth('Admin-Config', '获取系统配置（按 key 过滤）', {
      schema: {
        querystring: {
          type: 'object',
          properties: { key: { type: 'string' } },
        },
      },
    }),
    configController.getConfig,
  );

  fastify.post(
    '/api/admin/config',
    adminAuth('Admin-Config', '写入/更新系统配置', {
      schema: { body: { $ref: 'SetConfigRequest#' } },
    }),
    configController.setConfig,
  );
}
