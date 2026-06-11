import 'dotenv/config';
import Fastify from 'fastify';
import cors from '@fastify/cors';
import rateLimit from '@fastify/rate-limit';
import helmet from '@fastify/helmet';
import swagger from '@fastify/swagger';
import swaggerUi from '@fastify/swagger-ui';
import compress from '@fastify/compress';
import { assertEnv } from './utils/env.js';
import { errorHandler } from './utils/error.js';
import { getCorsOrigins } from './utils/security.js';
import { openApiSchemas } from './utils/openapi-schemas.js';
import { startLogCleanupTask } from './services/log.service.js';

// 路由（按业务域拆分子模块，集中在 app.js 装载）
import adminAuthRoutes from './routes/admin/auth.js';
import adminSessionRoutes from './routes/admin/session.js';
import adminUserRoutes from './routes/admin/user.js';
import adminTotpRoutes from './routes/admin/totp.js';
import adminLogRoutes from './routes/admin/log.js';
import adminConfigRoutes from './routes/admin/config.js';
import adminDeptRoutes from './routes/admin/dept.js';
import adminServiceRoutes from './routes/admin/service.js';
import adminGrantRoutes from './routes/admin/grant.js';
import adminAuditRoutes from './routes/admin/audit.js';
import adminSecurityRoutes from './routes/admin/security.js';
import adminStatusRoutes from './routes/admin/status.js';
import adminImportRoutes from './routes/admin/import.js';
import userAuthRoutes from './routes/user/auth.js';
import userSessionRoutes from './routes/user/session.js';
import userTotpRoutes from './routes/user/totp.js';
import userServiceRoutes from './routes/user/service.js';
import userFavoriteRoutes from './routes/user/favorite.js';
import userEventRoutes from './routes/user/events.js';
import userDeptRoutes from './routes/user/dept.js';

// 启动前强校验环境变量，缺一即拒启
assertEnv();

const PORT = parseInt(process.env.PORT || '3001', 10);
const HOST = process.env.BIND_HOST || '0.0.0.0';
const isProd = process.env.NODE_ENV === 'production';

const fastify = Fastify({
  logger: {
    level: isProd ? 'info' : 'debug',
  },
  trustProxy: true, // 支持反向代理时获取真实IP
  // 限制单 body 大小（防 DoS）
  bodyLimit: 1024 * 1024, // 1MB
});

// 1. Helmet - 设置安全响应头（仅生产严格 CSP；开发放行 vite 注入）
await fastify.register(helmet, {
  contentSecurityPolicy: isProd ? undefined : false, // 关闭 CSP 避免影响 swagger-ui / API
  crossOriginEmbedderPolicy: false, // 允许 swagger-ui 加载资源
  crossOriginResourcePolicy: { policy: 'cross-origin' },
});

// 2. CORS - 生产用白名单，开发放行
const corsOrigins = getCorsOrigins();
await fastify.register(cors, {
  origin: corsOrigins === true
    ? true
    : (origin, cb) => {
        if (!origin) return cb(null, true);
        if (Array.isArray(corsOrigins) && corsOrigins.includes(origin)) {
          return cb(null, true);
        }
        return cb(new Error('CORS not allowed'), false);
      },
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true,
});

// 2.5 Compress - 响应压缩（gzip/brotli）
await fastify.register(compress, {
  global: true,
  threshold: 1024,
  encodings: ['gzip', 'deflate'],
});

// 1.5 OpenAPI / Swagger 文档
// 在 fastify 实例上直接 addSchema，避免插件封装导致路由子上下文找不到
for (const [name, schema] of Object.entries(openApiSchemas)) {
  fastify.addSchema({ ...schema, $id: name });
}

await fastify.register(swagger, {
  openapi: {
    openapi: '3.0.3',
    info: {
      title: 'GuardVault 2FA Safe API',
      description: 'GuardVault 企业级集中式 2FA 验证码管理后端 API。所有非 /api/admin/login、/api/user/login、/health、/ready 接口均需在 Authorization 头中传 `Bearer <token>`。',
      version: '1.0.0',
      contact: { name: 'GuardVault Team' },
    },
    servers: [
      { url: 'http://127.0.0.1:3001', description: '本机开发' },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
        },
      },
    },
    tags: [
      { name: 'Health', description: '健康检查' },
      { name: 'Admin-Auth', description: '管理员鉴权相关（登录/登出/改密/初始化）' },
      { name: 'Admin-User', description: '管理员-用户管理' },
      { name: 'Admin-TOTP', description: '管理员-用户 TOTP 管理' },
      { name: 'Admin-Log', description: '管理员-审计日志查询/导出/清理' },
      { name: 'Admin-Config', description: '管理员-系统配置' },
      { name: 'Admin-Department', description: '管理员-部门管理' },
      { name: 'Admin-Service', description: '管理员-服务（账号）管理' },
      { name: 'Admin-Grant', description: '管理员-访问授权' },
      { name: 'Admin-Audit', description: '管理员-审计统计' },
      { name: 'Admin-Security', description: '管理员-安全管理（IP封禁）' },
      { name: 'User-Auth', description: '终端用户鉴权' },
      { name: 'User-TOTP', description: '终端用户-TOTP 码' },
      { name: 'User-Service', description: '终端用户-可访问服务' },
      { name: 'User-Favorite', description: '终端用户-收藏' },
    ],
  },
});

