import { z } from 'zod';
import bcrypt from 'bcryptjs';
import { findUserByUsername, recordLoginFail, clearLoginFail } from '../services/user.service.js';
import { signToken, revokeToken } from '../services/auth.service.js';
import { writeLog } from '../services/log.service.js';
import { getConfig } from '../services/config.service.js';
import { recordFailedAttempt } from '../services/ip-block.service.js';
import { createRefreshToken, revokeUserRefreshTokens } from '../services/refresh-token.service.js';
import { createChallenge, validateChallenge, clearChallenge } from '../services/challenge.service.js';
import { verifyTotp } from '../services/totp.service.js';
import { success, fail, ErrorCode } from '../utils/response.js';
import { prisma } from '../utils/prisma.js';

export async function login(request, reply) {
  const schema = z.object({
    username: z.string().min(1).max(32),
    password: z.string().min(1).max(128),
    totpCode: z.string().length(6).optional(),
  });
  const parsed = schema.safeParse(request.body);
  if (!parsed.success) {
    return fail(reply, ErrorCode.PARAM_ERROR, '参数校验失败');
  }
  const { username, password, totpCode } = parsed.data;
  const clientIp = request.ip;
  const userAgent = request.headers['user-agent'] || null;

  const user = await findUserByUsername(username);

  if (!user || !['user', 'dept_admin', 'super_admin'].includes(user.role)) {
    return fail(reply, ErrorCode.WRONG_CREDENTIALS, '用户名或密码错误');
  }

  if (user.status === 0) {
    return fail(reply, ErrorCode.ACCOUNT_DISABLED, '账号已被禁用');
  }

  const maxFail = parseInt(await getConfig('login_fail_max') || '5', 10);
  const lockMinutes = parseInt(await getConfig('login_lock_minutes') || '10', 10);

  if (user.lockedUntil && user.lockedUntil > new Date()) {
    const remainMin = Math.ceil((user.lockedUntil - Date.now()) / 60000);
    return fail(reply, ErrorCode.ACCOUNT_LOCKED, `账号已被锁定，请 ${remainMin} 分钟后再试`);
  }

  const valid = await bcrypt.compare(password, user.password);
  if (!valid) {
    const { failCount, locked } = await recordLoginFail(user.id, maxFail, lockMinutes);
    await recordFailedAttempt(clientIp, username, 'user_login');

    writeLog({
      operatorId: user.id, operatorName: username,
      actionType: 'USER_LOGIN', actionDesc: '用户登录失败：密码错误',
      clientIp, userAgent, result: 0, failReason: '密码错误',
    });
    if (locked) {
      return fail(reply, ErrorCode.ACCOUNT_LOCKED, `密码错误超过 ${maxFail} 次，账号已被锁定 ${lockMinutes} 分钟`);
    }
    const remaining = maxFail - failCount;
    return fail(reply, ErrorCode.WRONG_CREDENTIALS, `密码错误，还可尝试 ${remaining} 次`);
  }

  const totpKey = await prisma.userTotpKey.findUnique({ where: { userId: user.id }, select: { isEnable: true } });
  const totpEnabled = totpKey?.isEnable === 1;

  if (totpEnabled && !totpCode) {
    const { challengeToken, expireAt: challengeExpireAt } = await createChallenge(user.id, username);
    return success(reply, {
      totpRequired: true,
      challengeToken,
      expireAt: challengeExpireAt.toISOString(),
      message: '请输入TOTP动态验证码',
    });
  }

  const userPublic = {
    id: user.id,
    username: user.username,
    role: user.role,
    deptId: user.deptId ?? null,
  };

  if (totpEnabled && totpCode) {
    // 先校验 challengeToken 合法性（含 5 次失败锁定）
    const challengeToken = request.body.challengeToken;
    if (challengeToken) {
      try {
        await validateChallenge(user.id, challengeToken);
      } catch (err) {
        return fail(reply, err.code ?? ErrorCode.PARAM_ERROR, err.message);
      }
    }
    // 先尝试 TOTP 动态码，失败后尝试一次性恢复码
    const totpValid = await verifyTotp(user.id, totpCode);
    const usedRecovery = !totpValid && (totpCode.includes('-') || totpCode.length === 9)
      ? await consumeRecoveryCode(user.id, totpCode)
      : false;
    if (!totpValid && !usedRecovery) {
      writeLog({
        operatorId: user.id, operatorName: username,
        actionType: 'USER_LOGIN', actionDesc: '用户登录失败：TOTP验证失败',
        clientIp, userAgent, result: 0, failReason: 'TOTP验证失败',
      });
      return fail(reply, ErrorCode.WRONG_CREDENTIALS, 'TOTP验证码错误');
    }
    if (usedRecovery) {
      writeLog({
        operatorId: user.id, operatorName: username,
        actionType: 'USER_LOGIN', actionDesc: '用户使用恢复码登录',
        clientIp, userAgent, result: 1,
      });
    }

    await clearChallenge(user.id);
    await clearLoginFail(user.id, clientIp);
    await revokeUserRefreshTokens(user.id);
    const { token: refreshToken, expireAt: refreshExpireAt } = await createRefreshToken(user.id);

    const tokenHours = parseInt(await getConfig('token_expire_hours') || '2', 10);
    const expireSeconds = tokenHours * 3600;
    const token = signToken({ id: user.id, username: user.username, role: user.role, deptId: user.deptId ?? null }, expireSeconds);
    const expireAt = new Date(Date.now() + expireSeconds * 1000).toISOString();

    writeLog({
      operatorId: user.id, operatorName: username,
      actionType: 'USER_LOGIN', actionDesc: '用户登录成功',
      clientIp, userAgent, result: 1,
    });

    return success(reply, { token, expireAt, totpEnabled, refreshToken, refreshExpireAt: refreshExpireAt.toISOString(), user: userPublic });
  }

  await clearLoginFail(user.id, clientIp);
  await revokeUserRefreshTokens(user.id);
  const { token: refreshToken, expireAt: refreshExpireAt } = await createRefreshToken(user.id);

  const tokenHours = parseInt(await getConfig('token_expire_hours') || '2', 10);
  const expireSeconds = tokenHours * 3600;
  const token = signToken({ id: user.id, username: user.username, role: user.role, deptId: user.deptId ?? null }, expireSeconds);
  const expireAt = new Date(Date.now() + expireSeconds * 1000).toISOString();

  writeLog({
    operatorId: user.id, operatorName: username,
    actionType: 'USER_LOGIN', actionDesc: '用户登录成功',
    clientIp, userAgent, result: 1,
  });

  return success(reply, { token, expireAt, totpEnabled, refreshToken, refreshExpireAt: refreshExpireAt.toISOString(), user: userPublic });
}

export async function logout(request, reply) {
  await revokeToken(request.token);
  await revokeUserRefreshTokens(request.user.id);
  writeLog({
    operatorId: request.user.id, operatorName: request.user.username,
    actionType: 'USER_LOGOUT', actionDesc: '用户登出',
    clientIp: request.ip, result: 1,
  });
  return success(reply);
}
