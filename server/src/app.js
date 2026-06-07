import 'dotenv/config';
import Fastify from 'fastify';
import cors from '@fastify/cors';
import adminRoutes from './routes/admin/index.js';
import userRoutes from './routes/user/index.js';

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

// 全局错误处理（不向外暴露堆栈信息）
fastify.setErrorHandler((error, request, reply) => {
  fastify.log.error({ err: error, url: request.url }, 'Unhandled error');
  reply.code(500).send({ code: 5000, message: '服务器内部错误', data: null });
});

// 启动
try {
  await fastify.listen({ port: PORT, host: HOST });
  fastify.log.info(`Server running on ${HOST}:${PORT}`);
} catch (err) {
  fastify.log.error(err);
  process.exit(1);
}
