# 运维手册

## 服务端口

| 服务 | 端口 | 说明 |
| --- | --- | --- |
| guardvault-server | 3000 | API 服务 |
| guardvault-webadmin | 5174 | 预览模式（生产可用 nginx 反代 dist/） |

## PM2 模式（小规模/单机）

```bash
# 安装 pm2
npm i -g pm2
# 启动
pm2 start ecosystem.config.cjs
# 状态
pm2 status
pm2 logs guardvault-server
# 重启
pm2 restart ecosystem.config.cjs
# 开机自启
pm2 startup
pm2 save
```

## systemd 模式（生产 Linux 服务器）

```bash
# 部署项目到 /opt/guardvault
sudo useradd -r -s /bin/false guardvault
sudo chown -R guardvault:guardvault /opt/guardvault
sudo mkdir -p /var/log/guardvault && sudo chown guardvault:guardvault /var/log/guardvault

# 安装单元
sudo ./scripts/deploy.sh install

# 配置 .env
sudo cp server/.env.example /opt/guardvault/server/.env
sudo -u guardvault nano /opt/guardvault/server/.env

# 数据库初始化（首次部署必须执行）
cd /opt/guardvault/server
sudo -u guardvault npx prisma db deploy

# 启动
sudo systemctl start guardvault-server
sudo systemctl start guardvault-webadmin
sudo systemctl enable guardvault-server guardvault-webadmin

# 看日志
sudo ./scripts/deploy.sh logs
sudo journalctl -u guardvault-server -f
```

## Nginx 反代（推荐）

```nginx
server {
  listen 80;
  server_name guardvault.example.com;

  # Web 后台
  location / {
    root /opt/guardvault/web-admin/dist;
    try_files $uri $uri/ /index.html;
  }

  # API 反代
  location /api/ {
    proxy_pass http://127.0.0.1:3001;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
  }
}
```

## 数据库备份

```bash
# 备份
mysqldump -uadmin -p25821250 guardvault_db | gzip > /backup/guardvault_$(date +%F).sql.gz
# 恢复
gunzip < /backup/guardvault_2024-01-01.sql.gz | mysql -uadmin -p25821250 guardvault_db
```

## 升级

```bash
cd /opt/guardvault
git pull
(cd server && npm ci --omit=dev)
(cd web-admin && npm ci && npm run build)
(cd server && npx prisma db deploy)
sudo systemctl restart guardvault-server guardvault-webadmin
```

## 常见告警处理

| 现象 | 排查 |
| --- | --- |
| 502 / 503 | `systemctl status guardvault-server`，看日志 |
| 数据库连不上 | `mysql -uadmin -p25821250 -h127.0.0.1 guardvault_db -e "select 1"` |
| 客户端报"Token 过期" | 用户主动登出或吊销列表触发；让用户重新登录 |
| 内存持续上涨 | 检查 `prisma` 连接是否被回收；必要时重启服务 |

## 客户端连接故障排查

客户端通过 `app-config` 里的 `serverUrl` 找到服务端，并通过 `GET /health` 做可用性探测（自动发现也用同一端点）。

### 现象一：登录页"服务端离线"红点常亮

1. 确认客户端和服务端互通：
   ```bash
   # 从客户端机器上
   curl -m 3 http://<server-ip>:3001/health
   # 期望输出：{"status":"ok","time":"..."}
   ```
2. 确认服务端 `3001` 端口在监听：
   ```bash
   ss -lntp | grep 3001
   ```
3. 防火墙放行：云服务商安全组 / 本机 `firewalld` / `ufw` 都需要放行 TCP 3001。
4. 客户端点登录页右上 `↻` 按钮重新探测一次。

### 现象二：配置页"局域网内的服务端"列表为空

1. 扫描器只覆盖 **本机 IPv4 网卡所在 /24 + 127.0.0.1**，每次探测 `:3001`，超时 500ms。
2. 跨网段（VPC / VPN / Docker bridge / 容器网络）扫不到很正常，**直接在输入框手填** `http://<ip>:3001` 即可。
3. 同一网段也扫不到：
   - 服务端 `HOST` 是否绑定 `0.0.0.0`（`server/.env` 里 `HOST=0.0.0.0`），不能是 `127.0.0.1`。
   - 看服务端日志 `logs/server.log` 有没有收到扫描连接。
4. 配置页"重新扫描"按钮可手动触发一次。

### 现象三：保存配置时提示"无法连接到该地址"

`handleSave` 会先打一次 `/health`，通过后才落盘。失败原因多为：

- `serverUrl` 写成了 `https://` 但服务端没配 TLS（统一用 `http://`）。
- 端口号漏掉（`http://192.168.1.10` 应为 `:3001`）。
- 服务端进程没启动或刚崩，看 `pm2 status` / `systemctl status guardvault-server`。

### 现象四：能登录但登录后"在线/离线"状态和实际不符

主进程有 15s 周期心跳（`/health`）。如果服务器频繁切换在线状态：

- 看 `logs/electron.log`，搜索 `net:online` / `net:offline` 时间线。
- 改 `serverUrl` 后没生效：保存后已经 `rebuildClient()` 重建 axios 实例，下次请求即生效。

