import { authenticate } from '../../middlewares/authenticate.js';
import { authorize } from '../../middlewares/authorize.js';
import * as serviceController from '../../controllers/user.service.controller.js';
import { withPreHandler } from '../_shared.js';

const userAuth = withPreHandler([authenticate, authorize('user', 'dept_admin', 'super_admin')]);

export default async function serviceRoutes(fastify) {
  fastify.get(
    '/api/user/service/list',
    userAuth('User-Service', '我能访问的服务列表（分页 + 过滤）', {
      schema: {
        querystring: {
          type: 'object',
          properties: {
            page: { type: 'integer', default: 1 },
            pageSize: { type: 'integer', default: 50, maximum: 200 },
            keyword: { type: 'string' },
            category: { type: 'string' },
          },
        },
      },
    }),
    serviceController.getMyServices,
  );

  fastify.get(
    '/api/user/service/:id',
    userAuth('User-Service', '获取我能访问的某个服务详情', {
      schema: { params: { $ref: 'IdParam#' } },
    }),
    serviceController.getServiceDetail,
  );

  fastify.get(
    '/api/user/service/:id/code',
    userAuth('User-Service', '获取某服务的当前 TOTP 码（受授权校验）', {
      schema: { params: { $ref: 'IdParam#' } },
    }),
    serviceController.getServiceCode,
  );

  fastify.post(
    '/api/user/service/copy-report',
    userAuth('User-Service', '上报 TOTP 码被复制（用于审计）', {
      schema: { body: { $ref: 'CopyReportRequest#' } },
    }),
    serviceController.reportCopy,
  );
}
