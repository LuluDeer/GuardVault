# GuardVault 故障排查指南

本指南提供 GuardVault 系统常见问题的诊断和解决方案。

## 目录

- [故障排查流程](#故障排查流程)
- [服务端问题](#服务端问题)
- [客户端问题](#客户端问题)
- [Web 管理后台问题](#web-管理后台问题)
- [数据库问题](#数据库问题)
- [网络问题](#网络问题)
- [性能问题](#性能问题)
- [安全问题](#安全问题)
- [日志分析](#日志分析)
- [获取帮助](#获取帮助)

## 故障排查流程

### 1. 问题分类

首先确定问题类型：

- **服务端问题**: API 服务无法启动或响应异常
- **客户端问题**: PC 客户端无法连接或功能异常
- **Web 后台问题**: Web 界面无法访问或显示异常
- **数据库问题**: 数据库连接失败或查询异常
- **网络问题**: 网络连接问题
- **性能问题**: 系统响应缓慢或资源占用过高
- **安全问题**: 认证失败、权限问题等

### 2. 收集信息

收集以下信息有助于快速定位问题：

- **错误信息**: 完整的错误消息和堆栈跟踪
- **日志文件**: 相关的日志文件内容
- **环境信息**: 操作系统、Node.js 版本、数据库版本
- **复现步骤**: 如何重现问题的详细步骤
- **预期行为**: 期望的正确行为是什么
- **实际行为**: 实际观察到的行为

### 3. 诊断步骤

1. **检查服务状态**
   ```bash
   # Systemd
   sudo systemctl status guardvault-server
   sudo systemctl status guardvault-webadmin

   # PM2
   pm2 status
   pm2 logs guardvault-server
   ```

2. **检查端口监听**
   ```bash
   sudo netstat -tulpn | grep -E '3001|5174'
   # 或
   sudo ss -tulpn | grep -E '3001|5174'
   ```

3. **检查日志文件**
   ```bash
   # Systemd 日志
   sudo journalctl -u guardvault-server -n 100

   # PM2 日志
   pm2 logs guardvault-server --lines 100

   # 应用日志
   tail -f logs/server.log
   ```

4. **测试网络连接**
   ```bash
   # 测试 API 端点
   curl http://localhost:3001/api/health

   # 测试数据库连接
   mysql -u guardvault_user -p -h localhost guardvault_db
   ```

## 服务端问题

### 问题 1: 服务无法启动

**症状**:
- 服务启动失败
- 端口无法监听
- 进程立即退出

**可能原因**:
- 端口被占用
- 环境变量配置错误
- 数据库连接失败
- 依赖缺失

**解决方案**:

1. **检查端口占用**
   ```bash
   # 查找占用端口的进程
   sudo lsof -i :3001
   # 或
   sudo netstat -tulpn | grep :3001

   # 终止占用进程
   sudo kill -9 <PID>
   ```

2. **检查环境变量**
   ```bash
   # 确认 .env 文件存在
   ls -la server/.env

   # 检查必需的环境变量
   cat server/.env | grep -E 'DATABASE_URL|JWT_SECRET|TOTP_MASTER_KEY'
   ```

3. **测试数据库连接**
   ```bash
   # 从 .env 中提取数据库连接信息
   mysql -u <username> -p -h <host> <database>

   # 如果连接失败，检查 MySQL 服务状态
   sudo systemctl status mysql
   ```

4. **检查依赖**
   ```bash
   cd server
   npm list
   ```

5. **查看详细错误**
   ```bash
   cd server
   node src/app.js
   ```

### 问题 2: 服务启动后立即崩溃

**症状**:
- 服务启动成功但立即退出
- 日志显示未捕获的异常

**可能原因**:
- 代码错误
- 数据库迁移未执行
- 配置文件格式错误

**解决方案**:

1. **查看完整错误日志**
   ```bash
   sudo journalctl -u guardvault-server -n 200 --no-pager
   ```

2. **执行数据库迁移**
   ```bash
   cd server
   npm run prisma:push
   # 或
   npm run prisma:migrate
   ```

3. **检查配置文件格式**
   ```bash
   # 验证 JSON 格式
   cat server/.env | grep -v '^#' | grep -v '^$'
   ```

4. **手动启动查看错误**
   ```bash
   cd server
   NODE_ENV=production node src/app.js
   ```

### 问题 3: API 响应缓慢

**症状**:
- API 请求响应时间长
- 超时错误频繁

**可能原因**:
- 数据库查询慢
- 网络延迟
- 服务器资源不足
- 数据库连接池耗尽

**解决方案**:

1. **检查数据库查询**
   ```bash
   # 启用慢查询日志
   # 编辑 MySQL 配置
   sudo nano /etc/mysql/mysql.conf.d/mysqld.cnf

   # 添加以下配置
   slow_query_log = 1
   slow_query_log_file = /var/log/mysql/slow-query.log
   long_query_time = 2

   # 重启 MySQL
   sudo systemctl restart mysql

   # 查看慢查询
   sudo tail -f /var/log/mysql/slow-query.log
   ```

2. **检查数据库连接池**
   ```bash
   # 查看 MySQL 连接数
   mysql -u root -p -e "SHOW PROCESSLIST;"

   # 查看最大连接数
   mysql -u root -p -e "SHOW VARIABLES LIKE 'max_connections';"
   ```

3. **优化数据库配置**
   ```bash
   # 编辑 server/.env
   DB_CONNECTION_LIMIT=20
   DB_IDLE_TIMEOUT=300
   ```

4. **检查服务器资源**
   ```bash
   # CPU 使用率
   top

   # 内存使用
   free -h

   # 磁盘 I/O
   iotop
   ```

### 问题 4: 内存泄漏

**症状**:
- 服务内存持续增长
- 最终导致 OOM (Out of Memory)

**可能原因**:
- 未释放的数据库连接
- 缓存未清理
- 事件监听器未移除

**解决方案**:

1. **监控内存使用**
   ```bash
   # 使用 PM2 监控
   pm2 monit

   # 或使用系统工具
   ps aux | grep node
   ```

2. **设置内存限制**
   ```javascript
   // 编辑 ecosystem.config.cjs
   {
     max_memory_restart: '512M'
   }
   ```

3. **检查数据库连接**
   ```bash
   # 查看活跃连接
   mysql -u root -p -e "SHOW PROCESSLIST;"

   # 查看连接池状态
   # 在代码中添加日志
   ```

4. **定期重启服务**
   ```bash
   # 使用 PM2 定时重启
   pm2 install pm2-logrotate
   pm2 set pm2-logrotate:max_size 10M
   pm2 set pm2-logrotate:retain 7
   ```

## 客户端问题

### 问题 1: 客户端无法连接服务端

**症状**:
- 登录页显示"服务端离线"
- 连接超时
- 网络错误

**可能原因**:
- 服务端未启动
- 网络不通
- 防火墙阻止
- 地址配置错误

**解决方案**:

1. **测试服务端可达性**
   ```bash
   # 从客户端机器测试
   curl -m 5 http://<server-ip>:3001/api/health

   # 或使用 ping
   ping <server-ip>
   ```

2. **检查服务端状态**
   ```bash
   # 在服务端机器上
   sudo systemctl status guardvault-server

   # 检查端口监听
   sudo netstat -tulpn | grep :3001
   ```

3. **检查防火墙**
   ```bash
   # Ubuntu (UFW)
   sudo ufw status
   sudo ufw allow 3001/tcp

   # CentOS (firewalld)
   sudo firewall-cmd --list-all
   sudo firewall-cmd --add-port=3001/tcp --permanent
   sudo firewall-cmd --reload
   ```

4. **检查云服务器安全组**
   - 登录云控制台
   - 检查安全组规则
   - 确保放行 3001 端口

5. **重新配置服务端地址**
   - 打开客户端配置页面
   - 手动输入正确的服务端地址
   - 点击"测试连接"

### 问题 2: 客户端启动失败

**症状**:
- 客户端无法启动
- 启动后立即退出
- 白屏

**可能原因**:
- 依赖缺失
- 配置文件损坏
- 系统兼容性问题

**解决方案**:

1. **查看客户端日志**
   ```bash
   # Windows
   %APPDATA%\GuardVault\logs\

   # macOS
   ~/Library/Logs/GuardVault/

   # Linux
   ~/.config/GuardVault/logs/
   ```

2. **重新安装客户端**
   - 卸载现有客户端
   - 下载最新版本
   - 重新安装

3. **清除客户端数据**
   ```bash
   # Windows
   del %APPDATA%\GuardVault\*

   # macOS
   rm -rf ~/Library/Application\ Support/GuardVault/

   # Linux
   rm -rf ~/.config/GuardVault/
   ```

4. **检查系统兼容性**
   - 确认操作系统版本符合要求
   - 更新系统到最新版本

### 问题 3: 验证码不正确

**症状**:
- 显示的验证码与实际不符
- 验证码过期
- 倒计时不准确

**可能原因**:
- 系统时间不同步
- 服务端时间错误
- 网络延迟

**解决方案**:

1. **同步系统时间**
   ```bash
   # Linux
   sudo ntpdate pool.ntp.org
   sudo systemctl restart systemd-timesyncd

   # macOS
   sudo sntp -sS time.apple.com

   # Windows
   w32tm /resync
   ```

2. **检查服务端时间**
   ```bash
   # 在服务端机器上
   date
   timedatectl status
   ```

3. **检查网络延迟**
   ```bash
   # 测试网络延迟
   ping <server-ip>

   # 使用 traceroute
   traceroute <server-ip>
   ```

### 问题 4: 客户端自动更新失败

**症状**:
- 更新下载失败
- 更新安装失败
- 更新后无法启动

**可能原因**:
- 网络问题
- 权限不足
- 更新包损坏

**解决方案**:

1. **手动下载更新**
   - 访问 GitHub Releases
   - 下载最新版本
   - 手动安装

2. **检查网络连接**
   ```bash
   # 测试 GitHub 连接
   curl -I https://github.com

   # 检查代理设置
   echo $HTTP_PROXY
   echo $HTTPS_PROXY
   ```

3. **以管理员权限运行**
   - Windows: 右键 → 以管理员身份运行
   - macOS/Linux: 使用 sudo

## Web 管理后台问题

### 问题 1: Web 页面无法访问

**症状**:
- 浏览器显示连接错误
- 404 Not Found
- 502 Bad Gateway

**可能原因**:
- Nginx 未启动
- 静态文件未构建
- 反向代理配置错误

**解决方案**:

1. **检查 Nginx 状态**
   ```bash
   sudo systemctl status nginx

   # 重启 Nginx
   sudo systemctl restart nginx
   ```

2. **检查静态文件**
   ```bash
   # 确认 dist 目录存在
   ls -la web-admin/dist/

   # 重新构建
   cd web-admin
   npm run build
   ```

3. **检查 Nginx 配置**
   ```bash
   # 测试配置
   sudo nginx -t

   # 查看配置
   sudo cat /etc/nginx/sites-available/guardvault

   # 重载配置
   sudo systemctl reload nginx
   ```

4. **检查 Nginx 错误日志**
   ```bash
   sudo tail -f /var/log/nginx/error.log
   ```

### 问题 2: API 请求失败

**症状**:
- 前端显示网络错误
- 401 Unauthorized
- 403 Forbidden
- CORS 错误

**可能原因**:
- Token 过期
- 权限不足
- CORS 配置错误
- API 服务未启动

**解决方案**:

1. **检查 Token**
   ```javascript
   // 在浏览器控制台检查
   console.log(localStorage.getItem('token'))

   // 清除 Token 并重新登录
   localStorage.removeItem('token')
   localStorage.removeItem('user')
   ```

2. **检查 API 服务**
   ```bash
   # 测试 API 端点
   curl http://localhost:3001/api/health

   # 检查服务状态
   sudo systemctl status guardvault-server
   ```

3. **检查 CORS 配置**
   ```bash
   # 查看 server/.env
   cat server/.env | grep CORS_ORIGINS

   # 确保包含前端域名
   CORS_ORIGINS=http://localhost:5173,https://your-domain.com
   ```

4. **检查浏览器控制台**
   - 打开开发者工具 (F12)
   - 查看 Console 标签
   - 查看 Network 标签

### 问题 3: 页面显示异常

**症状**:
- 样式错乱
- 组件不显示
- 白屏

**可能原因**:
- 静态资源加载失败
- JavaScript 错误
- 浏览器兼容性问题

**解决方案**:

1. **清除浏览器缓存**
   - Ctrl + Shift + Delete (Windows/Linux)
   - Cmd + Shift + Delete (macOS)

2. **检查浏览器控制台**
   - 打开开发者工具 (F12)
   - 查看 Console 标签的错误信息
   - 查看 Network 标签的加载状态

3. **检查静态资源**
   ```bash
   # 确认静态文件存在
   ls -la web-admin/dist/assets/

   # 检查文件权限
   chmod -R 755 web-admin/dist/
   ```

4. **尝试其他浏览器**
   - Chrome
   - Firefox
   - Edge
   - Safari

## 数据库问题

### 问题 1: 数据库连接失败

**症状**:
- "Can't connect to MySQL server"
- "Access denied for user"
- "Unknown database"

**可能原因**:
- MySQL 服务未启动
- 用户名或密码错误
- 数据库不存在
- 网络不通

**解决方案**:

1. **检查 MySQL 服务**
   ```bash
   sudo systemctl status mysql

   # 启动 MySQL
   sudo systemctl start mysql

   # 设置开机自启
   sudo systemctl enable mysql
   ```

2. **测试数据库连接**
   ```bash
   # 使用命令行测试
   mysql -u guardvault_user -p -h localhost guardvault_db

   # 检查用户权限
   mysql -u root -p -e "SELECT user, host FROM mysql.user;"
   ```

3. **检查数据库是否存在**
   ```bash
   mysql -u root -p -e "SHOW DATABASES;"

   # 创建数据库
   mysql -u root -p -e "CREATE DATABASE IF NOT EXISTS guardvault_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"
   ```

4. **检查环境变量**
   ```bash
   # 查看 DATABASE_URL
   cat server/.env | grep DATABASE_URL

   # 确保格式正确
   # mysql://username:password@host:port/database
   ```

### 问题 2: 数据库迁移失败

**症状**:
- Prisma 迁移错误
- 表结构不匹配
- 外键约束错误

**可能原因**:
- 迁移文件冲突
- 数据不一致
- 权限不足

**解决方案**:

1. **查看迁移状态**
   ```bash
   cd server
   npx prisma migrate status

   # 查看迁移历史
   npx prisma migrate resolve --rolled-back "<migration-name>"
   ```

2. **重置数据库（谨慎使用）**
   ```bash
   cd server
   npx prisma migrate reset

   # 这会删除所有数据！
   ```

3. **手动执行迁移**
   ```bash
   cd server
   npx prisma db push

   # 或应用特定迁移
   npx prisma migrate deploy
   ```

4. **检查数据库权限**
   ```bash
   mysql -u root -p -e "GRANT ALL PRIVILEGES ON guardvault_db.* TO 'guardvault_user'@'localhost'; FLUSH PRIVILEGES;"
   ```

### 问题 3: 数据库性能问题

**症状**:
- 查询缓慢
- 锁表
- 连接超时

**可能原因**:
- 缺少索引
- 查询不优化
- 数据量过大
- 连接池配置不当

**解决方案**:

1. **分析慢查询**
   ```bash
   # 启用慢查询日志
   sudo nano /etc/mysql/mysql.conf.d/mysqld.cnf

   # 添加配置
   slow_query_log = 1
   long_query_time = 2

   # 重启 MySQL
   sudo systemctl restart mysql

   # 查看慢查询
   sudo tail -f /var/log/mysql/slow-query.log
   ```

2. **优化查询**
   ```sql
   -- 使用 EXPLAIN 分析查询
   EXPLAIN SELECT * FROM users WHERE username = 'admin';

   -- 添加索引
   CREATE INDEX idx_username ON users(username);
   ```

3. **优化数据库配置**
   ```ini
   # 编辑 MySQL 配置
   [mysqld]
   innodb_buffer_pool_size = 1G
   max_connections = 200
   query_cache_size = 64M
   ```

4. **清理旧数据**
   ```sql
   -- 删除过期日志
   DELETE FROM audit_logs WHERE created_at < DATE_SUB(NOW(), INTERVAL 90 DAY);

   -- 优化表
   OPTIMIZE TABLE audit_logs;
   ```

## 网络问题

### 问题 1: 端口被占用

**症状**:
- "Address already in use"
- 服务无法启动

**解决方案**:

1. **查找占用进程**
   ```bash
   # Linux/macOS
   sudo lsof -i :3001
   # 或
   sudo netstat -tulpn | grep :3001

   # Windows
   netstat -ano | findstr :3001
   ```

2. **终止进程**
   ```bash
   # Linux/macOS
   sudo kill -9 <PID>

   # Windows
   taskkill /PID <PID> /F
   ```

3. **更改端口**
   ```bash
   # 编辑 server/.env
   PORT=3002
   ```

### 问题 2: DNS 解析失败

**症状**:
- 域名无法解析
- 连接超时

**解决方案**:

1. **测试 DNS 解析**
   ```bash
   nslookup your-domain.com
   dig your-domain.com
   ```

2. **更换 DNS 服务器**
   ```bash
   # 编辑 /etc/resolv.conf
   sudo nano /etc/resolv.conf

   # 添加 Google DNS
   nameserver 8.8.8.8
   nameserver 8.8.4.4
   ```

3. **清除 DNS 缓存**
   ```bash
   # Linux
   sudo systemd-resolve --flush-caches

   # macOS
   sudo dscacheutil -flushcache

   # Windows
   ipconfig /flushdns
   ```

### 问题 3: SSL/TLS 证书问题

**症状**:
- "SSL certificate error"
- "certificate has expired"
- "certificate mismatch"

**解决方案**:

1. **检查证书有效期**
   ```bash
   # 查看证书信息
   openssl x509 -in /etc/letsencrypt/live/your-domain.com/cert.pem -text -noout

   # 查看过期时间
   openssl x509 -in /etc/letsencrypt/live/your-domain.com/cert.pem -noout -dates
   ```

2. **续期证书**
   ```bash
   # Let's Encrypt 自动续期
   sudo certbot renew

   # 手动续期
   sudo certbot renew --force-renewal
   ```

3. **检查证书链**
   ```bash
   # 验证证书链
   openssl s_client -connect your-domain.com:443 -showcerts
   ```

## 性能问题

### 问题 1: CPU 使用率过高

**症状**:
- CPU 使用率持续 100%
- 系统响应缓慢

**解决方案**:

1. **查找占用 CPU 的进程**
   ```bash
   top
   # 或
   htop
   ```

2. **分析 Node.js 进程**
   ```bash
   # 使用 Node.js profiler
   node --prof src/app.js

   # 分析 profiler 输出
   node --prof-process isolate-*.log > profile.txt
   ```

3. **优化代码**
   - 减少同步操作
   - 使用缓存
   - 优化数据库查询

### 问题 2: 内存使用过高

**症状**:
- 内存占用持续增长
- OOM (Out of Memory)

**解决方案**:

1. **监控内存使用**
   ```bash
   # 查看进程内存
   ps aux | grep node

   # 使用 PM2 监控
   pm2 monit
   ```

2. **设置内存限制**
   ```javascript
   // 编辑 ecosystem.config.cjs
   {
     max_memory_restart: '512M'
   }
   ```

3. **检查内存泄漏**
   ```bash
   # 使用 Node.js 内存分析
   node --inspect src/app.js

   # 在 Chrome DevTools 中分析
   # chrome://inspect
   ```

### 问题 3: 磁盘 I/O 过高

**症状**:
- 磁盘使用率 100%
- 读写缓慢

**解决方案**:

1. **监控磁盘 I/O**
   ```bash
   # iotop
   sudo iotop

   # iostat
   iostat -x 1
   ```

2. **优化日志**
   ```bash
   # 配置日志轮转
   pm2 install pm2-logrotate

   # 设置日志大小限制
   pm2 set pm2-logrotate:max_size 10M
   ```

3. **使用 SSD**
   - 将数据库迁移到 SSD
   - 提高磁盘性能

## 安全问题

### 问题 1: 登录失败

**症状**:
- "Invalid credentials"
- "Account locked"
- "Too many attempts"

**解决方案**:

1. **检查用户名和密码**
   ```bash
   # 重置用户密码
   curl -X PUT http://localhost:3001/api/admin/user/1/password \
     -H "Content-Type: application/json" \
     -H "Authorization: Bearer <admin-token>" \
     -d '{"password": "NewPassword@123"}'
   ```

2. **检查账户状态**
   ```bash
   # 查看用户状态
   mysql -u root -p guardvault_db -e "SELECT id, username, status, locked_until FROM users WHERE username = 'admin';"
   ```

3. **解锁账户**
   ```bash
   # 手动解锁
   mysql -u root -p guardvault_db -e "UPDATE users SET locked_until = NULL WHERE username = 'admin';"
   ```

4. **检查 IP 封禁**
   ```bash
   # 查看被封禁的 IP
   mysql -u root -p guardvault_db -e "SELECT * FROM blocked_ips;"

   # 解封 IP
   mysql -u root -p guardvault_db -e "DELETE FROM blocked_ips WHERE ip = '192.168.1.100';"
   ```

### 问题 2: Token 过期

**症状**:
- "Token expired"
- "Invalid token"
- 频繁要求重新登录

**解决方案**:

1. **调整 Token 有效期**
   ```bash
   # 编辑 server/.env
   JWT_USER_EXPIRE=7200    # 2 小时
   JWT_ADMIN_EXPIRE=1800   # 30 分钟
   ```

2. **检查 Token 吊销列表**
   ```bash
   # 查看吊销的 Token
   mysql -u root -p guardvault_db -e "SELECT * FROM token_blacklist;"
   ```

3. **实现 Refresh Token**
   - 使用 Refresh Token 机制
   - 自动刷新 Access Token

### 问题 3: 权限不足

**症状**:
- "Access denied"
- "Insufficient permissions"
- 403 Forbidden

**解决方案**:

1. **检查用户角色**
   ```bash
   mysql -u root -p guardvault_db -e "SELECT username, role FROM users WHERE username = 'testuser';"
   ```

2. **检查权限配置**
   ```javascript
   // 查看路由权限配置
   // 确保中间件正确配置
   ```

3. **调整用户权限**
   ```bash
   # 更新用户角色
   curl -X PUT http://localhost:3001/api/admin/user/1 \
     -H "Content-Type: application/json" \
     -H "Authorization: Bearer <admin-token>" \
     -d '{"role": "dept_admin"}'
   ```

## 日志分析

### 1. 服务端日志

**位置**:
- Systemd: `journalctl -u guardvault-server`
- PM2: `pm2 logs guardvault-server`
- 文件: `logs/server.log`

**常见日志级别**:
- `INFO`: 一般信息
- `WARN`: 警告信息
- `ERROR`: 错误信息
- `FATAL`: 致命错误

**分析技巧**:
```bash
# 查看最近的错误
sudo journalctl -u guardvault-server --since "1 hour ago" | grep ERROR

# 查看特定关键词
sudo journalctl -u guardvault-server | grep "database"

# 导出日志
sudo journalctl -u guardvault-server --since today > server.log
```

### 2. 客户端日志

**位置**:
- Windows: `%APPDATA%\GuardVault\logs\`
- macOS: `~/Library/Logs/GuardVault/`
- Linux: `~/.config/GuardVault/logs/`

**查看日志**:
```bash
# Linux/macOS
tail -f ~/.config/GuardVault/logs/main.log

# Windows
type %APPDATA%\GuardVault\logs\main.log
```

### 3. Web 后台日志

**位置**:
- Nginx: `/var/log/nginx/`
- 浏览器控制台

**查看 Nginx 日志**:
```bash
# 访问日志
sudo tail -f /var/log/nginx/guardvault-access.log

# 错误日志
sudo tail -f /var/log/nginx/guardvault-error.log
```

### 4. 数据库日志

**位置**:
- MySQL: `/var/log/mysql/`

**查看慢查询**:
```bash
sudo tail -f /var/log/mysql/slow-query.log
```

## 获取帮助

### 1. 查看文档

- [部署指南](DEPLOYMENT.md)
- [开发指南](DEVELOPMENT.md)
- [使用指南](USER_GUIDE.md)
- [打包指南](BUILD.md)
- [防火墙配置](FIREWALL.md)

### 2. 搜索问题

在 GitHub Issues 中搜索类似问题：
```
https://github.com/your-username/guardvault/issues?q=is%3Aissue
```

### 3. 提交 Issue

如果无法解决问题，请提交 Issue：

**Issue 模板**:

```markdown
## 问题描述
简要描述问题

## 复现步骤
1. 步骤一
2. 步骤二
3. 步骤三

## 预期行为
描述期望的正确行为

## 实际行为
描述实际观察到的行为

## 环境信息
- 操作系统: [例如 Ubuntu 20.04]
- Node.js 版本: [例如 18.17.0]
- GuardVault 版本: [例如 1.2.3]

## 错误日志
```
粘贴相关错误日志
```

## 其他信息
其他有助于解决问题的信息
```

### 4. 联系支持

- Email: support@example.com
- 官网: https://guardvault.example.com
- 文档: https://docs.guardvault.example.com

## 常用命令速查

```bash
# 服务管理
sudo systemctl start guardvault-server
sudo systemctl stop guardvault-server
sudo systemctl restart guardvault-server
sudo systemctl status guardvault-server

# 日志查看
sudo journalctl -u guardvault-server -f
sudo journalctl -u guardvault-server -n 100
pm2 logs guardvault-server

# 数据库
mysql -u root -p
mysql -u guardvault_user -p guardvault_db

# 网络测试
curl http://localhost:3001/api/health
ping <server-ip>
telnet <server-ip> 3001

# 端口检查
sudo netstat -tulpn | grep :3001
sudo lsof -i :3001

# 防火墙
sudo ufw status
sudo ufw allow 3001/tcp
sudo firewall-cmd --list-all
sudo firewall-cmd --add-port=3001/tcp --permanent

# 进程管理
ps aux | grep node
top
htop
kill -9 <PID>

# 磁盘空间
df -h
du -sh /path/to/directory

# 内存使用
free -h

# 系统信息
uname -a
cat /etc/os-release
node --version
npm --version
mysql --version
```

## 下一步

- 阅读 [部署指南](DEPLOYMENT.md) 了解如何部署系统
- 阅读 [开发指南](DEVELOPMENT.md) 了解如何进行开发
- 阅读 [使用指南](USER_GUIDE.md) 了解如何使用系统