# GuardVault - 企业级 2FA 集中管理系统

一个基于 Electron + Vue 3 的企业级双因素认证（TOTP/2FA）集中管理系统。
包含 PC 客户端、Web 管理后台、Fastify 后端服务三端。

## 🌟 项目定位：中心化 2FA 保险柜

管理员在 Web 后台录入各业务系统的 TOTP 服务账号（AWS / VPN / GitHub 等），按部门 / 按人授权给员工查看；员工在 PC 客户端看到自己有权限的服务列表，每个服务展示实时 TOTP 码 + 倒计时，可一键复制。适合 50-200 人规模的运维 / SRE 团队。

**核心特性**

- 🔐 **安全加密**：服务密钥 AES-256 加密存库，客户端永远不接触明文
- 👥 **三级角色**：`super_admin` / `dept_admin` / `user`，权限分级管理
- 📋 **多种录入**：手动录入 + 二维码扫码 + CSV/JSON 批量导入 + 谷歌OTP导入
- 🪟 **PC 客户端**：托盘驻留 + 全局快捷键 + 30 秒剪贴板自动清空
- 📊 **完整审计**：取码/复制/授权/查看明文全记录 + 聚合报表
- 🌐 **跨平台**：支持 Linux / macOS / Windows 客户端

## 📁 项目结构

```
GuardVault/
├── server/            # 后端服务（Fastify + Prisma + MySQL）
│   ├── src/
│   │   ├── app.js              # 应用入口
│   │   ├── controllers/        # 控制器
│   │   ├── routes/             # 路由配置
│   │   ├── services/           # 业务逻辑层
│   │   ├── middlewares/        # 中间件（认证/授权/错误处理）
│   │   ├── prisma/             # Prisma 数据模型
│   │   └── utils/              # 工具函数
│   ├── prisma/                 # 数据库迁移文件
│   └── .env.example            # 环境变量模板（复制为 .env）
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
│       ├── views/      # 页面组件：服务管理、用户管理、审计报表等
│       ├── components/ # 通用组件：搜索栏、表格工具栏
│       └── api/        # axios API 封装
│
├── scripts/           # 运维脚本
│   ├── deploy.sh      # Linux 一键部署脚本
│   └── systemd/       # systemd 服务配置文件
├── ecosystem.config.cjs   # PM2 生产环境配置
├── start.sh / stop.sh     # Linux/macOS 一键启停脚本
├── start.bat / stop.bat   # Windows 一键启停脚本
├── docs/                  # 详细文档目录
└── README.md              # 项目说明文档
```

## 🛠️ 技术栈

| 模块       | 技术                                              | 版本要求         |
| -------- | ----------------------------------------------- | ------------ |
| 服务端      | Fastify + Prisma + MySQL + JWT + bcryptjs + zod | Node.js ≥ 18 |
| PC 客户端   | Electron + Vue 3 + Pinia + vue-router           | Node.js ≥ 18 |
| Web 管理后台 | Vue 3 + Element Plus + axios + qrcode           | Node.js ≥ 18 |
| 运维       | PM2 / systemd                                   | -            |

## 🚀 快速开始

### 📋 环境要求

| 依赖      | 版本    | 说明                   |
| ------- | ----- | -------------------- |
| Node.js | ≥ 18  | 推荐使用 18 LTS 或 20 LTS |
| MySQL   | ≥ 8.0 | 数据库服务                |
| Git     | ≥ 2.0 | 代码版本管理               |

### 🔧 安装依赖

#### Linux / macOS

```bash
# 克隆项目
git clone <repository-url>
cd GuardVault

# 安装服务端依赖
cd server && npm install && cd ..

# 安装客户端依赖
cd client && npm install && cd ..

# 安装 Web 后台依赖
cd web-admin && npm install && cd ..
```

#### Windows (PowerShell)

```powershell
# 克隆项目
git clone <repository-url>
cd GuardVault

# 安装服务端依赖
cd server; npm install; cd ..

# 安装客户端依赖
cd client; npm install; cd ..

# 安装 Web 后台依赖
cd web-admin; npm install; cd ..
```

### ⚙️ 配置环境变量

#### 1. 创建配置文件

**Linux / macOS**

```bash
cp server/.env.example server/.env
```

**Windows (PowerShell)**

```powershell
Copy-Item server/.env.example server/.env
```

#### 2. 修改配置

编辑 `server/.env` 文件，配置以下关键字段：

```env
# 数据库连接（必填）
DATABASE_URL="mysql://用户名:密码@数据库地址:3306/数据库名"

# JWT 密钥（必填，用于签名 Token）
JWT_SECRET="请改成一个长随机字符串，至少32位"

# Token 过期时间（可选，单位：秒）
JWT_USER_EXPIRE=7200      # 用户 Token 有效期 2 小时
JWT_ADMIN_EXPIRE=1800     # 管理员 Token 有效期 30 分钟

# AES 加密密钥（必填，用于加密 TOTP 密钥，必须是 32 字节）
ADMIN_ENCRYPT_KEY="32字节的随机字符串，请务必妥善保管"

# 服务端口（可选）
PORT=3001
HOST=0.0.0.0
```

