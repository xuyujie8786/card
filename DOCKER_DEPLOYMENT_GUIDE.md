# 虚拟卡管理系统 - Docker 生产部署指南

## 📋 目录

- [系统架构](#系统架构)
- [部署前准备](#部署前准备)
- [快速部署](#快速部署)
- [手动部署](#手动部署)
- [配置说明](#配置说明)
- [运维管理](#运维管理)
- [故障排查](#故障排查)
- [安全加固](#安全加固)
- [性能优化](#性能优化)

---

## 🏗 系统架构

### 容器架构
```
┌─────────────────────────────────────────────────┐
│                   用户访问                       │
└──────────────────┬──────────────────────────────┘
                   │
                   ▼
┌─────────────────────────────────────────────────┐
│  Frontend (Nginx + React)                       │
│  - 容器: vcard-frontend                         │
│  - 端口: 8000                                   │
│  - 网络: 172.20.0.5                             │
└──────────────────┬──────────────────────────────┘
                   │ /api/* 代理
                   ▼
┌─────────────────────────────────────────────────┐
│  Backend (Node.js + Express)                    │
│  - 容器: vcard-backend                          │
│  - 端口: 3001 (内部)                            │
│  - 网络: 172.20.0.4                             │
└─────┬──────────────────┬─────────────────────────┘
      │                  │
      ▼                  ▼
┌─────────────┐    ┌─────────────┐
│ PostgreSQL  │    │   Redis     │
│ vcard-postgres   │ vcard-redis │
│ 172.20.0.2  │    │ 172.20.0.3  │
└─────────────┘    └─────────────┘
```

### 技术栈

| 组件 | 技术 | 版本 | 说明 |
|------|------|------|------|
| 前端 | React + Ant Design Pro | Latest | UmiJS 4构建 |
| 后端 | Node.js + Express + TypeScript | 20-alpine | 多阶段构建 |
| 数据库 | PostgreSQL | 15-alpine | 持久化存储 |
| 缓存 | Redis | 7-alpine | Session和缓存 |
| Web服务器 | Nginx | Alpine | 反向代理 |
| ORM | Prisma | 5.22 | 数据库操作 |

---

## 🔧 部署前准备

### 1. 服务器要求

**最低配置:**
- CPU: 2核
- 内存: 4GB
- 硬盘: 50GB SSD
- 操作系统: Ubuntu 20.04+ / CentOS 8+ / Debian 11+

**推荐配置:**
- CPU: 4核
- 内存: 8GB
- 硬盘: 100GB SSD
- 操作系统: Ubuntu 22.04 LTS

### 2. 安装Docker

#### Ubuntu/Debian
```bash
# 更新包索引
sudo apt-get update

# 安装依赖
sudo apt-get install -y \
    ca-certificates \
    curl \
    gnupg \
    lsb-release

# 添加Docker官方GPG密钥
sudo mkdir -p /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg

# 设置仓库
echo \
  "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu \
  $(lsb_release -cs) stable" | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null

# 安装Docker Engine
sudo apt-get update
sudo apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin

# 启动Docker
sudo systemctl start docker
sudo systemctl enable docker

# 验证安装
docker --version
docker compose version
```

#### CentOS/RHEL
```bash
# 安装yum-utils
sudo yum install -y yum-utils

# 添加Docker仓库
sudo yum-config-manager --add-repo https://download.docker.com/linux/centos/docker-ce.repo

# 安装Docker
sudo yum install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin

# 启动Docker
sudo systemctl start docker
sudo systemctl enable docker

# 验证安装
docker --version
docker compose version
```

### 3. 克隆项目

```bash
# 克隆代码
git clone <your-repository-url> vcard
cd vcard

# 或者上传压缩包
scp vcard.tar.gz user@server:/opt/
ssh user@server
cd /opt
tar -xzf vcard.tar.gz
cd vcard
```

### 4. 配置环境变量

```bash
# 复制环境变量模板
cp env.production.example .env.production

# 编辑配置文件
vim .env.production  # 或使用nano
```

**必须修改的配置项:**

1. **数据库密码** (`DB_PASSWORD`)
   ```bash
   # 生成强密码
   openssl rand -base64 32
   ```

2. **Redis密码** (`REDIS_PASSWORD`)
   ```bash
   openssl rand -base64 32
   ```

3. **JWT密钥** (`JWT_SECRET`)
   ```bash
   # 生成至少64位的密钥
   openssl rand -base64 64
   ```

4. **卡商API Token** (`CARD_PROVIDER_TOKEN`)
   - 从卡商处获取

5. **AES加密密钥** (`CARD_PROVIDER_AES_KEY`)
   - 从卡商处获取

6. **CORS配置** (`CORS_ORIGIN`)
   - 生产环境设置为具体域名，如: `https://vcard.yourdomain.com`

---

## 🚀 快速部署

### 使用一键部署脚本

```bash
# 给脚本执行权限
chmod +x deploy-production.sh

# 运行部署脚本
./deploy-production.sh

# 可选参数:
# --skip-backup  跳过数据库备份
# --skip-build   跳过镜像构建（使用已有镜像）
```

**部署流程:**
1. ✅ 检查系统依赖
2. ✅ 验证环境变量
3. ✅ 备份现有数据库
4. ✅ 停止旧容器
5. ✅ 清理未使用资源
6. ✅ 构建Docker镜像
7. ✅ 启动服务
8. ✅ 等待服务就绪
9. ✅ 运行数据库迁移
10. ✅ 显示服务状态

---

## 🔨 手动部署

### 1. 构建镜像

```bash
# 构建后端镜像
docker build -f backend/Dockerfile.optimized -t vcard-backend:latest ./backend

# 构建前端镜像
docker build -f v1/Dockerfile.optimized -t vcard-frontend:latest ./v1
```

### 2. 启动服务

```bash
# 启动所有服务
docker-compose -f docker-compose.production.yml --env-file .env.production up -d

# 查看启动日志
docker-compose -f docker-compose.production.yml logs -f
```

### 3. 初始化数据库

```bash
# 进入后端容器
docker exec -it vcard-backend sh

# 生成Prisma客户端
npx prisma generate

# 运行数据库迁移
npx prisma migrate deploy

# 退出容器
exit
```

### 4. 验证部署

```bash
# 检查容器状态
docker-compose -f docker-compose.production.yml ps

# 检查后端健康
curl http://localhost:3001/api/health

# 检查前端
curl http://localhost:8000/health
```

---

## ⚙️ 配置说明

### 环境变量详解

#### 核心配置

| 变量名 | 说明 | 默认值 | 示例 |
|--------|------|--------|------|
| `VERSION` | 版本号 | 1.0.0 | 1.0.1 |
| `TZ` | 时区 | Asia/Shanghai | Asia/Shanghai |
| `NODE_ENV` | 环境 | production | production |

#### 端口配置

| 变量名 | 说明 | 默认值 | 暴露 |
|--------|------|--------|------|
| `FRONTEND_PORT` | 前端端口 | 8000 | ✅ 对外 |
| `BACKEND_PORT` | 后端端口 | 3001 | ❌ 内部 |
| `DB_PORT` | 数据库端口 | 5432 | ❌ 内部 |
| `REDIS_PORT` | Redis端口 | 6379 | ❌ 内部 |

#### 安全配置

| 变量名 | 说明 | 要求 |
|--------|------|------|
| `DB_PASSWORD` | 数据库密码 | ≥16位，复杂 |
| `REDIS_PASSWORD` | Redis密码 | ≥16位，复杂 |
| `JWT_SECRET` | JWT密钥 | ≥64位，随机 |
| `CARD_PROVIDER_TOKEN` | 卡商Token | 从卡商获取 |

#### 定时任务

| 变量名 | 说明 | Cron表达式 |
|--------|------|-----------|
| `SYNC_AUTH_PREVIOUS_CRON` | 同步前日授权 | `0 1 * * *` |
| `SYNC_AUTH_CURRENT_CRON` | 同步当日授权 | `0 13 * * *` |
| `SYNC_SETTLE_PREVIOUS_CRON` | 同步前日结算 | `30 1 * * *` |
| `SYNC_SETTLE_CURRENT_CRON` | 同步当日结算 | `30 13 * * *` |

### Docker Compose配置

#### 资源限制

```yaml
deploy:
  resources:
    limits:
      cpus: '2'        # CPU限制
      memory: 2G       # 内存限制
    reservations:
      cpus: '1'        # CPU预留
      memory: 512M     # 内存预留
```

#### 网络配置

```yaml
networks:
  vcard-network:
    driver: bridge
    ipam:
      config:
        - subnet: 172.20.0.0/16
```

#### 持久化存储

```yaml
volumes:
  postgres_data:    # PostgreSQL数据
  redis_data:       # Redis数据
  backend_logs:     # 后端日志
  nginx_logs:       # Nginx日志
```

---

## 🔧 运维管理

### 日常操作

#### 查看日志
```bash
# 查看所有服务日志
docker-compose -f docker-compose.production.yml logs -f

# 查看特定服务日志
docker-compose -f docker-compose.production.yml logs -f backend
docker-compose -f docker-compose.production.yml logs -f frontend
docker-compose -f docker-compose.production.yml logs -f database

# 查看最近100行日志
docker-compose -f docker-compose.production.yml logs --tail=100 backend
```

#### 重启服务
```bash
# 重启所有服务
docker-compose -f docker-compose.production.yml restart

# 重启特定服务
docker-compose -f docker-compose.production.yml restart backend
docker-compose -f docker-compose.production.yml restart frontend
```

#### 停止服务
```bash
# 停止所有服务（保留数据）
docker-compose -f docker-compose.production.yml stop

# 停止并删除容器（保留数据）
docker-compose -f docker-compose.production.yml down

# 停止并删除所有（包括数据卷 - 危险操作！）
docker-compose -f docker-compose.production.yml down -v
```

#### 更新服务
```bash
# 拉取最新代码
git pull

# 重新构建并启动
./deploy-production.sh

# 或手动操作
docker-compose -f docker-compose.production.yml build
docker-compose -f docker-compose.production.yml up -d
```

### 数据库管理

#### 备份数据库
```bash
# 手动备份
docker exec vcard-postgres pg_dump -U vcard_user vcard_db > backup_$(date +%Y%m%d).dump

# 或使用脚本
./scripts/backup.sh
```

#### 恢复数据库
```bash
# 从备份恢复
docker exec -i vcard-postgres psql -U vcard_user vcard_db < backup_20241001.dump

# 或使用脚本
./scripts/restore.sh backup_20241001.dump
```

#### 数据库迁移
```bash
# 运行迁移
docker exec vcard-backend npx prisma migrate deploy

# 查看迁移状态
docker exec vcard-backend npx prisma migrate status
```

### 监控和健康检查

#### 检查服务状态
```bash
# 查看容器状态
docker-compose -f docker-compose.production.yml ps

# 查看资源使用
docker stats

# 查看健康状态
docker inspect vcard-backend | grep -A 10 Health
```

#### 健康检查端点
```bash
# 后端健康检查
curl http://localhost:3001/api/health

# 前端健康检查
curl http://localhost:8000/health

# 数据库健康检查
docker exec vcard-postgres pg_isready -U vcard_user
```

---

## 🔍 故障排查

### 常见问题

#### 1. 容器启动失败

**现象:** 容器不断重启
```bash
# 查看容器日志
docker-compose -f docker-compose.production.yml logs backend

# 检查容器状态
docker ps -a
```

**可能原因:**
- 环境变量配置错误
- 端口冲突
- 数据库连接失败
- 内存不足

**解决方法:**
```bash
# 检查环境变量
source .env.production
echo $DB_PASSWORD

# 检查端口占用
netstat -tulpn | grep 3001

# 检查资源使用
docker stats
```

#### 2. 数据库连接失败

**现象:** 后端日志显示数据库连接错误

**解决方法:**
```bash
# 1. 检查数据库容器状态
docker-compose -f docker-compose.production.yml ps database

# 2. 检查数据库日志
docker-compose -f docker-compose.production.yml logs database

# 3. 手动连接测试
docker exec -it vcard-postgres psql -U vcard_user -d vcard_db

# 4. 检查网络连接
docker exec vcard-backend ping database
```

#### 3. Prisma Schema不一致

**现象:** 查询报错字段不存在

**解决方法:**
```bash
# 1. 重新生成Prisma客户端
docker exec vcard-backend npx prisma generate

# 2. 查看当前schema
docker exec vcard-backend cat prisma/schema.prisma

# 3. 运行迁移
docker exec vcard-backend npx prisma migrate deploy
```

#### 4. 前端页面无法访问

**现象:** 访问8000端口无响应

**解决方法:**
```bash
# 1. 检查容器状态
docker ps | grep vcard-frontend

# 2. 检查nginx配置
docker exec vcard-frontend cat /etc/nginx/conf.d/default.conf

# 3. 检查nginx日志
docker-compose -f docker-compose.production.yml logs frontend

# 4. 测试nginx配置
docker exec vcard-frontend nginx -t
```

#### 5. API请求失败

**现象:** 前端无法调用后端API

**解决方法:**
```bash
# 1. 检查网络连通性
docker exec vcard-frontend ping backend

# 2. 检查nginx代理配置
docker exec vcard-frontend cat /etc/nginx/conf.d/default.conf | grep proxy_pass

# 3. 手动测试API
docker exec vcard-frontend wget -O- http://backend:3001/api/health
```

### 日志分析

#### 查看错误日志
```bash
# 后端错误日志
docker exec vcard-backend cat logs/error.log

# Nginx错误日志
docker exec vcard-frontend cat /var/log/nginx/error.log

# 数据库日志
docker-compose -f docker-compose.production.yml logs database | grep ERROR
```

#### 实时监控日志
```bash
# 监控所有服务日志
docker-compose -f docker-compose.production.yml logs -f

# 只看错误信息
docker-compose -f docker-compose.production.yml logs -f | grep -i error

# 多窗口监控
tmux new-session \; \
  split-window -h \; \
  split-window -v \; \
  send-keys 'docker-compose -f docker-compose.production.yml logs -f backend' C-m \; \
  select-pane -t 1 \; \
  send-keys 'docker-compose -f docker-compose.production.yml logs -f frontend' C-m \; \
  select-pane -t 2 \; \
  send-keys 'docker-compose -f docker-compose.production.yml logs -f database' C-m
```

---

## 🔒 安全加固

### 1. 防火墙配置

```bash
# Ubuntu/Debian (UFW)
sudo ufw allow 8000/tcp      # 前端
sudo ufw allow 22/tcp        # SSH
sudo ufw enable

# CentOS/RHEL (firewalld)
sudo firewall-cmd --permanent --add-port=8000/tcp
sudo firewall-cmd --permanent --add-port=22/tcp
sudo firewall-cmd --reload
```

### 2. SSL/TLS配置

使用Nginx作为SSL终止：

```bash
# 安装Certbot
sudo apt-get install certbot python3-certbot-nginx

# 获取证书
sudo certbot --nginx -d vcard.yourdomain.com

# 自动续期
sudo certbot renew --dry-run
```

### 3. 密码策略

- 使用强密码（≥16位，包含大小写、数字、特殊字符）
- 定期更换密码（建议每90天）
- 使用密码管理器保存密码

### 4. 访问控制

```bash
# 限制数据库和Redis只能内网访问
# 在docker-compose.production.yml中已配置:
ports:
  - "127.0.0.1:5432:5432"  # 只绑定本地
  - "127.0.0.1:6379:6379"  # 只绑定本地
```

### 5. 日志审计

```bash
# 启用Docker日志限制
# 在docker-compose.production.yml中已配置:
logging:
  driver: "json-file"
  options:
    max-size: "10m"
    max-file: "3"
```

---

## ⚡ 性能优化

### 1. Docker优化

#### 构建缓存优化
```dockerfile
# 先复制依赖文件，利用Docker缓存
COPY package*.json ./
RUN npm ci

# 后复制源代码
COPY . .
RUN npm run build
```

#### 镜像大小优化
```dockerfile
# 使用Alpine镜像
FROM node:20-alpine

# 多阶段构建
FROM node:20-alpine AS builder
# ... 构建步骤 ...

FROM node:20-alpine AS production
COPY --from=builder /app/dist ./dist
```

### 2. 数据库优化

#### 连接池配置
```env
DATABASE_URL=postgresql://user:pass@host:5432/db?connection_limit=20&pool_timeout=20
```

#### 索引优化
```sql
-- 在Prisma schema中已配置索引
@@index([userId])
@@index([createdAt])
```

### 3. Redis缓存策略

```bash
# 在docker-compose.production.yml中配置:
command: >
  redis-server
  --maxmemory 512mb
  --maxmemory-policy allkeys-lru
```

### 4. Nginx优化

```nginx
# 启用Gzip压缩
gzip on;
gzip_comp_level 6;

# 静态资源缓存
location ~* \.(js|css|png|jpg|jpeg|gif|ico)$ {
    expires 1y;
    add_header Cache-Control "public, immutable";
}

# 连接优化
keepalive_timeout 65;
client_max_body_size 10M;
```

### 5. 应用层优化

- 使用连接池
- 启用查询缓存
- 实现分页查询
- 使用CDN加速静态资源
- 启用HTTP/2

---

## 📊 监控指标

### 关键指标

1. **系统指标**
   - CPU使用率 < 70%
   - 内存使用率 < 80%
   - 磁盘使用率 < 80%

2. **应用指标**
   - 请求响应时间 < 500ms
   - 错误率 < 1%
   - 并发用户数

3. **数据库指标**
   - 连接数
   - 查询性能
   - 慢查询日志

4. **缓存指标**
   - 命中率 > 80%
   - 内存使用

---

## 📝 维护清单

### 每日检查
- [ ] 检查服务状态
- [ ] 查看错误日志
- [ ] 监控资源使用

### 每周检查
- [ ] 备份数据库
- [ ] 清理旧日志
- [ ] 检查磁盘空间

### 每月检查
- [ ] 更新系统补丁
- [ ] 审计安全日志
- [ ] 性能分析报告

### 每季度检查
- [ ] 更换密码
- [ ] 容量规划
- [ ] 灾难恢复演练

---

## 🆘 获取帮助

### 日志位置
- 后端日志: `/app/logs/` (容器内)
- Nginx日志: `/var/log/nginx/` (容器内)
- Docker日志: `docker-compose logs`

### 联系方式
- 技术支持: support@example.com
- 紧急热线: +86-xxx-xxxx-xxxx
- 文档: https://docs.example.com

---

**祝部署顺利！🎉**

