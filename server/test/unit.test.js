import { describe, it, expect, beforeAll } from 'vitest';
import crypto from 'node:crypto';

// 必须先设置环境变量再导入
process.env.JWT_SECRET = 'a'.repeat(64);
process.env.TOTP_MASTER_KEY = 'b'.repeat(64);
process.env.DATABASE_URL = 'mysql://test:test@127.0.0.1:3306/test';

// Mock prisma 和 token-blacklist 避免依赖数据库
import { vi } from 'vitest';
vi.mock('../src/utils/prisma.js', () => ({
  prisma: {
    tokenBlacklist: {
      findUnique: async () => null,
      findFirst: async () => null,
      deleteMany: async () => ({ count: 0 }),
      create: async () => ({}),
    },
  },
}));
vi.mock('../src/services/token-blacklist.service.js', () => ({
  revokeJti: async () => {},
  isRevoked: async () => false,
}));

const { encrypt, decrypt } = await import('../src/utils/crypto.js');
const { totp, generateCode, generateSecret } = await import('../src/utils/totp.js');
const { parseOtpauthUri } = await import('../src/utils/otpauth.js');
const { signToken, verifyToken, extractToken, revokeToken } = await import('../src/services/auth.service.js');
const { authorize, authorizeDeptAdmin } = await import('../src/middlewares/authorize.js');
const { assertEnv } = await import('../src/utils/env.js');
const { success, fail, ErrorCode } = await import('../src/utils/response.js');

describe('加密模块 crypto.js', () => {
  it('加密后解密应能还原原文', () => {
    const plain = 'JBSWY3DPEHPK3PXP';
    const encrypted = encrypt(plain);
    expect(encrypted).toContain(':'); // iv:authTag:ciphertext 格式
    expect(decrypt(encrypted)).toBe(plain);
  });

  it('相同明文每次加密结果不同（IV 随机）', () => {
    const a = encrypt('same');
    const b = encrypt('same');
    expect(a).not.toBe(b);
    expect(decrypt(a)).toBe('same');
    expect(decrypt(b)).toBe('same');
  });

  it('中文也能加密', () => {
    const plain = '中文测试密钥-测试-一二三';
    expect(decrypt(encrypt(plain))).toBe(plain);
  });

  it('篡改密文应失败（GCM 完整性校验）', () => {
    const enc = encrypt('test');
    // 修改最后一位
    const tampered = enc.slice(0, -1) + (enc.endsWith('0') ? '1' : '0');
    expect(() => decrypt(tampered)).toThrow();
  });
});

describe('TOTP 模块 totp.js', () => {
  it('generateSecret 应生成 32 位 base32 字符串', () => {
    const secret = generateSecret();
    expect(secret).toMatch(/^[A-Z2-7]{32}$/);
  });

  it('生成码应为 6 位数字', () => {
    const secret = 'JBSWY3DPEHPK3PXPJBSWY3DPEHPK3PXP';
    const { code, remainSeconds } = generateCode(secret);
    expect(code).toMatch(/^\d{6}$/);
    expect(remainSeconds).toBeGreaterThan(0);
    expect(remainSeconds).toBeLessThanOrEqual(30);
  });

  it('不同 secret 应生成不同码', () => {
    const a = generateCode('JBSWY3DPEHPK3PXPJBSWY3DPEHPK3PXP');
    const b = generateCode('KRSXG5BAONSWG4TFOQKRSXG5BAONSWG');
    expect(a.code).not.toBe(b.code);
  });

  it('otplib.totp 与服务端 generateCode 输出一致', async () => {
    const { totp: otplibTotp } = await import('otplib');
    otplibTotp.options = { digits: 6, step: 30, algorithm: 'sha1' };
    const secret = 'JBSWY3DPEHPK3PXPJBSWY3DPEHPK3PXP';
    const expected = otplibTotp.generate(secret);
    const { code } = generateCode(secret);
    expect(code).toBe(expected);
  });
});

