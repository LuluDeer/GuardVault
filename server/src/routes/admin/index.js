import { authenticate } from '../../middlewares/authenticate.js';
import { authorize } from '../../middlewares/authorize.js';
import { ipBlockCheck } from '../../middlewares/ip-block.js';
import * as adminAuthController from '../../controllers/admin.auth.controller.js';
import * as userController from '../../controllers/admin.user.controller.js';
import * as totpController from '../../controllers/admin.totp.controller.js';
import * as logController from '../../controllers/admin.log.controller.js';
import * as configController from '../../controllers/admin.config.controller.js';
import * as deptController from '../../controllers/admin.department.controller.js';
import * as serviceController from '../../controllers/admin.service.controller.js';
import * as grantController from '../../controllers/admin.grant.controller.js';
import * as auditController from '../../controllers/admin.audit.controller.js';
import * as securityController from '../../controllers/admin.security.controller.js';
import * as refreshController from '../../controllers/admin.refresh.controller.js';
import * as statusController from '../../controllers/admin.status.controller.js';
import * as importController from '../../controllers/admin.import.controller.js';

/**
 * 帮助函数：组装标准的 Fastify routeOptions（带 OpenAPI schema + security）
 * - tag：归属哪个 OpenAPI 分组
 * - summary/description：简要说明
 * - body/params/querystring：请求 schema（Fastify 用作运行时校验 + OpenAPI 文档）
 * - response：响应 schema（HTTP code -> schema）
 */
function route(tag, summary, opts = {}) {
  return {
    schema: {
      tags: [tag],
      summary,
      security: opts.public ? [] : [{ bearerAuth: [] }],
      ...opts.schema,
    },
    ...opts.routeOpts,
  };
}