### 🗄️ 初始化数据库

#### Linux / macOS

```bash
cd server
npm run prisma:push
cd ..
```

#### Windows (PowerShell)

```powershell
cd server; npm run prisma:push; cd ..
```

### 🔌 启动服务

#### Linux / macOS

```bash
# 开发模式（一键启动）
./start.sh

# 停止服务
./stop.sh

# 查看日志
tail -f logs/*.log
```

#### Windows (PowerShell)

```powershell
# 开发模式（一键启动）
.\start.bat

# 停止服务
.\stop.bat
```

#### 生产环境（PM2）

```bash
# 安装 PM2（如果未安装）
npm install -g pm2

# 启动所有服务
pm2 start ecosystem.config.cjs

# 设置开机自启
pm2 save
pm2 startup
```

### 🌐 访问地址

| 端        | 地址                      | 默认端口 |
| -------- | ----------------------- | ---- |
| 服务端 API  | <http://localhost:3001> | 3001 |
| Web 管理后台 | <http://localhost:5173> | 5173 |
| PC 客户端   | 启动后登录界面配置服务端地址          | -    |

## 📝 系统初始化

首次启动时数据库无任何管理员账号，请执行以下步骤：

### 方式一：API 调用

```bash
curl -X POST http://localhost:3001/api/admin/init \
  -H "Content-Type: application/json" \
  -d '{"username": "admin", "password": "Admin@123"
```

### 方式二：浏览器访问

打开浏览器，访问 `http://localhost:3001/api/admin/init`，提交 POST 请求。

成功后即可用 `admin` / `Admin@123` 登录 Web 管理后台。

## 🎯 功能矩阵

| 功能                              | PC 客户端 | Web 后台   |
| ------------------------------- | ------ | -------- |
| 用户登录/登出                         | ✅      | ✅        |
| 服务列表（按权限过滤）                     | ✅      | ✅        |
| 实时 TOTP 验证码                     | ✅      | ✅（管理员代查） |
| 30 秒倒计时 + 大字号码                  | ✅      | —        |
| 复制验证码（30秒自动清空）                  | ✅      | ✅        |
| 修改自己的密码                         | ✅      | ✅        |
| 托盘显示码 + 一键复制                    | ✅      | —        |
| 快捷键 `Ctrl+1~9` / `Esc`          | ✅      | —        |
| 系统通知                            | ✅      | —        |
| 开机自启（Win/macOS/Linux）           | ✅      | —        |
| 心跳检测 + 断线重连                     | ✅      | —        |
| safeStorage 安全存 Token           | ✅      | —        |
| 部门管理（增/删/改）                     | —      | ✅        |
| 服务账号管理（增/删/改/重置密钥）              | —      | ✅        |
| 服务录入：手动 / 扫码 / CSV 批量 / 谷歌OTP导入 | —      | ✅        |
| 授权管理（单/批量）                      | —      | ✅        |
| 用户管理（增/删/改/禁）                   | —      | ✅        |
| 操作日志查询 + CSV 导出                 | —      | ✅        |
| 审计报表（图表+Top20）                  | —      | ✅        |
| 系统配置                            | —      | ✅        |
| 登录失败锁定策略                        | —      | ✅        |

## 🔒 安全设计

- **密码存储**：bcrypt 12 轮加密
- **Token**：JWT，吊销列表落 MySQL，登出/改密立即失效
- **TOTP 密钥**：AES-256 对称加密存储，密钥由 `ADMIN_ENCRYPT_KEY` 提供
- **登录限流**：失败 N 次自动锁定 M 分钟（可配置）
- **客户端 Token**：Electron `safeStorage`（Linux 走 kwallet/gnome-keyring），不落明文
- **CORS**：默认放开开发，部署请收敛来源
- **CSP**：客户端 index.html 启用 `default-src 'self'`

## 📡 API 摘要

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
- **导入管理**：`POST /api/admin/import/*`
  - `/api/admin/import/parse-migration`（解析谷歌OTP迁移URL）
  - `/api/admin/import/preview`（预览导入数据）
  - `/api/admin/import/confirm`（确认导入）
  - `/api/admin/import/parse-otpauth`（解析单个otpauth URL）
- **授权管理**：`GET/POST /api/admin/grant/*`
  - 单个授权/撤销 + 批量授权/撤销
- **审计报表**：`GET /api/admin/audit/*`
  - `/summary` `/service-views` `/user-views` `/actions` `/daily`
- `GET  /api/admin/log/list`、`GET /api/admin/log/export`（CSV）
- `GET  /api/admin/config` / `POST /api/admin/config`

## 📦 部署到 Linux 服务器

```bash
# 1. 克隆代码
git clone <repo> /opt/guardvault && cd /opt/guardvault

# 2. 安装依赖（生产模式）
(cd server && npm ci --omit=dev)
(cd web-admin && npm ci && npm run build)

# 3. 配置环境变量
cp server/.env.example server/.env
nano server/.env

# 4. 初始化数据库
(cd server && npx prisma db deploy)

# 5. 安装 systemd 服务
sudo ./scripts/deploy.sh install
sudo systemctl start guardvault-server guardvault-webadmin
sudo ./scripts/deploy.sh status
```