describe('otpauth URI 解析', () => {
  it('解析标准 Google Authenticator 格式', () => {
    const uri = 'otpauth://totp/Example:alice@example.com?secret=JBSWY3DPEHPK3PXP&issuer=Example&algorithm=SHA1&digits=6&period=30';
    const r = parseOtpauthUri(uri);
    expect(r.valid).toBe(true);
    expect(r.data.issuer).toBe('Example');
    expect(r.data.account).toBe('alice@example.com');
    expect(r.data.secret).toBe('JBSWY3DPEHPK3PXP');
    expect(r.data.algorithm).toBe('SHA1');
    expect(r.data.digits).toBe(6);
    expect(r.data.period).toBe(30);
  });

  it('解析无 issuer 的格式', () => {
    const uri = 'otpauth://totp/alice?secret=JBSWY3DPEHPK3PXP';
    const r = parseOtpauthUri(uri);
    expect(r.valid).toBe(true);
    expect(r.data.account).toBe('alice');
    expect(r.data.issuer).toBe('');
  });

  it('不支持的 algorithm 应回退到 SHA1', () => {
    const uri = 'otpauth://totp/test?secret=JBSWY3DPEHPK3PXP&algorithm=MD5';
    const r = parseOtpauthUri(uri);
    expect(r.valid).toBe(true);
    expect(r.data.algorithm).toBe('SHA1');
  });

  it('不支持的 digits/period 应回退到默认值', () => {
    const uri = 'otpauth://totp/test?secret=JBSWY3DPEHPK3PXP&digits=10&period=45';
    const r = parseOtpauthUri(uri);
    expect(r.valid).toBe(true);
    expect(r.data.digits).toBe(6);
    expect(r.data.period).toBe(30);
  });

  it('缺少 secret 应报错', () => {
    const uri = 'otpauth://totp/test';
    const r = parseOtpauthUri(uri);
    expect(r.valid).toBe(false);
    expect(r.error).toContain('secret');
  });

  it('非 otpauth 协议应报错', () => {
    const r = parseOtpauthUri('http://example.com');
    expect(r.valid).toBe(false);
  });

  it('非 TOTP 类型应报错', () => {
    const r = parseOtpauthUri('otpauth://hotp/test?secret=JBSWY3DPEHPK3PXP');
    expect(r.valid).toBe(false);
  });

  it('非法 base32 secret 应报错', () => {
    const uri = 'otpauth://totp/test?secret=INVALID-CHAR$';
    const r = parseOtpauthUri(uri);
    expect(r.valid).toBe(false);
  });

  it('空 URI 应报错', () => {
    expect(parseOtpauthUri('').valid).toBe(false);
    expect(parseOtpauthUri(null).valid).toBe(false);
  });
});

describe('JWT Token', () => {
  it('签发 + 验证 payload 一致', async () => {
    const token = signToken({ id: 1, username: 'test', role: 'user' }, 60);
    const decoded = await verifyToken(token);
    expect(decoded.id).toBe(1);
    expect(decoded.username).toBe('test');
    expect(decoded.role).toBe('user');
    expect(decoded.jti).toBeDefined();
  });

  it('过期 token 应抛错', async () => {
    const token = signToken({ id: 1 }, 1);
    await new Promise(r => setTimeout(r, 1100));
    await expect(verifyToken(token)).rejects.toThrow();
  });

  it('伪造 token 应抛错', async () => {
    const fake = 'eyJhbGciOiJIUzI1NiJ9.eyJpZCI6MX0.fake';
    await expect(verifyToken(fake)).rejects.toThrow();
  });

  it('extractToken 提取 Bearer token', () => {
    expect(extractToken('Bearer abc.def.ghi')).toBe('abc.def.ghi');
    expect(extractToken('Bearer abc')).toBe('abc');
    expect(extractToken('Basic abc')).toBe(null);
    expect(extractToken('')).toBe(null);
    expect(extractToken(null)).toBe(null);
  });
});

