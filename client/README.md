# GuardVault PC 客户端

Electron + Vue 3 桌面客户端，提供 TOTP 码集中查看 / 复制、局域网服务端自动发现、安全凭据存储（safeStorage）、系统托盘 / 全局快捷键 / 30 秒剪贴板自动清空。

## 模块划分

```
src/
├── main/                # 主进程（Node, CommonJS）
│   ├── index.js           # 入口：app.whenReady / 创建窗口 / 注册 IPC / 启心跳
│   ├── window-manager.js  # 窗口创建、最大化/最小化、标题栏
│   ├── tray.js            # 系统托盘：菜单、托盘显示当前 TOTP 码
│   ├── app-config.js      # 客户端本地配置（serverUrl / darkMode），存用户目录 JSON
│   ├── token-store.js     # safeStorage 加密存 Token / RefreshToken / User
│   ├── http.js            # axios 封装：自动注入 Bearer、监听 1005 → auth:expired
│   ├── discovery.js       # 局域网服务端扫描（/24 + 127.0.0.1:3001，/health 探测）
│   ├── autostart.js       # 开机自启（Win 注册表 / macOS LaunchAgent / Linux .desktop）
│   ├── user-events.js     # 全局快捷键 Ctrl+1~9 / Esc → 复制码
│   ├── ipc-config.js      # IPC：config:* / window:* / clipboard:* / notify / heartbeat
│   ├── ipc-auth.js        # IPC：auth:login / logout / user / hasToken
│   ├── ipc-business.js    # IPC：totp:code / service:* / user:changePassword
│   └── ipc-discovery.js   # IPC：discover:servers
│
├── preload/             # 预加载脚本（contextBridge 白名单）
│   └── index.js           # 暴露 window.electronAPI（getConfig / login / request / discoverServers / ...）
│
└── renderer/            # 渲染进程（Vue 3 + Pinia + vue-router）
    ├── main.js            # 挂载 App + Pinia + router
    ├── App.vue            # 标题栏 + <router-view> + bootstrap
    ├── router/index.js    # 路由 + beforeEach 鉴权守卫
    ├── api/index.js       # 渲染端 API 封装（直接调 window.electronAPI）
    ├── stores/            # Pinia: auth（用户态） / service（服务列表）
    └── views/             # Login / Config / Services / ServiceDetail / Password
```

## 关键流程

### 启动顺序
1. `main/index.js` 注册 `ipc-config → ipc-auth → ipc-business → ipc-discovery`
2. 启动 `ipc-config.startHeartbeat`（每 15s 打 `/health`，向渲染进程广播 `net:online` / `net:offline`）
3. `App.vue` onMounted 调 `auth.bootstrap()` 读本地 config + token，进入对应路由
4. 路由守卫：未登录访问受保护页面 → `/login`

### 首次配置服务端
- 没有任何 `serverUrl` 时，`/login` 自动跳 `/config`
- `Config.vue` onMounted → `api.discoverServers({ port: 3001, timeoutMs: 500 })`
- 主进程 `discovery.js` 并发扫本机所有 IPv4 网卡所在 /24 + 127.0.0.1，约 2s 返回
- 用户点选或手填 URL → 调 `/health` 验证 → 落盘 → 跳回登录页
- `auth.setServerUrl` 内部已 `rebuildClient()`，HTTP client 的 `baseURL` 即刻生效

### 登录态
- Token 落 `safeStorage`（Linux 走 kwallet/gnome-keyring），不存磁盘明文
- `auth-expired` 由主进程在响应拦截器里识别 `code === 1005` 后广播
- 渲染端 `auth.bindNetworkEvents()` 订阅后清空 user、置 `tokenExpired = true`、跳登录页

### 局域网自动发现（关键模块）

`src/main/discovery.js`：

- 用 `os.networkInterfaces()` 列出所有非内部 IPv4 网卡
- 对每个网卡所在 `/24` 段全部 IP + 网卡自身 IP + `127.0.0.1` 加入探测列表
- 用原生 `http.request` 并发探测 `GET /health`（`validateStatus` + body 包含 `"status":"ok"` 双重判断）
- 并发上限 200、单次超时 500ms，全网段 ~2s
- 按延迟升序返回 `[{url, host, port, latencyMs}]`

如果后续要支持 mDNS / 二维码配对，可在 `discovery.js` 增加实现，IPC 接口保持不变。

## 开发

```bash
cd client
npm install
npm run dev          # Vite dev server (5175) + Electron 同时启动
npm run build        # 产线构建（产物在 dist/ + 打包 exe/dmg/AppImage）
```

## 调试

- 主进程日志：`logs/electron.log`（按天滚动）
- 渲染进程：DevTools 打开方式：`Ctrl+Shift+I`（开发模式下默认开启）
- 客户端本地配置：`~/.config/GuardVault/config.json`（Linux）/ `~/Library/Application Support/GuardVault/config.json`（macOS）
