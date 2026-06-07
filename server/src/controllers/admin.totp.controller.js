import * as totpService from '../services/totp.service.js';
import * as userService from '../services/user.service.js';
import { writeLog } from '../services/log.service.js';
import { success, fail, ErrorCode } from '../utils/response.js';
import { z } from 'zod';
import { prisma } from '../utils/prisma.js';
import { decrypt } from '../utils/crypto.js';
import bcrypt from 'bcryptjs';

/**
 * 开通2FA
 */
export async function enableTotp(request, reply) {
  const userId = parseInt(request.params.userId, 10);
  const target = await userService.findUserById(userId);
  if (!target) return fail(reply, ErrorCode.USER_NOT_FOUND, '用户不存在');

  await totpService.enableTotp(userId);

  await writeLog({
    operatorId: request.user.id, operatorName: request.user.username,
    targetUserId: userId, targetUsername: target.username,
    actionType: 'TOTP_ENABLE', actionDesc: `为用户 ${target.username} 开通2FA`,
    clientIp: request.ip, result: 1,
  });

  return success(reply);
}

/**
 * 禁用2FA
 */
export async function disableTotp(request, reply) {
  const userId = parseInt(request.params.userId, 10);
  const target = await userService.findUserById(userId);
  if (!target) return fail(reply, ErrorCode.USER_NOT_FOUND, '用户不存在');

  await totpService.disableTotp(userId);

  await writeLog({
    operatorId: request.user.id, operatorName: request.user.username,
    targetUserId: userId, targetUsername: target.username,
    actionType: 'TOTP_DISABLE', actionDesc: `禁用用户 ${target.username} 的2FA`,
    clientIp: request.ip, result: 1,
  });

  return success(reply);
}

/**
 * 重置单用户密钥
 */
export async function resetTotp(request, reply) {
  const userId = parseInt(request.params.userId, 10);
  const target = await userService.findUserById(userId);
  if (!target) return fail(reply, ErrorCode.USER_NOT_FOUND, '用户不存在');

  await totpService.resetTotp(userId);

  await writeLog({
    operatorId: request.user.id, operatorName: request.user.username,
    targetUserId: userId, targetUsername: target.username,
    actionType: 'TOTP_RESET', actionDesc: `重置用户 ${target.username} 的TOTP密钥`,
    clientIp: request.ip, result: 1,
  });

  return success(reply);
}

/**
 * 批量重置密钥（最多50人）
 */
export async function batchResetTotp(request, reply) {
  const schema = z.object({
    userIds: z.array(z.number().int().positive()).min(1).max(50),
  });
  const parsed = schema.safeParse(request.body);
  if (!parsed.success) {
    return fail(reply, ErrorCode.PARAM_ERROR, '参数校验失败：userIds需为1-50个正整数');
  }

  const result = await totpService.batchResetTotp(parsed.data.userIds);

  await writeLog({
    operatorId: request.user.id, operatorName: request.user.username,
    actionType: 'TOTP_RESET',
    actionDesc: `批量重置TOTP密钥，共 ${parsed.data.userIds.length} 人，成功 ${result.successCount} 人`,
    clientIp: request.ip, result: 1,
  });

  return success(reply, result);
}

/**
 * 管理员查询用户动态码
 */
export async function getUserCode(request, reply) {
  const userId = parseInt(request.params.userId, 10);
  const target = await userService.findUserById(userId);
  if (!target) return fail(reply, ErrorCode.USER_NOT_FOUND, '用户不存在');

  try {
    const codeResult = await totpService.getUserCode(userId);

    await writeLog({
      operatorId: request.user.id, operatorName: request.user.username,
      targetUserId: userId, targetUsername: target.username,
      actionType: 'ADMIN_VIEW_CODE', actionDesc: `管理员查询用户 ${target.username} 的动态码`,
      clientIp: request.ip, result: 1,
    });

    return success(reply, codeResult);
  } catch (err) {
    if (err.message === 'TOTP_NOT_ENABLED') {
      return fail(reply, ErrorCode.TOTP_NOT_ENABLED, '该用户未开通2FA');
    }
    throw err;
  }
}

/**
 * 管理员查看用户的当前TOTP密钥（用于二维码绑定、用户自助扫描）
 * 返回原始 base32 secret 和 otpauth URL（Google Authenticator 兼容）
 */
export async function getUserSecret(request, reply) {
  const schema = z.object({
    adminPassword: z.string().min(1).max(128),
  });
  const parsed = schema.safeParse(request.body);
  if (!parsed.success) {
    return fail(reply, ErrorCode.PARAM_ERROR, '请输入管理员密码');
  }

  const userId = parseInt(request.params.userId, 10);
  if (!userId) return fail(reply, ErrorCode.PARAM_ERROR, '用户ID无效');

  const admin = await prisma.systemUser.findUnique({
    where: { id: request.user.id },
    select: { password: true, username: true },
  });

  const passwordValid = await bcrypt.compare(parsed.data.adminPassword, admin.password);
  if (!passwordValid) {
    await writeLog({
      operatorId: request.user.id, operatorName: request.user.username,
      targetUserId: userId,
      actionType: 'ADMIN_VIEW_SECRET',
      actionDesc: `管理员查看用户TOTP密钥失败：密码验证失败`,
      clientIp: request.ip, result: 0, failReason: '密码验证失败',
    });
    return fail(reply, ErrorCode.WRONG_CREDENTIALS, '管理员密码错误');
  }

  const key = await totpService.getUserKey(userId);
  if (!key || key.isEnable !== 1) {
    return fail(reply, ErrorCode.TOTP_NOT_ENABLED, '该用户尚未绑定TOTP');
  }

  const secret = decrypt(key.encryptedSecret);
  const user = await prisma.systemUser.findUnique({
    where: { id: userId }, select: { username: true },
  });

  const otpauthUrl = `otpauth://totp/TOTPClient:${encodeURIComponent(user.username)}?secret=${secret}&issuer=TOTPClient&period=30&digits=6&algorithm=SHA1`;

  await writeLog({
    operatorId: request.user.id, operatorName: request.user.username,
    targetUserId: userId, targetUsername: user.username,
    actionType: 'ADMIN_VIEW_SECRET',
    actionDesc: `管理员查看用户 ${user.username} 的TOTP密钥`,
    clientIp: request.ip, result: 1,
  });

  return success(reply, {
    userId,
    username: user.username,
    secret,
    otpauthUrl,
    boundAt: key.resetTime,
  });
}
