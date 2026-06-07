# 局域网 TOTP 认证系统

一个基于 Electron + Vue 3 的局域网 TOTP（Time-based One-Time Password）双因素认证系统。

## 项目结构

```
TOTP/
├── server/          # 后端服务
│   ├── src/
│   │   ├── controllers/  # 控制器
│   │   ├── routes/        # 路由
│   │   ├── services/      # 业务逻辑
│   │   ├── prisma/        # 数据库模型
│   │   └── utils/         # 工具函数
│   └── .env              # 服务端配置
│
├── client/          # PC客户端（Electron）
│   ├── src/
│   │   ├── main/     # 主进程
│   │   ├── preload/  # 预加载脚本
│   │   └── renderer/ # 渲染进程（Vue）
│   └── index.html
│
├── web-admin/       # Web管理后台（Vue）
│
├── start.bat        # 快速启动脚本
├── stop.bat         # 停止脚本
├── create-test-user.bat  # 创建测试用户
└── CLIENT_GUIDE.md  # 客户端使用说明
```

## 技术栈

### 服务端
- **框架**: Fastify 4
- **数据库**: MySQL 8.0 + Prisma ORM
- **认证**: JWT + bcryptjs
- **TOTP**: otplib (RFC6238)

### PC客户端
- **框架**: Electron 28
- **前端**: Vue 3 + Pinia
- **构建**: electron-builder

### Web管理后台
- **框架**: Vue 3
- **UI**: Element Plus

## 快速开始

### 1. 安装依赖

```bash
# 安装服务端依赖
cd server
npm install

# 安装客户端依赖
cd ../client
npm install

# 安装Web管理后台依赖
cd ../web-admin
npm install
```

### 2. 配置数据库

编辑 `server/.env` 文件：

```env
DATABASE_URL="mysql://用户名:密码@数据库地址:3306/totp_db"
```

### 3. 初始化数据库

```bash
cd server
npm run prisma:push
```

### 4. 启动系统

#### 方法一：使用启动脚本（推荐）
双击运行 `start.bat`

#### 方法二：手动启动

**启动服务端：**
```bash
cd server
npm start
```

**启动客户端：**
```bash
cd client
npm run dev
```

**启动Web管理后台：**
```bash
cd web-admin
npm run dev
```

## 默认账号

系统初始化后会创建一个管理员账号：
- 用户名：`admin`
- 密码：`admin123`

## 客户端功能

- ✅ 用户登录/登出
- ✅ 显示动态TOTP验证码
- ✅ 30秒自动刷新
- ✅ 一键复制验证码
- ✅ 托盘驻留
- ✅ 开机自启
- ✅ 密码修改

## API接口

### 用户接口
- `POST /api/user/login` - 用户登录
- `POST /api/user/logout` - 用户登出
- `GET /api/user/totp/code` - 获取TOTP验证码
- `POST /api/user/password` - 修改密码

### 管理员接口
- `POST /api/admin/login` - 管理员登录
- `POST /api/admin/init` - 系统初始化
- `POST /api/admin/user/create` - 创建用户
- `GET /api/admin/user/list` - 用户列表
- `PUT /api/admin/user/:id` - 更新用户
- `DELETE /api/admin/user/:id` - 删除用户
- `POST /api/admin/totp/enable/:userId` - 启用TOTP
- `POST /api/admin/totp/disable/:userId` - 禁用TOTP
- `POST /api/admin/totp/reset/:userId` - 重置TOTP
- `GET /api/admin/log/list` - 日志查询
- `GET /api/admin/config` - 获取配置
- `POST /api/admin/config` - 更新配置

## 开发说明

### 服务端开发
```bash
cd server
npm run dev  # 开发模式（热重载）
```

### 客户端开发
```bash
cd client
npm run dev  # 开发模式
npm run build  # 构建Windows安装包
```

### Web管理后台开发
```bash
cd web-admin
npm run dev
```

## 许可证

ISC
