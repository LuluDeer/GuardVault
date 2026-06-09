import { authenticate } from '../../middlewares/authenticate.js';
import { authorize } from '../../middlewares/authorize.js';
import * as securityController from '../../controllers/admin.security.controller.js';
import { withPreHandler } from '../_shared.js';

const adminAuth = withPreHandler([authenticate, authorize('super_admin', 'dept_admin')]);

export default async function securityRoutes(fastify) {
  fastify.get(
    '/api/admin/security/blocked-ips',
    adminAuth('Admin-Security', '获取被封禁的 IP 列表', {
      schema: {
        querystring: {
          type: 'object',
          properties: {
            page: { type: 'integer', default: 1 },
            pageSize: { type: 'integer', default: 20 },
          },
        },
      },
    }),
    securityController.getBlockedList,
  );

  fastify.post(
    '/api/admin/security/block-ip',
    adminAuth('Admin-Security', '手动封禁 IP', {
      schema: {
        body: {
          type: 'object',
          required: ['ip'],
          properties: {
            ip: { type: 'string' },
            reason: { type: 'string' },
            durationMinutes: { type: 'integer', default: 30 },
          },
        },
      },
    }),
    securityController.manualBlock,
  );

  fastify.post(
    '/api/admin/security/unblock-ip',
    adminAuth('Admin-Security', '手动解封 IP', {
      schema: {
        body: {
          type: 'object',
          required: ['ip'],
          properties: { ip: { type: 'string' } },
        },
      },
    }),
    securityController.manualUnblock,
  );
}
