# GuardVault 防火墙配置指南

本指南详细介绍如何配置防火墙以确保 GuardVault 系统的安全运行。

## 目录

- [防火墙概述](#防火墙概述)
- [默认端口](#默认端口)
- [Ubuntu/Debian (UFW)](#ubuntudebian-ufw)
- [CentOS/RHEL (firewalld)](#centosrhel-firewalld)
- [云服务器安全组](#云服务器安全组)
- [Docker 防火墙配置](#docker-防火墙配置)
- [Nginx 防火墙配置](#nginx-防火墙配置)
- [端口冲突处理](#端口冲突处理)
- [安全最佳实践](#安全最佳实践)
- [故障排查](#故障排查)

## 防火墙概述

防火墙是网络安全的第一道防线，用于控制进出服务器的网络流量。GuardVault 系统需要开放以下端口：

| 端口 | 协议 | 用途 | 是否必需 |
|------|------|------|---------|
| 22 | TCP | SSH | 是（远程管理必需） |
| 80 | TCP | HTTP | 是（Web 访问） |
| 443 | TCP | HTTPS | 是（安全 Web 访问） |
| 3001 | TCP | API 服务 | 是（客户端和 Web 后台必需） |
| 5173 | TCP | Web 开发服务器 | 否（仅开发环境） |
| 3306 | TCP | MySQL | 否（建议限制为本地） |

## 默认端口

### API 服务端口

**默认端口**: 3001

**用途**:
- 客户端与服务端通信
- Web 管理后台 API 调用
- 健康检查端点

**配置位置**: `server/.env`
```env
PORT=3001
```

### Web 管理后台端口

**开发模式**: 5173
**生产模式**: 通过 Nginx 反向代理（80/443）

**配置位置**: `web-admin/vite.config.js`

### MySQL 端口

**默认端口**: 3306

**用途**: 数据库连接

**安全建议**: 仅允许本地访问，不要对外开放

## Ubuntu/Debian (UFW)

### 1. 安装 UFW

```bash
sudo apt update
sudo apt install -y ufw
```

### 2. 基本配置

#### 启用 UFW

```bash
# 启用 UFW（会提示确认）
sudo ufw enable

# 查看状态
sudo ufw status
```

#### 设置默认策略

```bash
# 默认拒绝传入连接
sudo ufw default deny incoming

# 默认允许传出连接
sudo ufw default allow outgoing
```

### 3. 配置规则

#### 允许 SSH（重要！）

```bash
# 允许 SSH（端口 22）
sudo ufw allow 22/tcp

# 或限制为特定 IP（推荐）
sudo ufw allow from 192.168.1.100 to any port 22
```

**注意**: 在启用 UFW 之前，务必确保 SSH 端口已开放，否则会被锁在外面！

#### 允许 HTTP/HTTPS

```bash
# 允许 HTTP
sudo ufw allow 80/tcp

# 允许 HTTPS
sudo ufw allow 443/tcp

# 或使用服务名称
sudo ufw allow 'Nginx Full'
```

#### 允许 API 端口

```bash
# 允许 API 端口（所有 IP）
sudo ufw allow 3001/tcp

# 或限制为特定网段（推荐）
sudo ufw allow from 192.168.1.0/24 to any port 3001

# 或限制为特定 IP
sudo ufw allow from 192.168.1.100 to any port 3001
```

#### 允许 MySQL（仅本地）

```bash
# 仅允许本地访问 MySQL
sudo ufw allow from 127.0.0.1 to any port 3306

# 或允许特定服务器访问
sudo ufw allow from 192.168.1.200 to any port 3306
```

### 4. 高级配置

#### 删除规则

```bash
# 查看规则编号
sudo ufw status numbered

# 删除特定规则
sudo ufw delete <rule_number>

# 或删除特定规则
sudo ufw delete allow 3001/tcp
```

#### 插入规则

```bash
# 在规则开头插入
sudo ufw insert 1 allow from 192.168.1.100 to any port 22

# 在特定位置插入
sudo ufw insert 2 allow from 192.168.1.0/24 to any port 3001
```

#### 限制连接速率

```bash
# 限制 SSH 连接速率（防止暴力破解）
sudo ufw limit 22/tcp

# 这会允许每分钟最多 6 个连接，超过则限制
```

#### 拒绝特定 IP

```bash
# 拒绝特定 IP
sudo ufw deny from 192.168.1.50

# 拒绝特定网段
sudo ufw deny from 192.168.1.0/24
```

### 5. 查看和管理

#### 查看状态

```bash
# 查看详细状态
sudo ufw status verbose

# 查看编号状态
sudo ufw status numbered

# 查看应用列表
sudo ufw app list
```

#### 重载规则

```bash
# 重载 UFW
sudo ufw reload

# 重置 UFW（谨慎使用！）
sudo ufw reset
```

#### 禁用/启用

```bash
# 禁用 UFW
sudo ufw disable

# 启用 UFW
sudo ufw enable
```

### 6. 完整配置示例

```bash
#!/bin/bash
# GuardVault UFW 配置脚本

# 设置默认策略
sudo ufw default deny incoming
sudo ufw default allow outgoing

# 允许 SSH（限制为管理 IP）
sudo ufw allow from 192.168.1.100 to any port 22

# 允许 HTTP/HTTPS
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp

# 允许 API 端口（限制为内网）
sudo ufw allow from 192.168.1.0/24 to any port 3001

# 允许 MySQL（仅本地）
sudo ufw allow from 127.0.0.1 to any port 3306

# 启用 UFW
sudo ufw enable

# 查看状态
sudo ufw status verbose
```

## CentOS/RHEL (firewalld)

### 1. 安装 firewalld

```bash
sudo yum install -y firewalld

# 启动 firewalld
sudo systemctl start firewalld

# 设置开机自启
sudo systemctl enable firewalld
```

### 2. 基本配置

#### 查看状态

```bash
# 查看状态
sudo firewall-cmd --state

# 查看当前区域
sudo firewall-cmd --get-active-zones

# 查看默认区域
sudo firewall-cmd --get-default-zone
```

#### 查看规则

```bash
# 查看所有规则
sudo firewall-cmd --list-all

# 查看特定区域
sudo firewall-cmd --zone=public --list-all

# 查看开放的端口
sudo firewall-cmd --list-ports
```

### 3. 配置规则

#### 允许 SSH

```bash
# 允许 SSH（永久）
sudo firewall-cmd --permanent --add-service=ssh

# 或允许特定端口
sudo firewall-cmd --permanent --add-port=22/tcp

# 或限制为特定 IP
sudo firewall-cmd --permanent --add-rich-rule='rule family="ipv4" source address="192.168.1.100" port protocol="tcp" port="22" accept'
```

#### 允许 HTTP/HTTPS

```bash
# 允许 HTTP
sudo firewall-cmd --permanent --add-service=http

# 允许 HTTPS
sudo firewall-cmd --permanent --add-service=https

# 或使用端口
sudo firewall-cmd --permanent --add-port=80/tcp
sudo firewall-cmd --permanent --add-port=443/tcp
```

#### 允许 API 端口

```bash
# 允许 API 端口（所有 IP）
sudo firewall-cmd --permanent --add-port=3001/tcp

# 或限制为特定网段
sudo firewall-cmd --permanent --add-rich-rule='rule family="ipv4" source address="192.168.1.0/24" port protocol="tcp" port="3001" accept'

# 或限制为特定 IP
sudo firewall-cmd --permanent --add-rich-rule='rule family="ipv4" source address="192.168.1.100" port protocol="tcp" port="3001" accept'
```

#### 允许 MySQL（仅本地）

```bash
# 仅允许本地访问 MySQL
sudo firewall-cmd --permanent --add-rich-rule='rule family="ipv4" source address="127.0.0.1" port protocol="tcp" port="3306" accept'

# 或允许特定服务器
sudo firewall-cmd --permanent --add-rich-rule='rule family="ipv4" source address="192.168.1.200" port protocol="tcp" port="3306" accept'
```

### 4. 应用规则

```bash
# 重载防火墙（应用永久规则）
sudo firewall-cmd --reload

# 查看生效的规则
sudo firewall-cmd --list-all
```

### 5. 高级配置

#### 删除规则

```bash
# 删除服务
sudo firewall-cmd --permanent --remove-service=ssh

# 删除端口
sudo firewall-cmd --permanent --remove-port=3001/tcp

# 删除富规则
sudo firewall-cmd --permanent --remove-rich-rule='rule family="ipv4" source address="192.168.1.100" port protocol="tcp" port="22" accept'

# 重载防火墙
sudo firewall-cmd --reload
```

#### 限制连接速率

```bash
# 限制 SSH 连接速率
sudo firewall-cmd --permanent --add-rich-rule='rule family="ipv4" source address="0.0.0.0/0" port port="22" protocol="tcp" limit value="1/m" accept'

# 这会限制每分钟最多 1 个连接
```

#### 拒绝特定 IP

```bash
# 拒绝特定 IP
sudo firewall-cmd --permanent --add-rich-rule='rule family="ipv4" source address="192.168.1.50" reject'

# 拒绝特定网段
sudo firewall-cmd --permanent --add-rich-rule='rule family="ipv4" source address="192.168.1.0/24" reject'

# 重载防火墙
sudo firewall-cmd --reload
```

#### 使用区域

```bash
# 查看所有区域
sudo firewall-cmd --get-zones

# 设置默认区域
sudo firewall-cmd --set-default-zone=public

# 将接口添加到区域
sudo firewall-cmd --zone=public --change-interface=eth0

# 在特定区域添加规则
sudo firewall-cmd --zone=public --permanent --add-port=3001/tcp
```

### 6. 完整配置示例

```bash
#!/bin/bash
# GuardVault firewalld 配置脚本

# 设置默认区域
sudo firewall-cmd --set-default-zone=public

# 允许 SSH（限制为管理 IP）
sudo firewall-cmd --permanent --add-rich-rule='rule family="ipv4" source address="192.168.1.100" port protocol="tcp" port="22" accept'

# 允许 HTTP/HTTPS
sudo firewall-cmd --permanent --add-service=http
sudo firewall-cmd --permanent --add-service=https

# 允许 API 端口（限制为内网）
sudo firewall-cmd --permanent --add-rich-rule='rule family="ipv4" source address="192.168.1.0/24" port protocol="tcp" port="3001" accept'

# 允许 MySQL（仅本地）
sudo firewall-cmd --permanent --add-rich-rule='rule family="ipv4" source address="127.0.0.1" port protocol="tcp" port="3306" accept'

# 重载防火墙
sudo firewall-cmd --reload

# 查看状态
sudo firewall-cmd --list-all
```

## 云服务器安全组

### 阿里云

#### 1. 登录阿里云控制台

访问：https://ecs.console.aliyun.com/

#### 2. 找到安全组

1. 选择"实例与镜像" → "实例"
2. 找到您的实例
3. 点击"更多" → "网络和安全组" → "安全组配置"

#### 3. 配置入方向规则

点击"配置规则" → "入方向" → "手动添加"

| 协议类型 | 端口范围 | 授权对象 | 描述 |
|---------|---------|---------|------|
| 自定义 TCP | 22/22 | 0.0.0.0/0 或特定 IP | SSH（建议限制 IP） |
| 自定义 TCP | 80/80 | 0.0.0.0/0 | HTTP |
| 自定义 TCP | 443/443 | 0.0.0.0/0 | HTTPS |
| 自定义 TCP | 3001/3001 | 内网网段或特定 IP | API 服务 |

#### 4. 配置出方向规则

通常允许所有出方向流量：

| 协议类型 | 端口范围 | 授权对象 | 描述 |
|---------|---------|---------|------|
| 全部 | -1/-1 | 0.0.0.0/0 | 允许所有出方向 |

### 腾讯云

#### 1. 登录腾讯云控制台

访问：https://console.cloud.tencent.com/cvm

#### 2. 找到安全组

1. 选择"云服务器" → "实例"
2. 找到您的实例
3. 点击"更多" → "安全组" → "配置安全组"

#### 3. 配置入站规则

点击"添加规则"

| 协议 | 端口 | 来源 | 策略 | 描述 |
|------|------|------|------|------|
| TCP | 22 | 0.0.0.0/0 或特定 IP | 允许 | SSH |
| TCP | 80 | 0.0.0.0/0 | 允许 | HTTP |
| TCP | 443 | 0.0.0.0/0 | 允许 | HTTPS |
| TCP | 3001 | 内网网段或特定 IP | 允许 | API 服务 |

#### 4. 配置出站规则

通常允许所有出站流量：

| 协议 | 端口 | 目标 | 策略 | 描述 |
|------|------|------|------|------|
| ALL | ALL | 0.0.0.0/0 | 允许 | 允许所有出站 |

### AWS

#### 1. 登录 AWS 控制台

访问：https://console.aws.amazon.com/ec2/

#### 2. 找到安全组

1. 选择"Instances"
2. 找到您的实例
3. 点击"Security"标签
4. 点击安全组链接

#### 3. 配置入站规则

点击"Edit inbound rules" → "Add rule"

| Type | Protocol | Port range | Source | Description |
|------|----------|------------|--------|-------------|
| SSH | TCP | 22 | My IP 或特定 IP | SSH access |
| HTTP | TCP | 80 | 0.0.0.0/0 | HTTP access |
| HTTPS | TCP | 443 | 0.0.0.0/0 | HTTPS access |
| Custom TCP | TCP | 3001 | 内网网段或特定 IP | API service |

#### 4. 配置出站规则

通常允许所有出站流量：

| Type | Protocol | Port range | Destination | Description |
|------|----------|------------|-------------|-------------|
| All traffic | All | All | 0.0.0.0/0 | All outbound traffic |

## Docker 防火墙配置

### 1. Docker 网络问题

Docker 会修改 iptables 规则，可能导致防火墙配置失效。

### 2. 解决方案

#### 方式一：禁用 Docker iptables 管理

```bash
# 编辑 Docker 配置
sudo nano /etc/docker/daemon.json

# 添加以下配置
{
  "iptables": false
}

# 重启 Docker
sudo systemctl restart docker
```

**注意**: 这可能会影响 Docker 网络功能。

#### 方式二：使用自定义网络

```bash
# 创建自定义网络
docker network create --driver bridge guardvault-network

# 使用自定义网络启动容器
docker run --network guardvault-network ...
```

#### 方式三：配置 Docker 防火墙规则

```bash
# 允许 Docker 网络流量
sudo ufw allow from 172.17.0.0/16
sudo ufw allow from 172.18.0.0/16

# 或使用 firewalld
sudo firewall-cmd --permanent --zone=trusted --add-source=172.17.0.0/16
sudo firewall-cmd --reload
```

### 3. Docker Compose 配置

```yaml
version: '3.8'

services:
  server:
    build: ./server
    ports:
      - "3001:3001"
    networks:
      - guardvault-network

networks:
  guardvault-network:
    driver: bridge
    ipam:
      config:
        - subnet: 172.20.0.0/16
```

配置防火墙：
```bash
# 允许 Docker 网络访问 API 端口
sudo ufw allow from 172.20.0.0/16 to any port 3001
```

## Nginx 防火墙配置

### 1. 基本配置

Nginx 作为反向代理，只需要开放 80 和 443 端口：

```bash
# UFW
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp

# firewalld
sudo firewall-cmd --permanent --add-service=http
sudo firewall-cmd --permanent --add-service=https
sudo firewall-cmd --reload
```

### 2. 限制访问

#### 限制特定路径

```nginx
# 只允许特定 IP 访问管理路径
location /admin {
    allow 192.168.1.100;
    deny all;

    proxy_pass http://127.0.0.1:3001;
}
```

#### 限制特定方法

```nginx
# 只允许 GET 和 POST 方法
if ($request_method !~ ^(GET|POST)$ ) {
    return 405;
}
```

#### 限制请求频率

```nginx
# 限制请求频率（防止 DDoS）
limit_req_zone $binary_remote_addr zone=api_limit:10m rate=10r/s;

location /api/ {
    limit_req zone=api_limit burst=20 nodelay;

    proxy_pass http://127.0.0.1:3001;
}
```

### 3. 安全头配置

```nginx
# 添加安全头
add_header X-Frame-Options "SAMEORIGIN" always;
add_header X-Content-Type-Options "nosniff" always;
add_header X-XSS-Protection "1; mode=block" always;
add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
add_header Referrer-Policy "no-referrer-when-downgrade" always;
```

## 端口冲突处理

### 1. 检查端口占用

```bash
# 使用 netstat
sudo netstat -tulpn | grep :3001

# 使用 ss
sudo ss -tulpn | grep :3001

# 使用 lsof
sudo lsof -i :3001
```

### 2. 查找占用进程

```bash
# 查找占用端口的进程
sudo lsof -i :3001

# 输出示例：
# COMMAND   PID USER   FD   TYPE DEVICE SIZE/OFF NODE NAME
# node     1234 user   20u  IPv4  12345      0t0  TCP *:3001 (LISTEN)
```

### 3. 终止占用进程

```bash
# 终止进程
sudo kill -9 1234

# 或使用进程名
sudo pkill -f "node.*3001"
```

### 4. 更改端口

如果无法终止占用进程，可以更改 GuardVault 使用的端口：

```bash
# 编辑 server/.env
nano server/.env

# 修改端口
PORT=3002

# 重启服务
sudo systemctl restart guardvault-server

# 更新防火墙规则
sudo ufw allow 3002/tcp
# 或
sudo firewall-cmd --permanent --add-port=3002/tcp
sudo firewall-cmd --reload
```

### 5. 自动化脚本

创建 `scripts/check-port.sh`:

```bash
#!/bin/bash
PORT=$1

if [ -z "$PORT" ]; then
  echo "Usage: $0 <port>"
  exit 1
fi

# 检查端口占用
PID=$(sudo lsof -ti :$PORT)

if [ -n "$PID" ]; then
  echo "端口 $PORT 被进程 $PID 占用"
  echo "进程信息:"
  ps -p $PID -o pid,ppid,cmd

  read -p "是否终止该进程？(y/n) " -n 1 -r
  echo
  if [[ $REPLY =~ ^[Yy]$ ]]; then
    sudo kill -9 $PID
    echo "进程已终止"
  fi
else
  echo "端口 $PORT 未被占用"
fi
```

使用脚本：
```bash
chmod +x scripts/check-port.sh
./scripts/check-port.sh 3001
```

## 安全最佳实践

### 1. 最小权限原则

- 只开放必要的端口
- 限制访问来源（IP 白名单）
- 定期审查防火墙规则

### 2. 分层防御

- 使用云服务器安全组
- 配置系统防火墙
- 使用 Nginx 反向代理
- 应用层访问控制

### 3. 定期更新

```bash
# 更新系统
sudo apt update && sudo apt upgrade -y  # Ubuntu/Debian
sudo yum update -y                      # CentOS/RHEL

# 更新防火墙规则
sudo ufw reload
sudo firewall-cmd --reload
```

### 4. 监控日志

```bash
# 查看 UFW 日志
sudo tail -f /var/log/ufw.log

# 查看 firewalld 日志
sudo journalctl -u firewalld -f

# 查看连接日志
sudo tail -f /var/log/syslog | grep UFW
```

### 5. 使用 fail2ban

```bash
# 安装 fail2ban
sudo apt install -y fail2ban

# 配置 fail2ban
sudo nano /etc/fail2ban/jail.local

# 添加以下配置
[sshd]
enabled = true
port = ssh
filter = sshd
logpath = /var/log/auth.log
maxretry = 3
bantime = 3600

# 启动 fail2ban
sudo systemctl start fail2ban
sudo systemctl enable fail2ban
```

### 6. 定期备份

```bash
# 备份防火墙规则
# UFW
sudo cp /etc/ufw/user.rules /backup/ufw-user.rules-$(date +%Y%m%d)

# firewalld
sudo firewall-cmd --export > /backup/firewalld-rules-$(date +%Y%m%d).xml
```

## 故障排查

### 1. 无法访问服务

#### 检查防火墙状态

```bash
# UFW
sudo ufw status verbose

# firewalld
sudo firewall-cmd --list-all
```

#### 检查端口监听

```bash
sudo netstat -tulpn | grep :3001
sudo ss -tulpn | grep :3001
```

#### 测试端口连通性

```bash
# 从本地测试
curl http://localhost:3001/api/health

# 从远程测试
telnet <server-ip> 3001
nc -zv <server-ip> 3001
```

### 2. 防火墙规则不生效

#### 检查规则顺序

```bash
# UFW
sudo ufw status numbered

# firewalld
sudo firewall-cmd --list-rich-rules
```

#### 重载防火墙

```bash
# UFW
sudo ufw reload

# firewalld
sudo firewall-cmd --reload
```

#### 检查 iptables 规则

```bash
# 查看所有 iptables 规则
sudo iptables -L -n -v

# 查看特定链
sudo iptables -L INPUT -n -v
```

### 3. Docker 网络问题

#### 检查 Docker 网络

```bash
# 查看 Docker 网络
docker network ls

# 查看网络详情
docker network inspect bridge
```

#### 检查容器网络

```bash
# 查看容器网络
docker inspect <container-id> | grep -A 10 NetworkSettings

# 测试容器连通性
docker exec <container-id> ping <target-ip>
```

### 4. 云服务器安全组问题

#### 检查安全组规则

- 登录云控制台
- 检查安全组入站/出站规则
- 确认端口和 IP 配置正确

#### 测试连通性

```bash
# 从云服务器内部测试
curl http://localhost:3001/api/health

# 从外部测试
curl http://<public-ip>:3001/api/health
```

## 常用命令速查

### UFW 命令

```bash
# 启用/禁用
sudo ufw enable
sudo ufw disable

# 查看状态
sudo ufw status
sudo ufw status verbose
sudo ufw status numbered

# 添加规则
sudo ufw allow 22/tcp
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw allow 3001/tcp

# 删除规则
sudo ufw delete allow 3001/tcp
sudo ufw delete <rule-number>

# 重载
sudo ufw reload

# 重置
sudo ufw reset
```

### firewalld 命令

```bash
# 启动/停止
sudo systemctl start firewalld
sudo systemctl stop firewalld

# 查看状态
sudo firewall-cmd --state
sudo firewall-cmd --list-all

# 添加规则
sudo firewall-cmd --permanent --add-port=3001/tcp
sudo firewall-cmd --permanent --add-service=http

# 删除规则
sudo firewall-cmd --permanent --remove-port=3001/tcp
sudo firewall-cmd --permanent --remove-service=http

# 重载
sudo firewall-cmd --reload
```

### 网络测试命令

```bash
# 端口检查
sudo netstat -tulpn | grep :3001
sudo ss -tulpn | grep :3001
sudo lsof -i :3001

# 连通性测试
curl http://localhost:3001/api/health
telnet <server-ip> 3001
nc -zv <server-ip> 3001

# 追踪路由
traceroute <server-ip>
mtr <server-ip>

# DNS 查询
nslookup <domain>
dig <domain>
```

## 下一步

- 阅读 [部署指南](DEPLOYMENT.md) 了解如何部署系统
- 阅读 [故障排查指南](TROUBLESHOOTING.md) 解决常见问题
- 阅读 [安全最佳实践](#安全最佳实践) 加强系统安全