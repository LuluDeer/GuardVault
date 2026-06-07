# 局域网 TOTP 认证系统

一个基于 Electron + Vue 3 的局域网 TOTP（Time-based One-Time Password）双因素认证系统。
包含 PC 客户端、Web 管理后台、Fastify 后端服务三端。

## 项目定位：中心化 2FA 保险柜

管理员在 Web 后台录入各业务系统的 TOTP 服务账号（AWS / VPN / GitHub 等），按部门 / 按人授权给员工查看；员工在 PC 客户端看到自己有权限的服务列表，每个服务展示实时 TOTP 码 + 倒计时，可一键复制。适合 50-200 人规模的运维 / SRE 团队。

**核心特性**
- 🔐 服务密钥 AES-256 加密存库，客户端永远不接触明文
- 👥 三级角色：`super_admin` / `dept_admin` / `user`
- 📋 服务录入：手动 + 二维码 / 客户端扫码 / CSV/JSON 批量导入
- 🪟 PC 客户端：托盘驻留 + 全局快捷键 + 30 秒剪贴板自动清空
- 📊 完整审计：取码/复制/授权/查看明文全记录 + 聚合报表


## 项目结构

```
TOTP/
├── server/            # 后端服务（Fastify + Prisma + MySQL）
│   ├── src/
│   │   ├── app.js
│   │   ├── controllers/   # 控制器
│   │   ├── routes/        # 路由
│   │   ├── services/      # 业务逻辑
│   │   ├── middlewares/   # 中间件（认证/授权/错误）
│   │   ├── prisma/        # Prisma 数据模型
│   │   └── utils/         # 工具函数
│   ├── prisma/            # 数据库迁移文件
│   └── .env               # 服务端配置（不提交到 git）
│
├── client/            # PC 客户端（Electron + Vue 3）
│   ├── src/
│   │   ├── main/        # 主进程（窗口、托盘、IPC、safeStorage）
│   │   ├── preload/     # 预加载（contextBridge）
│   │   └── renderer/    # 渲染进程（Vue 3 + Pinia + vue-router）
│   └── index.html
│
├── web-admin/         # Web 管理后台（Vue 3 + Element Plus）
│   └── src/
│       ├── views/      # 页面：用户、TOTP、日志、配置
│       ├── components/ # 通用组件：搜索栏、表格工具栏
│       └── api/        # axios 封装
│
├── scripts/           # 运维脚本（systemd 单元、deploy.sh）
├── ecosystem.config.cjs   # PM2 配置
├── start.sh / stop.sh    # 一键启停（开发/生产）
├── docs/                  # 详细文档
└── README.md
```

## 技术栈

| 模块 | 技术 |
| --- | --- |
| 服务端 | Fastify 4 + Prisma 5 + MySQL 8 + JWT + bcryptjs + otplib + zod |
| PC 客户端 | Electron 28 + Vue 3 + Pinia + vue-router + safeStorage |
| Web 管理后台 | Vue 3 + Element Plus + axios + qrcode |
| 运维 | PM2 / systemd |

## 快速开始

### 0. 环境要求
- Node.js ≥ 18
- MySQL 8.0
- Linux / macOS / Windows

### 1. 安装依赖

```bash
cd server && npm install && cd ..
cd client && npm install && cd ..
cd web-admin && npm install && cd ..
```

### 2. 准备环境变量

复制模板并按需修改：

```bash
cp server/.env.example server/.env
cp web-admin/.env.example web-admin/.env   # 如果存在
```

`server/.env` 关键字段：

```env
DATABASE_URL="mysql://admin:25821250@127.0.0.1:3306/totp_db"
JWT_SECRET="请改成一个长随机字符串"
JWT_USER_EXPIRE=7200
JWT_ADMIN_EXPIRE=1800
ADMIN_ENCRYPT_KEY="32字节随机字符串（用于加密TOTP密钥）"
PORT=3000
HOST=0.0.0.0
```

`start.sh` 会自动校验 `DATABASE_URL / JWT_SECRET / ADMIN_ENCRYPT_KEY` 是否存在。

### 3. 初始化数据库

```bash
cd server
npm run prisma:push   # 同步 schema 到 MySQL
```

