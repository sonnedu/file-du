#!/bin/bash
# ============================================================
# File-Du 一键部署脚本
# 支持：Ubuntu / Debian / CentOS / RHEL
# 用途：安装 Node.js、依赖、配置环境变量、用 pm2 启动服务
# ============================================================

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
BOLD='\033[1m'
NC='\033[0m'

log()  { echo -e "${GREEN}[✓]${NC} $1"; }
info() { echo -e "${CYAN}[→]${NC} $1"; }
warn() { echo -e "${YELLOW}[!]${NC} $1"; }
err()  { echo -e "${RED}[✗]${NC} $1"; exit 1; }

echo -e "${BOLD}"
echo "  ███████╗██╗██╗     ███████╗      ██████╗ ██╗   ██╗"
echo "  ██╔════╝██║██║     ██╔════╝      ██╔══██╗██║   ██║"
echo "  █████╗  ██║██║     █████╗   ████ ██║  ██║██║   ██║"
echo "  ██╔══╝  ██║██║     ██╔══╝        ██║  ██║██║   ██║"
echo "  ██║     ██║███████╗███████╗      ██████╔╝╚██████╔╝"
echo "  ╚═╝     ╚═╝╚══════╝╚══════╝      ╚═════╝  ╚═════╝"
echo -e "${NC}"
echo -e "  ${BOLD}File-Du 一键部署脚本${NC}"
echo "  ----------------------------------------"
echo ""

# ─── 1. 检查 / 安装 Node.js ───────────────────────────────────
info "检查 Node.js..."
if command -v node &>/dev/null; then
  NODE_VER=$(node -e "process.exit(parseInt(process.version.slice(1)) < 18 ? 1 : 0)" 2>/dev/null && echo ok || echo old)
  if [ "$NODE_VER" = "old" ]; then
    warn "Node.js 版本过低，需要 >= 18，正在升级..."
    INSTALL_NODE=true
  else
    log "Node.js $(node --version) 已存在"
    INSTALL_NODE=false
  fi
else
  warn "未检测到 Node.js，开始安装..."
  INSTALL_NODE=true
fi

if [ "$INSTALL_NODE" = "true" ]; then
  if command -v apt-get &>/dev/null; then
    # Debian / Ubuntu
    info "使用 apt 安装 Node.js 20..."
    curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash - 2>/dev/null
    sudo apt-get install -y nodejs 2>/dev/null
  elif command -v yum &>/dev/null; then
    # CentOS / RHEL
    info "使用 yum 安装 Node.js 20..."
    curl -fsSL https://rpm.nodesource.com/setup_20.x | sudo bash - 2>/dev/null
    sudo yum install -y nodejs 2>/dev/null
  elif command -v dnf &>/dev/null; then
    info "使用 dnf 安装 Node.js 20..."
    curl -fsSL https://rpm.nodesource.com/setup_20.x | sudo bash - 2>/dev/null
    sudo dnf install -y nodejs 2>/dev/null
  else
    err "无法自动安装 Node.js，请手动安装 Node.js >= 18：https://nodejs.org"
  fi
  log "Node.js $(node --version) 安装完成"
fi

# ─── 2. 安装 pm2 ─────────────────────────────────────────────
info "检查 pm2..."
if ! command -v pm2 &>/dev/null; then
  info "安装 pm2 进程管理器..."
  sudo npm install -g pm2 --quiet
  log "pm2 安装完成"
else
  log "pm2 $(pm2 --version) 已存在"
fi

# ─── 3. 安装项目依赖 ─────────────────────────────────────────
info "安装项目依赖（可能需要 1-3 分钟，含 WebTorrent 编译）..."
npm install --omit=dev 2>&1 | grep -v "^npm warn" || true
log "依赖安装完成"

# ─── 4. 配置 .env ─────────────────────────────────────────────
if [ ! -f ".env" ]; then
  info "配置环境变量..."
  cp .env.example .env

  echo ""
  echo -e "  ${BOLD}请配置访问密码${NC}"
  echo "  （文件管理页面需要密码登录）"
  echo ""

  read -p "  设置管理密码 [默认: changeme123]: " INPUT_PWD
  ADMIN_PWD=${INPUT_PWD:-changeme123}

  read -p "  服务端口 [默认: 3000]: " INPUT_PORT
  APP_PORT=${INPUT_PORT:-3000}

  # 生成随机 session secret
  SESSION_SEC=$(node -e "console.log(require('crypto').randomBytes(32).toString('hex'))")

  sed -i "s|ADMIN_PASSWORD=.*|ADMIN_PASSWORD=${ADMIN_PWD}|" .env
  sed -i "s|SESSION_SECRET=.*|SESSION_SECRET=${SESSION_SEC}|" .env
  sed -i "s|PORT=.*|PORT=${APP_PORT}|" .env

  log ".env 配置完成"
else
  warn ".env 已存在，跳过配置。如需修改请编辑 .env 文件"
  APP_PORT=$(grep "^PORT=" .env | cut -d= -f2 || echo "3000")
fi

# ─── 5. 创建数据目录 ─────────────────────────────────────────
mkdir -p data/uploads data/temp
log "数据目录已就绪"

# ─── 6. 启动 / 重启服务 ──────────────────────────────────────
info "启动 File-Du 服务..."
# 加载 .env 中的环境变量
export $(grep -v '^#' .env | xargs)

# 停止已有实例（如果存在）
pm2 stop file-du 2>/dev/null || true
pm2 delete file-du 2>/dev/null || true

# 启动
pm2 start server/index.js \
  --name "file-du" \
  --env production \
  --log "./logs/file-du.log" \
  --time \
  -- 2>/dev/null || \
pm2 start server/index.js --name "file-du"

pm2 save --force 2>/dev/null || true

# ─── 7. 设置开机自启 ─────────────────────────────────────────
info "配置开机自启..."
STARTUP_CMD=$(pm2 startup 2>&1 | grep "sudo" | tail -1)
if [ -n "$STARTUP_CMD" ]; then
  eval "$STARTUP_CMD" 2>/dev/null || warn "自动配置开机启动失败，请手动运行：$STARTUP_CMD"
fi
pm2 save 2>/dev/null || true

# ─── 完成 ────────────────────────────────────────────────────
echo ""
echo -e "  ${GREEN}${BOLD}✅ File-Du 部署完成！${NC}"
echo ""
echo -e "  🌐 访问地址：${BOLD}http://$(curl -s ifconfig.me 2>/dev/null || echo 'YOUR_IP'):${APP_PORT:-3000}${NC}"
echo -e "  📁 文件数据：${BOLD}$(pwd)/data${NC}"
echo ""
echo -e "  ${BOLD}常用命令：${NC}"
echo "    查看状态: pm2 status"
echo "    查看日志: pm2 logs file-du"
echo "    重启服务: pm2 restart file-du"
echo "    停止服务: pm2 stop file-du"
echo "    修改配置: nano .env && pm2 restart file-du"
echo ""
