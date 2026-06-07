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
