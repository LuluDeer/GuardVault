// 局域网服务端发现：扫描本机所有 IPv4 网卡所在 /24 + 127.0.0.1，并发探测 /health
// 通过 GuardVault 服务端响应 {status:'ok'} 来识别
//
// 注意事项：
// - 用原 net/http，避免拉额外依赖
// - 单次探测 timeoutMs 默认 500ms，并发 200，总耗时约 2s
// - 对同 /24 内不存在的 IP，connect 会被 RST/ICMP unreachable 快速拒绝，
//   跨网段的目标则按 timeout 退出

const os = require('node:os');
const http = require('node:http');

const DEFAULT_PORT = 3001;
const DEFAULT_TIMEOUT_MS = 500;
const MAX_CONCURRENCY = 200;

function listLocalIPv4Networks() {
  const nets = os.networkInterfaces();
  const out = [];
  for (const name of Object.keys(nets)) {
    for (const info of nets[name] || []) {
      if (info.family !== 'IPv4' || info.internal) continue;
      const ip = info.address;
      const parts = ip.split('.');
      if (parts.length !== 4) continue;
      const cidr24 = `${parts[0]}.${parts[1]}.${parts[2]}`;
      out.push({ iface: name, ip, cidr24 });
    }
  }
  return out;
}

function buildProbeList(port) {
  const targets = new Set();
  // 本机
  targets.add(`127.0.0.1:${port}`);
  // 所有网卡所在 /24
  for (const { ip, cidr24 } of listLocalIPv4Networks()) {
    targets.add(`${ip}:${port}`); // 自身
    for (let i = 1; i < 255; i++) {
      targets.add(`${cidr24}.${i}:${port}`);
    }
  }
  return Array.from(targets);
}

function probeOnce(host, port, timeoutMs) {
  return new Promise((resolve) => {
    const start = Date.now();
    const req = http.request(
      { host, port, path: '/health', method: 'GET', timeout: timeoutMs },
      (res) => {
        // 读 body 但限制大小（health 响应很小）
        let body = '';
        res.setEncoding('utf8');
        res.on('data', (chunk) => {
          if (body.length < 1024) body += chunk;
        });
        res.on('end', () => {
          const latencyMs = Date.now() - start;
          if (res.statusCode === 200 && /"status"\s*:\s*"ok"/.test(body)) {
            resolve({ ok: true, statusCode: res.statusCode, body, latencyMs });
            return;
          }
          resolve({ ok: false, statusCode: res.statusCode, body, latencyMs });
        });
      }
    );
    req.on('error', () => resolve({ ok: false }));
    req.on('timeout', () => {
      req.destroy();
      resolve({ ok: false });
    });
    req.end();
  });
}

// 并发限制的 map：每执行一个 pick 一个 next index
async function mapWithConcurrency(items, concurrency, fn) {
  const results = new Array(items.length);
  let next = 0;
  const workers = Array.from({ length: Math.min(concurrency, items.length) }, async () => {
    while (true) {
      const i = next++;
      if (i >= items.length) return;
      results[i] = await fn(items[i], i);
    }
  });
  await Promise.all(workers);
  return results;
}

/**
 * 局域网发现 GuardVault 服务端
 * @param {{ port?: number, timeoutMs?: number, extraHosts?: string[] }} opts
 * @returns {Promise<Array<{url:string, host:string, port:number, latencyMs:number}>>}
 */
async function discoverServers(opts = {}) {
  const port = Number(opts.port) || DEFAULT_PORT;
  const timeoutMs = Number(opts.timeoutMs) || DEFAULT_TIMEOUT_MS;

  const targets = buildProbeList(port);

  // 可选：附加手动 hint（用户上次配的）
  if (Array.isArray(opts.extraHosts)) {
    for (const h of opts.extraHosts) {
      const m = /^([^:]+):(\d+)$/.exec(h.trim());
      if (m) targets.push(`${m[1]}:${m[2]}`);
    }
  }

  // 去重
  const uniq = Array.from(new Set(targets));

  const probes = await mapWithConcurrency(uniq, MAX_CONCURRENCY, async (target) => {
    const [host, portStr] = target.split(':');
    const p = parseInt(portStr, 10);
    const r = await probeOnce(host, p, timeoutMs);
    return { target, host, port: p, ...r };
  });

  const found = [];
  for (const r of probes) {
    if (r.ok) {
      found.push({
        url: `http://${r.host}:${r.port}`,
        host: r.host,
        port: r.port,
        latencyMs: r.latencyMs,
      });
    }
  }
  // 按延迟升序，本机优先
  found.sort((a, b) => a.latencyMs - b.latencyMs);
  return found;
}

module.exports = { discoverServers, listLocalIPv4Networks };
