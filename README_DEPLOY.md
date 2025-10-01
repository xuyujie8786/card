# 🚀 虚拟卡管理系统 - 部署完全指南

> **项目状态**: ✅ 已准备就绪，可以立即部署  
> **仓库地址**: https://github.com/xuyujie8786/vcard.git  
> **部署方式**: 一键自动化部署脚本

---

## 📋 部署前准备

### 1. 服务器要求
- **操作系统**: Ubuntu 20.04+ / Debian 10+
- **CPU**: 至少 2 核
- **内存**: 至少 4GB
- **磁盘**: 至少 20GB 可用空间
- **网络**: 开放端口 8000 和 3001

### 2. 准备工作
```bash
# 确保你有服务器的 root 或 sudo 权限
ssh ubuntu@YOUR_SERVER_IP

# 确保服务器可以访问 GitHub
ping github.com
```

---

## 🎯 方法一：一键自动部署（推荐）⭐

### 步骤 1: 连接服务器
```bash
ssh ubuntu@YOUR_SERVER_IP
```

### 步骤 2: 下载并执行部署脚本
```bash
# 下载部署脚本
wget https://raw.githubusercontent.com/xuyujie8786/vcard/main/server-deploy.sh

# 赋予执行权限
chmod +x server-deploy.sh

# 执行部署（需要 sudo）
sudo ./server-deploy.sh
```

**就这么简单！** 🎉 脚本会自动完成所有配置和部署工作。

部署过程约 15-20 分钟，脚本会自动：
- ✅ 检查并安装 Docker
- ✅ 克隆项目代码
- ✅ 生成安全配置文件
- ✅ 修复已知问题
- ✅ 构建 Docker 镜像
- ✅ 启动所有服务
- ✅ 初始化数据库

### 步骤 3: 验证部署
部署完成后，访问：
```
前端：http://YOUR_SERVER_IP:8000
后端：http://YOUR_SERVER_IP:8000/api/health
```

默认管理员账号：
- 用户名: `admin`
- 密码: `admin123`

⚠️ **请立即登录并修改默认密码！**

---

## 🔧 方法二：手动分步部署

如果你想更精细地控制部署过程，参考 [PRODUCTION_DEPLOYMENT_GUIDE.md](./PRODUCTION_DEPLOYMENT_GUIDE.md)

---

## 📊 部署后管理

### 常用命令
```bash
# 进入项目目录
cd ~/vcard-system

# 查看服务状态
sudo docker compose ps

# 查看后端日志
sudo docker compose logs -f backend

# 查看所有服务日志
sudo docker compose logs -f

# 重启服务
sudo docker compose restart

# 停止服务
sudo docker compose down

# 启动服务
sudo docker compose up -d
```

### 数据库管理
```bash
# 进入数据库
sudo docker compose exec database psql -U vcard_user -d vcard_db

# 备份数据库
sudo docker compose exec database pg_dump -U vcard_user vcard_db > backup_$(date +%Y%m%d).sql

# 恢复数据库
cat backup.sql | sudo docker compose exec -T database psql -U vcard_user -d vcard_db
```

---

## 🔒 安全配置

### 1. 配置防火墙
```bash
# 安装 UFW
sudo apt-get install -y ufw

# 允许 SSH（重要！）
sudo ufw allow 22/tcp

# 允许应用端口
sudo ufw allow 8000/tcp
sudo ufw allow 3001/tcp

# 启用防火墙
sudo ufw enable

# 查看状态
sudo ufw status
```

### 2. 修改默认密码
1. 登录系统：http://YOUR_SERVER_IP:8000
2. 使用默认账号：admin / admin123
3. 进入「个人设置」修改密码

### 3. 配置 HTTPS（可选但推荐）
参考 [PRODUCTION_DEPLOYMENT_GUIDE.md](./PRODUCTION_DEPLOYMENT_GUIDE.md) 的 Nginx + SSL 配置章节

---

## 🆘 故障排查

### 问题 1: 服务无法启动
```bash
# 查看详细日志
sudo docker compose logs backend --tail=100

# 检查端口占用
sudo netstat -tulpn | grep -E '8000|3001|5432|6379'

# 重新构建
sudo docker compose down -v
sudo docker compose build --no-cache
sudo docker compose up -d
```

### 问题 2: 数据库连接失败
```bash
# 检查数据库状态
sudo docker compose exec database pg_isready -U vcard_user

# 查看数据库日志
sudo docker compose logs database

# 重新初始化
sudo docker compose exec backend npx prisma migrate deploy
```

### 问题 3: 前端 404 错误
```bash
# 检查前端服务
curl http://localhost:8000/health

# 查看前端日志
sudo docker compose logs frontend

# 重启前端
sudo docker compose restart frontend
```

---

## 📚 相关文档

| 文档 | 说明 |
|------|------|
| [PRODUCTION_DEPLOYMENT_GUIDE.md](./PRODUCTION_DEPLOYMENT_GUIDE.md) | 完整的生产环境部署指南 |
| [DEPLOYMENT_CHECKLIST.md](./DEPLOYMENT_CHECKLIST.md) | 部署检查清单 |
| [DEPLOY_NOW.md](./DEPLOY_NOW.md) | 快速部署指令卡 |
| [server-deploy.sh](./server-deploy.sh) | 一键部署脚本 |

---

## 🎯 快速参考

### 系统访问
- 前端: `http://YOUR_SERVER_IP:8000`
- 后端 API: `http://YOUR_SERVER_IP:3001`
- 健康检查: `http://YOUR_SERVER_IP:3001/api/health`

### 默认账号
- 用户名: `admin`
- 密码: `admin123`

### 项目目录
```
~/vcard-system/          # 主项目目录
├── backend/            # 后端代码
├── v1/                 # 前端代码
├── docker-compose.yml  # Docker 编排文件
├── .env               # 环境变量配置
└── logs/              # 日志目录
```

### 环境变量位置
```bash
# 查看配置
cat ~/vcard-system/.env

# 编辑配置
nano ~/vcard-system/.env

# 重启服务使配置生效
cd ~/vcard-system
sudo docker compose restart
```

---

## 🔄 更新部署

### 更新代码
```bash
cd ~/vcard-system
git pull origin main
sudo docker compose build
sudo docker compose up -d
sudo docker compose exec backend npx prisma migrate deploy
```

### 回滚版本
```bash
cd ~/vcard-system
git checkout <commit-hash>
sudo docker compose build
sudo docker compose up -d
```

---

## 📞 获取帮助

- 📧 技术支持: [提交 Issue](https://github.com/xuyujie8786/vcard/issues)
- 📖 API 文档: 见项目 `卡商API.md`
- 🔧 常见问题: 见 [DEPLOYMENT_CHECKLIST.md](./DEPLOYMENT_CHECKLIST.md)

---

**准备好了吗？现在就开始部署！** 🚀

```bash
wget https://raw.githubusercontent.com/xuyujie8786/vcard/main/server-deploy.sh && chmod +x server-deploy.sh && sudo ./server-deploy.sh
```

**一行命令，完成部署！** ✨

