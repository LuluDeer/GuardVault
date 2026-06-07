// 集中配置：限流、Helmet、CORS 来源
// 通过环境变量控制，避免硬编码

/**
 * 解析 CORS 允许的来源列表
 * - 留空 / '*' 表示允许所有（仅开发用）
 * - 多个用英文逗号分隔
 *  示例：CORS_ORIGINS=http://localhost:5173,http://192.168.1.10:5173
 */
export function getCorsOrigins() {
  const raw = (process.env.CORS_ORIGINS || '').trim();
  if (!raw || raw === '*') {
    // 开发模式：放行所有；生产模式：必须显式配置
    return process.env.NODE_ENV === 'production' ? false : true;
  }
  return raw.split(',').map(s => s.trim()).filter(Boolean);
}

/**
 * 不同端点的限流策略
 *  登录 / 改密：按 IP，每分钟 10 次（防爆破）
 *  取码：       按 user id，每分钟 60 次（防高频抓取）
 *  通用读：     按 IP，每分钟 200 次
 *  写操作：     按 IP，每分钟 60 次
 */
export const RATE_LIMITS = {
  // 路径前缀 -> 配置
  '/api/admin/login': { max: 10, timeWindow: '1 minute' },
  '/api/admin/password': { max: 5, timeWindow: '1 minute' },
  '/api/user/login': { max: 10, timeWindow: '1 minute' },
  '/api/user/password': { max: 5, timeWindow: '1 minute' },
  '/api/user/service/': { max: 60, timeWindow: '1 minute' },
  '/api/admin/service/': { max: 60, timeWindow: '1 minute' },
  '/api/admin/log/export': { max: 5, timeWindow: '1 minute' },
};
