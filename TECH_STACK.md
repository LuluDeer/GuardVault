# 局域网TOTP系统 — 技术选型与开发目标

**版本：** v1.0
**关联PRD：** PRD.md
**用途：** 指导开发团队完成V1.0系统落地，统一技术栈，明确各阶段开发目标

---

## 一、技术选型总览

| 模块 | 技术选型 | 选型理由 |
|------|----------|----------|
| 服务端运行时 | Node.js 20 LTS | 稳定、生态丰富、适合IO密集型接口服务 |
| 服务端框架 | Fastify 4 | 性能优于Express，内置Schema校验，适合API服务 |
| 数据库 | MySQL 8.0 | 企业内网主流，成熟稳定，运维熟悉度高 |
| ORM | Prisma | 类型安全、Migration管理清晰、开发体验好 |
| 认证方案 | JWT（jsonwebtoken） | 无状态Token，配合内存黑名单实现即时登出 |
| Token黑名单 | 内存Map（进程级） | 500用户内网场景足够，重启后Token自然失效符合安全要求 |
| 密码哈希 | bcryptjs（cost 12） | 标准密码存储，cost 12兼顾安全性和性能 |
| TOTP算法 | otplib | 完整RFC6238实现，维护活跃，TypeScript类型完善 |
| 数据库密钥加密 | Node.js内置crypto（AES-256-GCM） | 原生模块无额外依赖，GCM模式提供认证加密 |
| 输入校验 | Zod | 运行时类型校验，配合Fastify Schema使用 |
| Web管理端框架 | Vue 3 + Vite 5 | 国内生态成熟，开发效率高，Vite构建速度快 |
| Web管理端UI | Ant Design Vue 4 | 企业后台场景契合度高，组件完善 |
| Web管理端状态 | Pinia | Vue 3官方推荐，轻量易用 |
| Web管理端HTTP | Axios | 成熟稳定，拦截器方便处理Token和错误 |
| PC客户端框架 | Electron 28 + Vue 3 | 跨平台桌面，复用Web技术栈，降低开发成本 |
| PC客户端打包 | electron-builder | 支持NSIS安装包、静默安装、自动更新 |
| 进程管理 | PM2 | 自动重启、日志管理、开机自启，内网服务端标准方案 |
| Excel导出 | xlsx（SheetJS） | 纯JS实现，无服务端依赖，日志导出使用 |
| 日志框架（服务端） | pino | 高性能JSON日志，与Fastify原生集成 |

---

## 二、项目目录结构

