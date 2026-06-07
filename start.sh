#!/usr/bin/env bash
# 一键启停脚本（Linux/macOS）
# 用法：./start.sh [server|web|client|all]   默认 all
#       ./stop.sh
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$ROOT_DIR"
LOG_DIR="$ROOT_DIR/logs"
mkdir -p "$LOG_DIR"

RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'; CYAN='\033[0;36m'; NC='\033[0m'
log_info() { echo -e "${GREEN}[INFO]${NC} $*"; }
log_warn() { echo -e "${YELLOW}[WARN]${NC} $*"; }
log_err()  { echo -e "${RED}[ERROR]${NC} $*"; }

# ---- 校验 .env ----
assert_server_env() {
  if [[ ! -f server/.env ]]; then
    log_err "server/.env 不存在，请先复制 .env.example 并填写"
    exit 1
  fi
  for key in DATABASE_URL JWT_SECRET ADMIN_ENCRYPT_KEY; do
    if ! grep -q "^${key}=" server/.env; then
      log_err "server/.env 缺少 ${key} 配置"
      exit 1
    fi
  done
}

# ---- 端口检查 ----
check_port() {
  local port=$1
  if ss -ltn 2>/dev/null | grep -q ":$port "; then
    log_warn "端口 $port 已被占用"
    return 1
  fi
  return 0
}

# ---- 服务端 ----
start_server() {
  assert_server_env
  if [[ -f "$LOG_DIR/server.pid" ]] && kill -0 "$(cat $LOG_DIR/server.pid)" 2>/dev/null; then
    log_warn "服务端已在运行 PID $(cat $LOG_DIR/server.pid)"
    return
  fi
  check_port 3000 || { log_err "请先停掉占用 3000 端口的进程"; exit 1; }
  log_info "启动服务端..."
  (cd server && nohup node src/app.js > "$LOG_DIR/server.log" 2>&1 & echo $! > "$LOG_DIR/server.pid")
  log_info "服务端 PID: $(cat $LOG_DIR/server.pid)  日志: $LOG_DIR/server.log"
}

# ---- Web 管理后台 ----
start_web() {
  if [[ -f "$LOG_DIR/web.pid" ]] && kill -0 "$(cat $LOG_DIR/web.pid)" 2>/dev/null; then
    log_warn "Web 后台已在运行 PID $(cat $LOG_DIR/web.pid)"
    return
  fi
  check_port 5173 || true
  log_info "启动 Web 后台..."
  (cd web-admin && nohup npm run dev -- --host 0.0.0.0 --port 5173 > "$LOG_DIR/web.log" 2>&1 & echo $! > "$LOG_DIR/web.pid")
  log_info "Web 后台 PID: $(cat $LOG_DIR/web.pid)  日志: $LOG_DIR/web.log"
}

# ---- 客户端 ----
start_client() {
  if [[ -f "$LOG_DIR/client.pid" ]] && kill -0 "$(cat $LOG_DIR/client.pid)" 2>/dev/null; then
    log_warn "客户端已在运行 PID $(cat $LOG_DIR/client.pid)"
    return
  fi
  log_info "启动客户端..."
  (cd client && nohup npm run dev > "$LOG_DIR/client.log" 2>&1 & echo $! > "$LOG_DIR/client.pid")
  log_info "客户端 PID: $(cat $LOG_DIR/client.pid)  日志: $LOG_DIR/client.log"
}

cmd=${1:-all}
case "$cmd" in
  server) start_server ;;
  web)    start_web ;;
  client) start_client ;;
  all)    start_server; start_web; log_info "客户端请单独运行：./start.sh client" ;;
  *) echo "用法: $0 [server|web|client|all]"; exit 1 ;;
esac

log_info "完成"
