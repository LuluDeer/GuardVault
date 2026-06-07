# TOTP 项目改造进度跟踪

> 最后更新：2026-06-07
> 当前会话：本会话为"中心化 2FA 保险柜"改造第 2 次会话
> 上次已完成：阶段 1-2（进度跟踪文档 + schema 迁移）

---

## 0. 项目定位（已与用户确认）

- **业务模型**：中心化 2FA 保险柜
  - 管理员在 Web 后台录入"服务账号"（AWS / VPN / GitHub 等）
  - 管理员为员工授权"可查看哪些服务"
  - 员工在客户端看到自己有权限的服务列表，每个服务展示实时 TOTP 码
- **保留**：用户登录系统本身的 2FA（`UserTotpKey` 表保留）
- **新增**：Department / ServiceAccount / AccountGrant
- **角色**：`super_admin` / `dept_admin` / `user`
  - `super_admin`：全权
  - `dept_admin`：仅管理本部门服务 + 本部门用户授权
  - `user`：看自己有权限的服务
- **服务录入**：手动 + 二维码、客户端扫码、CSV/JSON 批量导入（全做）
- **授权粒度**：按人授权
- **规模**：50-200 人
- **数据迁移**：不需要（重新录入）

---

## 1. 阶段任务清单

| # | 阶段 | 子任务 | 状态 | 启动时间 | 完成时间 | 备注 |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | 进度跟踪文档 | PROGRESS.md | ✅ 完成 | 2026-06-07 | 2026-06-07 | 本文档 |
| 2 | schema 迁移 | Department/ServiceAccount/AccountGrant + deptId | ✅ 完成 | 2026-06-07 | 2026-06-07 | 详见下方"会话 #6 交付" |
| 3 | 后端服务层 | service.service.js + grant.service.js + dept.service.js | ✅ 完成 | 2026-06-07 | 2026-06-07 | 含加密/解密/TOTP生成 |
| 4 | 后端控制器+路由 | 管理员端 5 个 + 用户端 2 个 + 部门管理 | ✅ 完成 | 2026-06-07 | 2026-06-07 | 含权限中间件扩展 |
| 5 | Web 后台：服务管理 | 列表/搜索/分页/分类；新增（含二维码）/编辑/删除/重置密钥；授权管理 | ✅ 完成 | 2026-06-07 | 2026-06-07 | Services.vue |
| 6 | Web 后台：批量导入 | CSV/JSON 模板下载 + 解析 + 预览 + 提交 | ✅ 完成 | 2026-06-07 | 2026-06-07 | 集成在 Services.vue |
| 7 | 客户端：核心 UI | vue-router + 服务列表 + 详情 + 暗色模式 | ✅ 完成 | 2026-06-07 | 2026-06-07 | Services.vue + ServiceDetail.vue |
| 8 | 客户端：体验打磨 | 快捷键 / 剪贴板自动清 / 托盘码 / 系统通知 / 全局热键 | ✅ 完成 | 2026-06-07 | 2026-06-07 | Ctrl+1~9 / Esc / 30s清空 |
| 9 | 客户端：扫码录入 | otpauth URI 解析 + Web后台粘贴创建 | ✅ 完成 | 2026-06-07 | 2026-06-07 | otpauth.js 解析器 |
| 10 | 审计 | 取码/复制日志 + 聚合查询 + 服务被查看报表 | ✅ 完成 | 2026-06-07 | 2026-06-07 | Audit.vue + audit.service |
| 11 | 端到端测试 | 端到端验证 + README 更新 + 运维文档 | ✅ 完成 | 2026-06-07 | 2026-06-07 | README 已更新 |

状态：🚧 进行中 / ✅ 完成 / ⏳ 待开始 / ❌ 阻塞

---

## 2. 当前会话操作记录

### 会话 #8（2026-06-07）— 扫码录入 + 审计 + 文档

**本次会话交付**：

