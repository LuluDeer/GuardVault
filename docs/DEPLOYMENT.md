# GuardVault 部署指南

本文档详细介绍 GuardVault 的生产环境部署流程，包括环境准备、依赖安装、配置管理、服务启动、防火墙配置等各个方面。

## 目录

- [环境要求](#环境要求)
- [部署前准备](#部署前准备)
- [数据库配置](#数据库配置)
- [端口配置与防火墙](#端口配置与防火墙)
- [部署方式选择](#部署方式选择)
- [Nginx 反向代理](#nginx-反向代理)
- [SSL/TLS 配置](#ssltls-配置)
- [数据库备份](#数据库备份)
- [监控与日志](#监控与日志)
- [升级流程](#升级流程)

## 环境要求

### 硬件要求

| 组件 | 最低配置 | 推荐配置 |
|------|---------|---------|
| CPU | 2 核 | 4 核及以上 |
| 内存 | 4 GB | 8 GB 及以上 |
| 磁盘 | 20 GB | 50 GB 及以上（SSD 推荐） |
| 网络 | 100 Mbps | 1 Gbps |

### 软件要求

| 软件 | 版本要求 | 说明 |
|------|---------|------|
| 操作系统 | Ubuntu 20.04+ / CentOS 8+ / Debian 11+ | Linux 服务器 |
| Node.js | ≥ 18.0 | 推荐 18 LTS 或 20 LTS |
| MySQL | ≥ 8.0 | 数据库服务 |
| Nginx | ≥ 1.18 | 反向代理（可选但推荐） |
| PM2 | ≥ 5.0 | 进程管理（可选） |
| Git | ≥ 2.0 | 代码管理 |

## 部署前准备

### 1. 系统更新

**Ubuntu/Debian:**
```bash
sudo apt update && sudo apt upgrade -y
```

**CentOS/RHEL:**
```bash
sudo yum update -y
```

### 2. 安装 Node.js

**使用 NodeSource 仓库（推荐）:**
```bash
# 安装 Node.js 20 LTS
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

# 验证安装
node --version
npm --version
```

### 3. 安装 MySQL

**Ubuntu/Debian:**
```bash
sudo apt install -y mysql-server mysql-client
sudo systemctl start mysql
sudo systemctl enable mysql

# 安全配置
sudo mysql_secure_installation
```

**CentOS/RHEL:**
```bash
sudo yum install -y mysql-server
sudo systemctl start mysqld
sudo systemctl enable mysqld

# 获取临时密码
sudo grep 'temporary password' /var/log/mysqld.log

# 安全配置
sudo mysql_secure_installation
```

### 4. 安装 Nginx（可选但推荐）

```bash
# Ubuntu/Debian
sudo apt install -y nginx

# CentOS/RHEL
sudo yum install -y nginx

# 启动服务
sudo systemctl start nginx
sudo systemctl enable nginx
```

### 5. 安装 PM2（可选）

```bash
sudo npm install -g pm2
pm2 --version
```

### 6. 创建部署用户

```bash
# 创建专用用户
sudo useradd -r -s /bin/bash guardvault

# 设置密码（可选）
sudo passwd guardvault

# 创建必要的目录
sudo mkdir -p /opt/guardvault
sudo mkdir -p /var/log/guardvault
sudo chown -R guardvault:guardvault /opt/guardvault
sudo chown -R guardvault:guardvault /var/log/guardvault
```

## 数据库配置

### 1. 创建数据库和用户

```bash
# 登录 MySQL
sudo mysql -u root -p

# 执行以下 SQL 命令
CREATE DATABASE guardvault_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER 'guardvault_user'@'localhost' IDENTIFIED BY 'your_strong_password_here';
CREATE USER 'guardvault_user'@'%' IDENTIFIED BY 'your_strong_password_here';
GRANT ALL PRIVILEGES ON guardvault_db.* TO 'guardvault_user'@'localhost';
GRANT ALL PRIVILEGES ON guardvault_db.* TO 'guardvault_user'@'%';
FLUSH PRIVILEGES;
EXIT;
```

### 2. 测试数据库连接

```bash
mysql -u guardvault_user -p -h localhost guardvault_db
```

### 3. 配置数据库优化参数

编辑 `/etc/mysql/mysql.conf.d/mysqld.cnf` 或 `/etc/my.cnf`:

```ini
[mysqld]
# 基础配置
max_connections = 200
innodb_buffer_pool_size = 1G
innodb_log_file_size = 256M
innodb_flush_log_at_trx_commit = 2
innodb_flush_method = O_DIRECT

# 字符集
character-set-server = utf8mb4
collation-server = utf8mb4_unicode_ci

# 慢查询日志
slow_query_log = 1
slow_query_log_file = /var/log/mysql/slow-query.log
long_query_time = 2
```

重启 MySQL:
```bash
sudo systemctl restart mysql
```

## 端口配置与防火墙

### 默认端口

| 服务 | 默认端口 | 说明 |
|------|---------|------|
| API 服务 | 3001 | 后端 API 接口 |
| Web 管理后台 | 5173 | 开发模式端口 |
| Nginx | 80/443 | 反向代理端口 |

### 防火墙配置

#### Ubuntu (UFW)

```bash
# 启用 UFW
sudo ufw enable

# 允许 SSH（重要！）
sudo ufw allow 22/tcp

# 允许 HTTP/HTTPS
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp

# 允许 API 端口（如果直接访问）
sudo ufw allow 3001/tcp

# 查看状态
sudo ufw status
```

#### CentOS (firewalld)

```bash
# 启动 firewalld
sudo systemctl start firewalld
sudo systemctl enable firewalld

# 允许 SSH
sudo firewall-cmd --permanent --add-service=ssh

# 允许 HTTP/HTTPS
sudo firewall-cmd --permanent --add-service=http
sudo firewall-cmd --permanent --add-service=https

# 允许 API 端口
sudo firewall-cmd --permanent --add-port=3001/tcp

# 重载配置
sudo firewall-cmd --reload

# 查看状态
sudo firewall-cmd --list-all
```

#### 云服务器安全组

如果使用云服务器（阿里云、腾讯云、AWS 等），还需要在云控制台配置安全组规则：

| 协议 | 端口范围 | 源地址 | 说明 |
|------|---------|--------|------|
| TCP | 22 | 0.0.0.0/0 | SSH（建议限制为固定IP） |
| TCP | 80 | 0.0.0.0/0 | HTTP |
| TCP | 443 | 0.0.0.0/0 | HTTPS |
| TCP | 3001 | 内网网段 | API 服务（如果直接访问） |

### 端口冲突处理

如果默认端口被占用，可以修改配置：

#### 修改 API 端口

编辑 `server/.env`:
```env
PORT=3002  # 改为其他端口
```

#### 检查端口占用

```bash
# 查看端口占用情况
sudo netstat -tulpn | grep :3001
# 或
sudo ss -tulpn | grep :3001

# 查看进程占用端口的详细信息
sudo lsof -i :3001
```

#### 终止占用端口的进程

```bash
# 查找进程 PID
sudo lsof -i :3001

# 终止进程
sudo kill -9 <PID>
```

## 部署方式选择

### 方式一：Systemd 部署（推荐生产环境）

#### 1. 克隆代码

```bash
cd /opt
sudo git clone <repository-url> guardvault
sudo chown -R guardvault:guardvault /opt/guardvault
cd /opt/guardvault
```

#### 2. 安装依赖

```bash
# 切换到 guardvault 用户
sudo -u guardvault -i

# 进入项目目录
cd /opt/guardvault

# 安装服务端依赖
cd server
npm ci --omit=dev
cd ..

# 安装 Web 后台依赖并构建
cd web-admin
npm ci
npm run build
cd ..
```

#### 3. 配置环境变量

```bash
# 复制配置文件
cp server/.env.example server/.env

# 编辑配置文件
nano server/.env
```

关键配置项：
```env
# 应用配置
PORT=3001
NODE_ENV=production
BIND_HOST=0.0.0.0

# 数据库配置
DATABASE_URL="mysql://guardvault_user:your_password@localhost:3306/guardvault_db"

# JWT 密钥（必须修改！）
JWT_SECRET=your_very_long_random_secret_at_least_64_characters

# TOTP 加密密钥（必须修改！）
TOTP_MASTER_KEY=your_32_byte_hex_string_64_characters

# CORS 配置（生产环境建议配置）
CORS_ORIGINS=https://your-domain.com,https://admin.your-domain.com

# 安全配置
MAX_LOGIN_ATTEMPTS=10
BLOCK_DURATION_MINUTES=30
```

生成随机密钥：
```bash
# 生成 JWT_SECRET
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"

# 生成 TOTP_MASTER_KEY
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

#### 4. 初始化数据库

```bash
cd /opt/guardvault/server
sudo -u guardvault npx prisma db deploy
```

#### 5. 安装 Systemd 服务

```bash
# 切换回 root 用户
exit

# 安装服务
sudo ./scripts/deploy.sh install

# 启动服务
sudo systemctl start guardvault-server
sudo systemctl start guardvault-webadmin

# 设置开机自启
sudo systemctl enable guardvault-server
sudo systemctl enable guardvault-webadmin

# 查看状态
sudo systemctl status guardvault-server
sudo systemctl status guardvault-webadmin
```

#### 6. 验证部署

```bash
# 检查服务状态
sudo systemctl status guardvault-server --no-pager
sudo systemctl status guardvault-webadmin --no-pager

# 检查端口监听
sudo netstat -tulpn | grep -E '3001|5174'

# 测试 API 健康检查
curl http://localhost:3001/api/health

# 查看日志
sudo journalctl -u guardvault-server -f
sudo journalctl -u guardvault-webadmin -f
```

### 方式二：PM2 部署（适合中小规模）

#### 1. 克隆代码和安装依赖

```bash
# 同 systemd 方式的步骤 1-3
cd /opt
sudo git clone <repository-url> guardvault
sudo chown -R guardvault:guardvault /opt/guardvault
cd /opt/guardvault

sudo -u guardvault -i
cd /opt/guardvault

cd server && npm ci --omit=dev && cd ..
cd web-admin && npm ci && npm run build && cd ..
```

#### 2. 配置环境变量

```bash
# 同 systemd 方式的步骤 3
cp server/.env.example server/.env
nano server/.env
```

#### 3. 初始化数据库

```bash
cd /opt/guardvault/server
npx prisma db deploy
```

#### 4. 使用 PM2 启动

```bash
# 启动服务
pm2 start ecosystem.config.cjs

# 查看状态
pm2 status

# 查看日志
pm2 logs guardvault-server

# 设置开机自启
pm2 save
pm2 startup
```

#### 5. PM2 常用命令

```bash
# 重启服务
pm2 restart guardvault-server

# 停止服务
pm2 stop guardvault-server

# 删除服务
pm2 delete guardvault-server

# 监控
pm2 monit

# 查看详细信息
pm2 show guardvault-server
```

### 方式三：Docker 部署（可选）

#### 1. 创建 Dockerfile

**服务端 Dockerfile (`server/Dockerfile`):**
```dockerfile
FROM node:20-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --omit=dev

COPY . .
RUN npx prisma generate

EXPOSE 3001

CMD ["node", "src/app.js"]
```

**Web 后台 Dockerfile (`web-admin/Dockerfile`):**
```dockerfile
FROM node:20-alpine AS builder

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build

FROM nginx:alpine

COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/nginx.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
```

#### 2. 创建 docker-compose.yml

```yaml
version: '3.8'

services:
  mysql:
    image: mysql:8.0
    container_name: guardvault-mysql
    environment:
      MYSQL_ROOT_PASSWORD: root_password
      MYSQL_DATABASE: guardvault_db
      MYSQL_USER: guardvault_user
      MYSQL_PASSWORD: user_password
    volumes:
      - mysql_data:/var/lib/mysql
    ports:
      - "3306:3306"
    networks:
      - guardvault-network

  server:
    build:
      context: ./server
      dockerfile: Dockerfile
    container_name: guardvault-server
    environment:
      - NODE_ENV=production
      - DATABASE_URL=mysql://guardvault_user:user_password@mysql:3306/guardvault_db
      - JWT_SECRET=your_jwt_secret
      - TOTP_MASTER_KEY=your_totp_master_key
    depends_on:
      - mysql
    ports:
      - "3001:3001"
    networks:
      - guardvault-network
    restart: unless-stopped

  web-admin:
    build:
      context: ./web-admin
      dockerfile: Dockerfile
    container_name: guardvault-web
    ports:
      - "80:80"
    depends_on:
      - server
    networks:
      - guardvault-network
    restart: unless-stopped

volumes:
  mysql_data:

networks:
  guardvault-network:
    driver: bridge
```

#### 3. 启动服务

```bash
# 构建并启动
docker-compose up -d

# 查看状态
docker-compose ps

# 查看日志
docker-compose logs -f

# 停止服务
docker-compose down

# 停止并删除数据
docker-compose down -v
```

## Nginx 反向代理

### 1. 创建 Nginx 配置文件

```bash
sudo nano /etc/nginx/sites-available/guardvault
```

### 2. 配置内容

```nginx
# HTTP 重定向到 HTTPS
server {
    listen 80;
    server_name your-domain.com www.your-domain.com;

    # Let's Encrypt 验证路径
    location /.well-known/acme-challenge/ {
        root /var/www/certbot;
    }

    location / {
        return 301 https://$server_name$request_uri;
    }
}

# HTTPS 主配置
server {
    listen 443 ssl http2;
    server_name your-domain.com www.your-domain.com;

    # SSL 证书配置
    ssl_certificate /etc/letsencrypt/live/your-domain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/your-domain.com/privkey.pem;

    # SSL 安全配置
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;
    ssl_prefer_server_ciphers on;
    ssl_session_cache shared:SSL:10m;
    ssl_session_timeout 10m;

    # 安全头
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;

    # 日志
    access_log /var/log/nginx/guardvault-access.log;
    error_log /var/log/nginx/guardvault-error.log;

    # Web 管理后台
    location / {
        root /opt/guardvault/web-admin/dist;
        try_files $uri $uri/ /index.html;

        # 缓存静态资源
        location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
            expires 1y;
            add_header Cache-Control "public, immutable";
        }
    }

    # API 反向代理
    location /api/ {
        proxy_pass http://127.0.0.1:3001;
        proxy_http_version 1.1;

        # 代理头设置
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;

        # 超时设置
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;

        # 缓冲设置
        proxy_buffering on;
        proxy_buffer_size 4k;
        proxy_buffers 8 4k;
        proxy_busy_buffers_size 8k;
    }

    # 健康检查端点
    location /health {
        proxy_pass http://127.0.0.1:3001/health;
        access_log off;
    }

    # 限制请求体大小
    client_max_body_size 10M;
}
```

### 3. 启用配置

```bash
# 创建软链接
sudo ln -s /etc/nginx/sites-available/guardvault /etc/nginx/sites-enabled/

# 测试配置
sudo nginx -t

# 重载 Nginx
sudo systemctl reload nginx
```

## SSL/TLS 配置

### 使用 Let's Encrypt 免费证书

#### 1. 安装 Certbot

```bash
# Ubuntu/Debian
sudo apt install -y certbot python3-certbot-nginx

# CentOS/RHEL
sudo yum install -y certbot python3-certbot-nginx
```

#### 2. 获取证书

```bash
# 自动配置 Nginx
sudo certbot --nginx -d your-domain.com -d www.your-domain.com

# 或仅获取证书
sudo certbot certonly --nginx -d your-domain.com -d www.your-domain.com
```

#### 3. 自动续期

```bash
# 测试续期
sudo certbot renew --dry-run

# Certbot 会自动创建续期任务，可以通过以下命令查看
sudo systemctl status certbot.timer
```

#### 4. 手动续期

```bash
sudo certbot renew
sudo systemctl reload nginx
```

### 使用自签名证书（仅测试环境）

```bash
# 创建证书目录
sudo mkdir -p /etc/nginx/ssl

# 生成自签名证书
sudo openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
  -keyout /etc/nginx/ssl/guardvault.key \
  -out /etc/nginx/ssl/guardvault.crt

# 设置权限
sudo chmod 600 /etc/nginx/ssl/guardvault.key
sudo chmod 644 /etc/nginx/ssl/guardvault.crt
```

修改 Nginx 配置中的证书路径：
```nginx
ssl_certificate /etc/nginx/ssl/guardvault.crt;
ssl_certificate_key /etc/nginx/ssl/guardvault.key;
```

## 数据库备份

### 1. 创建备份脚本

```bash
sudo nano /opt/guardvault/scripts/backup.sh
```

```bash
#!/bin/bash
# GuardVault 数据库备份脚本

# 配置
BACKUP_DIR="/backup/guardvault"
DB_NAME="guardvault_db"
DB_USER="guardvault_user"
DB_PASS="your_password"
RETENTION_DAYS=30

# 创建备份目录
mkdir -p "$BACKUP_DIR"

# 生成备份文件名
BACKUP_FILE="$BACKUP_DIR/guardvault_$(date +%Y%m%d_%H%M%S).sql.gz"

# 执行备份
mysqldump -u"$DB_USER" -p"$DB_PASS" "$DB_NAME" | gzip > "$BACKUP_FILE"

# 检查备份是否成功
if [ $? -eq 0 ]; then
    echo "备份成功: $BACKUP_FILE"
else
    echo "备份失败!" >&2
    exit 1
fi

# 删除过期备份
find "$BACKUP_DIR" -name "guardvault_*.sql.gz" -mtime +$RETENTION_DAYS -delete

echo "清理完成，保留最近 $RETENTION_DAYS 天的备份"
```

### 2. 设置权限

```bash
sudo chmod +x /opt/guardvault/scripts/backup.sh
```

### 3. 设置定时任务

```bash
# 编辑 crontab
sudo crontab -e

# 添加每天凌晨 2 点执行备份
0 2 * * * /opt/guardvault/scripts/backup.sh >> /var/log/guardvault/backup.log 2>&1
```

### 4. 恢复数据库

```bash
# 解压并恢复
gunzip < /backup/guardvault/guardvault_20240101_020000.sql.gz | mysql -u guardvault_user -p guardvault_db
```

## 监控与日志

### 1. 日志管理

#### Systemd 日志

```bash
# 查看实时日志
sudo journalctl -u guardvault-server -f

# 查看最近 100 行
sudo journalctl -u guardvault-server -n 100

# 查看今天的日志
sudo journalctl -u guardvault-server --since today

# 查看特定时间的日志
sudo journalctl -u guardvault-server --since "2024-01-01 00:00:00" --until "2024-01-01 23:59:59"
```

#### PM2 日志

```bash
# 查看实时日志
pm2 logs guardvault-server

# 查看错误日志
pm2 logs guardvault-server --err

# 清空日志
pm2 flush

# 日志轮转配置
pm2 install pm2-logrotate
```

### 2. 系统监控

#### 安装监控工具

```bash
# 安装 htop
sudo apt install -y htop

# 安装 iotop
sudo apt install -y iotop

# 安装 nethogs
sudo apt install -y nethogs
```

#### 监控命令

```bash
# CPU 和内存使用
htop

# 磁盘 I/O
sudo iotop

# 网络流量
sudo nethogs

# 磁盘空间
df -h

# 内存使用
free -h

# 系统负载
uptime
```

### 3. 应用监控

#### 健康检查脚本

```bash
#!/bin/bash
# 健康检查脚本

HEALTH_URL="http://localhost:3001/api/health"
RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" "$HEALTH_URL")

if [ "$RESPONSE" -eq 200 ]; then
    echo "服务正常"
    exit 0
else
    echo "服务异常，HTTP 状态码: $RESPONSE"
    # 可以在这里添加告警逻辑
    exit 1
fi
```

## 升级流程

### 1. 备份数据

```bash
# 备份数据库
/opt/guardvault/scripts/backup.sh

# 备份配置文件
sudo cp /opt/guardvault/server/.env /opt/guardvault/server/.env.backup
```

### 2. 停止服务

```bash
# Systemd
sudo systemctl stop guardvault-server guardvault-webadmin

# PM2
pm2 stop guardvault-server
```

### 3. 更新代码

```bash
cd /opt/guardvault
sudo -u guardvault git pull origin main
```

### 4. 安装依赖

```bash
sudo -u guardvault bash -c '
cd /opt/guardvault/server && npm ci --omit=dev
cd /opt/guardvault/web-admin && npm ci && npm run build
'
```

### 5. 数据库迁移

```bash
cd /opt/guardvault/server
sudo -u guardvault npx prisma db deploy
```

### 6. 启动服务

```bash
# Systemd
sudo systemctl start guardvault-server guardvault-webadmin

# PM2
pm2 start guardvault-server
```

### 7. 验证升级

```bash
# 检查服务状态
sudo systemctl status guardvault-server

# 测试 API
curl http://localhost:3001/api/health

# 查看日志
sudo journalctl -u guardvault-server -n 50
```

### 8. 回滚（如果需要）

```bash
# 停止服务
sudo systemctl stop guardvault-server guardvault-webadmin

# 回滚代码
cd /opt/guardvault
sudo -u guardvault git reset --hard <previous-commit-hash>

# 恢复配置
sudo cp /opt/guardvault/server/.env.backup /opt/guardvault/server/.env

# 重新安装依赖
sudo -u guardvault bash -c '
cd /opt/guardvault/server && npm ci --omit=dev
cd /opt/guardvault/web-admin && npm ci && npm run build
'

# 启动服务
sudo systemctl start guardvault-server guardvault-webadmin
```

## 系统初始化

部署完成后，需要初始化系统管理员账号：

```bash
# 方法 1: 使用 curl
curl -X POST http://localhost:3001/api/admin/init \
  -H "Content-Type: application/json" \
  -d '{
    "username": "admin",
    "password": "Admin@123"
  }'

# 方法 2: 使用浏览器
# 访问 http://your-domain.com/api/admin/init 并提交 POST 请求
```

成功后即可使用 `admin` / `Admin@123` 登录 Web 管理后台。

## 常见问题

### 1. 服务启动失败

检查日志：
```bash
sudo journalctl -u guardvault-server -n 50
```

常见原因：
- 端口被占用
- 数据库连接失败
- 环境变量配置错误
- 依赖安装不完整

### 2. 数据库连接失败

检查数据库连接：
```bash
mysql -u guardvault_user -p -h localhost guardvault_db
```

检查防火墙：
```bash
sudo ufw status
sudo firewall-cmd --list-all
```

### 3. 权限问题

确保文件权限正确：
```bash
sudo chown -R guardvault:guardvault /opt/guardvault
sudo chmod -R 755 /opt/guardvault
```

### 4. 内存不足

检查内存使用：
```bash
free -h
```

如果内存不足，可以考虑：
- 增加服务器内存
- 优化数据库配置
- 使用 PM2 的内存限制功能

## 安全建议

1. **定期更新系统和依赖**
   ```bash
   sudo apt update && sudo apt upgrade -y
   cd /opt/guardvault && npm audit fix
   ```

2. **使用强密码**
   - 数据库密码
   - JWT_SECRET
   - TOTP_MASTER_KEY

3. **配置防火墙**
   - 只开放必要的端口
   - 限制 SSH 访问

4. **启用 SSL/TLS**
   - 使用 Let's Encrypt 免费证书
   - 强制 HTTPS 访问

5. **定期备份**
   - 数据库备份
   - 配置文件备份

6. **监控日志**
   - 定期检查错误日志
   - 设置异常告警

7. **限制访问**
   - 使用 IP 白名单
   - 配置 CORS 策略

## 下一步

- 阅读 [开发指南](DEVELOPMENT.md) 了解如何进行开发
- 阅读 [使用指南](USER_GUIDE.md) 了解如何使用系统
- 阅读 [故障排查指南](TROUBLESHOOTING.md) 解决常见问题
- 阅读 [防火墙配置指南](FIREWALL.md) 了解详细的防火墙配置