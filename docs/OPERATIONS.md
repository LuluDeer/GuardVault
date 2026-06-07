# 运维手册

## 服务端口

| 服务 | 端口 | 说明 |
| --- | --- | --- |
| totp-server | 3000 | API 服务 |
| totp-webadmin | 5174 | 预览模式（生产可用 nginx 反代 dist/） |

## PM2 模式（小规模/单机）

```bash
# 安装 pm2
npm i -g pm2
# 启动
pm2 start ecosystem.config.cjs
# 状态
pm2 status
pm2 logs totp-server
# 重启
pm2 restart ecosystem.config.cjs
# 开机自启
pm2 startup
pm2 save
```

## systemd 模式（生产 Linux 服务器）

```bash
# 部署项目到 /opt/totp
sudo useradd -r -s /bin/false totp
sudo chown -R totp:totp /opt/totp
sudo mkdir -p /var/log/totp && sudo chown totp:totp /var/log/totp

# 安装单元
sudo ./scripts/deploy.sh install

# 配置 .env
sudo cp server/.env.example /opt/totp/server/.env
sudo -u totp nano /opt/totp/server/.env

# 数据库初始化（首次部署必须执行）
cd /opt/totp/server
sudo -u totp npx prisma db deploy

# 启动
sudo systemctl start totp-server
sudo systemctl start totp-webadmin
sudo systemctl enable totp-server totp-webadmin

# 看日志
sudo ./scripts/deploy.sh logs
sudo journalctl -u totp-server -f
```

## Nginx 反代（推荐）

```nginx
server {
  listen 80;
  server_name totp.example.com;

  # Web 后台
  location / {
    root /opt/totp/web-admin/dist;
    try_files $uri $uri/ /index.html;
  }

  # API 反代
  location /api/ {
    proxy_pass http://127.0.0.1:3000;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
  }
}
```

## 数据库备份

```bash
# 备份
mysqldump -uadmin -p25821250 totp_db | gzip > /backup/totp_$(date +%F).sql.gz
# 恢复
gunzip < /backup/totp_2024-01-01.sql.gz | mysql -uadmin -p25821250 totp_db
```

## 升级

```bash
cd /opt/totp
git pull
(cd server && npm ci --omit=dev)
(cd web-admin && npm ci && npm run build)
(cd server && npx prisma db deploy)
sudo systemctl restart totp-server totp-webadmin
```

## 常见告警处理

| 现象 | 排查 |
| --- | --- |
| 502 / 503 | `systemctl status totp-server`，看日志 |
| 数据库连不上 | `mysql -uadmin -p25821250 -h127.0.0.1 totp_db -e "select 1"` |
| 客户端报"Token 过期" | 用户主动登出或吊销列表触发；让用户重新登录 |
| 内存持续上涨 | 检查 `prisma` 连接是否被回收；必要时重启服务 |