### 4. 启动

#### 一键启动（开发/小规模部署）
```bash
./start.sh    # 后台启动三个进程
./stop.sh     # 停止所有
tail -f logs/*.log   # 看日志
```

#### PM2（生产）
```bash
pm2 start ecosystem.config.cjs
pm2 save
pm2 startup
```

#### systemd（Linux 服务器）
```bash
sudo ./scripts/deploy.sh install
sudo systemctl start totp-server
sudo systemctl start totp-webadmin
```

### 5. 访问

| 端 | 地址 |
| --- | --- |
| 服务端 API | http://<host>:3000 |
| Web 管理后台 | http://<host>:5173 |
| 客户端 | 启动 `client` 后，登录界面配置服务端地址 |

## 系统初始化

首次启动时数据库无任何管理员账号。请访问：
```
POST /api/admin/init
{
  "username": "admin",
  "password": "Admin@123456"
}
```

成功后即可用该账号登录 Web 管理后台。

## 功能矩阵

| 功能 | PC 客户端 | Web 后台 |
| --- | --- | --- |
| 用户登录/登出 | ✅ | ✅ |
| 服务列表（按权限过滤） | ✅ | ✅ |
| 实时 TOTP 验证码 | ✅ | ✅（管理员代查） |
| 30 秒倒计时 + 大字号码 | ✅ | — |
| 复制验证码（30秒自动清空） | ✅ | ✅ |
| 修改自己的密码 | ✅ | ✅ |
| 托盘显示码 + 一键复制 | ✅ | — |
| 快捷键 `Ctrl+1~9` / `Esc` | ✅ | — |
| 系统通知 | ✅ | — |
| 开机自启（Win/macOS/Linux） | ✅ | — |
| 心跳检测 + 断线重连 | ✅ | — |
| safeStorage 安全存 Token | ✅ | — |
| 部门管理（增/删/改） | — | ✅ |
| 服务账号管理（增/删/改/重置密钥） | — | ✅ |
| 服务录入：手动 / 扫码 / CSV 批量 | — | ✅ |
| 授权管理（单/批量） | — | ✅ |
| 用户管理（增/删/改/禁） | — | ✅ |
| 操作日志查询 + CSV 导出 | — | ✅ |
| 审计报表（图表+Top20） | — | ✅ |
| 系统配置 | — | ✅ |
| 登录失败锁定策略 | — | ✅ |

## 安全设计

- **密码存储**：bcrypt 12 轮
- **Token**：JWT，吊销列表落 MySQL，登出/改密立即失效
- **TOTP 密钥**：AES 对称加密存储，密钥由 `ADMIN_ENCRYPT_KEY` 提供
- **登录限流**：失败 N 次自动锁定 M 分钟（可配置）
- **客户端 Token**：Electron `safeStorage`（Linux 走 kwallet/gnome-keyring），不落明文
- **CORS**：默认放开开发，部署请收敛来源
- **CSP**：客户端 index.html 启用 `default-src 'self'`

## API 摘要

### 用户端
- `POST /api/user/login` / `POST /api/user/logout`
- `PUT  /api/user/password`（改密）
- `GET  /api/user/totp/code`（个人登录 2FA 码）
- `GET  /api/user/service/list`（我有权限的服务列表）
- `GET  /api/user/service/:id`（服务详情）
- `GET  /api/user/service/:id/code`（取实时 TOTP 码）
- `POST /api/user/service/copy-report`（复制上报）
- `GET  /api/health`

### 管理端
- `POST /api/admin/init`（系统初始化）
- `POST /api/admin/login` / `POST /api/admin/logout`
- `PUT  /api/admin/password`
- `GET  /api/admin/user/list`、`POST /api/admin/user/create`、`PUT /api/admin/user/:id`、`DELETE /api/admin/user/:id`
- `POST /api/admin/totp/enable/:userId` / `disable` / `reset`
- `POST /api/admin/totp/batch-reset`
- `GET  /api/admin/totp/secret/:userId`（二维码绑定）
- `GET  /api/admin/totp/code/:userId`（管理员代查）
- **部门管理**：`GET/POST/PUT/DELETE /api/admin/dept/*`
- **服务管理**：`GET/POST/PUT/DELETE /api/admin/service/*`
  - `/api/admin/service/categories`（分类枚举）
  - `/api/admin/service/batch-import`（批量导入）
  - `/api/admin/service/scan-create`（扫码录入）
  - `/api/admin/service/:id/secret`（获取明文+二维码）
  - `/api/admin/service/:id/reset-secret`（重置密钥）
