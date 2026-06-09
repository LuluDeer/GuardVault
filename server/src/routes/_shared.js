// 路由注册共享辅助：所有模块复用 OpenAPI/security schema 装配
// - tag：归属哪个 OpenAPI 分组
// - summary：简要说明
// - opts.body / opts.params / opts.querystring：Fastify schema（同时生成 OpenAPI 文档）
// - opts.response：响应 schema（HTTP code -> schema）
// - opts.public：是否跳过鉴权（默认 false）
// - opts.preHandler：附加 preHandler（[ipBlockCheck] 等）
// - opts.routeOpts：透传给 fastify.route 的额外选项

export function route(tag, summary, opts = {}) {
  return {
    schema: {
      tags: [tag],
      summary,
      security: opts.public ? [] : [{ bearerAuth: [] }],
      ...opts.schema,
    },
    ...opts.routeOpts,
    ...(opts.preHandler && { preHandler: opts.preHandler }),
  };
}

/**
 * 创建带固定 preHandler 链的路由 helper
 *   const authRoute = withPreHandler([authenticate, authorize('super_admin', 'dept_admin')]);
 *   fastify.post('/x', authRoute('Tag', '...', { public: true, ... }), handler);
 */
export function withPreHandler(preHandler) {
  return function (tag, summary, opts = {}) {
    return route(tag, summary, { ...opts, preHandler });
  };
}
