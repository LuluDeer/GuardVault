import { authenticate } from '../../middlewares/authenticate.js';
import { authorize } from '../../middlewares/authorize.js';
import * as auditController from '../../controllers/admin.audit.controller.js';
import { withPreHandler } from '../_shared.js';

const adminAuth = withPreHandler([authenticate, authorize('super_admin', 'dept_admin')]);

const rangeQuery = {
  type: 'object',
  properties: {
    startTime: { type: 'string', format: 'date-time' },
    endTime: { type: 'string', format: 'date-time' },
  },
};

export default async function auditRoutes(fastify) {
  fastify.get(
    '/api/admin/audit/summary',
    adminAuth('Admin-Audit', '审计摘要（今日/本周/本月关键指标）'),
    auditController.getSummary,
  );

  fastify.get(
    '/api/admin/audit/service-views',
    adminAuth('Admin-Audit', '服务维度查看次数统计（TOP）', {
      schema: {
        querystring: {
          type: 'object',
          properties: {
            ...rangeQuery.properties,
            limit: { type: 'integer', default: 20 },
          },
        },
      },
    }),
    auditController.getServiceViewStats,
  );

  fastify.get(
    '/api/admin/audit/user-views',
    adminAuth('Admin-Audit', '用户维度查看次数统计（TOP）', { schema: { querystring: rangeQuery } }),
    auditController.getUserViewStats,
  );

  fastify.get(
    '/api/admin/audit/actions',
    adminAuth('Admin-Audit', '操作类型分布统计', { schema: { querystring: rangeQuery } }),
    auditController.getActionStats,
  );

  fastify.get(
    '/api/admin/audit/daily',
    adminAuth('Admin-Audit', '每日审计量趋势', { schema: { querystring: rangeQuery } }),
    auditController.getDailyStats,
  );
}
