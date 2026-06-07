import 'dotenv/config';
import Fastify from 'fastify';
import cors from '@fastify/cors';
import { assertEnv } from './utils/env.js';
import { errorHandler } from './utils/error.js';
import adminRoutes from './routes/admin/index.js';
import userRoutes from './routes/user/index.js';

// 启动前强校验环境变量，缺一即拒启
assertEnv();

const PORT = parseInt(process.env.PORT || '3000', 10);
const HOST = process.env.BIND_HOST || '0.0.0.0';

const fastify = Fastify({
  logger: {
    level: process.env.NODE_ENV === 'production' ? 'info' : 'debug',
  },
  trustProxy: true, // 支持反向代理时获取真实IP
});

// CORS（内网使用，允许局域网段，生产环境可收紧）
await fastify.register(cors, {
  origin: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
});

// 注册路由
await fastify.register(adminRoutes);
await fastify.register(userRoutes);

// 健康检查
fastify.get('/health', async () => ({ status: 'ok', time: new Date().toISOString() }));

// 全局错误处理（统一捕获 zod / prisma / 未知错误）
fastify.setErrorHandler(errorHandler);

// 启动
try {
  await fastify.listen({ port: PORT, host: HOST });
  fastify.log.info(`Server running on ${HOST}:${PORT}`);
} catch (err) {
  fastify.log.error(err);
  process.exit(1);
}
