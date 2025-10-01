# ✅ 虚拟卡系统部署检查清单

> **Git 仓库**: https://github.com/xuyujie8786/vcard.git  
> **分支**: main  
> **最新提交**: e4d619d - 📚 添加生产环境部署文档

---

## 📋 部署前检查（在服务器上执行）

### 1️⃣ 服务器基础环境

```bash
# 检查操作系统版本
cat /etc/os-release

# 检查 CPU 和内存
lscpu | grep "^CPU(s)"
free -h

# 检查磁盘空间
df -h

# 检查网络连通性
ping -c 3 google.com
curl -I https://openapi-hk.vccdaddy.com
```

**预期结果**:
- [ ] Ubuntu 20.04+ 或 Debian 11+
- [ ] 至少 2 核 CPU，4GB 内存
- [ ] 磁盘剩余 40GB+
- [ ] 可以访问外网和卡商 API

---

### 2️⃣ 安装必需软件

```bash
# 更新系统
sudo apt-get update && sudo apt-get upgrade -y

# 安装 Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh

# 安装 Docker Compose Plugin
sudo apt-get install -y docker-compose-plugin

# 安装 Git
sudo apt-get install -y git curl

# 验证安装
docker --version
docker compose version
git --version
```

**预期结果**:
- [ ] Docker 20.10+
- [ ] Docker Compose 2.0+
- [ ] Git 2.x

---

### 3️⃣ 克隆项目代码

```bash
# 切换到 home 目录
cd ~

# 克隆项目（使用 HTTPS）
git clone https://github.com/xuyujie8786/vcard.git vcard-system

# 进入项目目录
cd vcard-system

# 验证文件
ls -la

# 检查关键文件是否存在
test -f docker-compose.yml && echo "✅ docker-compose.yml 存在" || echo "❌ 缺少 docker-compose.yml"
test -f backend/Dockerfile && echo "✅ backend/Dockerfile 存在" || echo "❌ 缺少 backend/Dockerfile"
test -f v1/Dockerfile && echo "✅ v1/Dockerfile 存在" || echo "❌ 缺少 v1/Dockerfile"
test -f PRODUCTION_DEPLOYMENT_GUIDE.md && echo "✅ 部署文档存在" || echo "❌ 缺少部署文档"
```

**预期结果**:
- [ ] 项目成功克隆到 `~/vcard-system`
- [ ] 所有关键文件都存在

---

### 4️⃣ 配置环境变量

```bash
# 复制环境变量模板
cd ~/vcard-system
cp env.example .env

# 或使用自动生成脚本
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
DB_PASSWORD=$(openssl rand -hex 16)
DATABASE_URL=postgresql://vcard_user:$(openssl rand -hex 16)@database:5432/vcard_db

# ==================== Redis配置 ====================
REDIS_PASSWORD=$(openssl rand -hex 16)
REDIS_URL=redis://:$(openssl rand -hex 16)@redis:6379

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

# 验证环境变量
cat .env | grep -E "DB_PASSWORD|REDIS_PASSWORD|JWT_SECRET|CARD_PROVIDER"
```

**预期结果**:
- [ ] `.env` 文件已创建
- [ ] 所有密码和密钥已自动生成
- [ ] 卡商 API 配置正确

---

### 5️⃣ 修复已知问题（重要！）

```bash
cd ~/vcard-system

# 修复 backend/tsconfig.json
cat > backend/tsconfig.json << 'EOF'
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
EOF

# 修复 Dockerfile 中的 npm ci 问题
sed -i 's/RUN npm ci/RUN npm install/g' backend/Dockerfile
sed -i 's/RUN npm ci/RUN npm install/g' v1/Dockerfile

echo "✅ 配置修复完成"
```

**预期结果**:
- [ ] TypeScript 配置已修复
- [ ] Dockerfile 已修复

---

### 6️⃣ 构建和启动服务

```bash
cd ~/vcard-system

# 清理旧容器和镜像（如果有）
sudo docker compose down -v
sudo docker system prune -af

# 构建镜像（需要 10-15 分钟）
sudo docker compose build --no-cache

# 启动所有服务
sudo docker compose up -d

# 查看服务状态
sudo docker compose ps
```

**预期结果**:
- [ ] 所有镜像构建成功
- [ ] 4 个容器全部运行（database, redis, backend, frontend）
- [ ] 所有容器状态为 `Up` 或 `healthy`

---

### 7️⃣ 数据库初始化

```bash
cd ~/vcard-system

# 等待数据库完全启动
echo "等待数据库就绪..."
sleep 30

# 运行数据库迁移
sudo docker compose exec backend npx prisma migrate deploy

# 验证迁移状态
sudo docker compose exec backend npx prisma migrate status
```

**预期结果**:
- [ ] 数据库迁移成功执行
- [ ] 所有表已创建

---

### 8️⃣ 验证部署

```bash
# 检查服务状态
sudo docker compose ps

# 检查后端健康
curl http://localhost:3001/api/health

# 检查前端健康
curl http://localhost:8000/health

# 获取服务器公网 IP
SERVER_IP=$(curl -s ifconfig.me)
echo "🌐 访问地址："
echo "   前端：http://$SERVER_IP:8000"
echo "   后端API：http://$SERVER_IP:3001/api/health"
```

