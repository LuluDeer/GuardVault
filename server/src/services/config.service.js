import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// 配置缓存（避免每次请求都查库）
let cache = null;
let cacheTime = 0;
const CACHE_TTL = 60_000; // 60秒

// 默认配置
export const DEFAULT_CONFIG = {
  token_expire_hours: '2',       // 用户Token有效期（小时）
  admin_session_timeout: '30',   // 管理员会话超时（分钟）
  login_fail_max: '5',           // 登录失败锁定次数
  login_lock_minutes: '10',      // 登录失败锁定时长（分钟）
};

/**
 * 获取所有系统配置（带缓存）
 * @returns {Record<string, string>}
 */
export async function getAllConfig() {
  const now = Date.now();
  if (cache && now - cacheTime < CACHE_TTL) return cache;

  const rows = await prisma.systemConfig.findMany();
  const result = { ...DEFAULT_CONFIG };
  for (const row of rows) {
    result[row.configKey] = row.configValue;
  }
  cache = result;
  cacheTime = now;
  return result;
}

/**
 * 获取单项配置
 */
export async function getConfig(key) {
  const all = await getAllConfig();
  return all[key] ?? DEFAULT_CONFIG[key] ?? null;
}

/**
 * 更新配置
 */
export async function setConfig(key, value, updatedBy) {
  await prisma.systemConfig.upsert({
    where: { configKey: key },
    update: { configValue: String(value), updatedBy },
    create: { configKey: key, configValue: String(value), updatedBy },
  });
  // 清除缓存
  cache = null;
}

/**
 * 初始化默认配置（首次部署）
 */
export async function initDefaultConfig() {
  for (const [key, value] of Object.entries(DEFAULT_CONFIG)) {
    await prisma.systemConfig.upsert({
      where: { configKey: key },
      update: {},
      create: { configKey: key, configValue: value },
    });
  }
}
