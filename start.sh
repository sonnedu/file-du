#!/bin/bash
# File-Du 快速启动（已安装依赖时使用）

set -e

[ ! -f ".env" ] && cp .env.example .env && echo "[!] 已生成 .env，请先编辑配置后再启动"

export $(grep -v '^#' .env | xargs)

mkdir -p data/uploads data/temp logs

if command -v pm2 &>/dev/null; then
  pm2 stop file-du 2>/dev/null || true
  pm2 delete file-du 2>/dev/null || true
  pm2 start server/index.js --name "file-du" --log "./logs/file-du.log" --time
  pm2 save --force
  echo "[✓] 已用 pm2 启动，查看日志：pm2 logs file-du"
else
  echo "[→] pm2 未安装，直接前台启动（Ctrl+C 退出）..."
  node server/index.js
fi
