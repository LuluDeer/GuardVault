// 用户级事件流（SSE）：授权变更立即推送到客户端，避免 60s 缓存导致撤销后仍可看到旧码。
import { authenticate } from '../../middlewares/authenticate.js';
import { authorize } from '../../middlewares/authorize.js';
import { subscribeUserGrants } from '../../services/event-bus.js';

export default async function userEventRoutes(fastify) {
  fastify.get(
    '/api/user/events',
    {
      preHandler: [authenticate, authorize('user', 'dept_admin', 'super_admin')],
    },
    async (request, reply) => {
      const userId = request.user.id;

      // SSE 头
      reply.raw.setHeader('Content-Type', 'text/event-stream');
      reply.raw.setHeader('Cache-Control', 'no-cache, no-transform');
      reply.raw.setHeader('Connection', 'keep-alive');
      reply.raw.setHeader('X-Accel-Buffering', 'no'); // 禁用 nginx 缓冲
      reply.raw.flushHeaders?.();

      // 立即发一条 hello，便于客户端确认连接建立
      reply.raw.write(`event: hello\ndata: ${JSON.stringify({ userId })}\n\n`);

      const send = (eventName, payload) => {
        try {
          reply.raw.write(`event: ${eventName}\ndata: ${JSON.stringify(payload)}\n\n`);
        } catch (_) { /* 客户端断开后写入会抛错，忽略 */ }
      };

      const unsubscribe = subscribeUserGrants(userId, (payload) => {
        // listener 同时监听 revoked / granted，靠 type 区分
        send('grant-changed', payload);
      });

      // 30s 心跳：保活 + 触发反向代理超时刷新
      const heartbeat = setInterval(() => {
        try { reply.raw.write(`: ping ${Date.now()}\n\n`) } catch (_) {}
      }, 30000);

      // 客户端断开
      request.raw.on('close', () => {
        clearInterval(heartbeat);
        unsubscribe();
        try { reply.raw.end() } catch (_) {}
      });
    },
  );
}