- **授权管理**：`GET/POST /api/admin/grant/*`
  - 单个授权/撤销 + 批量授权/撤销
- **审计报表**：`GET /api/admin/audit/*`
  - `/summary` `/service-views` `/user-views` `/actions` `/daily`
- `GET  /api/admin/log/list`、`GET /api/admin/log/export`（CSV）
- `GET  /api/admin/config` / `POST /api/admin/config`

## 部署到 Linux 服务器

```bash
# 1. 克隆代码
git clone <repo> /opt/totp && cd /opt/totp
# 2. 安装依赖
(cd server && npm ci --omit=dev)
(cd web-admin && npm ci && npm run build)
# 3. 配置
cp server/.env.example server/.env && nano server/.env
# 4. 初始化 DB
(cd server && npx prisma db deploy)
# 5. 安装 systemd 服务
sudo ./scripts/deploy.sh install
sudo systemctl start totp-server totp-webadmin
sudo ./scripts/deploy.sh status
```

详细运维请见 [docs/OPERATIONS.md](docs/OPERATIONS.md)。

## 开发命令

```bash
# 服务端
cd server
npm run dev              # 热重载
npm run prisma:studio    # 打开 Prisma Studio

# 客户端
cd client
npm run dev              # 启动 Electron 开发版
npm run build:linux      # 构建 Linux 安装包
npm run build:win        # 构建 Windows 安装包

# Web 后台
cd web-admin
npm run dev
npm run build            # 产物在 dist/
```

## 常见问题

1. **客户端连不上服务端**  
   登录前在"服务端地址"里填入正确的 `http://<ip>:3000`，先用浏览器访问 `/api/health` 验证可达。

2. **Prisma 报错 "Environment variable not found: DATABASE_URL"**  
   `server/.env` 没建或字段缺失。`start.sh` 启动时会自动校验并提示。

3. **Linux 客户端无法自动启动**  
   部分桌面环境无 systemd-user 单元，会降级到 `~/.config/autostart` 的 .desktop 文件。

4. **扫码录入支持哪些格式？**  
   支持标准 `otpauth://totp/Issuer:Account?secret=...&issuer=...&algorithm=SHA1&digits=6&period=30` URI。Google Authenticator / Microsoft Authenticator / 1Password 等主流应用导出的二维码均兼容。

5. **dept_admin 跨部门操作会怎样？**  
   后端在 service / grant / dept 控制器中校验了部门归属，跨部门请求会返回 403。前端按 deptId 过滤，无需额外处理。

6. **二维码密钥明文会暴露吗？**  
   数据库中 `encrypted_secret` 是 AES-256 加密的。明文仅在管理员打开"二维码"弹窗或调用 `/service/:id/secret` 接口时返回，且会写 `SERVICE_VIEW_SECRET` 审计日志。

7. **TOTP 周期、位数、算法能改吗？**  
   新增 / 编辑服务时可调 `digits`（6/8）/ `period`（30/60秒）/ `algorithm`（SHA1/SHA256/SHA512）。

## 端到端测试流程

1. **系统初始化**：`POST /api/admin/init` 创建超级管理员
2. **管理员登录 Web 后台**：默认路由 `/services`
3. **创建部门**：部门管理 → 新增（编码：it / sales / ops）
4. **录入服务**：服务管理 → 新增（选择部门 + 分类）
   - 也可：批量导入（CSV/JSON）
   - 也可：扫码录入（粘贴 otpauth URI）
5. **授权用户**：服务详情 → 授权管理 → 选择用户
6. **员工登录客户端**：填服务端地址 → 登录
7. **查看/复制码**：列表点击或 `Ctrl+1` 复制第一个
8. **审计验证**：Web 后台 → 审计报表 / 操作日志

## 许可证

ISC
