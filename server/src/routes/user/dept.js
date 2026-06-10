import { authenticate } from '../../middlewares/authenticate.js';
import { authorize, authorizeDeptAdmin } from '../../middlewares/authorize.js';
import * as controller from '../../controllers/user.dept.controller.js';
import { withPreHandler } from '../_shared.js';

// 部门管理员或超级管理员才能用
const userAuth = withPreHandler([authenticate, authorizeDeptAdmin()]);
// 任命/撤销部门管理员：仅超级管理员（部门管理员无权任免同级）
const superAdminAuth = withPreHandler([authenticate, authorize('super_admin')]);

export default async function userDeptRoutes(fastify) {
  // 获取"我的部门"信息（dept_admin 看到本部门，super_admin 看到所有部门列表）
  fastify.get(
    '/api/user/dept/info',
    userAuth('User-Dept', '获取我所在的部门信息'),
    controller.getMyDeptInfo,
  );

  // 部门成员名册
  fastify.get(
    '/api/user/dept/members',
    userAuth('User-Dept', '获取本部门成员名册（客户端）'),
    controller.listDeptMembers,
  );

  // 任命本部门用户为部门管理员
  fastify.post(
    '/api/user/dept/appoint',
    superAdminAuth('User-Dept', '任命本部门用户为部门管理员（仅超管）', {
      schema: {
        body: {
          type: 'object',
          required: ['userId'],
          properties: { userId: { type: 'integer', minimum: 1 } },
        },
      },
    }),
    controller.appointDeptAdmin,
  );

  // 撤销部门管理员
  fastify.post(
    '/api/user/dept/revoke/:userId',
    superAdminAuth('User-Dept', '撤销部门管理员（仅超管）', {
      schema: {
        params: {
          type: 'object',
          required: ['userId'],
          properties: { userId: { type: 'integer', minimum: 1 } },
        },
      },
    }),
    controller.revokeDeptAdmin,
  );

  // 查看某用户的已授权服务（用于部门管理员给本部门用户做授权管理）
  fastify.get(
    '/api/user/dept/grants/:userId',
    userAuth('User-Dept', '查看本部门某用户的已授权服务', {
      schema: {
        params: {
          type: 'object',
          required: ['userId'],
          properties: { userId: { type: 'integer', minimum: 1 } },
        },
      },
    }),
    controller.listUserGrants,
  );

  // 更新本部门成员（重置密码 / 启停 / 角色）
  fastify.patch(
    '/api/user/dept/member/:userId',
    userAuth('User-Dept', '更新本部门成员（客户端）', {
      schema: {
        params: {
          type: 'object',
          required: ['userId'],
          properties: { userId: { type: 'integer', minimum: 1 } },
        },
      },
    }),
    controller.updateDeptMember,
  );

  // 代创建服务（自动绑定本部门）
  fastify.post(
    '/api/user/dept/service/create',
    userAuth('User-Dept', '代创建服务（部门内）'),
    controller.createServiceForDept,
  );

  // 部门内可授权服务池
  fastify.get(
    '/api/user/dept/services',
    userAuth('User-Dept', '部门内可授权服务列表'),
    controller.listGrantableServices,
  );

  // 部门内授权：服务 → 本部门用户
  fastify.post(
    '/api/user/dept/service/grant',
    userAuth('User-Dept', '部门内授权服务给本部门用户'),
    controller.grantServiceToDeptMember,
  );

  // 部门内撤销授权
  fastify.post(
    '/api/user/dept/service/revoke',
    userAuth('User-Dept', '部门内撤销本部门用户的服务授权'),
    controller.revokeServiceFromDeptMember,
  );

  // 代创建本部门成员（部门管理员仅可创建 user 角色，自动绑定本部门）
  fastify.post(
    '/api/user/dept/member/create',
    userAuth('User-Dept', '代创建本部门成员（客户端）', {
      schema: {
        body: {
          type: 'object',
          required: ['username', 'password'],
          properties: {
            username: { type: 'string', minLength: 3, maxLength: 32, pattern: '^[a-zA-Z0-9_]+$' },
            password: { type: 'string', minLength: 6, maxLength: 64 },
            role: { type: 'string', enum: ['user', 'dept_admin'], default: 'user' },
          },
        },
      },
    }),
    controller.createDeptMember,
  );
}
