import { authenticate } from '../../middlewares/authenticate.js';
import { authorize } from '../../middlewares/authorize.js';
import * as serviceController from '../../controllers/admin.service.controller.js';
import { withPreHandler } from '../_shared.js';

const adminAuth = withPreHandler([authenticate, authorize('super_admin', 'dept_admin')]);

const listQuery = {
  type: 'object',
  properties: {
    page: { type: 'integer', default: 1 },
    pageSize: { type: 'integer', default: 20, maximum: 200 },
    keyword: { type: 'string' },
    category: { type: 'string' },
    departmentId: { type: 'integer' },
  },
};

export default async function serviceRoutes(fastify) {
  // ===== CRUD =====
  fastify.get(
    '/api/admin/service/list',
    adminAuth('Admin-Service', '服务列表（分页 + 过滤）', { schema: { querystring: listQuery } }),
    serviceController.listServices,
  );

  fastify.get(
    '/api/admin/service/:id',
    adminAuth('Admin-Service', '获取单个服务', { schema: { params: { $ref: 'IdParam#' } } }),
    serviceController.getService,
  );

  fastify.get(
    '/api/admin/service/:id/secret',
    adminAuth('Admin-Service', '获取服务的明文 TOTP secret（高危）', { schema: { params: { $ref: 'IdParam#' } } }),
    serviceController.getServiceSecret,
  );

  fastify.post(
    '/api/admin/service/create',
    adminAuth('Admin-Service', '创建服务（手动录入 secret）', { schema: { body: { $ref: 'CreateServiceRequest#' } } }),
    serviceController.createService,
  );

  fastify.put(
    '/api/admin/service/:id',
    adminAuth('Admin-Service', '更新服务', {
      schema: {
        params: { $ref: 'IdParam#' },
        body: { $ref: 'UpdateServiceRequest#' },
      },
    }),
    serviceController.updateService,
  );

  fastify.post(
    '/api/admin/service/:id/reset-secret',
    adminAuth('Admin-Service', '重置服务的 TOTP secret', {
      schema: {
        params: { $ref: 'IdParam#' },
        body: { $ref: 'ResetSecretRequest#' },
      },
    }),
    serviceController.resetSecret,
  );

  fastify.delete(
    '/api/admin/service/:id',
    adminAuth('Admin-Service', '删除服务', { schema: { params: { $ref: 'IdParam#' } } }),
    serviceController.deleteService,
  );

  // ===== 分类管理 =====
  fastify.get(
    '/api/admin/service/categories',
    adminAuth('Admin-Service', '服务分类列表'),
    serviceController.getCategories,
  );

  fastify.post(
    '/api/admin/service/category',
    adminAuth('Admin-Service', '添加服务分类'),
    serviceController.addCategory,
  );

  fastify.delete(
    '/api/admin/service/category',
    adminAuth('Admin-Service', '删除服务分类'),
    serviceController.deleteCategory,
  );

  // ===== 批量 / 扫码录入 =====
  fastify.post(
    '/api/admin/service/batch-import',
    adminAuth('Admin-Service', '批量导入服务', { schema: { body: { $ref: 'BatchImportRequest#' } } }),
    serviceController.batchImport,
  );

  fastify.post(
    '/api/admin/service/scan-create',
    adminAuth('Admin-Service', '扫描 otpauth URI 创建服务', { schema: { body: { $ref: 'ScanOtpauthRequest#' } } }),
    serviceController.createFromOtpauth,
  );
}
