import { prisma } from './prisma.js';

const cache = new Map();
const CACHE_TTL = 5 * 60 * 1000;

export async function getConfig(key) {
  const cached = cache.get(key);
  if (cached && Date.now() < cached.expireAt) {
    return cached.value;
  }

  const record = await prisma.systemConfig.findUnique({ where: { configKey: key } });
  const value = record?.configValue || null;

  cache.set(key, { value, expireAt: Date.now() + CACHE_TTL });
  return value;
}

export async function setConfig(key, value, description = '') {
  await prisma.systemConfig.upsert({
    where: { configKey: key },
    update: { configValue: value, description },
    create: { configKey: key, configValue: value, description },
  });

  cache.delete(key);
  return value;
}

export async function getAllConfigs() {
  const cached = cache.get('__all__');
  if (cached && Date.now() < cached.expireAt) {
    return cached.value;
  }

  const records = await prisma.systemConfig.findMany();
  const configs = {};
  for (const record of records) {
    configs[record.configKey] = record.configValue;
    cache.set(record.configKey, {
      value: record.configValue,
      expireAt: Date.now() + CACHE_TTL,
    });
  }

  cache.set('__all__', { value: configs, expireAt: Date.now() + CACHE_TTL });
  return configs;
}

export function clearCache(key) {
  if (key) {
    cache.delete(key);
  } else {
    cache.clear();
  }
}

setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of cache.entries()) {
    if (now > entry.expireAt) {
      cache.delete(key);
    }
  }
}, 60 * 1000);