describe('权限中间件 authorize', () => {
  const reply = {
    code: function (s) { this.status = s; return this; },
    send: function (body) { this.body = body; return this; },
  };

  function makeReq(role, deptId) {
    return { user: { id: 1, role, deptId } };
  }

  it('authorize(roles) 允许匹配角色', async () => {
    const mw = authorize('admin', 'super_admin');
    const req = makeReq('super_admin');
    const result = await mw(req, reply);
    expect(result).toBeUndefined();
  });

  it('authorize(roles) 拒绝不匹配角色', async () => {
    const mw = authorize('super_admin');
    const req = makeReq('user');
    const result = await mw(req, reply);
    expect(result).toBeDefined();
    expect(reply.body.code).toBe(ErrorCode.FORBIDDEN);
  });

  it('authorize(roles) 未登录应拒绝', async () => {
    const mw = authorize('super_admin');
    const result = await mw({}, reply);
    expect(reply.body.code).toBe(ErrorCode.TOKEN_INVALID);
  });

  it('authorizeDeptAdmin 允许 super_admin', async () => {
    const mw = authorizeDeptAdmin();
    const req = makeReq('super_admin');
    const result = await mw(req, reply);
    expect(result).toBeUndefined();
  });

  it('authorizeDeptAdmin 允许有部门的 dept_admin', async () => {
    const mw = authorizeDeptAdmin();
    const req = makeReq('dept_admin', 5);
    const result = await mw(req, reply);
    expect(result).toBeUndefined();
  });

  it('authorizeDeptAdmin 拒绝无部门的 dept_admin', async () => {
    const mw = authorizeDeptAdmin();
    const req = makeReq('dept_admin', null);
    await mw(req, reply);
    expect(reply.body.code).toBe(ErrorCode.FORBIDDEN);
  });

  it('authorizeDeptAdmin 拒绝普通 user', async () => {
    const mw = authorizeDeptAdmin();
    const req = makeReq('user', 1);
    await mw(req, reply);
    expect(reply.body.code).toBe(ErrorCode.FORBIDDEN);
  });
});

describe('环境变量校验', () => {
  it('完整环境变量应通过', () => {
    process.env.JWT_SECRET = 'a'.repeat(64);
    process.env.TOTP_MASTER_KEY = 'b'.repeat(64);
    process.env.DATABASE_URL = 'mysql://x:x@x/x';
    expect(() => assertEnv()).not.toThrow();
  });

  it('缺 TOTP_MASTER_KEY 应抛错', () => {
    const orig = process.env.TOTP_MASTER_KEY;
    process.env.TOTP_MASTER_KEY = '';
    expect(() => assertEnv()).toThrow(/TOTP_MASTER_KEY/);
    process.env.TOTP_MASTER_KEY = orig;
  });

  it('TOTP_MASTER_KEY 长度不对应抛错', () => {
    const orig = process.env.TOTP_MASTER_KEY;
    process.env.TOTP_MASTER_KEY = 'ab';
    expect(() => assertEnv()).toThrow(/TOTP_MASTER_KEY.*64/);
    process.env.TOTP_MASTER_KEY = orig;
  });

  it('未替换的占位符应抛错', () => {
    const orig = process.env.JWT_SECRET;
    process.env.JWT_SECRET = 'REPLACE_WITH_RANDOM_SECRET';
    expect(() => assertEnv()).toThrow();
    process.env.JWT_SECRET = orig;
  });
});

