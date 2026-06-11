/**
 * Recovery Code 服务
 * - 生成 8 个单次使用恢复码，每个格式为 XXXX-XXXX（8位大写字母数字）
 * - 存储时 SHA-256 哈希，原始码只在生成时返回一次
 * - 使用时消耗对应记录，全部用完需重新生成
 */
import crypto from 'node:crypto';
import { prisma } from '../utils/prisma.js';

const CODE_COUNT = 8;

function generateRawCode() {
  const part = () => crypto.randomBytes(3).toString('hex').toUpperCase().slice(0, 4);
  return `${part()}-${part()}`;
}

const hashCode = (c) => crypto.createHash('sha256').update(c).digest('hex');

/**
 * 为用户生成新的恢复码，清除旧码后批量插入哈希
 * @returns {string[]} 原始恢复码数组（仅此一次）
 */
export async function generateRecoveryCodes(userId) {
  const rawCodes = Array.from({ length: CODE_COUNT }, generateRawCode);

  await prisma.$transaction([
    prisma.totpRecoveryCode.deleteMany({ where: { userId } }),
    prisma.totpRecoveryCode.createMany({
      data: rawCodes.map(c => ({ userId, codeHash: hashCode(c), used: false })),
    }),
  ]);

  return rawCodes;
}

/**
 * 尝试使用一个恢复码登录
 * 成功消耗该码并返回 true，否则返回 false
 */
export async function consumeRecoveryCode(userId, rawCode) {
  const targetHash = hashCode(rawCode.trim().toUpperCase());

  const record = await prisma.totpRecoveryCode.findFirst({
    where: { userId, codeHash: targetHash, used: false },
  });

  if (!record) return false;

  await prisma.totpRecoveryCode.update({
    where: { id: record.id },
    data: { used: true, usedAt: new Date() },
  });

  return true;
}

/**
 * 获取用户剩余可用恢复码数量
 */
export async function getRemainingCount(userId) {
  return prisma.totpRecoveryCode.count({ where: { userId, used: false } });
}

/**
 * 删除用户所有恢复码（禁用 2FA 时清理）
 */
export async function clearRecoveryCodes(userId) {
  await prisma.totpRecoveryCode.deleteMany({ where: { userId } });
}