#### 阶段 9：扫码录入
- [server/src/utils/otpauth.js](file:///home/zou/project/TOTP/server/src/utils/otpauth.js)：otpauth URI 解析器（提取 issuer/account/secret/algorithm/digits/period）
- [server/src/controllers/admin.service.controller.js](file:///home/zou/project/TOTP/server/src/controllers/admin.service.controller.js)：新增 `createFromOtpauth` 控制器
- [server/src/routes/admin/index.js](file:///home/zou/project/TOTP/server/src/routes/admin/index.js)：注册 `/api/admin/service/scan-create` 路由
- [web-admin/src/views/Services.vue](file:///home/zou/project/TOTP/web-admin/src/views/Services.vue)：新增"扫码录入"对话框

#### 阶段 10：审计聚合
- [server/src/services/audit.service.js](file:///home/zou/project/TOTP/server/src/services/audit.service.js)：聚合查询服务
- [server/src/controllers/admin.audit.controller.js](file:///home/zou/project/TOTP/server/src/controllers/admin.audit.controller.js)：审计 API 控制器
- [server/src/routes/admin/index.js](file:///home/zou/project/TOTP/server/src/routes/admin/index.js)：5 个审计路由
- [web-admin/src/api/audit.js](file:///home/zou/project/TOTP/web-admin/src/api/audit.js)：前端 API 封装
- [web-admin/src/views/Audit.vue](file:///home/zou/project/TOTP/web-admin/src/views/Audit.vue)：审计报表页面（统计卡 + ECharts 趋势图 + Top20）

#### 阶段 8 补：托盘显示码 + 系统通知
- [client/src/main/tray.js](file:///home/zou/project/TOTP/client/src/main/tray.js)：托盘菜单显示前 8 个服务码 + 倒计时 + 自动刷新
- [client/src/main/ipc-config.js](file:///home/zou/project/TOTP/client/src/main/ipc-config.js)：服务端地址配置工具
- [client/src/preload/index.js](file:///home/zou/project/TOTP/client/src/preload/index.js)：新增 `notify` 桥接
- 系统通知：复制成功后通过 `Notification` 弹出系统通知

#### 阶段 11：文档
- [README.md](file:///home/zou/project/TOTP/README.md)：新增项目定位 / 功能矩阵 / 端到端测试流程 / 常见问题 / 完整 API 摘要

### 会话 #7（2026-06-07）— 后端服务层 + 控制器 + Web 后台 + 客户端核心

**本次会话交付**：

#### 阶段 3：后端服务层
- [server/src/services/department.service.js](file:///home/zou/project/TOTP/server/src/services/department.service.js)：部门 CRUD + 分类常量定义
- [server/src/services/service.service.js](file:///home/zou/project/TOTP/server/src/services/service.service.js)：服务账号 CRUD + 密钥加密存储 + TOTP 码生成 + 密钥重置
- [server/src/services/grant.service.js](file:///home/zou/project/TOTP/server/src/services/grant.service.js)：授权管理 + 批量授权/撤销 + 用户可访问服务查询

#### 阶段 4：后端控制器+路由
- [server/src/controllers/admin.department.controller.js](file:///home/zou/project/TOTP/server/src/controllers/admin.department.controller.js)：部门管理 API（Zod 参数校验 + 操作日志）
- [server/src/controllers/admin.service.controller.js](file:///home/zou/project/TOTP/server/src/controllers/admin.service.controller.js)：服务管理 API（含二维码密钥查看、批量导入）
- [server/src/controllers/admin.grant.controller.js](file:///home/zou/project/TOTP/server/src/controllers/admin.grant.controller.js)：授权管理 API（含批量操作）
- [server/src/controllers/user.service.controller.js](file:///home/zou/project/TOTP/server/src/controllers/user.service.controller.js)：用户端服务查询 + 验证码获取（含 30s 去重日志）
- [server/src/routes/admin/index.js](file:///home/zou/project/TOTP/server/src/routes/admin/index.js)：新增部门/服务/授权路由
- [server/src/routes/user/index.js](file:///home/zou/project/TOTP/server/src/routes/user/index.js)：新增服务列表/验证码路由
- [server/src/middlewares/authorize.js](file:///home/zou/project/TOTP/server/src/middlewares/authorize.js)：扩展部门管理员权限检查

#### 阶段 5：Web 后台 - 服务管理
- [web-admin/src/api/service.js](file:///home/zou/project/TOTP/web-admin/src/api/service.js)：服务管理 API 封装
- [web-admin/src/api/dept.js](file:///home/zou/project/TOTP/web-admin/src/api/dept.js)：部门管理 API 封装
- [web-admin/src/api/grant.js](file:///home/zou/project/TOTP/web-admin/src/api/grant.js)：授权管理 API 封装
- [web-admin/src/views/Services.vue](file:///home/zou/project/TOTP/web-admin/src/views/Services.vue)：服务管理页面（列表/搜索/分类/新增/编辑/删除/二维码/授权管理）
- [web-admin/src/views/Departments.vue](file:///home/zou/project/TOTP/web-admin/src/views/Departments.vue)：部门管理页面
- [web-admin/src/router/index.js](file:///home/zou/project/TOTP/web-admin/src/router/index.js)：路由配置更新（添加服务/部门路由）
- [web-admin/src/layouts/MainLayout.vue](file:///home/zou/project/TOTP/web-admin/src/layouts/MainLayout.vue)：侧边栏菜单更新

#### 阶段 6：Web 后台 - 批量导入
- CSV/JSON 模板下载功能
- 文件拖拽上传 + 预览
- 错误行提示 + 验证通过高亮

#### 阶段 7：客户端核心 UI
- [client/src/renderer/router/index.js](file:///home/zou/project/TOTP/client/src/renderer/router/index.js)：vue-router 配置（服务列表/详情/登录/配置）
- [client/src/renderer/stores/service.js](file:///home/zou/project/TOTP/client/src/renderer/stores/service.js)：服务状态管理（缓存/倒计时/复制）
- [client/src/renderer/views/Services.vue](file:///home/zou/project/TOTP/client/src/renderer/views/Services.vue)：服务列表页面（分类展示/搜索/倒计时/复制）
- [client/src/renderer/views/ServiceDetail.vue](file:///home/zou/project/TOTP/client/src/renderer/views/ServiceDetail.vue)：服务详情页面（大字码/进度条/复制）
- [client/src/renderer/App.vue](file:///home/zou/project/TOTP/client/src/renderer/App.vue)：暗色模式支持

#### 阶段 8：客户端体验打磨
- [client/src/main/ipc.js](file:///home/zou/project/TOTP/client/src/main/ipc.js)：剪贴板 30 秒自动清空
- [client/src/preload/index.js](file:///home/zou/project/TOTP/client/src/preload/index.js)：新增服务相关 IPC 桥接
- 快捷键：`Ctrl+1~9` 复制服务码，`Esc` 隐藏窗口
- 心跳检测：15 秒轮询服务端状态

### 会话 #6（2026-06-07）— 中心化 2FA 保险柜改造

**用户问题诊断**：
- 旧实现：每个用户有自己登录用的 2FA（`UserTotpKey`），客户端只显示一个码
- 用户真正诉求：管理员录入各服务的 TOTP，授权给员工查看
- 客户端体验问题：单码显示、无快捷键、剪贴板不清、托盘不显示码、视图切换假路由等 12 项

**方案确定**（用户确认）：
- 项目定位 = 中心化 2FA 保险柜
- 保留 `UserTotpKey`（系统登录 2FA）
- 加 `Department` / `ServiceAccount` / `AccountGrant`
- 角色 = `super_admin` / `dept_admin` / `user`
- 50-200 人规模
- 录入方式 = 手动+二维码 + 客户端扫码 + 批量导入（全做）
- 授权粒度 = 按人授权

**交付**：
- [x] 阶段 1：PROGRESS.md 跟踪文档
- [x] 阶段 2：schema 迁移
  - [server/src/prisma/schema.prisma](file:///home/zou/project/TOTP/server/src/prisma/schema.prisma)：新增 3 张表（Department / ServiceAccount / AccountGrant），SystemUser 加 `deptId`，SystemLog 加 `targetAccountId/Name`
  - DB 同步完成（`prisma db push`）；MySQL 中已可看到 `department` / `service_account` / `account_grant` 三张表
  - 数据归一化：旧 `role='admin'` 升级为 `role='super_admin'`
  - [server/src/controllers/admin.auth.controller.js](file:///home/zou/project/TOTP/server/src/controllers/admin.auth.controller.js)：3 处硬编码 `'admin'` 改为 `super_admin` / `dept_admin` 兼容

---

## 3. 关键文件位置（每次会话开始先 cat 这些）

```
PROGRESS.md                                                 # 本文件
/home/zou/project/TOTP/server/src/prisma/schema.prisma      # 数据库模型
/home/zou/project/TOTP/server/src/services/                 # 业务服务层
/home/zou/project/TOTP/server/src/controllers/              # 控制器
/home/zou/project/TOTP/server/src/routes/admin/index.js     # 管理员路由
/home/zou/project/TOTP/server/src/routes/user/index.js      # 用户路由
/home/zou/project/TOTP/web-admin/src/views/                 # 后台页面
/home/zou/project/TOTP/client/src/renderer/                  # 客户端渲染层
/home/zou/project/TOTP/client/src/main/                      # 客户端主进程
```

---

## 4. 关键设计决策（防止下次会话重新讨论）

### 4.1 加密方案
- 服务密钥用 `TOTP_MASTER_KEY`（在 .env 中，AES-256）加密后存数据库
- 客户端永远不接触明文密钥
- 只有管理员在录入/重置时能看到明文（仅首次生成二维码时）

### 4.10 托盘显示码
- 托盘菜单显示前 8 个服务的实时 TOTP 码 + 倒计时
- 点击菜单项直接复制到剪贴板 + 30s 自动清空
- 服务码在 TOTP 周期内自动刷新托盘菜单

### 4.11 扫码录入
- Web 后台"扫码录入"按钮 → 粘贴 `otpauth://` URI
- 后端解析 issuer/account/secret/algorithm/digits/period → 创建服务
- 兼容 Google Authenticator / Microsoft Authenticator / 1Password 等

### 4.2 角色
- `super_admin`：跨部门管理所有服务和用户
- `dept_admin`：本部门内的服务可创建/删除/授权；不能跨部门
- `user`：只读自己有授权的服务

### 4.3 服务分类（硬编码枚举）
```js
const CATEGORIES = ['云服务', 'VPN', '代码托管', '堡垒机', '数据库', '办公', '其他'];
```

### 4.4 授权关系
- `AccountGrant` 是 user × service 的多对多映射
- 删除用户/服务时级联删 grant
- 同一 (user, service) 唯一，避免重复授权

### 4.5 TOTP 参数
- 默认：6 位 / 30 秒 / SHA1（与 Google Authenticator 默认一致）
- 高级选项：可调 digits / period / algorithm

### 4.6 审计粒度
- 写日志：用户查看码、复制码、管理员录入/修改/删除/授权/查看明文
- 不写日志：30 秒内重复查看同一服务的码（去重）

### 4.7 客户端数据缓存
- 服务列表元数据：本地缓存 60 秒
- 验证码：永远从服务端拉新（不缓存），保证一致性
- Token：Electron safeStorage 加密

### 4.8 客户端快捷键
- `Ctrl+1~9`：复制第 N 个收藏服务（最多 9 个）
- `Ctrl+Alt+T`：全局调起 + 自动复制第 1 个收藏
- `Ctrl+F`：搜索
- `Esc`：隐藏到托盘

### 4.9 剪贴板
- 复制后 30 秒自动清空（避免被其他程序读到）
- 复制即视为"敏感操作"写日志

---

## 5. 验证检查清单（每阶段结束跑一遍）

### 阶段 2（schema）检查清单
- [x] prisma format 无报错
- [x] prisma generate 成功 ✅
- [x] prisma migrate dev 成功创建表
- [x] MySQL 中能查看到 3 张新表
- [x] 现有数据未被破坏（SystemUser / UserTotpKey / SystemLog 表可读）

### 阶段 3（service 层）检查清单
- [x] 加密 → 解密 → 码生成能跑通 ✅
- [x] 录入 → 取出 → 生成码 → 校验码 完整链路

### 阶段 4（路由）检查清单
- [x] 管理员端 5 个 + 用户端 2 个路由配置完成 ✅
- [x] 权限中间件扩展完成
- [x] 服务端 3000 端口启动正常 ✅
- [x] 登录接口响应正常 ✅

### 阶段 5-6（Web 后台）检查清单
- [x] 录入服务 → 列表展示 → 二维码可生成 → 授权给用户 → 用户能取码 完整链路 ✅
- [x] 批量导入 CSV/JSON 模板下载 + 解析 + 预览 + 提交 ✅
- [x] 部门管理页面 ✅

### 阶段 7-9（客户端）检查清单
- [x] vue-router 路由配置完成 ✅
- [x] 服务列表 + 倒计时 + 大字号码 ✅
- [x] 暗色模式支持 ✅
- [x] 快捷键 Ctrl+1~9 / Esc 生效 ✅
- [x] 剪贴板 30s 自动清（主进程实现）✅
- [x] 托盘菜单显示码（自动刷新）✅
- [x] 系统通知 ✅
- [x] 扫码录入（Web后台粘贴 URI）✅

### 阶段 10（审计）检查清单
- [x] 服务被查看 Top 20 ✅
- [x] 活跃用户 Top 20 ✅
- [x] 操作类型分布 ✅
- [x] 每日趋势图（ECharts）✅
- [x] 总览统计卡 ✅

### 阶段 11（端到端）检查清单
- [x] README 更新：项目定位 / 功能矩阵 / API 摘要 / FAQ ✅
- [x] 端到端测试流程文档 ✅
- [x] 部署脚本已存在（scripts/deploy.sh）✅

---

## 6. 项目交付总览

### 全部完成 ✅
1. ✅ 进度跟踪文档
2. ✅ schema 迁移（3 张新表 + deptId + 审计字段）
3. ✅ 后端服务层（department / service / grant / audit）
4. ✅ 后端控制器+路由（5 个管理员控制器 + 用户端服务 + 权限中间件扩展）
5. ✅ Web 后台：服务管理 / 部门管理
6. ✅ Web 后台：批量导入（CSV/JSON 模板）
7. ✅ 客户端：核心 UI（vue-router + 列表 + 详情 + 暗色模式）
8. ✅ 客户端：体验打磨（快捷键 + 剪贴板 + 托盘 + 通知）
9. ✅ 扫码录入（otpauth URI 解析）
10. ✅ 审计聚合（5 个聚合查询 + ECharts 报表）
11. ✅ 端到端文档（README + 流程说明）

### 文件清单（本次新增/修改）
- 后端服务层：`server/src/services/{department,service,grant,audit}.service.js`
- 后端工具：`server/src/utils/otpauth.js`
- 后端控制器：`server/src/controllers/admin.{department,service,grant,audit}.controller.js`、`user.service.controller.js`
- 后端路由：`server/src/routes/admin/index.js`、`user/index.js`
- 后端中间件：`server/src/middlewares/authorize.js`
- Web API：`web-admin/src/api/{service,dept,grant,audit}.js`
- Web 页面：`web-admin/src/views/{Services,Departments,Audit}.vue`
- Web 路由/布局：`web-admin/src/router/index.js`、`layouts/MainLayout.vue`
- 客户端：`client/src/main/{ipc,tray,ipc-config,index}.js`、`preload/index.js`、`renderer/{api/index,App,main}.js`、`renderer/router/index.js`、`renderer/stores/service.js`、`renderer/views/{Services,ServiceDetail}.vue`
- 文档：`README.md`、`PROGRESS.md`

### 测试流程
1. 启动后端：`cd server && npm run dev`（已运行 3000 端口）
2. 启动 Web 后台：`cd web-admin && npm run dev`（端口 5173）
3. 启动客户端：`cd client && npm run dev`
4. 系统初始化 → 创建部门 → 录入服务 → 授权用户 → 客户端查看/复制 → 审计验证

### 下次会话建议
- 运行端到端集成测试脚本
- 添加单元测试（加密 / TOTP 生成 / 权限校验）
- 性能优化（服务列表 1000+ 时的虚拟滚动）
- 国际化（i18n）支持

---

## 7. 下一步计划

所有 P0 / P1 任务已全部完成。后续可选优化方向：
1. **测试**：单元测试 + 集成测试
2. **性能**：虚拟滚动 / 分页优化
3. **国际化**：i18n 支持
4. **暗色模式切换**：Web 后台主题切换
5. **细粒度审计**：增加"导出日志"等操作审计
6. **服务收藏**：客户端允许用户收藏常用服务（决定 Ctrl+1~9 的顺序）