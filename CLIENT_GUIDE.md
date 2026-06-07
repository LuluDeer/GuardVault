# TOTP 客户端使用说明

## 系统要求
- Windows 10/11
- Node.js 18+
- MySQL 8.0

## 快速启动

### 方法一：使用启动脚本（推荐）
1. 双击运行 `start.bat`
2. 系统会自动启动服务端和客户端

### 方法二：手动启动
1. 启动服务端
   ```bash
   cd server
   npm start
   ```

2. 启动客户端
   ```bash
   cd client
   npm run dev
   ```

## 初始配置

### 创建管理员账号
首次使用时，系统会提示配置服务端地址。默认地址是 `http://localhost:3000`

### 创建测试用户
1. 运行 `create-test-user.bat` 脚本
2. 或者通过 API 创建：
   ```bash
   # 管理员登录
   curl -X POST http://localhost:3000/api/admin/login \
     -H "Content-Type: application/json" \
     -d '{"username":"admin","password":"admin123"}'

   # 创建用户（替换 <TOKEN> 为上一步获取的token）
   curl -X POST http://localhost:3000/api/admin/user/create \
     -H "Content-Type: application/json" \
     -H "Authorization: Bearer <TOKEN>" \
     -d '{"username":"testuser","password":"test123","email":"test@example.com","status":1}'
   ```

## 客户端使用

### 登录
1. 输入用户名和密码
2. 点击"登录"按钮

### 查看动态码
登录成功后，客户端会自动：
- 每30秒刷新一次TOTP动态码
- 显示倒计时进度条
- 一键复制验证码到剪贴板

### 修改密码
1. 点击右上角"修改密码"按钮
2. 输入原密码和新密码
3. 确认修改

### 退出登录
点击右上角"退出"按钮

## 功能特性

- **托盘驻留**：关闭窗口会最小化到系统托盘
- **开机自启**：可选开启开机自动启动
- **自动刷新**：动态码30秒自动更新
- **一键复制**：点击即可复制验证码

## 停止系统

运行 `stop.bat` 或手动关闭进程

## 常见问题

### 客户端白屏
- 确保服务端正在运行
- 检查服务端地址配置是否正确
- 尝试重启客户端

### 无法登录
- 确认用户名密码正确
- 检查账号是否被禁用
- 查看服务端日志排查问题

### 网络错误
- 检查防火墙设置
- 确认端口3000未被占用
- 验证数据库连接