describe('响应工具', () => {
  it('success 返回 code=0 + data', () => {
    const reply = { code: function (s) { this.status = s; return this; }, send: function (b) { this.body = b; return this; } };
    success(reply, { foo: 1 }, '操作成功');
    expect(reply.status).toBe(200);
    expect(reply.body.code).toBe(0);
    expect(reply.body.message).toBe('操作成功');
    expect(reply.body.data).toEqual({ foo: 1 });
  });

  it('fail 返回自定义 code + http status', () => {
    const reply = { code: function (s) { this.status = s; return this; }, send: function (b) { this.body = b; return this; } };
    fail(reply, 1001, '参数错误', 400);
    expect(reply.status).toBe(400);
    expect(reply.body.code).toBe(1001);
    expect(reply.body.message).toBe('参数错误');
  });

  it('ErrorCode 错误码定义完整', () => {
    expect(ErrorCode.SUCCESS).toBe(0);
    expect(ErrorCode.PARAM_ERROR).toBe(1001);
    expect(ErrorCode.TOKEN_INVALID).toBe(1005);
    expect(ErrorCode.FORBIDDEN).toBe(1007);
  });
});

// ============================================================
// 独立测试：token-blacklist 真实实现（覆盖 issue1: 过期 token 不应被判为吊销）
// 不使用上面的 mock，单独 import 并针对 prisma.tokenBlacklist.findFirst 进行细粒度 mock
// ============================================================
import { vi as vi2 } from 'vitest';

describe('token-blacklist 真实实现 (issue1: 过期 token)', () => {
  // 动态 import 真实模块（上方已对整个模块做 mock，这里用 re-import 拿真实实现）
  let realModule;
  beforeAll(async () => {
    realModule = await vi2.importActual('../src/services/token-blacklist.service.js');
  });

  it('未过期的 jti 应当返回 true', async () => {
    const future = BigInt(Date.now() + 60_000);
    const spy = vi2.fn(async (args) => {
      // 模拟 findFirst 按 where 条件过滤
      if (args.where.jti === 'jti-fresh' && args.where.expireAt.gt <= future) {
        return { jti: 'jti-fresh', expireAt: future };
      }
      return null;
    });
    const prismaMod = await import('../src/utils/prisma.js');
    const original = prismaMod.prisma.tokenBlacklist.findFirst;
    prismaMod.prisma.tokenBlacklist.findFirst = spy;
    try {
      const result = await realModule.isRevoked('jti-fresh');
      expect(result).toBe(true);
      expect(spy).toHaveBeenCalled();
      const call = spy.mock.calls[0][0];
      expect(call.where.jti).toBe('jti-fresh');
      expect(call.where.expireAt).toBeTruthy();
    } finally {
      prismaMod.prisma.tokenBlacklist.findFirst = original;
    }
  });

  it('已过期的 jti 应当返回 false（修复前的 bug：会返回 true）', async () => {
    const past = BigInt(Date.now() - 60_000);
    const spy = vi2.fn(async (args) => {
      // 真实 findFirst 行为：若 expireAt <= now 则不会返回该行
      if (args.where.expireAt.gt > BigInt(Date.now())) {
        return { jti: 'jti-stale', expireAt: past };
      }
      return null;
    });
    const prismaMod = await import('../src/utils/prisma.js');
    const original = prismaMod.prisma.tokenBlacklist.findFirst;
    prismaMod.prisma.tokenBlacklist.findFirst = spy;
    try {
      const result = await realModule.isRevoked('jti-stale');
      expect(result).toBe(false);
    } finally {
      prismaMod.prisma.tokenBlacklist.findFirst = original;
    }
  });

  it('空 jti 应直接返回 false（无需查库）', async () => {
    const result = await realModule.isRevoked('');
    expect(result).toBe(false);
    const result2 = await realModule.isRevoked(null);
    expect(result2).toBe(false);
  });

  it('数据库返回 null 时应返回 false', async () => {
    const prismaMod = await import('../src/utils/prisma.js');
    const original = prismaMod.prisma.tokenBlacklist.findFirst;
    prismaMod.prisma.tokenBlacklist.findFirst = vi2.fn(async () => null);
    try {
      const result = await realModule.isRevoked('jti-unknown');
      expect(result).toBe(false);
    } finally {
      prismaMod.prisma.tokenBlacklist.findFirst = original;
    }
  });
});
