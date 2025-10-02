# 虚拟卡管理系统 - 部署快速参考

## 🚀 一键部署（推荐）

```bash
# 1. 配置环境变量
cp env.production.example .env.production
vim .env.production  # 修改必要配置

# 2. 运行部署脚本
./deploy-production.sh
```

---

## 📁 重要文件说明

| 文件 | 说明 |
|------|------|
| `docker-compose.production.yml` | 生产环境Docker配置 |
| `env.production.example` | 环境变量模板 |
| `.env.production` | 实际环境变量（需创建）|
| `deploy-production.sh` | 一键部署脚本 |
| `health-check.sh` | 健康检查脚本 |
| `backend/Dockerfile.optimized` | 后端优化Dockerfile |
| `v1/Dockerfile.optimized` | 前端优化Dockerfile |

---

## 🔧 常用命令速查

### 部署相关

```bash
# 一键部署
./deploy-production.sh

# 跳过备份部署
./deploy-production.sh --skip-backup

# 跳过构建部署（使用现有镜像）
./deploy-production.sh --skip-build
```

### 服务管理

```bash
# 启动服务
docker-compose -f docker-compose.production.yml up -d

# 停止服务
docker-compose -f docker-compose.production.yml down

# 重启服务
docker-compose -f docker-compose.production.yml restart

# 查看状态
docker-compose -f docker-compose.production.yml ps

# 查看日志
docker-compose -f docker-compose.production.yml logs -f

# 查看特定服务日志
docker-compose -f docker-compose.production.yml logs -f backend
```

### 健康检查

```bash
# 运行完整健康检查
./health-check.sh

# 手动检查各服务
curl http://localhost:3001/api/health  # 后端
curl http://localhost:8000/health      # 前端
docker exec vcard-postgres pg_isready  # 数据库
docker exec vcard-redis redis-cli ping # Redis
```

### 数据库管理

```bash
# 备份数据库
docker exec vcard-postgres pg_dump -U vcard_user vcard_db > backup.dump

# 恢复数据库
docker exec -i vcard-postgres psql -U vcard_user vcard_db < backup.dump

# 运行数据库迁移
docker exec vcard-backend npx prisma migrate deploy

# 生成Prisma客户端
docker exec vcard-backend npx prisma generate

# 进入数据库控制台
docker exec -it vcard-postgres psql -U vcard_user -d vcard_db
```

### 容器管理

```bash
# 进入容器
docker exec -it vcard-backend sh
docker exec -it vcard-frontend sh
docker exec -it vcard-postgres sh

# 查看容器资源使用
docker stats

# 查看容器详细信息
docker inspect vcard-backend

# 查看容器日志
docker logs vcard-backend
docker logs -f vcard-backend  # 实时查看
```

### 镜像管理

```bash
# 构建镜像
docker build -f backend/Dockerfile.optimized -t vcard-backend:latest ./backend
docker build -f v1/Dockerfile.optimized -t vcard-frontend:latest ./v1

# 查看镜像
docker images | grep vcard

# 删除旧镜像
docker image prune -f

# 清理所有未使用资源
docker system prune -af
```

---

## 🔒 必须修改的配置

在 `.env.production` 中：

```bash
# 1. 数据库密码（至少16位）
DB_PASSWORD=YourSecureDBPassword123!@#

# 2. Redis密码（至少16位）
REDIS_PASSWORD=YourSecureRedisPassword123!@#

# 3. JWT密钥（至少64位）
JWT_SECRET=YourSuperSecretJWTKeyHere...

# 4. 卡商API Token
CARD_PROVIDER_TOKEN=your_actual_token_here

# 5. AES加密密钥
CARD_PROVIDER_AES_KEY=your_aes_key_here

# 6. CORS配置（生产环境）
CORS_ORIGIN=https://vcard.yourdomain.com
```

生成安全密钥：
```bash
# 生成数据库密码
openssl rand -base64 32

# 生成JWT密钥
openssl rand -base64 64
```

---

## 🌐 端口说明

| 端口 | 服务 | 访问方式 | 说明 |
|------|------|----------|------|
| 8000 | 前端 | 外部访问 | 主要入口 |
| 3001 | 后端 | 内部访问 | 通过Nginx代理 |
| 5432 | PostgreSQL | 内部访问 | 只绑定127.0.0.1 |
| 6379 | Redis | 内部访问 | 只绑定127.0.0.1 |

访问URL：
- 前端: `http://localhost:8000`
- 后端API: `http://localhost:8000/api/*`
- 直接访问后端: `http://localhost:3001/api/*`

---

## 🆘 故障排查速查

### 容器无法启动

```bash
# 查看日志
docker-compose -f docker-compose.production.yml logs backend

# 检查环境变量
source .env.production
echo $DB_PASSWORD

# 检查端口占用
netstat -tulpn | grep 3001

# 重新构建
docker-compose -f docker-compose.production.yml build --no-cache
```

### 数据库连接失败

```bash
# 检查数据库容器
docker ps | grep postgres

# 测试数据库连接
docker exec vcard-backend ping database

# 查看数据库日志
docker logs vcard-postgres

# 手动连接测试
docker exec -it vcard-postgres psql -U vcard_user -d vcard_db
```

