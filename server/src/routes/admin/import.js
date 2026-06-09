import { authenticate } from '../../middlewares/authenticate.js';
import { authorize } from '../../middlewares/authorize.js';
import * as importController from '../../controllers/admin.import.controller.js';
import { withPreHandler } from '../_shared.js';

const adminAuth = withPreHandler([authenticate, authorize('super_admin', 'dept_admin')]);

const urlBody = {
  type: 'object',
  required: ['url'],
  properties: { url: { type: 'string' } },
};

export default async function importRoutes(fastify) {
  fastify.post(
    '/api/admin/import/parse-migration',
    adminAuth('Admin-Import', '解析谷歌OTP迁移URL（otpauth-migration://）', { schema: { body: urlBody } }),
    importController.parseMigrationUrl,
  );

  fastify.post(
    '/api/admin/import/parse-url',
    adminAuth('Admin-Import', '解析单个otpauth URL', { schema: { body: urlBody } }),
    importController.parseOtpauthUrl,
  );

  fastify.post(
    '/api/admin/import/preview',
    adminAuth('Admin-Import', '预览待导入的服务列表', {
      schema: {
        body: {
          type: 'object',
          required: ['items'],
          properties: {
            items: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  name: { type: 'string' },
                  issuer: { type: 'string' },
                  secret: { type: 'string' },
                  type: { type: 'string' },
                  digits: { type: 'integer' },
                  algorithm: { type: 'string' },
                },
              },
            },
          },
        },
      },
    }),
    importController.previewImport,
  );

  fastify.post(
    '/api/admin/import/confirm',
    adminAuth('Admin-Import', '确认导入服务', {
      schema: {
        body: {
          type: 'object',
          required: ['items', 'deptId'],
          properties: {
            items: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  selected: { type: 'boolean' },
                  name: { type: 'string' },
                  issuer: { type: 'string' },
                  secret: { type: 'string' },
                  category: { type: 'string' },
                  digits: { type: 'integer' },
                  algorithm: { type: 'string' },
                },
              },
            },
            deptId: { type: 'integer' },
          },
        },
      },
    }),
    importController.confirmImport,
  );
}
