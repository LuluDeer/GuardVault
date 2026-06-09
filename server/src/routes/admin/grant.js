import { authenticate } from '../../middlewares/authenticate.js';
import { authorize } from '../../middlewares/authorize.js';
import * as grantController from '../../controllers/admin.grant.controller.js';
import { withPreHandler } from '../_shared.js';

const adminAuth = withPreHandler([authenticate, authorize('super_admin', 'dept_admin')]);

export default async function grantRoutes(fastify) {
  fastify.get(
    '/api/admin/grant/list',
    adminAuth('Admin-Grant', '授权列表（分页）', {
      schema: {
        querystring: {
          type: 'object',
          properties: {
            page: { type: 'integer', default: 1 },
            pageSize: { type: 'integer', default: 20 },
            userId: { type: 'integer' },
            accountId: { type: 'integer' },
          },
        },
      },
    }),
    grantController.listGrants,
  );

  fastify.get(
    '/api/admin/grant/check',
    adminAuth('Admin-Grant', '查询某用户对某服务的授权', {
      schema: {
        querystring: {
          type: 'object',
          required: ['userId', 'accountId'],
          properties: {
            userId: { type: 'integer' },
            accountId: { type: 'integer' },
          },
        },
      },
    }),
    grantController.getGrant,
  );

  fastify.post(
    '/api/admin/grant/grant',
    adminAuth('Admin-Grant', '授予单个用户对单个服务的访问权', { schema: { body: { $ref: 'GrantRequest#' } } }),
    grantController.grantAccess,
  );

  fastify.post(
    '/api/admin/grant/revoke',
    adminAuth('Admin-Grant', '撤销单个用户对单个服务的访问权', { schema: { body: { $ref: 'RevokeRequest#' } } }),
    grantController.revokeAccess,
  );

  fastify.post(
    '/api/admin/grant/batch-grant',
    adminAuth('Admin-Grant', '批量授权（多用户 -> 单服务）', { schema: { body: { $ref: 'BatchGrantRequest#' } } }),
    grantController.batchGrant,
  );

  fastify.post(
    '/api/admin/grant/batch-revoke',
    adminAuth('Admin-Grant', '批量撤销（多用户 <- 单服务）', { schema: { body: { $ref: 'BatchRevokeRequest#' } } }),
    grantController.batchRevoke,
  );

  fastify.post(
    '/api/admin/grant/batch-grant-by-dept',
    adminAuth('Admin-Grant', '按部门批量授权（多部门 -> 单服务）', {
      schema: {
        body: {
          type: 'object',
          required: ['deptIds', 'accountId'],
          properties: {
            deptIds: { type: 'array', items: { type: 'integer' }, minItems: 1 },
            accountId: { type: 'integer' },
            remark: { type: 'string', maxLength: 256 },
          },
        },
      },
    }),
    grantController.batchGrantByDept,
  );

  fastify.post(
    '/api/admin/grant/batch-revoke-by-dept',
    adminAuth('Admin-Grant', '按部门批量撤销（多部门 <- 单服务）', {
      schema: {
        body: {
          type: 'object',
          required: ['deptIds', 'accountId'],
          properties: {
            deptIds: { type: 'array', items: { type: 'integer' }, minItems: 1 },
            accountId: { type: 'integer' },
          },
        },
      },
    }),
    grantController.batchRevokeByDept,
  );
}