// QA-04: 生产环境不挂载 Swagger UI，避免暴露接口攻击面地图
if (!isProd) {
  await fastify.register(swaggerUi, {
    routePrefix: '/api/docs',
    uiConfig: {
      docExpansion: 'list',
      deepLinking: true,
      tryItOutEnabled: true,
    },
    staticCSP: true,
    transformSpecification: (swaggerObject) => swaggerObject,
    transformSpecificationClone: true,
  });
}

// 3. Rate-Limit - 默认全站限流（防 DDOS / 爬虫）
await fastify.register(rateLimit, {
  global: true,
  max: 200,        // 默认 200 次 / 分钟
  timeWindow: '1 minute',
  // 跳过健康检查和文档
  allowList: (request) => {
    const u = request.url;
    return u === '/health' || u === '/ready' || u.startsWith('/api/docs') || u === '/api/docs/json';
  },
});

// 注册路由（具体端点的更细粒度限流在路由层覆盖）
// 顺序：先注册 auth（公开端点），再注册需鉴权的子模块
await fastify.register(adminAuthRoutes);
await fastify.register(adminSessionRoutes);
await fastify.register(adminUserRoutes);
await fastify.register(adminTotpRoutes);
await fastify.register(adminLogRoutes);
await fastify.register(adminConfigRoutes);
await fastify.register(adminDeptRoutes);
await fastify.register(adminServiceRoutes);
await fastify.register(adminGrantRoutes);
await fastify.register(adminAuditRoutes);
await fastify.register(adminSecurityRoutes);
await fastify.register(adminStatusRoutes);
await fastify.register(adminImportRoutes);
await fastify.register(userAuthRoutes);
await fastify.register(userSessionRoutes);
await fastify.register(userTotpRoutes);
await fastify.register(userServiceRoutes);
await fastify.register(userFavoriteRoutes);
await fastify.register(userEventRoutes);
await fastify.register(userDeptRoutes);

// 启动日志清理定时任务（每天凌晨 3 点，可通过 LOG_CLEANUP_CRON_HOUR 调整）
startLogCleanupTask(fastify.log);

// 健康检查（存活）
fastify.get('/health', {
  schema: {
    tags: ['Health'],
    summary: '存活检查',
    description: '检查 HTTP server 是否在监听；不验证 DB 状态。',
    response: {
      200: {
        type: 'object',
        properties: {
          status: { type: 'string', example: 'ok' },
          time: { type: 'string', format: 'date-time' },
        },
      },
    },
  },
}, async () => ({ status: 'ok', time: new Date().toISOString() }));

// 就绪检查（含 DB ping）
fastify.get('/ready', {
  schema: {
    tags: ['Health'],
    summary: '就绪检查',
    description: '检查服务进程是否健康，且数据库可访问。',
    response: {
      200: {
        type: 'object',
        properties: {
          status: { type: 'string' },
          db: { type: 'string' },
          time: { type: 'string', format: 'date-time' },
        },
      },
      503: {
        type: 'object',
        properties: {
          status: { type: 'string' },
          db: { type: 'string' },
          message: { type: 'string' },
        },
      },
    },
  },
}, async (_request, reply) => {
  try {
    const { prisma } = await import('./utils/prisma.js');
    await prisma.$queryRaw`SELECT 1`;
    return { status: 'ok', db: 'ok', time: new Date().toISOString() };
  } catch (err) {
    reply.code(503);
    return { status: 'fail', db: 'down', message: err.message, time: new Date().toISOString() };
  }
});

// 全局错误处理（统一捕获 zod / prisma / 未知错误）
fastify.setErrorHandler(errorHandler);

// 优雅关闭（PM2 / systemd 触发 SIGTERM）
const closeListeners = async (signal) => {
  fastify.log.info(`[${signal}] 收到终止信号，开始优雅关闭...`);
  try {
    await fastify.close();
    fastify.log.info('HTTP server closed');
    process.exit(0);
  } catch (err) {
    fastify.log.error({ err }, '关闭失败');
    process.exit(1);
  }
};
process.on('SIGTERM', () => closeListeners('SIGTERM'));
process.on('SIGINT', () => closeListeners('SIGINT'));

// 启动
try {
  await fastify.listen({ port: PORT, host: HOST });
  fastify.log.info(`Server running on ${HOST}:${PORT}`);
} catch (err) {
  fastify.log.error(err);
  process.exit(1);
}
