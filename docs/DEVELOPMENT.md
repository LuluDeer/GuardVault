# GuardVault 开发指南

本文档详细介绍 GuardVault 的开发环境搭建、项目结构、开发流程、测试方法等内容。

## 目录

- [开发环境准备](#开发环境准备)
- [项目结构详解](#项目结构详解)
- [开发流程](#开发流程)
- [数据库开发](#数据库开发)
- [API 开发](#api-开发)
- [前端开发](#前端开发)
- [客户端开发](#客户端开发)
- [测试](#测试)
- [代码规范](#代码规范)
- [调试技巧](#调试技巧)
- [常见开发问题](#常见开发问题)

## 开发环境准备

### 1. 系统要求

| 组件 | 版本要求 | 说明 |
|------|---------|------|
| 操作系统 | Windows 10+ / macOS 10.15+ / Linux | 任选其一 |
| Node.js | ≥ 18.0 | 推荐 18 LTS 或 20 LTS |
| MySQL | ≥ 8.0 | 本地开发数据库 |
| Git | ≥ 2.0 | 代码版本管理 |
| IDE | VS Code / WebStorm | 推荐使用 VS Code |

### 2. 安装 Node.js

**官方下载：**
- 访问 [Node.js 官网](https://nodejs.org/)
- 下载 LTS 版本（推荐 18.x 或 20.x）

**使用版本管理工具（推荐）：**

**macOS/Linux (nvm):**
```bash
# 安装 nvm
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash

# 重新加载 shell
source ~/.bashrc  # 或 source ~/.zshrc

# 安装 Node.js 20 LTS
nvm install 20
nvm use 20

# 设置默认版本
nvm alias default 20
```

**Windows (nvm-windows):**
- 下载 [nvm-windows](https://github.com/coreybutler/nvm-windows/releases)
- 安装后运行：
```powershell
nvm install 20
nvm use 20
```

**验证安装：**
```bash
node --version  # 应显示 v20.x.x
npm --version   # 应显示 10.x.x
```

### 3. 安装 MySQL

**Windows:**
- 下载 [MySQL Installer](https://dev.mysql.com/downloads/installer/)
- 选择 "Developer Default" 安装
- 记住 root 密码

**macOS (Homebrew):**
```bash
brew install mysql
brew services start mysql

# 安全配置
mysql_secure_installation
```

**Linux (Ubuntu/Debian):**
```bash
sudo apt update
sudo apt install -y mysql-server mysql-client
sudo systemctl start mysql
sudo systemctl enable mysql
sudo mysql_secure_installation
```

### 4. 安装 Git

**Windows:**
- 下载 [Git for Windows](https://git-scm.com/download/win)

**macOS:**
```bash
# macOS 自带 Git，或使用 Homebrew
brew install git
```

**Linux:**
```bash
sudo apt install -y git  # Ubuntu/Debian
sudo yum install -y git  # CentOS/RHEL
```

### 5. 安装 VS Code（推荐）

**下载地址：** [https://code.visualstudio.com/](https://code.visualstudio.com/)

**推荐插件：**
- ESLint
- Prettier
- Vue Language Features (Volar)
- Prisma
- GitLens
- Thunder Client（API 测试）

### 6. 克隆项目

```bash
# 克隆仓库
git clone <repository-url>
cd GuardVault

# 查看项目结构
ls -la
```

### 7. 安装项目依赖

```bash
# 安装服务端依赖
cd server
npm install
cd ..

# 安装客户端依赖
cd client
npm install
cd ..

# 安装 Web 后台依赖
cd web-admin
npm install
cd ..
```

### 8. 配置开发环境变量

```bash
# 复制环境变量模板
cp server/.env.example server/.env

# 编辑配置文件
nano server/.env  # Linux/macOS
# 或使用 VS Code 打开编辑
```

开发环境配置示例：
```env
# 应用配置
PORT=3001
NODE_ENV=development
BIND_HOST=0.0.0.0

# 数据库配置（本地开发）
DATABASE_URL="mysql://root:your_password@127.0.0.1:3306/guardvault_dev"

# JWT 密钥（开发环境可以使用简单值）
JWT_SECRET=dev_secret_key_change_in_production

# TOTP 加密密钥（开发环境可以使用简单值）
TOTP_MASTER_KEY=12345678901234567890123456789012

# CORS 配置（开发环境可以留空）
CORS_ORIGINS=

# 安全配置（开发环境可以宽松一些）
MAX_LOGIN_ATTEMPTS=20
BLOCK_DURATION_MINUTES=5
```

### 9. 初始化开发数据库

```bash
# 创建开发数据库
mysql -u root -p -e "CREATE DATABASE IF NOT EXISTS guardvault_dev CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"

# 运行数据库迁移
cd server
npm run prisma:push

# 可选：打开 Prisma Studio（数据库管理界面）
npm run prisma:studio
```

### 10. 启动开发服务

**方式一：使用启动脚本（推荐）**

```bash
# Linux/macOS
./start.sh

# Windows
.\start.bat
```

**方式二：手动启动各服务**

```bash
# 终端 1: 启动服务端
cd server
npm run dev

# 终端 2: 启动 Web 后台
cd web-admin
npm run dev

# 终端 3: 启动客户端（可选）
cd client
npm run dev
```

### 11. 验证开发环境

```bash
# 测试 API 健康检查
curl http://localhost:3001/api/health

# 访问 Web 管理后台
# 浏览器打开: http://localhost:5173

# 初始化系统管理员
curl -X POST http://localhost:3001/api/admin/init \
  -H "Content-Type: application/json" \
  -d '{"username": "admin", "password": "Admin@123"}'
```

## 项目结构详解

### 整体结构

```
GuardVault/
├── server/              # 后端服务
│   ├── src/
│   │   ├── app.js              # 应用入口
│   │   ├── controllers/        # 控制器层
│   │   ├── routes/             # 路由配置
│   │   ├── services/           # 业务逻辑层
│   │   ├── middlewares/        # 中间件
│   │   ├── prisma/             # 数据模型
│   │   └── utils/              # 工具函数
│   ├── prisma/                 # 数据库迁移
│   ├── package.json
│   └── .env.example
│
├── client/              # PC 客户端
│   ├── src/
│   │   ├── main/        # 主进程
│   │   ├── preload/     # 预加载脚本
│   │   └── renderer/    # 渲染进程
│   ├── package.json
│   └── electron-builder.yml
│
├── web-admin/           # Web 管理后台
│   ├── src/
│   │   ├── views/       # 页面组件
│   │   ├── components/  # 通用组件
│   │   ├── api/         # API 封装
│   │   ├── stores/      # 状态管理
│   │   └── router/      # 路由配置
│   ├── package.json
│   └── vite.config.js
│
├── scripts/             # 运维脚本
├── docs/                # 文档
└── README.md
```

### 服务端结构详解

```
server/src/
├── app.js                      # Fastify 应用入口
│
├── controllers/                # 控制器（处理 HTTP 请求）
│   ├── admin/                  # 管理员控制器
│   │   ├── admin.auth.controller.js
│   │   ├── admin.user.controller.js
│   │   ├── admin.service.controller.js
│   │   └── ...
│   └── user/                   # 用户控制器
│       ├── user.auth.controller.js
│       ├── user.service.controller.js
│       └── ...
│
├── routes/                     # 路由配置
│   ├── admin/                  # 管理员路由
│   │   ├── auth.js
│   │   ├── user.js
│   │   └── ...
│   ├── user/                   # 用户路由
│   │   ├── auth.js
│   │   └── ...
│   └── _shared.js              # 共享路由
│
├── services/                   # 业务逻辑层
│   ├── auth.service.js         # 认证服务
│   ├── user.service.js         # 用户服务
│   ├── service.service.js      # 服务管理
│   ├── totp.service.js         # TOTP 生成
│   └── ...
│
├── middlewares/                # 中间件
│   ├── authenticate.js         # 身份认证
│   ├── authorize.js            # 权限授权
│   └── ip-block.js             # IP 封禁
│
├── prisma/                     # Prisma 配置
│   └── schema.prisma           # 数据模型定义
│
└── utils/                      # 工具函数
    ├── crypto.js               # 加密工具
    ├── env.js                  # 环境变量
    ├── error.js                # 错误处理
    └── ...
```

### 客户端结构详解

```
client/src/
├── main/                       # 主进程
│   ├── index.js                # 主进程入口
│   ├── window-manager.js       # 窗口管理
│   ├── tray.js                 # 系统托盘
│   ├── discovery.js            # 局域网发现
│   ├── autostart.js            # 开机自启
│   ├── http.js                 # HTTP 请求
│   ├── token-store.js          # Token 存储
│   └── ipc-*.js                # IPC 处理器
│
├── preload/                    # 预加载脚本
│   └── index.js                # 暴露安全 API
│
└── renderer/                   # 渲染进程
    ├── main.js                 # Vue 应用入口
    ├── App.vue                 # 根组件
    ├── views/                  # 页面组件
    │   ├── Login.vue
    │   ├── Services.vue
    │   └── ...
    ├── stores/                 # Pinia 状态
    │   ├── auth.js
    │   └── service.js
    ├── api/                    # API 封装
    │   └── index.js
    └── router/                 # 路由配置
        └── index.js
```

### Web 后台结构详解

```
web-admin/src/
├── main.js                     # Vue 应用入口
├── App.vue                     # 根组件
│
├── views/                      # 页面组件
│   ├── Login.vue               # 登录页
│   ├── Users.vue               # 用户管理
│   ├── Services.vue            # 服务管理
│   ├── Departments.vue         # 部门管理
│   ├── Audit.vue               # 审计报表
│   └── ...
│
├── components/                 # 通用组件
│   ├── SearchBar.vue           # 搜索栏
│   └── TableToolbar.vue        # 表格工具栏
│
├── api/                        # API 封装
│   ├── index.js                # 基础配置
│   ├── auth.js                 # 认证 API
│   ├── user.js                 # 用户 API
│   └── ...
│
├── stores/                     # Pinia 状态
│   ├── auth.js                 # 认证状态
│   └── theme.js                # 主题状态
│
├── router/                     # 路由配置
│   └── index.js
│
└── assets/                     # 静态资源
    └── ...
```

## 开发流程

### 1. 创建功能分支

```bash
# 从 main 分支创建功能分支
git checkout main
git pull origin main
git checkout -b feat/your-feature-name

# 或从 develop 分支创建（如果有）
git checkout develop
git pull origin develop
git checkout -b feat/your-feature-name
```

### 2. 开发新功能

#### 后端开发流程

**步骤 1: 修改数据模型（如需要）**

编辑 `server/src/prisma/schema.prisma`:
```prisma
model NewModel {
  id        Int      @id @default(autoincrement())
  name      String
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
}
```

**步骤 2: 生成并应用迁移**

```bash
cd server
npm run prisma:push  # 开发环境
# 或
npm run prisma:migrate  # 生产环境
```

**步骤 3: 创建 Service 层**

创建 `server/src/services/new-service.service.js`:
```javascript
export class NewService {
  async create(data) {
    // 业务逻辑
  }

  async findById(id) {
    // 查询逻辑
  }
}

export default new NewService();
```

**步骤 4: 创建 Controller 层**

创建 `server/src/controllers/admin/new.controller.js`:
```javascript
import newService from '../services/new-service.service.js';

export async function createHandler(request, reply) {
  try {
    const result = await newService.create(request.body);
    return reply.success(result);
  } catch (error) {
    return reply.error(error.message);
  }
}
```

**步骤 5: 创建路由**

创建 `server/src/routes/admin/new.js`:
```javascript
import { authenticate, authorize } from '../../middlewares/index.js';
import { createHandler } from '../../controllers/admin/new.controller.js';

export default async function (fastify) {
  fastify.post('/', {
    preHandler: [authenticate, authorize(['super_admin'])],
    handler: createHandler
  });
}
```

**步骤 6: 注册路由**

编辑 `server/src/app.js`:
```javascript
import newRoutes from './routes/admin/new.js';

// 在路由注册部分添加
await fastify.register(newRoutes, { prefix: '/api/admin/new' });
```

#### 前端开发流程

**步骤 1: 创建 API 封装**

编辑 `web-admin/src/api/new.js`:
```javascript
import request from './index';

export const createNew = (data) => {
  return request.post('/admin/new', data);
};

export const getNewList = (params) => {
  return request.get('/admin/new', { params });
};
```

**步骤 2: 创建页面组件**

创建 `web-admin/src/views/New.vue`:
```vue
<template>
  <div class="new-page">
    <!-- 页面内容 -->
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { createNew, getNewList } from '@/api/new';

const data = ref([]);

onMounted(async () => {
  const res = await getNewList();
  data.value = res.data;
});
</script>
```

**步骤 3: 配置路由**

编辑 `web-admin/src/router/index.js`:
```javascript
{
  path: '/new',
  name: 'New',
  component: () => import('@/views/New.vue'),
  meta: { requiresAuth: true }
}
```

### 3. 测试功能

```bash
# 启动开发服务
./start.sh

# 手动测试
# - 访问 Web 界面
# - 测试 API 接口
# - 测试业务流程

# 运行测试（如果有）
cd server
npm test
```

### 4. 代码检查

```bash
# ESLint 检查
cd server
npx eslint src/

# Prettier 格式化
npx prettier --write src/
```

### 5. 提交代码

```bash
# 查看修改
git status

# 添加文件
git add .

# 提交代码
git commit -m "feat(module): 添加新功能描述"

# 推送到远程
git push origin feat/your-feature-name
```

### 6. 创建 Pull Request

1. 在 GitHub/GitLab 上创建 PR
2. 填写 PR 描述
3. 等待代码审查
4. 根据反馈修改代码
5. 合并到主分支

## 数据库开发

### 1. 数据模型设计

编辑 `server/src/prisma/schema.prisma`:

```prisma
model User {
  id        Int      @id @default(autoincrement())
  username  String   @unique
  email     String?  @unique
  password  String
  role      UserRole @default(USER)
  deptId    Int?
  dept      Department? @relation(fields: [deptId], references: [id])
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  @@index([username])
  @@index([email])
}

model Department {
  id        Int     @id @default(autoincrement())
  name      String  @unique
  code      String  @unique
  users     User[]
  services  Service[]
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
}

enum UserRole {
  SUPER_ADMIN
  DEPT_ADMIN
  USER
}
```

### 2. 数据库迁移

**开发环境（快速同步）:**
```bash
cd server
npm run prisma:push
```

**生产环境（创建迁移文件）:**
```bash
# 创建迁移
npm run prisma:migrate dev --name add_new_field

# 应用迁移
npm run prisma:migrate deploy
```

### 3. Prisma Studio

```bash
cd server
npm run prisma:studio
```

Prisma Studio 会在浏览器中打开一个数据库管理界面。

### 4. 数据库查询示例

```javascript
// 在 Service 中使用 Prisma Client
import { prisma } from '../utils/prisma.js';

export class UserService {
  async findByUsername(username) {
    return await prisma.user.findUnique({
      where: { username },
      include: { dept: true }
    });
  }

  async findByDept(deptId) {
    return await prisma.user.findMany({
      where: { deptId },
      orderBy: { createdAt: 'desc' }
    });
  }

  async createWithDept(data) {
    return await prisma.user.create({
      data: {
        ...data,
        dept: {
          connect: { id: data.deptId }
        }
      }
    });
  }
}
```

## API 开发

### 1. API 设计规范

**RESTful API 设计:**

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | /api/resource | 获取列表 |
| GET | /api/resource/:id | 获取详情 |
| POST | /api/resource | 创建资源 |
| PUT | /api/resource/:id | 更新资源 |
| DELETE | /api/resource/:id | 删除资源 |

**响应格式:**

成功响应:
```json
{
  "success": true,
  "data": { ... },
  "message": "操作成功"
}
```

错误响应:
```json
{
  "success": false,
  "error": "错误信息",
  "code": "ERROR_CODE"
}
```

### 2. 创建新 API

**步骤 1: 定义路由**

```javascript
// server/src/routes/admin/example.js
export default async function (fastify) {
  // 获取列表
  fastify.get('/', {
    preHandler: [authenticate, authorize(['super_admin', 'dept_admin'])],
    handler: getListHandler
  });

  // 获取详情
  fastify.get('/:id', {
    preHandler: [authenticate, authorize(['super_admin', 'dept_admin'])],
    handler: getDetailHandler
  });

  // 创建
  fastify.post('/', {
    preHandler: [authenticate, authorize(['super_admin'])],
    handler: createHandler
  });

  // 更新
  fastify.put('/:id', {
    preHandler: [authenticate, authorize(['super_admin'])],
    handler: updateHandler
  });

  // 删除
  fastify.delete('/:id', {
    preHandler: [authenticate, authorize(['super_admin'])],
    handler: deleteHandler
  });
}
```

**步骤 2: 实现控制器**

```javascript
// server/src/controllers/admin/example.controller.js
import exampleService from '../../services/example.service.js';

export async function getListHandler(request, reply) {
  try {
    const { page = 1, limit = 20, keyword } = request.query;
    const result = await exampleService.getList({
      page: parseInt(page),
      limit: parseInt(limit),
      keyword
    });
    return reply.success(result);
  } catch (error) {
    return reply.error(error.message);
  }
}

export async function createHandler(request, reply) {
  try {
    const data = await exampleService.create(request.body);
    return reply.success(data, '创建成功');
  } catch (error) {
    return reply.error(error.message);
  }
}
```

**步骤 3: 实现服务层**

```javascript
// server/src/services/example.service.js
import { prisma } from '../utils/prisma.js';

export class ExampleService {
  async getList({ page, limit, keyword }) {
    const skip = (page - 1) * limit;
    const where = keyword ? {
      OR: [
        { name: { contains: keyword } },
        { description: { contains: keyword } }
      ]
    } : {};

    const [data, total] = await Promise.all([
      prisma.example.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' }
      }),
      prisma.example.count({ where })
    ]);

    return {
      data,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    };
  }

  async create(data) {
    return await prisma.example.create({
      data
    });
  }
}

export default new ExampleService();
```

### 3. API 测试

**使用 curl:**
```bash
# 获取列表
curl http://localhost:3001/api/admin/example \
  -H "Authorization: Bearer YOUR_TOKEN"

# 创建资源
curl -X POST http://localhost:3001/api/admin/example \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{"name": "示例", "description": "测试"}'
```

**使用 Thunder Client (VS Code 插件):**
1. 安装 Thunder Client 插件
2. 创建新请求
3. 配置 URL、方法、Headers、Body
4. 发送请求查看响应

## 前端开发

### 1. 组件开发

**Vue 3 Composition API:**

```vue
<template>
  <div class="user-list">
    <el-table :data="users" v-loading="loading">
      <el-table-column prop="username" label="用户名" />
      <el-table-column prop="email" label="邮箱" />
      <el-table-column label="操作">
        <template #default="{ row }">
          <el-button @click="handleEdit(row)">编辑</el-button>
          <el-button @click="handleDelete(row)" type="danger">删除</el-button>
        </template>
      </el-table-column>
    </el-table>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { getUserList, deleteUser } from '@/api/user';
import { ElMessage, ElMessageBox } from 'element-plus';

const users = ref([]);
const loading = ref(false);

const fetchUsers = async () => {
  loading.value = true;
  try {
    const res = await getUserList();
    users.value = res.data.data;
  } catch (error) {
    ElMessage.error('获取用户列表失败');
  } finally {
    loading.value = false;
  }
};

const handleEdit = (row) => {
  // 编辑逻辑
};

const handleDelete = async (row) => {
  try {
    await ElMessageBox.confirm('确定要删除该用户吗？', '提示', {
      type: 'warning'
    });

    await deleteUser(row.id);
    ElMessage.success('删除成功');
    fetchUsers();
  } catch (error) {
    if (error !== 'cancel') {
      ElMessage.error('删除失败');
    }
  }
};

onMounted(() => {
  fetchUsers();
});
</script>

<style scoped>
.user-list {
  padding: 20px;
}
</style>
```

### 2. 状态管理

**Pinia Store:**

```javascript
// web-admin/src/stores/auth.js
import { defineStore } from 'pinia';
import { login as loginApi, logout as logoutApi } from '@/api/auth';

export const useAuthStore = defineStore('auth', {
  state: () => ({
    token: localStorage.getItem('token') || '',
    user: JSON.parse(localStorage.getItem('user') || 'null')
  }),

  getters: {
    isAuthenticated: (state) => !!state.token,
    userRole: (state) => state.user?.role
  },

  actions: {
    async login(credentials) {
      const res = await loginApi(credentials);
      this.token = res.data.token;
      this.user = res.data.user;

      localStorage.setItem('token', this.token);
      localStorage.setItem('user', JSON.stringify(this.user));
    },

    async logout() {
      await logoutApi();
      this.token = '';
      this.user = null;

      localStorage.removeItem('token');
      localStorage.removeItem('user');
    }
  }
});
```

### 3. 路由配置

```javascript
// web-admin/src/router/index.js
import { createRouter, createWebHistory } from 'vue-router';
import { useAuthStore } from '@/stores/auth';

const routes = [
  {
    path: '/login',
    name: 'Login',
    component: () => import('@/views/Login.vue'),
    meta: { requiresAuth: false }
  },
  {
    path: '/',
    component: () => import('@/layouts/MainLayout.vue'),
    meta: { requiresAuth: true },
    children: [
      {
        path: '',
        redirect: '/services'
      },
      {
        path: 'services',
        name: 'Services',
        component: () => import('@/views/Services.vue')
      },
      {
        path: 'users',
        name: 'Users',
        component: () => import('@/views/Users.vue'),
        meta: { roles: ['super_admin', 'dept_admin'] }
      }
    ]
  }
];

const router = createRouter({
  history: createWebHistory(),
  routes
});

// 路由守卫
router.beforeEach((to, from, next) => {
  const authStore = useAuthStore();

  if (to.meta.requiresAuth && !authStore.isAuthenticated) {
    next('/login');
  } else if (to.meta.roles && !to.meta.roles.includes(authStore.userRole)) {
    next('/unauthorized');
  } else {
    next();
  }
});

export default router;
```

## 客户端开发

### 1. 主进程开发

**窗口管理:**

```javascript
// client/src/main/window-manager.js
import { BrowserWindow, app } from 'electron';

export function createMainWindow() {
  const mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      preload: path.join(__dirname, '../preload/index.js'),
      contextIsolation: true,
      nodeIntegration: false
    }
  });

  // 开发环境加载开发服务器
  if (process.env.NODE_ENV === 'development') {
    mainWindow.loadURL('http://localhost:5175');
    mainWindow.webContents.openDevTools();
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
  }

  return mainWindow;
}
```

**IPC 通信:**

```javascript
// client/src/main/ipc-business.js
import { ipcMain } from 'electron';
import * as authService from '../services/auth.js';

export function registerIpcHandlers() {
  // 登录
  ipcMain.handle('auth:login', async (event, credentials) => {
    try {
      const result = await authService.login(credentials);
      return { success: true, data: result };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  // 获取服务列表
  ipcMain.handle('service:getList', async () => {
    try {
      const services = await authService.getServiceList();
      return { success: true, data: services };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });
}
```

### 2. 渲染进程开发

**调用主进程 API:**

```javascript
// client/src/renderer/api/index.js
export const login = async (credentials) => {
  return await window.electronAPI.auth.login(credentials);
};

export const getServiceList = async () => {
  return await window.electronAPI.service.getList();
};
```

**在组件中使用:**

```vue
<template>
  <div>
    <button @click="handleLogin">登录</button>
  </div>
</template>

<script setup>
import { login } from '@/api';

const handleLogin = async () => {
  const result = await login({
    username: 'admin',
    password: 'Admin@123'
  });

  if (result.success) {
    console.log('登录成功', result.data);
  } else {
    console.error('登录失败', result.error);
  }
};
</script>
```

### 3. 调试技巧

**主进程调试:**
```javascript
// 在主进程中使用 console.log
console.log('主进程日志', data);

// 或使用 VS Code 调试器
// 在 package.json 中添加调试配置
```

**渲染进程调试:**
- 开发环境自动打开 DevTools
- 或使用快捷键 `Ctrl+Shift+I` (Windows/Linux) / `Cmd+Option+I` (macOS)

## 测试

### 1. 单元测试

```bash
cd server
npm test
```

### 2. 端到端测试

```bash
# 运行 E2E 测试
node scripts/e2e-test.js
```

### 3. 手动测试流程

1. **系统初始化测试**
   ```bash
   curl -X POST http://localhost:3001/api/admin/init \
     -H "Content-Type: application/json" \
     -d '{"username": "admin", "password": "Admin@123"}'
   ```

2. **管理员登录测试**
   - 访问 http://localhost:5173
   - 使用 admin/Admin@123 登录

3. **创建部门测试**
   - 进入部门管理
   - 创建测试部门

4. **创建用户测试**
   - 进入用户管理
   - 创建测试用户

5. **录入服务测试**
   - 进入服务管理
   - 手动录入测试服务
   - 或批量导入 CSV

6. **授权测试**
   - 为用户授权服务

7. **客户端测试**
   - 启动客户端
   - 使用测试用户登录
   - 查看和复制 TOTP 码

## 代码规范

### 1. 命名规范

- **文件名**: kebab-case (user-service.js)
- **变量名**: camelCase (userName)
- **常量名**: UPPER_SNAKE_CASE (MAX_LOGIN_ATTEMPTS)
- **类名**: PascalCase (UserService)
- **组件名**: PascalCase (UserList.vue)

### 2. 代码风格

使用 ESLint 和 Prettier:

```bash
# 检查代码
npx eslint src/

# 自动修复
npx eslint src/ --fix

# 格式化代码
npx prettier --write src/
```

### 3. 提交规范

```
<type>(<scope>): <subject>

<body>

<footer>
```

类型 (type):
- `feat`: 新功能
- `fix`: 修复 bug
- `docs`: 文档更新
- `style`: 代码格式
- `refactor`: 重构
- `test`: 测试
- `chore`: 构建/工具

示例:
```
feat(auth): 添加双因素认证功能

- 实现 TOTP 密钥生成
- 添加二维码扫描功能
- 更新登录流程

Closes #123
```

## 调试技巧

### 1. VS Code 调试配置

创建 `.vscode/launch.json`:

```json
{
  "version": "0.2.0",
  "configurations": [
    {
      "type": "node",
      "request": "launch",
      "name": "启动服务端",
      "cwd": "${workspaceFolder}/server",
      "program": "${workspaceFolder}/server/src/app.js",
      "env": {
        "NODE_ENV": "development"
      }
    },
    {
      "type": "node",
      "request": "launch",
      "name": "启动客户端",
      "cwd": "${workspaceFolder}/client",
      "runtimeExecutable": "${workspaceFolder}/client/node_modules/.bin/electron",
      "windows": {
        "runtimeExecutable": "${workspaceFolder}/client/node_modules/.bin/electron.cmd"
      },
      "program": "${workspaceFolder}/client/src/main/index.js",
      "env": {
        "NODE_ENV": "development"
      }
    }
  ]
}
```

### 2. 日志调试

```javascript
// 使用 console.log
console.log('调试信息', data);

// 使用调试器
debugger;

// 使用日志库
import logger from '../utils/logger.js';
logger.info('信息日志');
logger.error('错误日志', error);
```

### 3. 网络调试

**服务端:**
```javascript
// 记录请求日志
fastify.addHook('onRequest', (request, reply, done) => {
  console.log(`${request.method} ${request.url}`);
  done();
});
```

**前端:**
```javascript
// 拦截请求
axios.interceptors.request.use(config => {
  console.log('请求:', config);
  return config;
});

axios.interceptors.response.use(response => {
  console.log('响应:', response);
  return response;
});
```

## 常见开发问题

### 1. 端口被占用

```bash
# 查找占用端口的进程
lsof -i :3001  # macOS/Linux
netstat -ano | findstr :3001  # Windows

# 终止进程
kill -9 <PID>  # macOS/Linux
taskkill /PID <PID> /F  # Windows
```

### 2. 数据库连接失败

检查 `server/.env` 中的 `DATABASE_URL` 配置:
```bash
# 测试数据库连接
mysql -u root -p -h 127.0.0.1 guardvault_dev
```

### 3. 依赖安装失败

```bash
# 清除缓存
npm cache clean --force

# 删除 node_modules 重新安装
rm -rf node_modules package-lock.json
npm install
```

### 4. Prisma 迁移失败

```bash
# 重置数据库（谨慎使用！）
cd server
npx prisma migrate reset

# 或手动删除迁移文件
rm -rf prisma/migrations/*
npm run prisma:push
```

### 5. Electron 启动失败

```bash
# 重新构建
cd client
rm -rf node_modules package-lock.json
npm install

# 检查 Electron 版本
npm list electron
```

## 下一步

- 阅读 [部署指南](DEPLOYMENT.md) 了解如何部署到生产环境
- 阅读 [使用指南](USER_GUIDE.md) 了解如何使用系统
- 阅读 [故障排查指南](TROUBLESHOOTING.md) 解决常见问题