export default async function adminRoutes(fastify) {
  // ===== Auth =====
  fastify.post(
    '/api/admin/login',
    route('Admin-Auth', '管理员登录', {
      public: true,
      routeOpts: { preHandler: [ipBlockCheck] },
      schema: {
        body: { $ref: 'LoginRequest#' },
        response: { 200: { $ref: 'ApiResponse#' } },
      },
    }),
    adminAuthController.login,
  );

  fastify.post(
    '/api/admin/init',
    route('Admin-Auth', '系统初始化（创建首个超管）', {
      public: true,
      schema: {
        body: { $ref: 'CreateUserRequest#' },
        response: { 200: { $ref: 'ApiResponse#' } },
      },
    }),
    adminAuthController.initSystem,
  );

  const adminPreHandler = [authenticate, authorize('super_admin', 'dept_admin')];

  fastify.post(
    '/api/admin/logout',
    route('Admin-Auth', '管理员登出（吊销当前 token）', { preHandler: adminPreHandler }),
    adminAuthController.logout,
  );

  fastify.put(
    '/api/admin/password',
    route('Admin-Auth', '管理员修改自己的密码', {
      preHandler: adminPreHandler,
      schema: { body: { $ref: 'ChangePasswordRequest#' } },
    }),
    adminAuthController.changePassword,
  );

  // ===== User =====
  fastify.get(
    '/api/admin/user/list',
    route('Admin-User', '用户列表（分页 + 过滤）', {
      preHandler: adminPreHandler,
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
    route('Admin-User', '创建用户', {
      preHandler: adminPreHandler,
      schema: { body: { $ref: 'CreateUserRequest#' } },
    }),
    userController.createUser,
  );

  fastify.put(
    '/api/admin/user/:id',
    route('Admin-User', '更新用户', {
      preHandler: adminPreHandler,
      schema: {
        params: { $ref: 'IdParam#' },
        body: { $ref: 'UpdateUserRequest#' },
      },
    }),
    userController.updateUser,
  );

  fastify.delete(
    '/api/admin/user/:id',
    route('Admin-User', '删除用户', {
      preHandler: adminPreHandler,
      schema: { params: { $ref: 'IdParam#' } },
    }),
    userController.deleteUser,
  );

  // ===== TOTP =====
  fastify.post(
    '/api/admin/totp/enable/:userId',
    route('Admin-TOTP', '为指定用户开启 TOTP（生成 secret）', {
      preHandler: adminPreHandler,
      schema: {
        params: { type: 'object', properties: { userId: { type: 'integer' } }, required: ['userId'] },
      },
    }),
    totpController.enableTotp,
  );

  fastify.post(
    '/api/admin/totp/disable/:userId',
    route('Admin-TOTP', '关闭指定用户的 TOTP', {
      preHandler: adminPreHandler,
      schema: {
        params: { type: 'object', properties: { userId: { type: 'integer' } }, required: ['userId'] },
      },
    }),
    totpController.disableTotp,
  );

  fastify.post(
    '/api/admin/totp/reset/:userId',
    route('Admin-TOTP', '重置指定用户的 TOTP（保留账号，重新生成 secret）', {
      preHandler: adminPreHandler,
      schema: {
        params: { type: 'object', properties: { userId: { type: 'integer' } }, required: ['userId'] },
      },
    }),
    totpController.resetTotp,
  );

  fastify.post(
    '/api/admin/totp/batch-reset',
    route('Admin-TOTP', '批量重置 TOTP', {
      preHandler: adminPreHandler,
      schema: { body: { $ref: 'BatchResetTotpRequest#' } },
    }),
    totpController.batchResetTotp,
  );

  fastify.get(
    '/api/admin/totp/code/:userId',
    route('Admin-TOTP', '查看指定用户的当前 TOTP 码（代理登录/重置场景）', {
      preHandler: adminPreHandler,
      schema: {
        params: { type: 'object', properties: { userId: { type: 'integer' } }, required: ['userId'] },
      },
    }),
    totpController.getUserCode,
  );

  fastify.get(
    '/api/admin/totp/secret/:userId',
    route('Admin-TOTP', '查看指定用户的明文 TOTP secret（高危）', {
      preHandler: adminPreHandler,
      schema: {
        params: { type: 'object', properties: { userId: { type: 'integer' } }, required: ['userId'] },
      },
    }),
    totpController.getUserSecret,
  );

  fastify.get(
    '/api/admin/totp/list',
    route('Admin-TOTP', '已开启 TOTP 的用户列表（复用 user 列表）', {
      preHandler: adminPreHandler,
    }),
    userController.listUsers,
  );

  // ===== Log =====
  fastify.get(
    '/api/admin/log/list',
    route('Admin-Log', '审计日志查询（分页 + 过滤）', {
      preHandler: adminPreHandler,
      schema: {
        querystring: { $ref: 'LogQuery#' },
      },
    }),
    logController.queryLogs,
  );

  fastify.get(
    '/api/admin/log/export',
    route('Admin-Log', '导出审计日志（CSV 流式下载）', {
      preHandler: adminPreHandler,
      schema: {
        querystring: { $ref: 'LogQuery#' },
      },
    }),
    logController.exportLogsHandler,
  );

  fastify.post(
    '/api/admin/log/cleanup',
    route('Admin-Log', '手动触发日志清理', {
      preHandler: adminPreHandler,
      schema: {
        body: {
          type: 'object',
          properties: { retentionDays: { type: 'integer', minimum: 1, maximum: 3650 } },
        },
      },
    }),
    logController.cleanupHandler,
  );

  // ===== Config =====
  fastify.get(
    '/api/admin/config',
    route('Admin-Config', '获取系统配置（按 key 过滤）', {
      preHandler: adminPreHandler,
      schema: {
        querystring: {
          type: 'object',
          properties: { key: { type: 'string' } },
        },
      },
    }),
    configController.getConfig,
  );

  fastify.post(
    '/api/admin/config',
    route('Admin-Config', '写入/更新系统配置', {
      preHandler: adminPreHandler,
      schema: { body: { $ref: 'SetConfigRequest#' } },
    }),
    configController.setConfig,
  );

  // ===== Department =====
  fastify.get(
    '/api/admin/dept/list',
    route('Admin-Department', '部门列表（树形）', { preHandler: adminPreHandler }),
    deptController.listDepartments,
  );

  fastify.get(
    '/api/admin/dept/all',
    route('Admin-Department', '所有部门（扁平）', { preHandler: adminPreHandler }),
    deptController.getAllDepartments,
  );

  fastify.get(
    '/api/admin/dept/:id',
    route('Admin-Department', '获取单个部门', {
      preHandler: adminPreHandler,
      schema: { params: { $ref: 'IdParam#' } },
    }),
    deptController.getDepartment,
  );

  fastify.post(
    '/api/admin/dept/create',
    route('Admin-Department', '创建部门', {
      preHandler: adminPreHandler,
      schema: { body: { $ref: 'CreateDepartmentRequest#' } },
    }),
    deptController.createDepartment,
  );

  fastify.put(
    '/api/admin/dept/:id',
    route('Admin-Department', '更新部门', {
      preHandler: adminPreHandler,
      schema: {
        params: { $ref: 'IdParam#' },
        body: { $ref: 'UpdateDepartmentRequest#' },
      },
    }),
    deptController.updateDepartment,
  );

  fastify.delete(
    '/api/admin/dept/:id',
    route('Admin-Department', '删除部门', {
      preHandler: adminPreHandler,
      schema: { params: { $ref: 'IdParam#' } },
    }),
    deptController.deleteDepartment,
  );

  // ===== Service =====
  fastify.get(
    '/api/admin/service/list',
    route('Admin-Service', '服务列表（分页 + 过滤）', {
      preHandler: adminPreHandler,
      schema: {
        querystring: {
          type: 'object',
          properties: {
            page: { type: 'integer', default: 1 },
            pageSize: { type: 'integer', default: 20, maximum: 200 },
            keyword: { type: 'string' },
            category: { type: 'string' },
            departmentId: { type: 'integer' },
          },
        },
      },
    }),
    serviceController.listServices,
  );

  fastify.get(
    '/api/admin/service/:id',
    route('Admin-Service', '获取单个服务', {
      preHandler: adminPreHandler,
      schema: { params: { $ref: 'IdParam#' } },
    }),
    serviceController.getService,
  );

  fastify.get(
    '/api/admin/service/:id/secret',
    route('Admin-Service', '获取服务的明文 TOTP secret（高危）', {
      preHandler: adminPreHandler,
      schema: { params: { $ref: 'IdParam#' } },
    }),
    serviceController.getServiceSecret,
  );

  fastify.post(
    '/api/admin/service/create',
    route('Admin-Service', '创建服务（手动录入 secret）', {
      preHandler: adminPreHandler,
      schema: { body: { $ref: 'CreateServiceRequest#' } },
    }),
    serviceController.createService,
  );

  fastify.put(
    '/api/admin/service/:id',
    route('Admin-Service', '更新服务', {
      preHandler: adminPreHandler,
      schema: {
        params: { $ref: 'IdParam#' },
        body: { $ref: 'UpdateServiceRequest#' },
      },
    }),
    serviceController.updateService,
  );

  fastify.post(
    '/api/admin/service/:id/reset-secret',
    route('Admin-Service', '重置服务的 TOTP secret', {
      preHandler: adminPreHandler,
      schema: {
        params: { $ref: 'IdParam#' },
        body: { $ref: 'ResetSecretRequest#' },
      },
    }),
    serviceController.resetSecret,
  );

  fastify.delete(
    '/api/admin/service/:id',
    route('Admin-Service', '删除服务', {
      preHandler: adminPreHandler,
      schema: { params: { $ref: 'IdParam#' } },
    }),
    serviceController.deleteService,
  );

  fastify.get(
    '/api/admin/service/categories',
    route('Admin-Service', '服务分类列表', { preHandler: adminPreHandler }),
    serviceController.getCategories,
  );

  fastify.post(
    '/api/admin/service/batch-import',
    route('Admin-Service', '批量导入服务', {
      preHandler: adminPreHandler,
      schema: { body: { $ref: 'BatchImportRequest#' } },
    }),
    serviceController.batchImport,
  );

  fastify.post(
    '/api/admin/service/scan-create',
    route('Admin-Service', '扫描 otpauth URI 创建服务', {
      preHandler: adminPreHandler,
      schema: { body: { $ref: 'ScanOtpauthRequest#' } },
    }),
    serviceController.createFromOtpauth,
  );

  // ===== Import =====
  fastify.post(
    '/api/admin/import/parse-migration',
    route('Admin-Import', '解析谷歌OTP迁移URL（otpauth-migration://）', {
      preHandler: adminPreHandler,
      schema: {
        body: {
          type: 'object',
          required: ['url'],
          properties: { url: { type: 'string' } },
        },
      },
    }),
    importController.parseMigrationUrl,
  );

  fastify.post(
    '/api/admin/import/parse-url',
    route('Admin-Import', '解析单个otpauth URL', {
      preHandler: adminPreHandler,
      schema: {
        body: {
          type: 'object',
          required: ['url'],
          properties: { url: { type: 'string' } },
        },
      },
    }),
    importController.parseOtpauthUrl,
  );

  fastify.post(
    '/api/admin/import/preview',
    route('Admin-Import', '预览待导入的服务列表', {
      preHandler: adminPreHandler,
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
    route('Admin-Import', '确认导入服务', {
      preHandler: adminPreHandler,
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

  // ===== Grant =====
  fastify.get(
    '/api/admin/grant/list',
    route('Admin-Grant', '授权列表（分页）', {
      preHandler: adminPreHandler,
      schema: {
        querystring: {
          type: 'object',
          properties: {
            page: { type: 'integer', default: 1 },
            pageSize: { type: 'integer', default: 20 },
            userId: { type: 'integer' },
            serviceId: { type: 'integer' },
          },
        },
      },
    }),
    grantController.listGrants,
  );

  fastify.get(
    '/api/admin/grant/check',
    route('Admin-Grant', '查询某用户对某服务的授权', {
      preHandler: adminPreHandler,
      schema: {
        querystring: {
          type: 'object',
          required: ['userId', 'serviceId'],
          properties: {
            userId: { type: 'integer' },
            serviceId: { type: 'integer' },
          },
        },
      },
    }),
    grantController.getGrant,
  );

  fastify.post(
    '/api/admin/grant/grant',
    route('Admin-Grant', '授予单个用户对单个服务的访问权', {
      preHandler: adminPreHandler,
      schema: { body: { $ref: 'GrantRequest#' } },
    }),
    grantController.grantAccess,
  );

  fastify.post(
    '/api/admin/grant/revoke',
    route('Admin-Grant', '撤销单个用户对单个服务的访问权', {
      preHandler: adminPreHandler,
      schema: { body: { $ref: 'RevokeRequest#' } },
    }),
    grantController.revokeAccess,
  );

  fastify.post(
    '/api/admin/grant/batch-grant',
    route('Admin-Grant', '批量授权（多用户 -> 单服务）', {
      preHandler: adminPreHandler,
      schema: { body: { $ref: 'BatchGrantRequest#' } },
    }),
    grantController.batchGrant,
  );

  fastify.post(
    '/api/admin/grant/batch-revoke',
    route('Admin-Grant', '批量撤销（多用户 <- 单服务）', {
      preHandler: adminPreHandler,
      schema: { body: { $ref: 'BatchRevokeRequest#' } },
    }),
    grantController.batchRevoke,
  );

  // ===== Audit =====
  fastify.get(
    '/api/admin/audit/summary',
    route('Admin-Audit', '审计摘要（今日/本周/本月关键指标）', { preHandler: adminPreHandler }),
    auditController.getSummary,
  );

  fastify.get(
    '/api/admin/audit/service-views',
    route('Admin-Audit', '服务维度查看次数统计（TOP）', {
      preHandler: adminPreHandler,
      schema: {
        querystring: {
          type: 'object',
          properties: {
            startTime: { type: 'string', format: 'date-time' },
            endTime: { type: 'string', format: 'date-time' },
            limit: { type: 'integer', default: 20 },
          },
        },
      },
    }),
    auditController.getServiceViewStats,
  );

  fastify.get(
    '/api/admin/audit/user-views',
    route('Admin-Audit', '用户维度查看次数统计（TOP）', {
      preHandler: adminPreHandler,
      schema: {
        querystring: {
          type: 'object',
          properties: {
            startTime: { type: 'string', format: 'date-time' },
            endTime: { type: 'string', format: 'date-time' },
            limit: { type: 'integer', default: 20 },
          },
        },
      },
    }),
    auditController.getUserViewStats,
  );

  fastify.get(
    '/api/admin/audit/actions',
    route('Admin-Audit', '操作类型分布统计', {
      preHandler: adminPreHandler,
      schema: {
        querystring: {
          type: 'object',
          properties: {
            startTime: { type: 'string', format: 'date-time' },
            endTime: { type: 'string', format: 'date-time' },
          },
        },
      },
    }),
    auditController.getActionStats,
  );

  fastify.get(
    '/api/admin/audit/daily',
    route('Admin-Audit', '每日审计量趋势', {
      preHandler: adminPreHandler,
      schema: {
        querystring: {
          type: 'object',
          properties: {
            startTime: { type: 'string', format: 'date-time' },
            endTime: { type: 'string', format: 'date-time' },
          },
        },
      },
    }),
    auditController.getDailyStats,
  );

  // ===== Security =====
  fastify.get(
    '/api/admin/security/blocked-ips',
    route('Admin-Security', '获取被封禁的 IP 列表', {
      preHandler: adminPreHandler,
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
    route('Admin-Security', '手动封禁 IP', {
      preHandler: adminPreHandler,
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
    route('Admin-Security', '手动解封 IP', {
      preHandler: adminPreHandler,
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

  fastify.post(
    '/api/admin/refresh',
    route('Admin-Auth', '刷新 Token', {
      public: true,
      routeOpts: { preHandler: [ipBlockCheck] },
      schema: {
        body: {
          type: 'object',
          required: ['refreshToken'],
          properties: { refreshToken: { type: 'string' } },
        },
      },
    }),
    refreshController.refresh,
  );

  fastify.get(
    '/api/admin/status',
    route('Admin-Audit', '安全状态仪表盘', {
      preHandler: adminPreHandler,
    }),
    statusController.getSecurityStatus,
  );
}