```
TOTP/
├── server/                      # 服务端（Node.js + Fastify）
│   ├── src/
│   │   ├── routes/              # 路由注册
│   │   │   ├── admin/           # 管理员路由（user, totp, log, config）
│   │   │   └── user/            # 普通用户路由（login, totp, password）
│   │   ├── controllers/         # 控制器（业务入口，参数处理）
│   │   ├── services/            # 业务逻辑层
│   │   │   ├── auth.service.js  # 认证、Token、黑名单
│   │   │   ├── user.service.js  # 用户CRUD
│   │   │   ├── totp.service.js  # TOTP算码、密钥加解密
│   │   │   ├── log.service.js   # 日志写入、查询
│   │   │   └── config.service.js # 系统配置
│   │   ├── middlewares/
│   │   │   ├── authenticate.js  # JWT校验中间件
│   │   │   └── authorize.js     # 角色权限中间件
│   │   ├── utils/
│   │   │   ├── crypto.js        # AES-256-GCM加解密封装
│   │   │   ├── totp.js          # TOTP计算封装（基于otplib）
│   │   │   └── response.js      # 统一响应格式封装
│   │   ├── prisma/
│   │   │   └── schema.prisma    # 数据库Schema
│   │   └── app.js               # Fastify应用入口
│   ├── .env.example             # 环境变量模板（不含真实值）
│   ├── .env                     # 实际环境变量（不入git）
│   └── package.json
│
├── web-admin/                   # Web管理端（Vue 3 + Vite）
│   ├── src/
│   │   ├── views/
│   │   │   ├── Login.vue
│   │   │   ├── UserManage.vue   # 用户管理
│   │   │   ├── TotpManage.vue   # 密钥与动态码查询
│   │   │   ├── LogAudit.vue     # 日志审计
│   │   │   └── SysConfig.vue    # 系统配置
│   │   ├── components/          # 公共组件
│   │   ├── api/                 # 接口封装（对应PRD第8章）
│   │   ├── stores/              # Pinia状态（user, config）
│   │   ├── router/              # 路由（含导航守卫）
│   │   └── utils/               # 工具函数
│   ├── vite.config.js
│   └── package.json
│
├── client/                      # PC客户端（Electron + Vue 3）
│   ├── src/
│   │   ├── main/                # Electron主进程
│   │   │   ├── index.js         # 主进程入口（窗口、托盘）
│   │   │   ├── tray.js          # 托盘管理
│   │   │   ├── ipc.js           # IPC通信处理（代理网络请求）
│   │   │   └── autostart.js     # 开机自启管理
│   │   ├── preload/
│   │   │   └── index.js         # contextBridge暴露API
│   │   └── renderer/            # 渲染进程（Vue 3）
│   │       ├── views/
│   │       │   ├── Config.vue   # 首次配置服务端地址
│   │       │   ├── Login.vue
│   │       │   ├── Main.vue     # 主界面（验证码展示）
│   │       │   └── Password.vue # 修改密码
│   │       ├── api/             # 通过IPC调用主进程发起请求
│   │       └── stores/          # Pinia（token, userInfo）
│   ├── electron-builder.yml     # 打包配置
│   └── package.json
│
├── docs/
│   ├── PRD.md                   # 产品需求文档
│   └── TECH_STACK.md            # 本文档
└── .gitignore
```

---

## 三、关键技术实现规范

### 3.1 TOTP算码实现

```js
// server/src/utils/totp.js
import { totp } from 'otplib';

export function generateCode(base32Secret) {
  // RFC6238标准：6位、30秒、SHA1
  totp.options = { digits: 6, step: 30, algorithm: 'sha1' };
  const code = totp.generate(base32Secret);
  const epoch = Math.floor(Date.now() / 1000);
  const remainSeconds = 30 - (epoch % 30);
  return { code, remainSeconds };
}
```

### 3.2 密钥AES-256-GCM加密存储

```js
// server/src/utils/crypto.js
import crypto from 'node:crypto';

// Master Key从环境变量读取（32字节，hex编码64字符）
const MASTER_KEY = Buffer.from(process.env.TOTP_MASTER_KEY, 'hex');

// 加密：返回 iv:authTag:ciphertext 格式字符串
export function encrypt(plainText) {
  const iv = crypto.randomBytes(12); // 96bit GCM标准IV
  const cipher = crypto.createCipheriv('aes-256-gcm', MASTER_KEY, iv);
  const encrypted = Buffer.concat([cipher.update(plainText, 'utf8'), cipher.final()]);
  const authTag = cipher.getAuthTag();
  return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted.toString('hex')}`;
}

// 解密
export function decrypt(stored) {
  const [ivHex, authTagHex, dataHex] = stored.split(':');
  const decipher = crypto.createDecipheriv('aes-256-gcm', MASTER_KEY, Buffer.from(ivHex, 'hex'));
  decipher.setAuthTag(Buffer.from(authTagHex, 'hex'));
  const decrypted = Buffer.concat([
    decipher.update(Buffer.from(dataHex, 'hex')),
    decipher.final()
  ]);
  return decrypted.toString('utf8');
}
```

### 3.3 JWT + 内存黑名单

```js
// server/src/services/auth.service.js
import jwt from 'jsonwebtoken';
import crypto from 'node:crypto';

// 黑名单：Map<jti, expireAt时间戳>
const blacklist = new Map();

// 定期清理已过期的黑名单条目（每小时）
setInterval(() => {
  const now = Date.now();
  for (const [jti, expireAt] of blacklist) {
    if (expireAt < now) blacklist.delete(jti);
  }
}, 3600_000);

