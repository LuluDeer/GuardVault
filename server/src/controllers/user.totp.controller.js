import * as totpService from '../services/totp.service.js';
import { writeLog } from '../services/log.service.js';
import { success, fail, ErrorCode } from '../utils/response.js';
import { z } from 'zod';
import { decrypt } from '../utils/crypto.js';
import { prisma } from '../utils/prisma.js';
import bcrypt from 'bcryptjs';

/**
 * 用户获取个人动态码
 */
export async function getMyCode(request, reply) {
  const userId = request.user.id;

  try {
    const codeResult = await totpService.getUserCode(userId);

    await writeLog({
      operatorId: userId, operatorName: request.user.username,
      actionType: 'USER_GET_CODE', actionDesc: '用户获取个人动态验证码',
      clientIp: request.ip, result: 1,
    });

    return success(reply, codeResult);
  } catch (err) {
    if (err.message === 'TOTP_NOT_ENABLED') {
      return fail(reply, ErrorCode.TOTP_NOT_ENABLED, '2FA权限未开通，请联系管理员');
    }
    throw err;
  }
}

export async function verifyTotp(request, reply) {
  const schema = z.object({
    code: z.string().length(6),
  });
  const parsed = schema.safeParse(request.body);
  if (!parsed.success) {
    return fail(reply, ErrorCode.PARAM_ERROR, '验证码必须为6位数字');
  }

  const userId = request.user.id;
  try {
    const valid = await totpService.verifyTotp(userId, parsed.data.code);

    await writeLog({
      operatorId: userId, operatorName: request.user.username,
      actionType: 'USER_VERIFY_TOTP',
      actionDesc: valid ? 'TOTP验证成功' : 'TOTP验证失败',
      clientIp: request.ip, result: valid ? 1 : 0,
    });

    return success(reply, { valid });
  } catch (err) {
    if (err.message === 'TOTP_NOT_ENABLED') {
      return fail(reply, ErrorCode.TOTP_NOT_ENABLED, '2FA权限未开通，请联系管理员');
    }
    throw err;
  }
}

export async function getMySecret(request, reply) {
  const schema = z.object({
    password: z.string().min(1).max(128),
  });
  const parsed = schema.safeParse(request.body);
  if (!parsed.success) {
    return fail(reply, ErrorCode.PARAM_ERROR, '请输入密码');
  }

  const userId = request.user.id;
  const user = await prisma.systemUser.findUnique({
    where: { id: userId },
    select: { password: true },
  });
  if (!user) {
    return fail(reply, ErrorCode.USER_NOT_FOUND, '用户不存在');
  }

  const passwordValid = await bcrypt.compare(parsed.data.password, user.password);
  if (!passwordValid) {
    await writeLog({
      operatorId: userId, operatorName: request.user.username,
      actionType: 'USER_VIEW_SECRET',
      actionDesc: '用户查看TOTP密钥失败：密码验证失败',
      clientIp: request.ip, result: 0, failReason: '密码验证失败',
    });
    return fail(reply, ErrorCode.WRONG_CREDENTIALS, '密码错误');
  }

  const key = await totpService.getUserKey(userId);
  if (!key || key.isEnable !== 1) {
    return fail(reply, ErrorCode.TOTP_NOT_ENABLED, '2FA权限未开通，请联系管理员');
  }

  const secret = decrypt(key.encryptedSecret);
  const otpauthUrl = `otpauth://totp/TOTPClient:${encodeURIComponent(request.user.username)}?secret=${secret}&issuer=TOTPClient&period=30&digits=6&algorithm=SHA1`;

  await writeLog({
    operatorId: userId, operatorName: request.user.username,
    actionType: 'USER_VIEW_SECRET',
    actionDesc: '用户查看自己的TOTP密钥',
    clientIp: request.ip, result: 1,
  });

  return success(reply, {
    userId,
    username: request.user.username,
    secret,
    otpauthUrl,
    boundAt: key.resetTime,
  });
}