详细运维请见 [docs/OPERATIONS.md](docs/OPERATIONS.md)。

## 🛠️ 开发命令

```bash
# 服务端
cd server
npm run dev              # 热重载开发模式
npm run prisma:studio    # 打开 Prisma Studio 数据库管理界面

# 客户端
cd client
npm run dev              # 启动 Electron 开发版
npm run build:linux      # 构建 Linux 安装包
npm run build:win        # 构建 Windows 安装包

# Web 后台
cd web-admin
npm run dev              # 热重载开发模式
npm run build            # 构建生产版本，产物在 dist/
```

## ❓ 常见问题

### 1. 客户端连不上服务端

登录前在"服务端地址"里填入正确的 `http://<ip>:3001`，先用浏览器访问 `/api/health` 验证可达。

### 2. Prisma 报错 "Environment variable not found: DATABASE\_URL"

`server/.env` 没建或字段缺失。`start.sh` / `start.bat` 启动时会自动校验并提示。

### 3. Linux 客户端无法自动启动

部分桌面环境无 systemd-user 单元，会降级到 `~/.config/autostart` 的 .desktop 文件。

### 4. 扫码录入支持哪些格式？

支持标准 `otpauth://totp/Issuer:Account?secret=...&issuer=...&algorithm=SHA1&digits=6&period=30` URI。Google Authenticator / Microsoft Authenticator / 1Password 等主流应用导出的二维码均兼容。

### 5. dept\_admin 跨部门操作会怎样？

后端在 service / grant / dept 控制器中校验了部门归属，跨部门请求会返回 403。前端按 deptId 过滤，无需额外处理。

### 6. 如何从谷歌验证码迁移服务？

在谷歌验证码中选择"转移账号"，可通过以下三种方式导入：

- **粘贴迁移 URL**：扫描显示的二维码获取迁移 URL（以 `otpauth-migration://` 开头），粘贴到导入页面
- **上传二维码图片**：直接上传谷歌验证码显示的迁移二维码图片
- **上传导出文件**：上传包含迁移 URL 的 .txt 文件

导入后可选择要导入的服务并修改分类。

### 7. 二维码密钥明文会暴露吗？

数据库中 `encrypted_secret` 是 AES-256 加密的。明文仅在管理员打开"二维码"弹窗或调用 `/service/:id/secret` 接口时返回，且会写 `SERVICE_VIEW_SECRET` 审计日志。

### 8. TOTP 周期、位数、算法能改吗？

新增 / 编辑服务时可调 `digits`（6/8）/ `period`（30/60秒）/ `algorithm`（SHA1/SHA256/SHA512）。

### 9. Windows 用户如何运行 .sh 脚本？

Windows 用户请使用对应的 `.bat` 脚本：`start.bat` / `stop.bat`。

### 10. MySQL 如何安装？

**Linux (Ubuntu/Debian)**

```bash
sudo apt update && sudo apt install mysql-server
sudo systemctl start mysql
sudo systemctl enable mysql
```

**macOS (Homebrew)**

```bash
brew install mysql
brew services start mysql
```

**Windows**
下载安装包：<https://dev.mysql.com/downloads/installer/>

## 🔄 端到端测试流程

1. **系统初始化**：`POST /api/admin/init` 创建超级管理员
2. **管理员登录 Web 后台**：默认路由 `/services`
3. **创建部门**：部门管理 → 新增（编码：it / sales / ops）
4. **录入服务**：服务管理 → 新增（选择部门 + 分类）
   - 也可：批量导入（CSV/JSON）
   - 也可：扫码录入（粘贴 otpauth URI）
   - 也可：谷歌OTP导入（迁移URL/二维码图片）
5. **授权用户**：服务详情 → 授权管理 → 选择用户
6. **员工登录客户端**：填服务端地址 → 登录
7. **查看/复制码**：列表点击或 `Ctrl+1` 复制第一个
8. **审计验证**：Web 后台 → 审计报表 / 操作日志

## 🤝 贡献指南

欢迎贡献代码！请遵循以下规范：

### 提交规范

```
<类型>(<模块>): <描述>

<详细说明>
```

类型：

- `feat`: 新功能
- `fix`: 修复 bug
- `docs`: 文档更新
- `style`: 代码格式调整（不影响功能）
- `refactor`: 重构代码
- `test`: 测试相关
- `chore`: 构建/工具相关

### 代码规范

- 使用 ESLint 进行代码检查
- 使用 Prettier 进行代码格式化
- 前端组件使用 PascalCase 命名
- 函数使用 camelCase 命名
- 常量使用 UPPER\_SNAKE\_CASE 命名

### PR 流程

1. Fork 项目
2. 创建功能分支：`git checkout -b feat/my-feature`
3. 提交代码：`git commit -m "feat(module): description"`
4. 推送到远程：`git push origin feat/my-feature`
5. 创建 Pull Request

## 📄 许可证

ISC

## 📧 联系我们

如有问题或建议，欢迎提交 Issue 或联系维护者。
