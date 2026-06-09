import { authenticate } from '../../middlewares/authenticate.js';
import { authorize } from '../../middlewares/authorize.js';
import * as deptController from '../../controllers/admin.department.controller.js';
import { withPreHandler } from '../_shared.js';

const adminAuth = withPreHandler([authenticate, authorize('super_admin', 'dept_admin')]);

export default async function deptRoutes(fastify) {
  fastify.get(
    '/api/admin/dept/list',
    adminAuth('Admin-Department', '部门列表（树形）'),
    deptController.listDepartments,
  );

  fastify.get(
    '/api/admin/dept/all',
    adminAuth('Admin-Department', '所有部门（扁平）'),
    deptController.getAllDepartments,
  );

  fastify.get(
    '/api/admin/dept/:id',
    adminAuth('Admin-Department', '获取单个部门', {
      schema: { params: { $ref: 'IdParam#' } },
    }),
    deptController.getDepartment,
  );

  fastify.post(
    '/api/admin/dept/create',
    adminAuth('Admin-Department', '创建部门', {
      schema: { body: { $ref: 'CreateDepartmentRequest#' } },
    }),
    deptController.createDepartment,
  );

  fastify.put(
    '/api/admin/dept/:id',
    adminAuth('Admin-Department', '更新部门', {
      schema: {
        params: { $ref: 'IdParam#' },
        body: { $ref: 'UpdateDepartmentRequest#' },
      },
    }),
    deptController.updateDepartment,
  );

  fastify.delete(
    '/api/admin/dept/:id',
    adminAuth('Admin-Department', '删除部门', {
      schema: { params: { $ref: 'IdParam#' } },
    }),
    deptController.deleteDepartment,
  );

  // ============ 部门成员 ============
  fastify.get(
    '/api/admin/dept/:id/members',
    adminAuth('Admin-Department', '部门成员列表', {
      schema: {
        params: {
          type: 'object',
          required: ['id'],
          properties: { id: { type: 'integer' } },
        },
        querystring: {
          type: 'object',
          properties: { role: { type: 'string' } },
        },
      },
    }),
    deptController.listDeptMembers,
  );

  fastify.post(
    '/api/admin/dept/:id/members',
    adminAuth('Admin-Department', '添加部门成员', {
      schema: {
        params: {
          type: 'object',
          required: ['id'],
          properties: { id: { type: 'integer' } },
        },
        body: {
          type: 'object',
          required: ['userIds'],
          properties: {
            userIds: { type: 'array', items: { type: 'integer' }, minItems: 1, maxItems: 500 },
          },
        },
      },
    }),
    deptController.addDeptMembers,
  );

  fastify.delete(
    '/api/admin/dept/:id/members/:userId',
    adminAuth('Admin-Department', '移除部门成员', {
      schema: {
        params: {
          type: 'object',
          required: ['id', 'userId'],
          properties: {
            id: { type: 'integer' },
            userId: { type: 'integer' },
          },
        },
      },
    }),
    deptController.removeDeptMember,
  );

  // ============ 部门管理员 ============
  fastify.post(
    '/api/admin/dept/:id/admins',
    adminAuth('Admin-Department', '任命部门管理员', {
      schema: {
        params: {
          type: 'object',
          required: ['id'],
          properties: { id: { type: 'integer' } },
        },
        body: {
          type: 'object',
          required: ['userId'],
          properties: { userId: { type: 'integer' } },
        },
      },
    }),
    deptController.appointDeptAdmin,
  );

  fastify.delete(
    '/api/admin/dept/:id/admins/:userId',
    adminAuth('Admin-Department', '撤销部门管理员', {
      schema: {
        params: {
          type: 'object',
          required: ['id', 'userId'],
          properties: {
            id: { type: 'integer' },
            userId: { type: 'integer' },
          },
        },
      },
    }),
    deptController.revokeDeptAdmin,
  );
}
