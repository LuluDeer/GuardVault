import { authenticate } from '../../middlewares/authenticate.js';
import { authorize } from '../../middlewares/authorize.js';
import * as userController from '../../controllers/admin.user.controller.js';
import { withPreHandler } from '../_shared.js';

const adminAuth = withPreHandler([authenticate, authorize('super_admin', 'dept_admin')]);

export default async function userRoutes(fastify) {
  fastify.get(
    '/api/admin/user/list',
    adminAuth('Admin-User', '用户列表（分页 + 过滤）', {
      schema: {
        querystring: {
          type: 'object',
          properties: {
            page: { type: 'integer', default: 1 },
            pageSize: { type: 'integer', default: 20, maximum: 200 },
            keyword: { type: 'string' },
            departmentId: { type: 'integer' },
            role: { type: 'string' },
          },
        },
      },
    }),
    userController.listUsers,
  );

  fastify.post(
    '/api/admin/user/create',
    adminAuth('Admin-User', '创建用户', {
      schema: { body: { $ref: 'CreateUserRequest#' } },
    }),
    userController.createUser,
  );

  fastify.put(
    '/api/admin/user/:id',
    adminAuth('Admin-User', '更新用户', {
      schema: {
        params: { $ref: 'IdParam#' },
        body: { $ref: 'UpdateUserRequest#' },
      },
    }),
    userController.updateUser,
  );

  fastify.delete(
    '/api/admin/user/:id',
    adminAuth('Admin-User', '删除用户', {
      schema: { params: { $ref: 'IdParam#' } },
    }),
    userController.deleteUser,
  );
}
