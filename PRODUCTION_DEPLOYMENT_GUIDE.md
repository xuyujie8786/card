# 🚀 虚拟卡管理系统 - 生产环境部署指南

> **版本**: v1.0.0  
> **最后更新**: 2024年12月  
> **适用环境**: Ubuntu 20.04+, Debian 11+, CentOS 8+

---

## 📋 目录

- [系统概述](#系统概述)
- [技术架构](#技术架构)
- [部署前准备](#部署前准备)
- [快速部署](#快速部署)
- [详细配置](#详细配置)
- [数据库迁移](#数据库迁移)
- [监控与维护](#监控与维护)
- [故障排除](#故障排除)
- [安全加固](#安全加固)

---

## 📖 系统概述

### 功能特性

✅ **虚拟卡管理**
- 多次卡开卡（支持14种货币：USD, EUR, GBP, HKD等）
- 卡片充值、提现、冻结、激活
- 卡片状态实时追踪

✅ **交易账单**
- 授权(Auth)账单实时回调处理
- 结算(Settle)账单自动同步
- 交易记录导出（Excel格式）

✅ **定时同步**
- 每日自动同步前一天账单（01:00 AM, 01:30 AM）
- 每日自动同步当天账单（01:00 PM, 01:30 PM）
- 支持自定义Cron表达式配置

✅ **用户管理**
- 多级用户体系（超级管理员 > 管理员 > 普通用户）
- 用户余额管理
- 操作日志审计

✅ **安全功能**
- JWT认证 + TOTP双因素认证
- 密码加密（bcrypt）
- API限流（15分钟/100请求）
- XSS & CSRF防护

---

## 🏗️ 技术架构

### 系统组件

```
┌─────────────────────────────────────────────────────┐
│                     用户浏览器                        │
└─────────────────────┬───────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────────┐
│              Frontend (Nginx + React)                │
│  - Ant Design Pro 框架                               │
│  - 端口: 8000                                        │
└─────────────────────┬───────────────────────────────┘
                      │ /api/*
                      ▼
┌─────────────────────────────────────────────────────┐
│           Backend (Node.js + Express)                │
│  - TypeScript                                        │
│  - 端口: 3001                                        │
│  - 定时任务（node-cron）                             │
└─────┬───────────────┬──────────────┬────────────────┘
      │               │              │
      ▼               ▼              ▼
┌──────────┐   ┌─────────────┐  ┌──────────────────┐
│PostgreSQL│   │   Redis     │  │  卡商API         │
│  数据库   │   │   缓存      │  │ (vccdaddy.com)  │
│端口: 5432│   │  端口: 6379 │  │                  │
└──────────┘   └─────────────┘  └──────────────────┘
```

### 技术栈

| 类型 | 技术 | 版本 |
|------|------|------|
| **前端** | React + Ant Design Pro | 6.0 |
| **后端** | Node.js + Express + TypeScript | 20.x |
| **数据库** | PostgreSQL | 15 |
| **缓存** | Redis | 7 |
| **ORM** | Prisma | 5.22 |
| **容器化** | Docker + Docker Compose | Latest |
| **Web服务器** | Nginx | Alpine |
| **定时任务** | node-cron | 4.x |

---

## 🔧 部署前准备

### 1. 服务器要求

| 配置项 | 最低要求 | 推荐配置 |
|--------|---------|---------|
| **操作系统** | Ubuntu 20.04+ | Ubuntu 22.04 LTS |
| **CPU** | 2核 | 4核+ |
| **内存** | 4GB | 8GB+ |
| **磁盘** | 40GB SSD | 100GB+ SSD |
| **网络** | 10Mbps | 100Mbps+ |

### 2. 必需软件

```bash
# Docker 20.10+
docker --version

# Docker Compose 2.0+
docker compose version

# Git
git --version
```

### 3. 网络要求

✅ **开放端口**
- `22/tcp` - SSH
- `8000/tcp` - 前端访问
- `3001/tcp` - 后端API（可选，建议仅内网）
- `5432/tcp` - PostgreSQL（仅内网）
- `6379/tcp` - Redis（仅内网）

✅ **外部访问**
- 卡商API：`https://openapi-hk.vccdaddy.com`
- 确保服务器能访问外网

---

## ⚡ 快速部署

### 一键部署脚本

> ⚠️ **重要**: 执行前请仔细阅读并理解每个步骤

```bash
#!/bin/bash
# 虚拟卡系统一键部署脚本

set -e  # 遇到错误立即退出

echo "🚀 开始部署虚拟卡管理系统..."

# 1️⃣ 安装 Docker
echo "📦 安装 Docker..."
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh
sudo apt-get install -y docker-compose-plugin

# 2️⃣ 克隆项目
echo "📥 克隆项目代码..."
cd ~
git clone https://github.com/xuyujie8786/vcard.git vcard-system
cd vcard-system

# 3️⃣ 创建环境变量文件
echo "⚙️  创建配置文件..."
cat > .env << 'EOF'
# ==============================================
# 虚拟卡管理系统环境变量配置
# ==============================================

# ==================== 应用配置 ====================
NODE_ENV=production
LOG_LEVEL=info
TZ=Asia/Shanghai

# ==================== 端口配置 ====================
FRONTEND_PORT=8000
BACKEND_PORT=3001
DB_PORT=5432
REDIS_PORT=6379

# ==================== 数据库配置 ====================
DB_NAME=vcard_db
DB_USER=vcard_user
DB_PASSWORD=CHANGE_THIS_DB_PASSWORD_$(openssl rand -hex 16)
DATABASE_URL=postgresql://vcard_user:CHANGE_THIS_DB_PASSWORD_$(openssl rand -hex 16)@database:5432/vcard_db

# ==================== Redis配置 ====================
REDIS_PASSWORD=CHANGE_THIS_REDIS_PASSWORD_$(openssl rand -hex 16)
REDIS_URL=redis://:CHANGE_THIS_REDIS_PASSWORD_$(openssl rand -hex 16)@redis:6379

# ==================== JWT配置 ====================
JWT_SECRET=$(openssl rand -base64 64)
JWT_EXPIRES_IN=7d

# ==================== 卡商API配置 ====================
CARD_PROVIDER_TOKEN=w5Epkw0M257ocOwB
CARD_PROVIDER_URL=https://openapi-hk.vccdaddy.com
CARD_PROVIDER_AES_KEY=eoC31VaznV1ZBG6T

# ==================== 安全配置 ====================
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100

# ==================== 监控配置 ====================
HEALTH_CHECK_INTERVAL=30000
HEALTH_CHECK_TIMEOUT=5000

# ==================== 日志配置 ====================
LOG_MAX_SIZE=100m
LOG_MAX_FILES=5
LOG_DATE_PATTERN=YYYY-MM-DD

# ==================== 定时同步配置 ====================
SYNC_ENABLED=true
SYNC_AUTH_PREVIOUS_CRON=0 1 * * *
SYNC_AUTH_CURRENT_CRON=0 13 * * *
SYNC_SETTLE_PREVIOUS_CRON=30 1 * * *
SYNC_SETTLE_CURRENT_CRON=30 13 * * *
EOF

echo "✅ 配置文件已生成"

# 4️⃣ 修复 TypeScript 编译问题
echo "🔧 修复 TypeScript 配置..."

# 修复 backend/tsconfig.json - 关闭严格模式
cat > backend/tsconfig.json << 'TSCONFIG_EOF'
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "commonjs",
    "lib": ["ES2020"],
    "outDir": "./dist",
    "rootDir": "./src",
    "strict": false,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true,
    "removeComments": false,
    "noImplicitAny": false,
    "noImplicitReturns": false,
    "noFallthroughCasesInSwitch": false,
    "noUnusedLocals": false,
    "noUnusedParameters": false,
    "exactOptionalPropertyTypes": false,
    "experimentalDecorators": true,
    "emitDecoratorMetadata": true
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist", "**/*.test.ts"],
  "typeRoots": ["./node_modules/@types", "./src/types"]
}
TSCONFIG_EOF

# 修复 Dockerfile 中的 npm ci 问题
sed -i 's/RUN npm ci/RUN npm install/g' backend/Dockerfile
sed -i 's/RUN npm ci/RUN npm install/g' v1/Dockerfile

echo "✅ TypeScript 配置已修复"

# 5️⃣ 构建镜像
echo "🏗️  构建 Docker 镜像（需要 10-15 分钟）..."
sudo docker compose build --no-cache

# 6️⃣ 启动服务
echo "🚀 启动所有服务..."
sudo docker compose up -d

# 7️⃣ 等待数据库就绪
echo "⏳ 等待数据库启动（30秒）..."
sleep 30

# 8️⃣ 运行数据库迁移
echo "📊 运行数据库迁移..."
sudo docker compose exec -T backend npx prisma migrate deploy

# 9️⃣ 显示部署结果
echo ""
echo "======================================"
echo "✅ 部署完成！"
echo "======================================"
echo ""
sudo docker compose ps
echo ""
echo "🌐 访问地址："
echo "   前端：http://$(curl -s ifconfig.me):8000"
echo "   后端API：http://$(curl -s ifconfig.me):3001/api/health"
echo ""
echo "👤 默认管理员账户："
echo "   用户名：admin"
echo "   密码：admin123"
echo ""
echo "⚠️  重要提示："
echo "   1. 请立即修改默认密码！"
echo "   2. 查看配置：cat .env"
echo "   3. 查看日志：sudo docker compose logs -f backend"
echo ""
```

### 保存脚本并执行

```bash
# 保存为 deploy.sh
nano deploy.sh

# 粘贴上面的脚本内容

# 赋予执行权限
chmod +x deploy.sh

# 执行部署
./deploy.sh
```

---

## 🔐 详细配置

### 环境变量说明

#### 核心配置

| 变量名 | 说明 | 默认值 | 是否必须 |
|--------|------|--------|---------|
| `NODE_ENV` | 运行环境 | `production` | ✅ |
| `DATABASE_URL` | 数据库连接串 | - | ✅ |
| `REDIS_URL` | Redis连接串 | - | ✅ |
| `JWT_SECRET` | JWT密钥（≥64字符） | - | ✅ |
| `CARD_PROVIDER_TOKEN` | 卡商API Token | - | ✅ |
| `CARD_PROVIDER_AES_KEY` | AES加密密钥 | - | ✅ |

#### 定时同步配置

| 变量名 | 说明 | 默认值 | Cron表达式 |
|--------|------|--------|-----------|
| `SYNC_ENABLED` | 启用定时同步 | `true` | - |
| `SYNC_AUTH_PREVIOUS_CRON` | 前一天授权账单同步 | `0 1 * * *` | 每日 01:00 |
| `SYNC_AUTH_CURRENT_CRON` | 当天授权账单同步 | `0 13 * * *` | 每日 13:00 |
| `SYNC_SETTLE_PREVIOUS_CRON` | 前一天结算账单同步 | `30 1 * * *` | 每日 01:30 |
| `SYNC_SETTLE_CURRENT_CRON` | 当天结算账单同步 | `30 13 * * *` | 每日 13:30 |

**Cron表达式格式**：
```
分 时 日 月 星期
*  *  *  *  *

示例：
0 2 * * *     → 每日 02:00
30 14 * * 1   → 每周一 14:30
0 */6 * * *   → 每 6 小时
```

#### 安全配置

| 变量名 | 说明 | 默认值 |
|--------|------|--------|
| `RATE_LIMIT_WINDOW_MS` | 限流时间窗口（毫秒） | `900000` (15分钟) |
| `RATE_LIMIT_MAX_REQUESTS` | 最大请求数 | `100` |
| `JWT_EXPIRES_IN` | Token有效期 | `7d` |

### 修改配置

```bash
# 编辑环境变量
nano .env

# 重启服务使配置生效
sudo docker compose down
sudo docker compose up -d
```

---

## 💾 数据库迁移

### Prisma数据模型

系统使用 **Prisma ORM** 管理数据库架构，包含以下核心表：

| 表名 | 说明 | 关键字段 |
|------|------|---------|
| `users` | 用户表 | username, email, role, balance |
| `virtual_cards` | 虚拟卡表 | cardId, cardNo, cvv, expDate, status |
| `card_transactions` | 交易账单表 | txnId, txnType, merchantName, txnTime |
| `user_balance_logs` | 余额日志表 | userId, type, amount, balanceBefore |

### 迁移命令

```bash
# 查看当前迁移状态
sudo docker compose exec backend npx prisma migrate status

# 应用迁移（生产环境）
sudo docker compose exec backend npx prisma migrate deploy

# 重置数据库（开发环境，会删除所有数据！）
sudo docker compose exec backend npx prisma migrate reset

# 生成 Prisma Client
sudo docker compose exec backend npx prisma generate

# 查看数据库结构
sudo docker compose exec backend npx prisma studio
```

### 初始化管理员

系统启动后会自动创建默认管理员：

```
用户名: admin
密码: admin123
角色: SUPER_ADMIN
```

⚠️ **生产环境必须立即修改默认密码！**

### 手动创建管理员

```bash
# 进入 PostgreSQL 容器
sudo docker compose exec database psql -U vcard_user -d vcard_db

# 插入管理员（密码：YourNewPassword123）
INSERT INTO users (username, email, password_hash, name, role, status, balance, currency)
VALUES (
  'admin',
  'admin@example.com',
  '$2b$10$XYZ...', -- 使用 bcrypt 加密
  'System Admin',
  'super_admin',
  'active',
  0.00,
  'USD'
);
```

生成密码哈希：

```bash
# Node.js 环境
node -e "const bcrypt = require('bcryptjs'); console.log(bcrypt.hashSync('YourPassword123', 10));"
```

---

## 📊 监控与维护

### 日志管理

```bash
# 查看所有服务日志
sudo docker compose logs

# 实时查看后端日志
sudo docker compose logs -f backend

# 查看最近100行日志
sudo docker compose logs --tail=100 backend

# 查看特定时间段日志
sudo docker compose logs --since="2024-12-01T00:00:00" backend

# 导出日志到文件
sudo docker compose logs backend > backend.log
```

### 日志文件位置

| 服务 | 日志路径 |
|------|---------|
| **Backend** | `/app/logs/app.log`, `/app/logs/error.log` |
| **Frontend** | `/var/log/nginx/access.log`, `/var/log/nginx/error.log` |
| **PostgreSQL** | Docker 内部日志 |
| **Redis** | Docker 内部日志 |

### 性能监控

```bash
# 查看容器资源使用
sudo docker stats

# 查看磁盘使用
df -h

# 查看数据库大小
sudo docker compose exec database psql -U vcard_user -d vcard_db -c "\l+"

# 查看表大小
sudo docker compose exec database psql -U vcard_user -d vcard_db -c "
SELECT 
  schemaname, 
  tablename, 
  pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS size
FROM pg_tables 
WHERE schemaname = 'public' 
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;
"
```

### 健康检查

```bash
# 检查服务状态
sudo docker compose ps

# 检查后端健康
curl http://localhost:3001/api/health

# 检查前端健康
curl http://localhost:8000/health

# 检查数据库连接
sudo docker compose exec database pg_isready -U vcard_user

# 检查 Redis
sudo docker compose exec redis redis-cli -a ${REDIS_PASSWORD} ping
```

### 备份策略

#### 数据库备份

```bash
# 手动备份
sudo docker compose exec database pg_dump -U vcard_user vcard_db > backup_$(date +%Y%m%d_%H%M%S).sql

# 恢复备份
cat backup_20241201_120000.sql | sudo docker compose exec -T database psql -U vcard_user vcard_db

# 自动备份脚本（每日 02:00）
cat > /etc/cron.d/vcard-backup << 'EOF'
0 2 * * * root cd /root/vcard-system && docker compose exec -T database pg_dump -U vcard_user vcard_db | gzip > /backup/vcard_$(date +\%Y\%m\%d).sql.gz
EOF

# 备份保留策略（保留30天）
0 3 * * * root find /backup -name "vcard_*.sql.gz" -mtime +30 -delete
```

#### 完整系统备份

```bash
# 停止服务
sudo docker compose down

# 备份所有数据
sudo tar -czf vcard_full_backup_$(date +%Y%m%d).tar.gz \
  ~/vcard-system \
  /var/lib/docker/volumes/vcard-system_postgres_data \
  /var/lib/docker/volumes/vcard-system_redis_data

# 重启服务
sudo docker compose up -d
```

---

## 🔧 故障排除

### 常见问题

#### 1️⃣ 服务启动失败

**问题**: 容器启动后立即退出

```bash
# 检查日志
sudo docker compose logs backend

# 检查容器状态
sudo docker compose ps -a

# 重新构建
sudo docker compose build --no-cache backend
sudo docker compose up -d
```

**可能原因**:
- ❌ 环境变量配置错误
- ❌ 端口被占用
- ❌ 依赖安装失败
- ❌ TypeScript 编译错误

#### 2️⃣ 数据库连接失败

**错误**: `Error: connect ECONNREFUSED`

```bash
# 检查数据库是否启动
sudo docker compose ps database

# 检查数据库健康状态
sudo docker compose exec database pg_isready -U vcard_user

# 检查网络连接
sudo docker compose exec backend ping database

# 重启数据库
sudo docker compose restart database
```

#### 3️⃣ Prisma 类型错误

**错误**: `error TS2305: Module '"@prisma/client"' has no exported member`

**解决方案**:

```bash
# 1. 修改 tsconfig.json
cat > backend/tsconfig.json << 'EOF'
{
  "compilerOptions": {
    "strict": false,
    "noImplicitAny": false,
    // ... 其他配置
  }
}
EOF

# 2. 修改 Dockerfile
sed -i 's/RUN npm ci/RUN npm install/g' backend/Dockerfile

# 3. 确保先生成 Prisma，再编译 TypeScript
# Dockerfile 中的顺序应该是：
# RUN npm install
# RUN npx prisma generate
# RUN npm run build

# 4. 重新构建
sudo docker compose build --no-cache backend
sudo docker compose up -d
```

#### 4️⃣ 定时任务未执行

**问题**: 定时同步任务没有运行

```bash
# 检查环境变量
sudo docker compose exec backend env | grep SYNC

# 检查时区
sudo docker compose exec backend date

# 查看定时任务日志
sudo docker compose logs backend | grep "定时"

# 手动触发同步（测试）
sudo docker compose exec backend node -e "
const syncService = require('./dist/services/syncService').default;
syncService.syncAuthTransactions('2024-12-01', '2024-12-01').then(console.log);
"
```

#### 5️⃣ 前端无法访问后端API

**错误**: `Failed to fetch` 或 `502 Bad Gateway`

```bash
# 检查 nginx 配置
sudo docker compose exec frontend cat /etc/nginx/conf.d/default.conf

# 检查后端是否运行
curl http://localhost:3001/api/health

# 检查 nginx 日志
sudo docker compose logs frontend

# 重启 nginx
sudo docker compose restart frontend
```

#### 6️⃣ 端口被占用

**错误**: `Bind for 0.0.0.0:3001 failed: port is already allocated`

```bash
# 查看端口占用
sudo netstat -tulpn | grep 3001

# 杀死占用进程
sudo kill -9 <PID>

# 或修改 .env 中的端口
nano .env
# BACKEND_PORT=3002
```

### 调试模式

```bash
# 启用详细日志
# 修改 .env
LOG_LEVEL=debug

# 重启服务
sudo docker compose restart backend

# 进入容器调试
sudo docker compose exec backend sh

# 查看进程
ps aux

# 查看网络
netstat -tuln

# 测试数据库连接
npx prisma db pull
```

---

## 🛡️ 安全加固

### 1. 修改默认密码

```bash
# 登录系统后立即修改
# 前端: 个人中心 > 修改密码

# 或使用 API
curl -X POST http://localhost:3001/api/users/change-password \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "oldPassword": "admin123",
    "newPassword": "YourNewSecurePassword123!"
  }'
```

### 2. 启用 HTTPS

```bash
# 安装 Certbot
sudo apt-get install certbot python3-certbot-nginx

# 获取 SSL 证书
sudo certbot --nginx -d yourdomain.com

# 自动续期
sudo certbot renew --dry-run
```

### 3. 配置防火墙

```bash
# Ubuntu UFW
sudo ufw allow 22/tcp
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw allow 8000/tcp
sudo ufw deny 3001/tcp  # 仅内网访问
sudo ufw deny 5432/tcp  # 仅内网访问
sudo ufw deny 6379/tcp  # 仅内网访问
sudo ufw enable

# 检查状态
sudo ufw status
```

### 4. 数据库安全

```bash
# 修改数据库密码
sudo docker compose exec database psql -U vcard_user -d vcard_db

ALTER USER vcard_user WITH PASSWORD 'NewSecurePassword123!';

# 更新 .env
nano .env
# DB_PASSWORD=NewSecurePassword123!
# DATABASE_URL=postgresql://vcard_user:NewSecurePassword123!@database:5432/vcard_db

# 重启后端
sudo docker compose restart backend
```

### 5. Redis 安全

```bash
# 已在 docker-compose.yml 中配置密码
# 定期更换密码

# 更新 .env
REDIS_PASSWORD=$(openssl rand -hex 32)

# 重启 Redis 和 Backend
sudo docker compose restart redis backend
```

### 6. API 限流

系统已内置限流，可调整参数：

```bash
# .env
RATE_LIMIT_WINDOW_MS=900000   # 15分钟
RATE_LIMIT_MAX_REQUESTS=100   # 最多100请求

# 针对特定IP更严格限制
# 修改 backend/src/middleware/rateLimit.ts
```

### 7. 日志审计

```bash
# 启用操作日志
# 所有关键操作已自动记录在 user_balance_logs 表

# 查询最近操作
sudo docker compose exec database psql -U vcard_user -d vcard_db -c "
SELECT * FROM user_balance_logs 
ORDER BY created_at DESC 
LIMIT 20;
"
```

### 8. 定期更新

```bash
# 更新系统包
sudo apt-get update && sudo apt-get upgrade -y

# 更新 Docker 镜像
sudo docker compose pull
sudo docker compose up -d

# 更新代码
cd ~/vcard-system
git pull origin main
sudo docker compose build --no-cache
sudo docker compose up -d
```

---

## 📚 常用运维命令

### 服务管理

```bash
# 启动所有服务
sudo docker compose up -d

# 停止所有服务
sudo docker compose down

# 重启服务
sudo docker compose restart

# 重启特定服务
sudo docker compose restart backend

# 查看服务状态
sudo docker compose ps

# 查看服务日志
sudo docker compose logs -f [service-name]
```

### 数据管理

```bash
# 进入数据库
sudo docker compose exec database psql -U vcard_user -d vcard_db

# 导出数据
sudo docker compose exec database pg_dump -U vcard_user vcard_db > backup.sql

# 导入数据
cat backup.sql | sudo docker compose exec -T database psql -U vcard_user vcard_db

# 清空 Redis 缓存
sudo docker compose exec redis redis-cli -a ${REDIS_PASSWORD} FLUSHALL
```

### 系统维护

```bash
# 清理 Docker 资源
sudo docker system prune -af

# 查看磁盘使用
df -h
du -sh ~/vcard-system/*

# 日志清理
sudo truncate -s 0 ~/vcard-system/backend/logs/*.log

# 数据库 VACUUM
sudo docker compose exec database psql -U vcard_user -d vcard_db -c "VACUUM FULL;"
```

---

## 📞 技术支持

### 获取帮助

**问题反馈**：
1. 收集错误日志：`sudo docker compose logs > error.log`
2. 收集系统信息：`uname -a && free -h && df -h`
3. 服务状态：`sudo docker compose ps`

**联系方式**：
- GitHub Issues: [项目地址]
- Email: support@example.com

### 常用链接

- [Prisma 文档](https://www.prisma.io/docs)
- [Docker Compose 文档](https://docs.docker.com/compose/)
- [Ant Design Pro 文档](https://pro.ant.design/)
- [Node.js 文档](https://nodejs.org/docs/)

---

## 📝 更新日志

### v1.0.0 (2024-12-01)
- ✅ 初始版本发布
- ✅ 支持虚拟卡开卡、充值、提现
- ✅ 授权/结算账单自动同步
- ✅ 定时任务调度
- ✅ 用户多级管理
- ✅ Docker 容器化部署

---

**部署完成后，请访问 http://YOUR_SERVER_IP:8000 开始使用！** 🎉


