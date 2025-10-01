# 🚀 虚拟卡系统一键部署指南

## 📋 前提条件

- 新的 Ubuntu/Debian 服务器
- 至少 4GB RAM, 2核 CPU
- Root 或 sudo 权限

## 🔑 部署步骤

### 1. SSH 连接到服务器

```bash
ssh ubuntu@YOUR_SERVER_IP
```

### 2. 执行一键部署脚本

复制以下完整命令到终端（一次性执行）：

```bash
# 更新系统并安装 Docker
curl -fsSL https://get.docker.com -o get-docker.sh && \
sudo sh get-docker.sh && \
sudo apt-get install -y docker-compose-plugin git && \

# 克隆项目
cd ~ && \
git clone https://github.com/xuyujie8786/vcard.git vcard-system && \
cd vcard-system && \

# 创建环境变量文件
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
DB_PASSWORD=CHANGE_THIS_SECURE_PASSWORD_123
DATABASE_URL=postgresql://vcard_user:CHANGE_THIS_SECURE_PASSWORD_123@database:5432/vcard_db

# ==================== Redis配置 ====================
REDIS_PASSWORD=CHANGE_THIS_REDIS_PASSWORD_123
REDIS_URL=redis://:CHANGE_THIS_REDIS_PASSWORD_123@redis:6379

# ==================== JWT配置 ====================
JWT_SECRET=CHANGE_THIS_JWT_SECRET_KEY_MUST_BE_AT_LEAST_64_CHARACTERS_LONG
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

echo "✅ 环境变量文件已创建"
echo "⚠️  请立即修改 .env 文件中的密码和密钥！"
```

### 3. 修改安全配置（重要！）

```bash
nano .env
```

**必须修改以下项：**
- `DB_PASSWORD` - 数据库密码
- `REDIS_PASSWORD` - Redis 密码
- `JWT_SECRET` - JWT 密钥（至少64字符）

按 `Ctrl+X`，然后 `Y`，然后 `Enter` 保存。

### 4. 启动服务

```bash
# 构建并启动所有服务
sudo docker-compose build --no-cache
sudo docker-compose up -d

# 查看服务状态
sudo docker-compose ps

# 查看日志（如果有问题）
sudo docker-compose logs -f backend
```

### 5. 初始化数据库

```bash
# 等待数据库启动（约30秒）
sleep 30

# 运行数据库迁移
sudo docker-compose exec backend npx prisma migrate deploy

# 创建初始管理员账户（可选）
sudo docker-compose exec backend node dist/scripts/createAdmin.js
```

### 6. 验证部署

访问以下地址：

- **前端**: http://YOUR_SERVER_IP:8000
- **后端API**: http://YOUR_SERVER_IP:3001/api/health
- **默认管理员账户**: admin / admin123

### 7. 配置防火墙

```bash
# Ubuntu UFW
sudo ufw allow 22/tcp
sudo ufw allow 8000/tcp
sudo ufw allow 3001/tcp
sudo ufw enable
```

## 🔧 常用命令

```bash
# 查看所有服务状态
sudo docker-compose ps

# 查看日志
sudo docker-compose logs -f [service-name]

# 重启服务
sudo docker-compose restart [service-name]

# 停止所有服务
sudo docker-compose down

# 完全清理并重新部署
sudo docker-compose down -v
sudo docker system prune -af
sudo docker-compose build --no-cache
sudo docker-compose up -d
```

## 📊 监控和维护

### 查看资源使用

```bash
# 查看Docker容器资源
sudo docker stats

# 查看磁盘空间
df -h

# 查看日志大小
du -sh ~/vcard-system/logs
```

### 备份数据库

```bash
# 手动备份
sudo docker-compose exec database pg_dump -U vcard_user vcard_db > backup_$(date +%Y%m%d).sql

# 恢复备份
cat backup_20240101.sql | sudo docker-compose exec -T database psql -U vcard_user vcard_db
```

## ⚠️ 故障排除

### 问题1: 服务启动失败

```bash
# 检查日志
sudo docker-compose logs backend
sudo docker-compose logs database

# 重启服务
sudo docker-compose restart
```

### 问题2: 数据库连接失败

```bash
# 检查数据库容器
sudo docker-compose exec database pg_isready -U vcard_user

# 检查环境变量
sudo docker-compose exec backend env | grep DATABASE
```

### 问题3: 端口被占用

```bash
# 查看端口占用
sudo netstat -tulpn | grep 3001
sudo netstat -tulpn | grep 8000

# 修改 .env 中的端口配置
nano .env
```

## 🔐 生产环境安全建议

1. **修改所有默认密码**
2. **使用强密码（至少16字符）**
3. **配置 HTTPS（使用 nginx + Let's Encrypt）**
4. **限制数据库端口访问（仅内网）**
5. **定期更新系统和 Docker 镜像**
6. **设置自动备份**
7. **启用日志轮转**

## 📞 技术支持

如遇问题，请提供：
1. 错误日志：`sudo docker-compose logs backend --tail=100`
2. 服务状态：`sudo docker-compose ps`
3. 系统信息：`uname -a` 和 `free -h`

---

最后更新：2024年12月