**预期结果**:
- [ ] 后端返回 `{"status":"ok"}`
- [ ] 前端返回 `healthy`
- [ ] 可以通过浏览器访问前端

---

### 9️⃣ 配置防火墙

```bash
# Ubuntu UFW
sudo ufw allow 22/tcp
sudo ufw allow 8000/tcp
sudo ufw allow 3001/tcp
sudo ufw enable

# 查看防火墙状态
sudo ufw status
```

**预期结果**:
- [ ] 防火墙已启用
- [ ] 端口 22, 8000, 3001 已开放

---

### 🔟 登录测试

```bash
# 方法 1: 使用 curl 测试登录
curl -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "username": "admin",
    "password": "admin123"
  }'

# 方法 2: 浏览器访问
echo "🌐 在浏览器打开: http://$(curl -s ifconfig.me):8000"
echo "👤 登录账号: admin / admin123"
```

**预期结果**:
- [ ] API 返回 token 和用户信息
- [ ] 可以在浏览器登录系统

---

## 🔍 部署后检查

### 检查日志

```bash
# 查看所有服务日志
sudo docker compose logs

# 查看后端日志
sudo docker compose logs -f backend

# 查看前端日志
sudo docker compose logs -f frontend

# 查看数据库日志
sudo docker compose logs database
```

### 检查定时任务

```bash
# 查看定时任务注册日志
sudo docker compose logs backend | grep "定时"

# 检查环境变量
sudo docker compose exec backend env | grep SYNC

# 检查容器时区
sudo docker compose exec backend date
```

**预期结果**:
- [ ] 看到 "定时同步调度器初始化完成" 日志
- [ ] 4 个定时任务已注册
- [ ] 容器时区为 Asia/Shanghai

---

## 🎯 功能测试清单

### 1. 用户登录
- [ ] 使用 admin/admin123 登录成功
- [ ] 修改默认密码成功
- [ ] 退出登录成功

### 2. 虚拟卡管理
- [ ] 创建虚拟卡成功
- [ ] 查看卡片详情成功
- [ ] 卡片充值成功
- [ ] 卡片提现成功
- [ ] 卡片冻结/激活成功

### 3. 交易账单
- [ ] 查看授权账单列表
- [ ] 查看结算账单列表
- [ ] 导出交易记录（Excel）

### 4. 用户管理
- [ ] 创建子用户成功
- [ ] 修改用户余额成功
- [ ] 查看余额日志成功

### 5. 定时同步
- [ ] 等待定时任务触发（01:00 或 13:00）
- [ ] 查看同步日志
- [ ] 验证数据同步成功

---

## 🚨 常见问题快速修复

### 问题 1: 容器启动失败

```bash
# 查看详细错误
sudo docker compose logs backend --tail=100

# 重新构建
sudo docker compose build --no-cache backend
sudo docker compose up -d
```

### 问题 2: 数据库连接失败

```bash
# 检查数据库
sudo docker compose exec database pg_isready -U vcard_user

# 重启数据库
sudo docker compose restart database
sleep 10
sudo docker compose restart backend
```

### 问题 3: 前端 502 错误

```bash
# 检查后端是否运行
curl http://localhost:3001/api/health

# 检查 nginx 配置
sudo docker compose exec frontend cat /etc/nginx/conf.d/default.conf

# 重启前端
sudo docker compose restart frontend
```

---

## 📊 部署完成总结

执行以下命令生成部署报告：

```bash
cd ~/vcard-system

echo "======================================"
echo "🎉 虚拟卡系统部署报告"
echo "======================================"
echo ""
echo "📦 Git 信息："
git log -1 --pretty=format:"   提交: %h - %s%n   作者: %an%n   时间: %ar%n"
echo ""
echo "🐳 Docker 服务状态："
sudo docker compose ps
echo ""
echo "🌐 访问地址："
echo "   前端：http://$(curl -s ifconfig.me):8000"
echo "   后端：http://$(curl -s ifconfig.me):3001/api/health"
echo ""
echo "👤 默认账号："
echo "   用户名：admin"
echo "   密码：admin123"
echo ""
echo "⚠️  安全提示："
echo "   1. 立即修改默认密码"
echo "   2. 配置 HTTPS（生产环境）"
echo "   3. 限制数据库端口访问"
echo "   4. 定期备份数据"
echo ""
echo "📚 文档位置："
echo "   ~/vcard-system/PRODUCTION_DEPLOYMENT_GUIDE.md"
echo ""
echo "======================================"
```

---

## 📞 获取帮助

如果遇到问题：

1. **查看详细日志**
   ```bash
   sudo docker compose logs > deployment_error.log
   ```

2. **收集系统信息**
   ```bash
   uname -a > system_info.txt
   free -h >> system_info.txt
   df -h >> system_info.txt
   sudo docker compose ps >> system_info.txt
   ```

3. **联系支持**
   - GitHub Issues: https://github.com/xuyujie8786/vcard/issues
   - 附上错误日志和系统信息

---

**最后更新**: 2024年12月  
**文档版本**: v1.0.0

