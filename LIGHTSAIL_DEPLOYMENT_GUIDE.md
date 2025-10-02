# 🚀 Lightsail 完整部署指南

> **虚拟卡管理系统** - 从零开始的生产环境部署

---

## 📋 目录

1. [准备工作](#准备工作)
2. [创建Lightsail实例](#创建lightsail实例)
3. [一键部署](#一键部署)
4. [验证部署](#验证部署)
5. [常见问题](#常见问题)
6. [安全加固](#安全加固)

---

## 📌 准备工作

### 1. 检查本地文件

确保以下文件存在：

```bash
vcard/
├── docker-compose.production.yml   # ✅ Docker编排文件
├── backend/Dockerfile.optimized    # ✅ 后端Dockerfile
├── v1/Dockerfile.optimized         # ✅ 前端Dockerfile
├── .env.production.new             # ✅ 环境配置（已生成）
└── deploy-to-lightsail-complete.sh # ✅ 一键部署脚本
```

### 2. 查看生成的密码

所有密码已自动生成（仅包含字母数字）：

```bash
# 查看环境配置
cat .env.production.new | grep PASSWORD
cat .env.production.new | grep SECRET
```

**重要密码（请记录）：**

- 数据库密码: `j4FcyddfkduL03q3FpT9yQO5blKoFC0b`
- Redis密码: `jZPqLlVMqwZeZ8lByXRBQZu4AYZlLJr4`
- 管理员密码: `k7LjrKOcHsHFtOIZ`
- 管理员邮箱: `admin@vcard.local`

---

## 🖥️ 创建Lightsail实例

### 步骤 1: 登录AWS Lightsail

访问: https://lightsail.aws.amazon.com/

### 步骤 2: 创建实例

**基础配置：**

| 选项 | 推荐配置 |
|------|---------|
| **实例位置** | 新加坡 (ap-southeast-1) |
| **操作系统** | Ubuntu 22.04 LTS |
| **实例套餐** | 2 GB RAM / 1 vCPU / 60 GB SSD （$10/月） |
| **实例名称** | vcard-production |

**网络配置：**

1. 创建静态IP地址
2. 将静态IP附加到实例
3. 记录IP地址（例如：`52.74.58.160`）

### 步骤 3: 配置防火墙规则

在Lightsail控制台 → 网络 → IPv4 防火墙 中添加：

| 应用 | 协议 | 端口范围 | 说明 |
|------|------|---------|------|
| SSH | TCP | 22 | 管理访问 |
| Custom | TCP | 8000 | 前端服务 |
| Custom | TCP | 3001 | 后端API |

### 步骤 4: 下载SSH密钥

1. 在Lightsail控制台 → 账户 → SSH密钥
2. 下载默认密钥（例如：`LightsailDefaultKey-ap-southeast-1.pem`）
3. 保存到 `~/.ssh/` 目录
4. 设置权限：

```bash
chmod 400 ~/.ssh/LightsailDefaultKey-ap-southeast-1.pem
```

---

## 🎯 一键部署

### 方法1：自动部署脚本（推荐）

```bash
# 在本地Mac上执行
cd ~/vcard

# 运行一键部署脚本（替换为你的服务器IP）
./deploy-to-lightsail-complete.sh 52.74.58.160
```

**脚本会自动完成：**

- ✅ 测试SSH连接
- ✅ 生成服务器专用配置（自动替换IP地址）
- ✅ 打包项目文件
- ✅ 上传到服务器
- ✅ 安装Docker和依赖
- ✅ 构建Docker镜像
- ✅ 启动所有服务
- ✅ 运行数据库迁移
- ✅ 验证部署结果

**部署时间：** 约 10-15 分钟

### 方法2：自定义SSH密钥路径

```bash
./deploy-to-lightsail-complete.sh 52.74.58.160 ~/.ssh/my-key.pem
```

---

## ✅ 验证部署

### 1. 检查服务状态

部署完成后，脚本会显示：

```
╔══════════════════════════════════════════╗
║          部署成功！                      ║
╚══════════════════════════════════════════╝

📌 访问信息
  前端地址: http://52.74.58.160:8000
  后端API:  http://52.74.58.160:3001/api

🔐 管理员账号
  邮箱:     admin@vcard.local
  密码:     k7LjrKOcHsHFtOIZ
```

### 2. 测试前端访问

在浏览器打开：

```
http://你的服务器IP:8000
```

应该看到登录页面。

### 3. 测试后端API

```bash
# 测试健康检查
curl http://你的服务器IP:3001/api/health

# 应该返回：
{"status":"healthy","timestamp":"..."}
```

### 4. 登录系统

使用管理员账号登录：

- **邮箱**: `admin@vcard.local`
- **密码**: `k7LjrKOcHsHFtOIZ`

**⚠️ 首次登录后，请立即修改密码！**

---

## 🛠️ 常用运维命令

### SSH登录服务器

```bash
ssh -i ~/.ssh/LightsailDefaultKey-ap-southeast-1.pem ubuntu@你的服务器IP
```

### 查看服务状态

```bash
cd /home/ubuntu/vcard
sudo docker compose -f docker-compose.production.yml ps
```

### 查看服务日志

```bash
# 查看所有服务日志
sudo docker compose -f docker-compose.production.yml logs -f

# 只查看后端日志
sudo docker compose -f docker-compose.production.yml logs -f backend

# 只查看前端日志
sudo docker compose -f docker-compose.production.yml logs -f frontend

# 只查看数据库日志
sudo docker compose -f docker-compose.production.yml logs -f database
```

### 重启服务

```bash
cd /home/ubuntu/vcard

# 重启所有服务
sudo docker compose -f docker-compose.production.yml restart

# 重启单个服务
sudo docker compose -f docker-compose.production.yml restart backend
```

### 停止服务

```bash
cd /home/ubuntu/vcard
sudo docker compose -f docker-compose.production.yml down
```

### 更新部署

```bash
# 在本地Mac上执行
./deploy-to-lightsail-complete.sh 你的服务器IP
```

### 备份数据库

```bash
# SSH登录服务器后执行
cd /home/ubuntu/vcard
sudo docker exec vcard-postgres pg_dump -U vcard_user vcard_db > backup_$(date +%Y%m%d).sql
```

### 恢复数据库

```bash
# SSH登录服务器后执行
cd /home/ubuntu/vcard
cat backup_20251002.sql | sudo docker exec -i vcard-postgres psql -U vcard_user vcard_db
```

---

## ❓ 常见问题

### Q1: 部署脚本提示 "SSH连接失败"

**原因：**
- SSH密钥路径错误
- 服务器IP地址错误
- 防火墙未开放22端口

**解决：**

```bash
# 1. 检查SSH密钥权限
chmod 400 ~/.ssh/LightsailDefaultKey-ap-southeast-1.pem

# 2. 手动测试SSH连接
ssh -i ~/.ssh/LightsailDefaultKey-ap-southeast-1.pem ubuntu@你的服务器IP

# 3. 检查Lightsail防火墙规则
```

### Q2: 前端页面无法访问

**原因：**
- 防火墙未开放8000端口
- Docker容器未启动
- Nginx配置错误

**解决：**

```bash
# 1. 检查容器状态
sudo docker compose -f docker-compose.production.yml ps

# 2. 查看前端日志
sudo docker compose -f docker-compose.production.yml logs frontend

# 3. 重启前端服务
sudo docker compose -f docker-compose.production.yml restart frontend

# 4. 测试端口
curl http://localhost:8000/health
```

### Q3: 后端API返回500错误

**原因：**
- 数据库连接失败
- 环境变量配置错误
- Prisma客户端未生成

**解决：**

```bash
# 1. 检查后端日志
sudo docker compose -f docker-compose.production.yml logs backend

# 2. 检查数据库状态
sudo docker compose -f docker-compose.production.yml ps database

# 3. 重新运行数据库迁移
sudo docker exec vcard-backend npx prisma generate
sudo docker exec vcard-backend npx prisma migrate deploy

# 4. 重启后端
sudo docker compose -f docker-compose.production.yml restart backend
```

### Q4: 登录失败

**原因：**
- 管理员账号未创建
- 密码错误
- 数据库迁移未完成

**解决：**

```bash
# 1. 查看环境配置中的管理员密码
cat /home/ubuntu/vcard/.env.production | grep ADMIN

# 2. 检查用户表
sudo docker exec -it vcard-postgres psql -U vcard_user vcard_db -c "SELECT * FROM users;"

# 3. 如果没有用户，手动创建（联系开发人员）
```

### Q5: Docker构建失败

**原因：**
- 内存不足
- 网络问题
- 依赖下载失败

**解决：**

```bash
# 1. 清理Docker缓存
sudo docker system prune -a -f

# 2. 增加交换空间
sudo fallocate -l 2G /swapfile
sudo chmod 600 /swapfile
sudo mkswap /swapfile
sudo swapon /swapfile

# 3. 重新部署
./deploy-to-lightsail-complete.sh 你的服务器IP
```

---

## 🛡️ 安全加固

### 1. 修改默认管理员密码

首次登录后：

1. 点击右上角头像 → 安全设置
2. 修改密码
3. 启用双因素认证（2FA）

### 2. 配置防火墙

```bash
# SSH登录服务器
ssh -i ~/.ssh/LightsailDefaultKey-ap-southeast-1.pem ubuntu@你的服务器IP

# 安装UFW防火墙
sudo apt-get update
sudo apt-get install -y ufw

# 配置规则
sudo ufw default deny incoming
sudo ufw default allow outgoing
sudo ufw allow 22/tcp    # SSH
sudo ufw allow 8000/tcp  # 前端
sudo ufw allow 3001/tcp  # 后端

# 启用防火墙
sudo ufw enable

# 检查状态
sudo ufw status
```

### 3. 启用HTTPS（可选）

使用Nginx反向代理 + Let's Encrypt：

```bash
# 安装Nginx和Certbot
sudo apt-get install -y nginx certbot python3-certbot-nginx

# 配置域名（假设你有域名 vcard.example.com）
sudo certbot --nginx -d vcard.example.com

# Certbot会自动配置HTTPS
```

### 4. 设置自动备份

```bash
# 创建备份脚本
cat > /home/ubuntu/backup.sh << 'EOF'
#!/bin/bash
BACKUP_DIR="/home/ubuntu/backups"
mkdir -p $BACKUP_DIR
FILENAME="vcard_backup_$(date +%Y%m%d_%H%M%S).sql"
sudo docker exec vcard-postgres pg_dump -U vcard_user vcard_db > $BACKUP_DIR/$FILENAME
# 只保留最近7天的备份
find $BACKUP_DIR -name "vcard_backup_*.sql" -mtime +7 -delete
EOF

chmod +x /home/ubuntu/backup.sh

# 添加到crontab（每天凌晨2点备份）
crontab -e
# 添加：
0 2 * * * /home/ubuntu/backup.sh
```

### 5. 监控系统资源

```bash
# 安装htop
sudo apt-get install -y htop

# 查看系统资源
htop

# 查看Docker资源使用
sudo docker stats
```

---

## 📊 系统要求

### 最低配置

- **CPU**: 1 核心
- **内存**: 2 GB
- **存储**: 40 GB SSD
- **带宽**: 2 TB/月

### 推荐配置

- **CPU**: 2 核心
- **内存**: 4 GB
- **存储**: 80 GB SSD
- **带宽**: 4 TB/月

---

## 🎓 学习资源

- [Docker官方文档](https://docs.docker.com/)
- [Lightsail文档](https://lightsail.aws.amazon.com/ls/docs)
- [Prisma文档](https://www.prisma.io/docs)
- [Nginx配置指南](https://nginx.org/en/docs/)

---

## 📞 技术支持

如有问题，请：

1. 查看日志：`sudo docker compose logs`
2. 检查本文档的常见问题
3. 联系开发团队

---

## ✅ 部署检查清单

部署前：

- [ ] 已创建Lightsail实例
- [ ] 已配置静态IP
- [ ] 已开放防火墙端口（22, 8000, 3001）
- [ ] 已下载SSH密钥
- [ ] 已记录管理员密码

部署后：

- [ ] 前端可以访问（http://IP:8000）
- [ ] 后端健康检查通过（http://IP:3001/api/health）
- [ ] 可以登录系统
- [ ] 已修改管理员密码
- [ ] 已设置自动备份
- [ ] 已配置防火墙

---

**祝部署顺利！** 🎉


