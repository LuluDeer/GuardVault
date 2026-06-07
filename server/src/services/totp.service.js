import { prisma } from '../utils/prisma.js';
import { encrypt, decrypt } from '../utils/crypto.js';
import { generateSecret, generateCode } from '../utils/totp.js';

/**
 * 为用户开通2FA（生成密钥并加密入库）
 */
export async function enableTotp(userId) {
  const secret = generateSecret();
  const encryptedSecret = encrypt(secret);

  // upsert：若已有记录则更新，否则创建
  await prisma.userTotpKey.upsert({
    where: { userId },
    update: {
      encryptedSecret,
      isEnable: 1,
      resetTime: new Date(),
      resetCount: { increment: 1 },
    },
    create: {
      userId,
      encryptedSecret,
      isEnable: 1,
    },
  });
}

/**
 * 禁用用户2FA
 */
export async function disableTotp(userId) {
  await prisma.userTotpKey.updateMany({
    where: { userId },
    data: { isEnable: 0 },
  });
}

/**
 * 重置单用户密钥
 */
export async function resetTotp(userId) {
  const secret = generateSecret();
  const encryptedSecret = encrypt(secret);
  await prisma.userTotpKey.update({
    where: { userId },
    data: {
      encryptedSecret,
      resetTime: new Date(),
      resetCount: { increment: 1 },
    },
  });
}

/**
 * 批量重置密钥（最多50人）
 */
export async function batchResetTotp(userIds) {
  let successCount = 0;
  let failCount = 0;
  for (const userId of userIds.slice(0, 50)) {
    try {
      await resetTotp(userId);
      successCount++;
    } catch {
      failCount++;
    }
  }
  return { successCount, failCount };
}

/**
 * 获取用户当前动态码
 * @returns {{ code: string, remainSeconds: number }}
 */
export async function getUserCode(userId) {
  const key = await prisma.userTotpKey.findUnique({ where: { userId } });
  if (!key || key.isEnable !== 1) {
    throw new Error('TOTP_NOT_ENABLED');
  }
  const secret = decrypt(key.encryptedSecret);
  const result = generateCode(secret);
  // 立即清除内存中的明文（GC友好）
  return result;
}

/**
 * 获取用户TOTP状态
 */
export async function getTotpStatus(userId) {
  const key = await prisma.userTotpKey.findUnique({
    where: { userId },
    select: { isEnable: true, resetTime: true, resetCount: true },
  });
  return {
    enabled: key?.isEnable === 1,
    resetTime: key?.resetTime ?? null,
    resetCount: key?.resetCount ?? 0,
  };
}

/**
 * 获取用户密钥记录（不解密），供管理员查询二维码使用
 * 返回 null 表示未绑定
 */
export async function getUserKey(userId) {
  return prisma.userTotpKey.findUnique({ where: { userId } });
}
