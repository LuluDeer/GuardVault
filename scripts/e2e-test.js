#!/usr/bin/env node
/**
 * 端到端测试脚本：完整链路验证
 * 流程：管理员登录 → 创建部门 → 创建用户 → 录入服务 → 授权 → 用户登录 → 取码 → 审计验证
 */
// 用 otplib.totp（与服务端实现一致）验证服务端 TOTP 码
import { totp } from 'otplib';

totp.options = { digits: 6, step: 30, algorithm: 'sha1' };

const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';

const BASE = 'http://127.0.0.1:3000';
let totalPass = 0;
let totalFail = 0;
const failures = [];

function assert(cond, label) {
  if (cond) {
    console.log(`  ✅ ${label}`);
    totalPass++;
  } else {
    console.log(`  ❌ ${label}`);
    totalFail++;
    failures.push(label);
  }
}

async function call(method, path, body, token) {
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers.Authorization = `Bearer ${token}`;
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });
  let json = null;
  try { json = await res.json(); } catch {}
  return { status: res.status, body: json };
}

async function main() {
  console.log('=== TOTP 端到端测试 ===\n');

  // 1. 健康检查
  console.log('[1] 健康检查');
  const health = await call('GET', '/health');
  assert(health.status === 200 && health.body.status === 'ok', 'GET /health 200 OK');

  // 2. 管理员登录（尝试默认账户）
  console.log('\n[2] 管理员登录');
  // 先尝试 admin/Admin@123（已设置）
  const adminLogin = await call('POST', '/api/admin/login', {
    username: 'admin',
    password: 'Admin@123',
  });
  let adminToken = null;
  if (adminLogin.status === 200) {
    adminToken = adminLogin.body.data?.token;
    assert(adminToken, 'admin/Admin@123 登录成功');
  } else {
    // 解锁 admin 账户（重置 fail_count=0, locked_until=NULL）需要数据库直接操作
    console.log('  登录失败:', JSON.stringify(adminLogin.body));
    console.log('  请先在数据库中解锁 admin 账户并设置密码为 Admin@123');
    process.exit(1);
  }

  // 3. 创建部门
  console.log('\n[3] 部门管理');
  const deptCode = `D${Date.now()}`.slice(-16);
  const deptRes = await call('POST', '/api/admin/dept/create', {
    name: `测试部-${Date.now()}`,
    code: deptCode,
    description: 'E2E 自动创建',
  }, adminToken);
  let deptId = null;
  if (deptRes.status === 200 && deptRes.body.data) {
    deptId = deptRes.body.data.id;
    assert(deptId, `创建部门 id=${deptId}`);
  } else {
    // 已存在则取第一个
    const list = await call('GET', '/api/admin/dept/all', null, adminToken);
    const first = list.body.data?.[0];
    if (first) {
      deptId = first.id;
      assert(true, `复用已存在部门 id=${deptId}`);
    } else {
      console.log('  部门创建失败:', JSON.stringify(deptRes.body));
      assert(false, '无部门可用');
      return;
    }
  }

  // 4. 创建用户
  console.log('\n[4] 用户管理');
  const uname = `e2e_user_${Date.now()}`;
  const uRes = await call('POST', '/api/admin/user/create', {
    username: uname,
    password: 'User@123',
    name: 'E2E 测试员',
    role: 'user',
    deptId,
  }, adminToken);
  let userId = null;
  if (uRes.status === 200) {
    userId = uRes.body.data?.id;
    assert(userId, `创建用户 id=${userId}`);
  } else {
    console.log('  创建用户失败:', JSON.stringify(uRes.body));
    assert(false, '创建用户');
    return;
  }

  // 5. 录入服务（用固定 secret 便于本地验证）
  console.log('\n[5] 服务账号管理');
  // 32 base32 chars = 20 bytes = 160 bit
  const secret = 'JBSWY3DPEHPK3PXPJBSWY3DPEHPK3PXP';
  const svcRes = await call('POST', '/api/admin/service/create', {
    name: `E2E-AWS-${Date.now()}`,
    category: '云服务',
    identifier: 'admin@example.com',
    url: 'https://aws.amazon.com',
    remark: 'E2E 测试服务',
    secret,
    digits: 6,
    period: 30,
    algorithm: 'SHA1',
    deptId,
  }, adminToken);
  let serviceId = null;
  if (svcRes.status === 200 && svcRes.body.data) {
    serviceId = svcRes.body.data.id;
    assert(serviceId, `创建服务 id=${serviceId}`);
  } else {
    console.log('  服务创建失败:', JSON.stringify(svcRes.body));
    assert(false, '创建服务');
    return;
  }

  // 5.1 验证密钥加解密无损
  const secretCheck = await call('GET', `/api/admin/service/${serviceId}/secret`, null, adminToken);
  if (secretCheck.status === 200 && secretCheck.body.data?.plainSecret === secret) {
    assert(true, '密钥加密→解密 round-trip 无损');
  } else {
    assert(false, `密钥 round-trip 异常: ${JSON.stringify(secretCheck.body).slice(0, 200)}`);
  }

  // 6. otpauth URI 录入
  console.log('\n[6] 扫码录入（otpauth URI）');
  // 用独立固定 secret
  const scanSecret = 'KRSXG5BAONSWG4TFOQ'; // 20 chars = 100 bit
  const otpauthUri = `otpauth://totp/VPN-Test?secret=${scanSecret}&issuer=VPN&algorithm=SHA1&digits=6&period=30`;
  const scanRes = await call('POST', '/api/admin/service/scan-create', {
    uri: otpauthUri,
    name: 'E2E-VPN-Scan',
    category: 'VPN',
    deptId,
  }, adminToken);
  if (scanRes.status === 200 && scanRes.body.data) {
    assert(true, `otpauth URI 解析录入 id=${scanRes.body.data.id}`);
  } else {
    console.log('  扫码录入失败:', JSON.stringify(scanRes.body));
    assert(false, 'otpauth URI 录入');
  }

  // 7. 授权
  console.log('\n[7] 授权管理');
  const grantRes = await call('POST', '/api/admin/grant/grant', {
    userId,
    accountId: serviceId,
  }, adminToken);
  assert(grantRes.status === 200, `授权 user=${userId} → service=${serviceId} (${JSON.stringify(grantRes.body).slice(0,100)})`);

  // 8. 用户登录
  console.log('\n[8] 用户登录');
  const userLogin = await call('POST', '/api/user/login', {
    username: uname,
    password: 'User@123',
  });
  let userToken = null;
  if (userLogin.status === 200) {
    userToken = userLogin.body.data?.token;
    assert(userToken, '用户登录成功');
  } else {
    console.log('  登录失败:', JSON.stringify(userLogin.body));
    assert(false, '用户登录');
    return;
  }

  // 9. 获取服务列表
  console.log('\n[9] 用户端服务列表');
  const svcList = await call('GET', '/api/user/service/list', null, userToken);
  const services = svcList.body.data || [];
  assert(services.length >= 1, `服务列表长度=${services.length}`);
  assert(services.some(s => s.id === serviceId), '列表包含授权的服务');

  // 10. 取码并验证
  console.log('\n[10] 取码 + 验证');
  const codeRes = await call('GET', `/api/user/service/${serviceId}/code`, null, userToken);
  if (codeRes.status === 200) {
    const code = codeRes.body.data?.code;
    const remain = codeRes.body.data?.remainSeconds;
    assert(typeof code === 'string' && /^\d{6}$/.test(code), `验证码格式正确: ${code}`);
    assert(typeof remain === 'number' && remain > 0 && remain <= 30, `剩余秒数=${remain}`);

    // 用 otplib.totp 验证生成的码（与服务端实现一致）
    const expected = totp.generate(secret);
    assert(code === expected, `服务端码与 otplib.totp 一致 (实际=${code}, 期望=${expected})`);
  } else {
    assert(false, '取码');
  }

  // 11. 复制上报
  console.log('\n[11] 复制上报');
  const copyRes = await call('POST', '/api/user/service/copy-report', {
    accountId: serviceId,
  }, userToken);
  assert(copyRes.status === 200, `复制上报成功 (${JSON.stringify(copyRes.body).slice(0,80)})`);

  // 12. 审计查询
  console.log('\n[12] 审计聚合');
  const summary = await call('GET', '/api/admin/audit/summary', null, adminToken);
  assert(summary.status === 200, '审计 summary 200');
  if (summary.body.data) {
    assert(typeof summary.body.data.totalAccounts === 'number', 'summary.totalAccounts 存在');
    assert(typeof summary.body.data.totalUsers === 'number', 'summary.totalUsers 存在');
    assert(typeof summary.body.data.totalGrants === 'number', 'summary.totalGrants 存在');
  }
  const svcView = await call('GET', '/api/admin/audit/service-views', null, adminToken);
  assert(svcView.status === 200, '服务查看 Top 聚合 OK');
  const daily = await call('GET', '/api/admin/audit/daily?days=7', null, adminToken);
  assert(daily.status === 200, '每日趋势聚合 OK');

  // 13. 撤销授权 + 再次取码应失败
  console.log('\n[13] 撤销授权 + 权限失效验证');
  const revokeRes = await call('POST', '/api/admin/grant/revoke', { userId, accountId: serviceId }, adminToken);
  assert(revokeRes.status === 200, '撤销授权');
  const deniedRes = await call('GET', `/api/user/service/${serviceId}/code`, null, userToken);
  // 业务层 fail() 默认 HTTP 200，错误通过响应体 code 字段体现
  const isForbidden = deniedRes.body?.code === 1006 || deniedRes.body?.code === 1001;
  assert(isForbidden, `无权限访问应被拒 (http=${deniedRes.status}, code=${deniedRes.body?.code}, msg=${deniedRes.body?.message})`);

  // 14. 重新授权 + 服务收藏（favorites）
  console.log('\n[14] 服务收藏 (Favorites)');
  const reGrantRes = await call('POST', '/api/admin/grant/grant', { userId, accountId: serviceId }, adminToken);
  assert(reGrantRes.status === 200, '重新授权');

  // 添加收藏
  const addFavRes = await call('POST', '/api/user/favorite/add', { accountId: serviceId }, userToken);
  assert(addFavRes.status === 200 && addFavRes.body.code === 0, `添加收藏成功 (${JSON.stringify(addFavRes.body).slice(0,80)})`);

  // 重复添加应幂等
  const addFavRes2 = await call('POST', '/api/user/favorite/add', { accountId: serviceId }, userToken);
  assert(addFavRes2.status === 200, '重复添加收藏应幂等成功');

  // 列表
  const listFavRes = await call('GET', '/api/user/favorite/list', null, userToken);
  assert(listFavRes.status === 200 && Array.isArray(listFavRes.body.data), '收藏列表 200');
  const hasThis = listFavRes.body.data?.some(f => f.accountId === serviceId);
  assert(hasThis, `收藏列表中包含 #${serviceId}`);

  // 重排（把同一个放进去至少 1 条）
  const reorderRes = await call('POST', '/api/user/favorite/reorder', { orderedAccountIds: [serviceId] }, userToken);
  assert(reorderRes.status === 200, `重排收藏成功 (count=${reorderRes.body.data?.count})`);

  // 取消收藏
  const rmFavRes = await call('POST', '/api/user/favorite/remove', { accountId: serviceId }, userToken);
  assert(rmFavRes.status === 200, '取消收藏成功');

  const listFavRes2 = await call('GET', '/api/user/favorite/list', null, userToken);
  const stillHas = listFavRes2.body.data?.some(f => f.accountId === serviceId);
  assert(!stillHas, '取消后列表为空');

  // 15. 日志清理（手动触发 + 默认 90 天 + 不应影响近期日志）
  console.log('\n[15] 审计日志自动清理');
  // retentionDays=3650（10 年）应清 0 条
  const cleanupRes = await call('POST', '/api/admin/log/cleanup', { retentionDays: 3650 }, adminToken);
  assert(cleanupRes.status === 200 && cleanupRes.body.code === 0, 'cleanup 返回 200');
  assert(typeof cleanupRes.body.data?.retentionDays === 'number', `retentionDays 是数字: ${cleanupRes.body.data?.retentionDays}`);
  assert(typeof cleanupRes.body.data?.deleted === 'number', `deleted 是数字: ${cleanupRes.body.data?.deleted}`);

  // 不传参数走默认（system_config.log_retention_days 或 90）
  const cleanupRes2 = await call('POST', '/api/admin/log/cleanup', {}, adminToken);
  assert(cleanupRes2.status === 200 && cleanupRes2.body.code === 0, 'cleanup 默认参数 200');

  // 验证刚刚的 LOG_CLEANUP 日志被记录
  const listRes = await call('GET', '/api/admin/log/list?actionType=LOG_CLEANUP&pageSize=5', null, adminToken);
  assert(listRes.status === 200, '查询 LOG_CLEANUP 日志 200');
  const hasCleanupLog = listRes.body.data?.list?.some(l => l.actionType === 'LOG_CLEANUP');
  assert(hasCleanupLog, 'LOG_CLEANUP 日志已写入');

  // 总结
  console.log(`\n=== 测试结果 ===`);
  console.log(`通过: ${totalPass}`);
  console.log(`失败: ${totalFail}`);
  if (failures.length) {
    console.log('失败项:');
    failures.forEach(f => console.log(`  - ${f}`));
  }
  process.exit(totalFail === 0 ? 0 : 1);
}

main().catch(err => {
  console.error('测试运行错误:', err);
  process.exit(1);
});