export function signToken(payload, expiresIn) {
  const jti = crypto.randomUUID();
  return jwt.sign({ ...payload, jti }, process.env.JWT_SECRET, { expiresIn });
}

export function revokeToken(token) {
  try {
    const decoded = jwt.decode(token);
    if (decoded?.jti && decoded?.exp) {
      blacklist.set(decoded.jti, decoded.exp * 1000);
    }
  } catch {}
}

export function verifyToken(token) {
  const decoded = jwt.verify(token, process.env.JWT_SECRET); // 会抛出异常
  if (blacklist.has(decoded.jti)) throw new Error('TOKEN_REVOKED');
  return decoded;
}
```

### 3.4 Electron安全规范

```js
// client/src/main/index.js — 窗口创建配置
new BrowserWindow({
  webPreferences: {
    contextIsolation: true,    // 必须开启
    nodeIntegration: false,    // 必须关闭
    sandbox: true,             // 启用沙箱
    preload: path.join(__dirname, '../preload/index.js')
  }
});

// client/src/preload/index.js — 仅暴露必要API
import { contextBridge, ipcRenderer } from 'electron';
contextBridge.exposeInMainWorld('electronAPI', {
  // 所有网络请求通过IPC发给主进程处理，渲染进程不直接发网络请求
  request: (config) => ipcRenderer.invoke('http-request', config),
  getServerUrl: () => ipcRenderer.invoke('get-server-url'),
  setServerUrl: (url) => ipcRenderer.invoke('set-server-url', url),
  copyToClipboard: (text) => ipcRenderer.invoke('copy-clipboard', text),
  setAutoStart: (enable) => ipcRenderer.invoke('set-autostart', enable),
});
```

---

## 四、环境变量配置规范

`server/.env.example`（模板，提交到git）：

```env
# ===== 应用配置 =====
PORT=3000
NODE_ENV=production
BIND_HOST=0.0.0.0

# ===== 数据库 =====
DATABASE_URL="mysql://totp_user:your_password@127.0.0.1:3306/totp_db"

# ===== JWT =====
# 至少64位随机字符串，生成：node -e "require('crypto').randomBytes(64).toString('hex')"
JWT_SECRET=REPLACE_WITH_RANDOM_SECRET
# 管理员Token有效期（秒），默认1800=30分钟
JWT_ADMIN_EXPIRE=1800
# 用户Token有效期（秒），默认7200=2小时
JWT_USER_EXPIRE=7200

# ===== TOTP密钥加密主密钥 =====
# 32字节hex字符串（64个字符），生成：node -e "require('crypto').randomBytes(32).toString('hex')"
TOTP_MASTER_KEY=REPLACE_WITH_64_HEX_CHARS
```

**安全要求：**
- `.env`文件加入`.gitignore`，永不提交
- 生产环境通过服务器环境变量或密钥管理服务注入
- `TOTP_MASTER_KEY`和`JWT_SECRET`独立备份，丢失将导致所有密钥不可恢复

---

## 五、数据库Schema（Prisma）

```prisma
// server/src/prisma/schema.prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "mysql"
  url      = env("DATABASE_URL")
}

model SystemUser {
  id            Int          @id @default(autoincrement())
  username      String       @unique @db.VarChar(32)
  password      String       @db.VarChar(128)
  role          String       @db.VarChar(16)   // "admin" | "user"
  status        Int          @default(1)        // 1=正常 0=禁用
  failCount     Int          @default(0)        @map("fail_count")
  lockedUntil   DateTime?    @map("locked_until")
  lastLoginTime DateTime?    @map("last_login_time")
  lastLoginIp   String?      @db.VarChar(45)   @map("last_login_ip")
  createdAt     DateTime     @default(now())   @map("created_at")
  updatedAt     DateTime     @updatedAt        @map("updated_at")
  totpKey       UserTotpKey?
  operateLogs   SystemLog[]  @relation("operator")
  targetLogs    SystemLog[]  @relation("target")
  @@map("system_user")
}

