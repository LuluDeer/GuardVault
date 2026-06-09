import { authenticate } from '../../middlewares/authenticate.js';
import { authorize } from '../../middlewares/authorize.js';
import * as logController from '../../controllers/admin.log.controller.js';
import { withPreHandler } from '../_shared.js';

const adminAuth = withPreHandler([authenticate, authorize('super_admin', 'dept_admin')]);

export default async function logRoutes(fastify) {
  fastify.get(
    '/api/admin/log/list',
    adminAuth('Admin-Log', '审计日志查询（分页 + 过滤）', {
      schema: { querystring: { $ref: 'LogQuery#' } },
    }),
    logController.queryLogs,
  );

  fastify.get(
    '/api/admin/log/export',
    adminAuth('Admin-Log', '导出审计日志（CSV 流式下载）', {
      schema: { querystring: { $ref: 'LogQuery#' } },
    }),
    logController.exportLogsHandler,
  );

  fastify.post(
    '/api/admin/log/cleanup',
    adminAuth('Admin-Log', '手动触发日志清理', {
      schema: {
        body: {
          type: 'object',
          properties: { retentionDays: { type: 'integer', minimum: 1, maximum: 3650 } },
        },
      },
    }),
    logController.cleanupHandler,
  );
}
