#!/usr/bin/env bash
# 停掉 start.sh 拉起的所有后台进程
set -euo pipefail
ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
LOG_DIR="$ROOT_DIR/logs"
RED='\033[0;31m'; GREEN='\033[0;32m'; NC='\033[0m'

stop_one() {
  local name=$1 pid_file=$LOG_DIR/$2
  if [[ -f "$pid_file" ]]; then
    local pid; pid=$(cat "$pid_file")
    if kill -0 "$pid" 2>/dev/null; then
      kill "$pid" 2>/dev/null || true
      echo -e "${GREEN}[INFO]${NC} 已停止 $name (PID $pid)"
    else
      echo -e "${GREEN}[INFO]${NC} $name 未运行"
    fi
    rm -f "$pid_file"
  fi
}

stop_one server  server.pid
stop_one web     web.pid
stop_one client  client.pid
# 兜底：清理残留 node 进程
pkill -f "node src/app.js" 2>/dev/null || true
pkill -f "vite" 2>/dev/null || true
pkill -f "electron" 2>/dev/null || true
echo -e "${GREEN}[INFO]${NC} 全部停止"
