// 用 Prisma 模型存 JWT 黑名单（重启不丢、跨进程一致）
import { prisma } from '../utils/prisma.js';

let swept = false;

async function sweepExpired() {
  await prisma.tokenBlacklist.deleteMany({
    where: { expireAt: { lt: BigInt(Date.now()) } },
  });
}

/**
 * 将 jti 加入黑名单
 * @param {string} jti
 * @param {number} expireAtMs - 过期时间（毫秒）
 */
export async function revokeJti(jti, expireAtMs) {
  if (!jti) return;
  try {
    await prisma.tokenBlacklist.create({
      data: { jti, expireAt: BigInt(expireAtMs) },
    });
  } catch {
    // 重复 jti 忽略
  }
}

/**
 * 检查 jti 是否被吊销（且未过期）
 * 仅当 jti 在黑名单中且 expireAt 仍大于当前时间，才视为已吊销。
 * 这样在 sweepExpired 周期之间，已过期的黑名单项也不会误判为吊销。
 */
export async function isRevoked(jti) {
  if (!jti) return false;
  const row = await prisma.tokenBlacklist.findFirst({
    where: { jti, expireAt: { gt: BigInt(Date.now()) } },
  });
  return !!row;
}

// 启动时清理一次过期项
if (!swept) {
  swept = true;
  sweepExpired().catch((err) => console.error('[Blacklist] sweep error:', err.message));
}
// 每小时清理一次
setInterval(() => {
  sweepExpired().catch(() => {});
}, 3_600_000);
