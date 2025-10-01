# 🚀 立即部署 - 快速指令卡

> **仓库地址**: https://github.com/xuyujie8786/vcard.git  
> **最新提交**: eb40f69 - 🚀 添加服务器端一键部署脚本  
> **部署时间**: 约 15-20 分钟

---

## 方法一：使用一键部署脚本（推荐）⭐

### 在服务器上执行以下命令：

```bash
# 下载并执行一键部署脚本
wget https://raw.githubusercontent.com/xuyujie8786/vcard/main/server-deploy.sh
chmod +x server-deploy.sh
sudo ./server-deploy.sh
```

**就这么简单！** 脚本会自动：
- ✅ 检查系统环境
- ✅ 安装 Docker 和依赖
- ✅ 克隆项目代码
- ✅ 生成安全配置
- ✅ 修复已知问题
- ✅ 构建并启动服务
- ✅ 初始化数据库

---

## 方法二：手动分步部署

### 步骤 1: SSH 连接服务器

```bash
ssh ubuntu@YOUR_SERVER_IP
```

### 步骤 2: 安装 Docker

```bash
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh
sudo apt-get install -y docker-compose-plugin
```

### 步骤 3: 克隆项目

```bash
cd ~
git clone https://github.com/xuyujie8786/vcard.git vcard-system
cd vcard-system
```

### 步骤 4: 配置环境变量

```bash
cat > .env << 'EOF'
NODE_ENV=production
TZ=Asia/Shanghai
FRONTEND_PORT=8000
BACKEND_PORT=3001
DB_NAME=vcard_db
DB_USER=vcard_user
DB_PASSWORD=$(openssl rand -hex 16)
DATABASE_URL=postgresql://vcard_user:$(openssl rand -hex 16)@database:5432/vcard_db
REDIS_PASSWORD=$(openssl rand -hex 16)
REDIS_URL=redis://:$(openssl rand -hex 16)@redis:6379
JWT_SECRET=$(openssl rand -base64 64)
JWT_EXPIRES_IN=7d
CARD_PROVIDER_TOKEN=w5Epkw0M257ocOwB
CARD_PROVIDER_URL=https://openapi-hk.vccdaddy.com
CARD_PROVIDER_AES_KEY=eoC31VaznV1ZBG6T
SYNC_ENABLED=true
SYNC_AUTH_PREVIOUS_CRON=0 1 * * *
SYNC_AUTH_CURRENT_CRON=0 13 * * *
SYNC_SETTLE_PREVIOUS_CRON=30 1 * * *
SYNC_SETTLE_CURRENT_CRON=30 13 * * *
EOF
```

### 步骤 5: 修复配置（重要！）

```bash
# 修复 TypeScript 配置
cat > backend/tsconfig.json << 'EOF'
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "commonjs",
    "strict": false,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "outDir": "./dist",
    "rootDir": "./src"
  }
}
EOF

# 修复 Dockerfile
sed -i 's/RUN npm ci/RUN npm install/g' backend/Dockerfile
sed -i 's/RUN npm ci/RUN npm install/g' v1/Dockerfile
```

### 步骤 6: 构建并启动

```bash
sudo docker compose build --no-cache
sudo docker compose up -d
sleep 30
sudo docker compose exec backend npx prisma migrate deploy
```

### 步骤 7: 验证部署

```bash
sudo docker compose ps
curl http://localhost:3001/api/health
curl http://localhost:8000/health
```

---

## 📊 部署完成后

### 访问系统

```
前端：http://YOUR_SERVER_IP:8000
后端：http://YOUR_SERVER_IP:3001/api/health

默认账号：admin / admin123
```

### 常用命令

```bash
# 查看日志
cd ~/vcard-system
sudo docker compose logs -f backend

# 重启服务
sudo docker compose restart

# 停止服务
sudo docker compose down

# 启动服务
sudo docker compose up -d

# 查看服务状态
sudo docker compose ps
```

---

## ⚠️ 重要提醒

1. **立即修改默认密码！**
2. **配置防火墙**：
   ```bash
   sudo ufw allow 22/tcp
   sudo ufw allow 8000/tcp
   sudo ufw enable
   ```
3. **定期备份数据库**：
   ```bash
   sudo docker compose exec database pg_dump -U vcard_user vcard_db > backup.sql
   ```

---

## 🆘 遇到问题？

### 查看详细日志

```bash
sudo docker compose logs backend --tail=100
```

### 重新部署

```bash
cd ~/vcard-system
sudo docker compose down -v
sudo docker compose build --no-cache
sudo docker compose up -d
```

### 获取帮助

- 📚 详细文档：`PRODUCTION_DEPLOYMENT_GUIDE.md`
- ✅ 检查清单：`DEPLOYMENT_CHECKLIST.md`
- 🐛 GitHub Issues: https://github.com/xuyujie8786/vcard/issues

---

**准备好了吗？立即开始部署！** 🚀