model UserTotpKey {
  id              Int        @id @default(autoincrement())
  userId          Int        @unique  @map("user_id")
  encryptedSecret String     @db.VarChar(512) @map("encrypted_secret")
  isEnable        Int        @default(0)      @map("is_enable")
  resetCount      Int        @default(0)      @map("reset_count")
  resetTime       DateTime?  @map("reset_time")
  createdAt       DateTime   @default(now())  @map("created_at")
  user            SystemUser @relation(fields: [userId], references: [id], onDelete: Cascade)
  @@map("user_totp_key")
}

model SystemLog {
  id             BigInt     @id @default(autoincrement())
  operatorId     Int        @map("operator_id")
  operatorName   String     @db.VarChar(32)  @map("operator_name")
  targetUserId   Int?       @map("target_user_id")
  targetUsername String?    @db.VarChar(32)  @map("target_username")
  actionType     String     @db.VarChar(32)  @map("action_type")
  actionDesc     String     @db.VarChar(512) @map("action_desc")
  clientIp       String     @db.VarChar(45)  @map("client_ip")
  userAgent      String?    @db.VarChar(256) @map("user_agent")
  result         Int                          // 1=成功 0=失败
  failReason     String?    @db.VarChar(256) @map("fail_reason")
  createdAt      DateTime   @default(now())  @map("created_at")
  operator       SystemUser @relation("operator", fields: [operatorId], references: [id])
  @@index([createdAt])
  @@index([operatorId])
  @@index([actionType])
  @@map("system_log")
}