### Prisma错误

```bash
# 重新生成客户端
docker exec vcard-backend npx prisma generate

# 查看schema
docker exec vcard-backend cat prisma/schema.prisma

# 运行迁移
docker exec vcard-backend npx prisma migrate deploy

# 重置数据库（危险！）
docker exec vcard-backend npx prisma migrate reset
```

### 前端无法访问

```bash
# 检查nginx配置
docker exec vcard-frontend cat /etc/nginx/conf.d/default.conf

# 测试nginx配置
docker exec vcard-frontend nginx -t

# 重载nginx
docker exec vcard-frontend nginx -s reload

# 查看nginx日志
docker exec vcard-frontend cat /var/log/nginx/error.log
```

---

## 📊 监控检查清单

### 每日检查

```bash
# 1. 运行健康检查
./health-check.sh

# 2. 查看服务状态
docker-compose -f docker-compose.production.yml ps

# 3. 查看错误日志
docker-compose -f docker-compose.production.yml logs | grep -i error

# 4. 检查磁盘空间
df -h

# 5. 检查资源使用
docker stats --no-stream
```

### 每周检查

```bash
# 1. 备份数据库
BACKUP_FILE="backup_$(date +%Y%m%d).dump"
docker exec vcard-postgres pg_dump -U vcard_user vcard_db > $BACKUP_FILE

# 2. 清理日志
docker-compose -f docker-compose.production.yml logs --tail=1000 > /dev/null

# 3. 清理Docker资源
docker system prune -f

# 4. 查看容器重启次数
docker ps -a --format "table {{.Names}}\t{{.Status}}"
```

---

## 🔄 更新流程

### 更新应用代码

```bash
# 1. 备份数据
./health-check.sh
docker exec vcard-postgres pg_dump -U vcard_user vcard_db > backup_before_update.dump

# 2. 拉取最新代码
git pull

# 3. 重新部署
./deploy-production.sh

# 4. 验证
./health-check.sh
```

### 回滚操作

```bash
# 1. 停止当前服务
docker-compose -f docker-compose.production.yml down

# 2. 恢复代码
git checkout <previous-commit>

# 3. 恢复数据库（如需要）
docker exec -i vcard-postgres psql -U vcard_user vcard_db < backup_before_update.dump

# 4. 重新部署
./deploy-production.sh
```

---

## 📝 环境变量快速参考

### 核心配置

```env
VERSION=1.0.0                        # 版本号
TZ=Asia/Shanghai                     # 时区
NODE_ENV=production                  # 环境
```

### 端口配置

```env
FRONTEND_PORT=8000                   # 前端端口
BACKEND_PORT=3001                    # 后端端口
DB_PORT=5432                         # 数据库端口
REDIS_PORT=6379                      # Redis端口
```

### 安全配置

```env
DB_PASSWORD=<strong-password>        # 数据库密码
REDIS_PASSWORD=<strong-password>     # Redis密码
JWT_SECRET=<64-char-secret>          # JWT密钥
JWT_EXPIRES_IN=7d                    # Token过期时间
```

### API配置

```env
CARD_PROVIDER_TOKEN=<token>          # 卡商Token
CARD_PROVIDER_URL=https://...        # 卡商API地址
CARD_PROVIDER_AES_KEY=<key>          # AES密钥
```

### 限流配置

```env
RATE_LIMIT_WINDOW_MS=900000          # 15分钟
RATE_LIMIT_MAX_REQUESTS=100          # 最多100次
```

### 定时任务

```env
SYNC_ENABLED=true                    # 启用定时任务
SYNC_AUTH_PREVIOUS_CRON=0 1 * * *    # 凌晨1点
SYNC_AUTH_CURRENT_CRON=0 13 * * *    # 下午1点
SYNC_SETTLE_PREVIOUS_CRON=30 1 * * * # 凌晨1:30
SYNC_SETTLE_CURRENT_CRON=30 13 * * * # 下午1:30
```

---

## 🎯 性能优化提示

### 数据库优化

```env
# 连接池配置
DATABASE_URL=postgresql://user:pass@host:5432/db?connection_limit=20&pool_timeout=20
```

### Redis优化

```bash
# 内存限制和淘汰策略
maxmemory 512mb
maxmemory-policy allkeys-lru
```

### Nginx优化

```nginx
# 启用Gzip
gzip on;
gzip_comp_level 6;

# 静态资源缓存
expires 1y;
add_header Cache-Control "public, immutable";
```

---

## 📞 获取帮助

### 日志位置

- 后端日志: `docker exec vcard-backend cat logs/app.log`
- Nginx日志: `docker exec vcard-frontend cat /var/log/nginx/error.log`
- Docker日志: `docker-compose -f docker-compose.production.yml logs`

### 调试技巧

```bash
# 进入容器调试
docker exec -it vcard-backend sh

# 查看环境变量
docker exec vcard-backend env

# 查看进程
docker exec vcard-backend ps aux

# 测试网络连接
docker exec vcard-backend ping database
docker exec vcard-backend curl http://backend:3001/api/health
```

---

**保持此文档在手边，快速解决部署问题！** 📚

