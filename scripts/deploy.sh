#!/usr/bin/env bash
# 部署辅助脚本
# 用法：
#   ./scripts/deploy.sh install   一键安装 systemd 服务（需要 root）
#   ./scripts/deploy.sh uninstall 卸载 systemd 服务
#   ./scripts/deploy.sh logs      跟踪服务端日志
#   ./scripts/deploy.sh status    查看服务状态
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"

RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'; NC='\033[0m'
log_info() { echo -e "${GREEN}[INFO]${NC} $*"; }
log_warn() { echo -e "${YELLOW}[WARN]${NC} $*"; }
log_err() { echo -e "${RED}[ERROR]${NC} $*"; }

install() {
  if [[ $EUID -ne 0 ]]; then log_err "请使用 root 用户执行 install"; exit 1; fi
  log_info "复制 systemd 单元..."
  cp "$SCRIPT_DIR/guardvault-server.service" /etc/systemd/system/
  cp "$SCRIPT_DIR/guardvault-webadmin.service" /etc/systemd/system/
  systemctl daemon-reload
  systemctl enable guardvault-server.service guardvault-webadmin.service
  log_info "已启用，请确认 /opt/guardvault 部署完整后执行：systemctl start guardvault-server"
}

uninstall() {
  if [[ $EUID -ne 0 ]]; then log_err "请使用 root 用户执行 uninstall"; exit 1; fi
  systemctl stop guardvault-server guardvault-webadmin || true
  systemctl disable guardvault-server guardvault-webadmin || true
  rm -f /etc/systemd/system/guardvault-server.service
  rm -f /etc/systemd/system/guardvault-webadmin.service
  systemctl daemon-reload
  log_info "已卸载"
}

logs() {
  journalctl -u guardvault-server -u guardvault-webadmin -f
}

status() {
  systemctl status guardvault-server --no-pager || true
  echo "---"
  systemctl status guardvault-webadmin --no-pager || true
}

case "${1:-}" in
  install) install ;;
  uninstall) uninstall ;;
  logs) logs ;;
  status) status ;;
  *) echo "用法: $0 {install|uninstall|logs|status}"; exit 1 ;;
esac
