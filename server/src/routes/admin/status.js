import { authenticate } from '../../middlewares/authenticate.js';
import { authorize } from '../../middlewares/authorize.js';
import * as statusController from '../../controllers/admin.status.controller.js';
import { withPreHandler } from '../_shared.js';

const adminAuth = withPreHandler([authenticate, authorize('super_admin', 'dept_admin')]);

export default async function statusRoutes(fastify) {
  fastify.get(
    '/api/admin/status',
    adminAuth('Admin-Audit', '安全状态仪表盘'),
    statusController.getSecurityStatus,
  );
}
