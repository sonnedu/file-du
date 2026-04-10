# 🗄 File-Du — 文件中转平台

轻量级、开箱即用的自托管文件中转平台。支持大文件上传、远程 URL / 磁力 / BT 下载，内置密码保护的管理后台、国际化与深浅主题切换。

## ✨ 功能特性

- **公开下载列表** — 首页展示所有中转文件，无需登录即可搜索、下载
- **文件上传** — 拖拽或点击上传，实时进度显示，单文件最大支持 8GB（可配置）
- **远程下载** — HTTP/HTTPS URL 直接拉取中转，SSE 实时显示下载进度
- **磁力/BT** — 支持 `magnet:` 链接和 `.torrent` URL（WebTorrent）
- **文件管理** — 列表、搜索、排序、重命名、删除，全部受密码保护
- **分享链接** — 每个文件生成唯一链接，任何人可直接下载，无需登录
- **安全** — 上传、远程下载、文件管理 API 均需 Session 认证，防止未授权访问
- **国际化** — 中文（简体）/ English 一键切换
- **主题** — 深色 / 浅色模式

---

## 📐 页面结构

| 路径 | 访问权限 | 说明 |
|------|---------|------|
| `/` | 🌐 公开 | 文件下载列表（搜索、排序、下载） |
| `/admin` | 🔐 需要登录 | 管理后台：上传文件 / 远程下载 / 文件管理 |
| `/share/:id` | 🌐 公开 | 单文件分享页（显示文件信息 + 下载按钮） |

---

## 🚀 一键部署（VPS 脚本，无需 Docker）

> 推荐方式：使用脚本部署，进程由 **pm2** 管理，自动重启 + 开机自启。

### 部署步骤

```bash
# 1. 将代码上传或克隆到 VPS
git clone https://github.com/your-username/file-du.git
cd file-du

# 2. 执行一键部署（自动安装 Node.js 20、依赖、配置环境、启动服务）
chmod +x deploy.sh && bash deploy.sh
```

脚本会自动完成：
- ✅ 检测并安装 Node.js 20（若未安装，支持 Ubuntu / Debian / CentOS）
- ✅ 安装项目依赖（含 WebTorrent 编译）
- ✅ 交互式设置管理密码和端口
- ✅ 用 pm2 在后台启动服务
- ✅ 配置开机自启（`pm2 startup`）

部署完成后访问 `http://your-vps-ip:3000`

### 常用运维命令

```bash
pm2 status              # 查看服务状态
pm2 logs file-du        # 实时查看日志
pm2 restart file-du     # 重启服务
pm2 stop file-du        # 停止服务
nano .env               # 修改配置（改完后 pm2 restart file-du）
```

### 升级更新

```bash
git pull
npm install --omit=dev
pm2 restart file-du
```

---

## ⚙️ 配置说明（`.env`）

复制模板并修改：

```bash
cp .env.example .env
nano .env
```

| 变量 | 描述 | 默认值 |
|------|------|--------|
| `ADMIN_PASSWORD` | 管理后台登录密码（**必须修改**） | `changeme123` |
| `SESSION_SECRET` | Session 签名密钥，随机字符串（**必须修改**） | — |
| `PORT` | 服务监听端口 | `3000` |
| `MAX_FILE_SIZE` | 单文件最大大小，支持人类可读格式 | `8GB` |

#### `MAX_FILE_SIZE` 支持格式

```bash
MAX_FILE_SIZE=8GB      # 推荐写法
MAX_FILE_SIZE=500MB
MAX_FILE_SIZE=1.5GB    # 支持小数
MAX_FILE_SIZE=1024KB
MAX_FILE_SIZE=2TB
MAX_FILE_SIZE=8589934592  # 纯字节数也兼容
```

支持单位：`B` / `KB` / `MB` / `GB` / `TB`（不区分大小写）

---

## 🐳 Docker 部署（可选）

如果你更习惯 Docker：

```bash
cp .env.example .env && nano .env
docker-compose up -d

# 查看日志
docker-compose logs -f

# 更新
git pull && docker-compose up -d --build

# 停止
docker-compose down
```

---

## 🌐 Nginx 反向代理（可选）

使用 Nginx 反代时，**必须**设置 `client_max_body_size`，否则大文件上传会报 413：

```nginx
server {
    listen 80;
    server_name your-domain.com;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_read_timeout 3600s;
        proxy_send_timeout 3600s;
        client_max_body_size 8g;    # ← 与 MAX_FILE_SIZE 保持一致
    }
}
```

---

## 📁 数据目录

所有持久化数据存储在 `./data/`：

| 路径 | 内容 |
|------|------|
| `./data/db.json` | 文件元数据数据库 |
| `./data/uploads/` | 上传 / 远程下载的文件 |
| `./data/temp/` | BT 下载临时目录 |

---

## 🔧 本地开发

```bash
npm install
cp .env.example .env   # 按需修改
node server/index.js   # 访问 http://localhost:3000
```

---

## 📝 注意事项

- **磁力/BT 下载** 需要 VPS 能访问 DHT 网络（绝大多数 VPS 均可）
- **Session** 在服务重启后失效，需重新登录管理后台
- **上传 / 远程下载 API** 均需 Session 认证，防止未授权的 curl 访问
- 建议配合 Nginx + HTTPS（Let's Encrypt）使用，保障传输安全