model SystemConfig {
  id          Int      @id @default(autoincrement())
  configKey   String   @unique @db.VarChar(64)  @map("config_key")
  configValue String   @db.VarChar(256)         @map("config_value")
  description String?  @db.VarChar(256)
  updatedAt   DateTime @updatedAt               @map("updated_at")
  updatedBy   String?  @db.VarChar(32)          @map("updated_by")
  @@map("system_config")
}
```

---

## 六、开发阶段目标

### 阶段一：服务端核心（优先完成，其他模块依赖此阶段）

**目标：** 服务端独立运行，所有接口可通过Postman/curl完整调试

- [ ] 项目初始化（Fastify + Prisma + MySQL连通）
- [ ] 数据库Migration执行，四张表创建完成
- [ ] 系统初始化接口（首次部署创建管理员账号）
- [ ] 管理员登录/登出接口 + JWT签发 + 黑名单
- [ ] 用户管理CRUD接口（含账号锁定逻辑）
- [ ] 2FA开通/禁用接口（含密钥自动生成与加密入库）
- [ ] 密钥重置接口（单个 + 批量）
- [ ] 用户登录/登出接口
- [ ] 用户获取个人动态码接口（核心：解密+算码）
- [ ] 管理员查询用户动态码接口
- [ ] 日志写入（所有操作自动记录）
- [ ] 日志查询接口（分页+筛选）
- [ ] 系统配置接口
- [ ] 健康检查接口 GET /health
- [ ] 用户修改密码接口
- [ ] 认证中间件（JWT校验 + 角色隔离）

**验收标准：**
- 所有接口按PRD第8章规范响应
- 核心铁律验证：接口响应中永远不出现secret_key明文
- 动态码与Google Authenticator手动对比验证一致

### 阶段二：Web管理端

**目标：** 管理员可通过浏览器完成所有管理操作

- [ ] 项目初始化（Vue 3 + Vite + Ant Design Vue）
- [ ] 登录页面（含错误提示、锁定提示）
- [ ] 路由守卫（未登录跳转登录页，Token过期处理）
- [ ] Axios封装（统一错误处理、Token注入）
- [ ] 用户管理页面（列表、新增、编辑、删除、启用/禁用）
- [ ] 2FA权限管理（开通、禁用、密钥重置）
- [ ] 动态码查询页面（选择用户+查询+倒计时展示）
- [ ] 日志审计页面（分页列表、筛选、导出Excel）
- [ ] 系统配置页面
- [ ] 全局响应错误提示（统一处理错误码为用户友好提示）

**验收标准：**
- 完整走通「新增用户 → 开通2FA → 查看动态码」流程
- 日志页面能查到全部操作记录

### 阶段三：PC客户端

**目标：** 员工可安装客户端，正常使用验证码

- [ ] 项目初始化（Electron + Vue 3 + electron-builder）
- [ ] 安全配置（contextIsolation、sandbox、preload）
- [ ] 服务端地址配置页面（首次启动）
- [ ] 登录页面（含记住用户名、错误提示）
- [ ] 主界面（大字体验证码、倒计时进度条、颜色变化）
- [ ] 一键复制功能（主进程通过clipboard API写入）
- [ ] 自动刷新（到期前1秒主动请求新码）
- [ ] 服务连接状态展示
- [ ] 修改密码功能
- [ ] 托盘常驻（关闭最小化、右键菜单、双击唤起）
- [ ] 开机自启（Windows注册表写入）
- [ ] Token过期自动弹出重登提示
- [ ] 断网状态处理（清空验证码、显示提示）
- [ ] NSIS打包配置（支持静默安装 /S 参数）

**验收标准：**
- 安装包可静默安装，安装后可直接配置服务端地址使用
- 验证码展示与Web管理端查询结果一致
- 客户端进程内存中无任何密钥相关数据

### 阶段四：集成测试与部署

- [ ] 三端联调测试（服务端 + Web管理端 + PC客户端）
- [ ] 完整业务流程测试（新增用户 → 开通2FA → 客户端登录 → 使用 → 禁用 → 重置）
- [ ] 安全测试：普通用户尝试访问管理接口（应被拒绝）
- [ ] 安全测试：抓包验证接口响应中无密钥明文
- [ ] 性能测试：模拟50并发刷新验证码，响应时间 ≤ 200ms
- [ ] 编写部署文档（服务端部署、客户端分发、环境变量配置）
- [ ] PM2配置文件（ecosystem.config.js）
- [ ] 数据库备份脚本

---

## 七、开发规范约定

### 7.1 代码规范
- 服务端使用ES Module（`type: "module"`），统一使用`import/export`
- 异步代码统一使用`async/await`，禁止回调嵌套
- 数据库操作统一通过Prisma，禁止原生SQL字符串拼接
- 所有接口入参使用Zod Schema校验，校验失败返回错误码1001
- 错误处理：业务错误抛出自定义Error类，Fastify错误钩子统一处理响应格式

### 7.2 安全约定
- 接口返回数据中，`password`、`encrypted_secret`、任何含有`secret`/`key`字样的字段禁止出现
- 日志记录时，密码字段使用`[REDACTED]`替代，不记录原文
- 服务端异常日志使用pino记录完整信息，对外接口只返回错误码和通用提示
- 敏感操作（开通2FA、重置密钥、查看动态码）必须在操作完成后立即写入日志

### 7.3 Git管理
- 分支策略：`main`（生产）、`develop`（开发）、`feature/xxx`（功能）
- `.gitignore`必须包含：`.env`、`node_modules/`、`dist/`、`*.exe`、`*.dmg`
- 提交信息格式：`feat: 添加用户登录接口` / `fix: 修复Token黑名单内存泄漏`

### 7.4 接口版本
- V1.0不设版本前缀，路径直接为`/api/admin/...`和`/api/user/...`
- 后续版本迭代如需破坏性变更，在路径加`/v2/`前缀

---

## 八、第三方依赖清单（服务端）

```json
{
  "dependencies": {
    "fastify": "^4.28.0",
    "@fastify/cors": "^9.0.0",
    "@prisma/client": "^5.14.0",
    "jsonwebtoken": "^9.0.2",
    "bcryptjs": "^2.4.3",
    "otplib": "^12.0.1",
    "zod": "^3.23.0",
    "pino": "^9.0.0",
    "dotenv": "^16.4.0"
  },
  "devDependencies": {
    "prisma": "^5.14.0",
    "nodemon": "^3.1.0"
  }
}
```

**依赖说明：**
- 所有依赖使用固定次版本（`^`限定主版本），避免自动升级引入破坏性变更
- 部署前执行`npm audit`检查已知CVE，高危漏洞必须修复后才能上线
- 禁止引入未经审查的依赖，每个新依赖需说明用途和选型理由
