# 虚拟卡管理系统 - Docker 完整部署计划

## 📋 部署计划概览

### 部署目标
将虚拟卡管理系统通过Docker容器化部署到生产环境，实现：
- ✅ 高可用性和稳定性
- ✅ 易于维护和扩展
- ✅ 安全可靠的数据存储
- ✅ 完善的监控和日志

### 部署架构

```
┌─────────────────────────────────────────────────────┐
│                    Docker Host                       │
│  ┌─────────────────────────────────────────────┐   │
│  │          vcard-network (172.20.0.0/16)      │   │
│  │                                             │   │
│  │  ┌──────────────┐    ┌──────────────┐     │   │
│  │  │  Frontend    │    │   Backend    │     │   │
│  │  │  (Nginx)     │───▶│  (Node.js)   │     │   │
│  │  │  :80         │    │  :3001       │     │   │
│  │  │ 172.20.0.5   │    │ 172.20.0.4   │     │   │
│  │  └──────────────┘    └──────┬───────┘     │   │
│  │                              │             │   │
│  │         ┌────────────────────┴─────┐       │   │
│  │         ▼                          ▼       │   │
│  │  ┌──────────────┐          ┌──────────┐   │   │
│  │  │  PostgreSQL  │          │  Redis   │   │   │
│  │  │   :5432      │          │  :6379   │   │   │
│  │  │ 172.20.0.2   │          │172.20.0.3│   │   │
│  │  └──────────────┘          └──────────┘   │   │
│  └─────────────────────────────────────────────┘   │
│                                                     │
│  Volumes:                                          │
│  - postgres_data  (数据库持久化)                  │
│  - redis_data     (缓存持久化)                    │
│  - backend_logs   (后端日志)                      │
│  - nginx_logs     (访问日志)                      │
└─────────────────────────────────────────────────────┘
```

---

## 🔍 代码分析总结

### 项目结构
```
vcard/
├── backend/                 # Node.js后端
│   ├── src/                # TypeScript源码
│   ├── prisma/             # 数据库Schema
│   ├── Dockerfile.optimized # 优化的Docker构建
│   └── package.json
│
├── v1/                      # React前端  
│   ├── src/                # 前端源码
│   ├── config/             # UmiJS配置
│   ├── Dockerfile.optimized # 优化的Docker构建
│   └── nginx.conf          # Nginx配置
│
├── docker-compose.production.yml  # 生产环境编排
├── env.production.example         # 环境变量模板
├── deploy-production.sh           # 一键部署脚本
├── health-check.sh               # 健康检查脚本
└── 文档/
    ├── DOCKER_DEPLOYMENT_GUIDE.md      # 详细部署指南
    └── DEPLOYMENT_QUICK_REFERENCE.md   # 快速参考
```

### 技术栈确认

| 层级 | 技术 | 版本 | 说明 |
|------|------|------|------|
| **前端** | React | 19.1.1 | UI框架 |
| | Ant Design Pro | 6.0 | 组件库 |
| | UmiJS | 4.3.24 | 应用框架 |
| | TypeScript | 5.6.3 | 类型系统 |
| **后端** | Node.js | 20 | 运行时 |
| | Express | Latest | Web框架 |
| | TypeScript | Latest | 类型系统 |
| | Prisma | 5.22 | ORM |
| **数据库** | PostgreSQL | 15-alpine | 关系数据库 |
| **缓存** | Redis | 7-alpine | 缓存/会话 |
| **容器** | Docker | Latest | 容器化 |
| | Docker Compose | Latest | 编排工具 |

### 发现并修复的问题

#### ✅ 已修复问题
1. **Prisma Schema不一致**
   - 问题: `two_fa_backup_codes`字段类型不匹配
   - 修复: 从`Json`改为`String @db.Text`

2. **Docker构建优化**
   - 创建了优化的Dockerfile
   - 实现多阶段构建
   - 减小镜像体积

3. **前端构建污染**
   - 添加`.dockerignore`防止后端代码进入前端镜像
   - 优化构建上下文

4. **环境变量管理**
   - 创建完整的`.env`模板
   - 明确必须修改的配置项

---

## 📦 部署文件清单

### 新创建的文件

#### 1. Docker配置文件
- ✅ `backend/Dockerfile.optimized` - 后端优化Dockerfile
- ✅ `v1/Dockerfile.optimized` - 前端优化Dockerfile  
- ✅ `docker-compose.production.yml` - 生产环境编排配置
- ✅ `.dockerignore` - 根目录Docker忽略
- ✅ `backend/.dockerignore` - 后端Docker忽略
- ✅ `v1/.dockerignore` - 前端Docker忽略

#### 2. 环境配置
- ✅ `env.production.example` - 生产环境变量模板

#### 3. 部署脚本
- ✅ `deploy-production.sh` - 一键部署脚本
- ✅ `health-check.sh` - 健康检查脚本

#### 4. 文档
- ✅ `DOCKER_DEPLOYMENT_GUIDE.md` - 详细部署指南（58KB）
- ✅ `DEPLOYMENT_QUICK_REFERENCE.md` - 快速参考（16KB）
- ✅ `DOCKER_部署计划.md` - 本文档

### 修改的文件
- ✅ `backend/prisma/schema.prisma` - 修复字段类型

---

## 🚀 部署步骤

### 第一阶段：环境准备（5分钟）

1. **检查服务器环境**
   ```bash
   # 操作系统
   cat /etc/os-release
   
   # 资源检查
   free -h        # 内存≥4GB
   df -h          # 硬盘≥50GB
   nproc          # CPU≥2核
   ```

2. **安装Docker**
   ```bash
   # Ubuntu/Debian
   curl -fsSL https://get.docker.com | sh
   sudo systemctl start docker
   sudo systemctl enable docker
   
   # 验证
   docker --version
   docker compose version
   ```

### 第二阶段：代码部署（3分钟）

3. **上传代码**
   ```bash
   # 方式1: Git克隆
   git clone <repository> /opt/vcard
   
   # 方式2: SCP上传
   scp vcard.tar.gz server:/opt/
   tar -xzf vcard.tar.gz
   
   cd /opt/vcard
   ```

4. **配置环境变量**
   ```bash
   # 复制模板
   cp env.production.example .env.production
   
   # 编辑配置
   vim .env.production
   
   # 必须修改:
   # - DB_PASSWORD（数据库密码）
   # - REDIS_PASSWORD（Redis密码）
   # - JWT_SECRET（JWT密钥，64位）
   # - CARD_PROVIDER_TOKEN（卡商Token）
   # - CARD_PROVIDER_AES_KEY（AES密钥）
   # - CORS_ORIGIN（前端域名）
   ```

### 第三阶段：执行部署（10分钟）

5. **运行部署脚本**
   ```bash
   # 给脚本执行权限
   chmod +x deploy-production.sh
   chmod +x health-check.sh
   
   # 执行部署
   ./deploy-production.sh
   ```

   **脚本会自动完成:**
   - ✅ 检查系统依赖
   - ✅ 验证环境变量
   - ✅ 备份现有数据库
   - ✅ 停止旧容器
   - ✅ 构建Docker镜像
   - ✅ 启动所有服务
   - ✅ 等待服务就绪
   - ✅ 运行数据库迁移
   - ✅ 显示服务状态

### 第四阶段：验证部署（5分钟）

6. **健康检查**
   ```bash
   # 运行健康检查脚本
   ./health-check.sh
   
   # 手动验证各服务
   curl http://localhost:3001/api/health  # 后端
   curl http://localhost:8000/health      # 前端
   
   # 检查容器状态
   docker-compose -f docker-compose.production.yml ps
   ```

7. **访问测试**
   ```bash
   # 在浏览器访问
   http://<服务器IP>:8000
   
   # 或使用域名（如已配置DNS）
   https://vcard.yourdomain.com
   ```

---

## ⚙️ 关键配置说明

### Docker Compose配置要点

#### 网络隔离
```yaml
networks:
  vcard-network:
    driver: bridge
    ipam:
      config:
        - subnet: 172.20.0.0/16
```
- 所有容器在独立网络中
- 固定IP便于内部通信

#### 端口映射策略
```yaml
# 数据库和Redis只绑定本地
ports:
  - "127.0.0.1:5432:5432"  # 不对外暴露
  - "127.0.0.1:6379:6379"  # 不对外暴露

# 前端对外暴露
ports:
  - "8000:80"              # 公网可访问
```

#### 资源限制
```yaml
deploy:
  resources:
    limits:
      cpus: '2'
      memory: 2G
    reservations:
      cpus: '1'
      memory: 512M
```

#### 健康检查
```yaml
healthcheck:
  test: ["CMD-SHELL", "curl -f http://localhost:3001/api/health || exit 1"]
  interval: 30s
  timeout: 10s
  retries: 3
  start_period: 60s
```

### 环境变量关键配置

#### 必须修改（安全）
```env
DB_PASSWORD=<strong-password>          # ≥16位
REDIS_PASSWORD=<strong-password>       # ≥16位
JWT_SECRET=<64-char-secret>            # ≥64位
CARD_PROVIDER_TOKEN=<actual-token>     # 从卡商获取
CARD_PROVIDER_AES_KEY=<aes-key>        # 从卡商获取
```

#### 建议修改（生产）
```env
CORS_ORIGIN=https://vcard.yourdomain.com  # 具体域名
LOG_LEVEL=info                            # info或warn
FRONTEND_PORT=8000                        # 根据需要
```

#### 可选配置
```env
# 定时任务
SYNC_ENABLED=true
SYNC_AUTH_PREVIOUS_CRON=0 1 * * *

# 邮件通知
SMTP_HOST=smtp.gmail.com
SMTP_USER=your_email@gmail.com
```

---

## 🔒 安全加固清单

### 系统层面
- [x] 配置防火墙，只开放8000端口
- [x] 禁用root直接登录
- [x] 使用SSH密钥认证
- [x] 定期更新系统补丁

### Docker层面
- [x] 容器以非root用户运行
- [x] 数据库和Redis不对外暴露
- [x] 使用Docker secrets管理敏感信息（可选）
- [x] 定期更新镜像

### 应用层面
- [x] 使用强密码（≥16位）
- [x] JWT密钥足够长（≥64位）
- [x] 启用CORS白名单
- [x] API限流保护
- [x] 日志脱敏

### 网络层面
- [ ] 配置SSL/TLS证书（推荐Let's Encrypt）
- [ ] 使用Nginx反向代理
- [ ] 启用HTTP/2
- [ ] 配置安全响应头

---

## 📊 监控和维护

### 日常监控
```bash
# 每天运行
./health-check.sh

# 查看资源使用
docker stats

# 查看日志
docker-compose -f docker-compose.production.yml logs -f
```

### 定期维护

#### 每周任务
```bash
# 1. 备份数据库
docker exec vcard-postgres pg_dump -U vcard_user vcard_db > \
  backup_$(date +%Y%m%d).dump

# 2. 清理日志
docker-compose -f docker-compose.production.yml logs --tail=1000 > /dev/null

# 3. 清理Docker资源
docker system prune -f
```

#### 每月任务
```bash
# 1. 更新系统
sudo apt update && sudo apt upgrade -y

# 2. 检查磁盘空间
df -h

# 3. 审计日志
docker-compose -f docker-compose.production.yml logs | grep -i error
```

---

## 🆘 故障处理流程

### 1. 容器启动失败
```bash
# 步骤1: 查看日志
docker-compose -f docker-compose.production.yml logs <service>

# 步骤2: 检查配置
source .env.production
env | grep -E "(DB|REDIS|JWT)"

# 步骤3: 重新构建
docker-compose -f docker-compose.production.yml build --no-cache
docker-compose -f docker-compose.production.yml up -d
```

### 2. 数据库连接失败
```bash
# 步骤1: 检查容器
docker ps | grep postgres

# 步骤2: 测试连接
docker exec -it vcard-postgres psql -U vcard_user -d vcard_db

# 步骤3: 检查网络
docker exec vcard-backend ping database
```

### 3. API请求失败
```bash
# 步骤1: 检查后端健康
curl http://localhost:3001/api/health

# 步骤2: 检查Nginx配置
docker exec vcard-frontend nginx -t

# 步骤3: 查看错误日志
docker logs vcard-backend
```

---

## 🔄 更新和回滚

### 更新流程
```bash
# 1. 备份
./health-check.sh
docker exec vcard-postgres pg_dump -U vcard_user vcard_db > backup_before_update.dump

# 2. 拉取代码
git pull

# 3. 重新部署
./deploy-production.sh

# 4. 验证
./health-check.sh
```

### 回滚流程
```bash
# 1. 停止服务
docker-compose -f docker-compose.production.yml down

# 2. 恢复代码
git checkout <previous-commit>

# 3. 恢复数据（如需要）
docker exec -i vcard-postgres psql -U vcard_user vcard_db < backup_before_update.dump

# 4. 重新部署
./deploy-production.sh
```

---

## 📈 性能优化建议

### 数据库优化
```env
# 增加连接池
DATABASE_URL=postgresql://user:pass@host:5432/db?connection_limit=50&pool_timeout=30
```

### Redis优化
```bash
# 调整内存策略
maxmemory 1gb
maxmemory-policy allkeys-lru
```

### Nginx优化
```nginx
# 启用缓存
proxy_cache_path /var/cache/nginx levels=1:2 keys_zone=my_cache:10m;

# 启用Gzip
gzip_comp_level 6;
```

### 应用优化
- 使用CDN加速静态资源
- 启用数据库查询缓存
- 实现API响应缓存
- 优化数据库索引

---

## ✅ 部署检查清单

### 部署前
- [ ] 服务器资源满足要求
- [ ] Docker已正确安装
- [ ] 代码已上传到服务器
- [ ] 环境变量已配置
- [ ] 防火墙已配置
- [ ] SSL证书已准备（可选）

### 部署中
- [ ] 部署脚本执行成功
- [ ] 所有容器启动正常
- [ ] 数据库迁移完成
- [ ] 健康检查通过

### 部署后
- [ ] 前端页面可访问
- [ ] API接口正常
- [ ] 登录功能正常
- [ ] 主要业务流程测试通过
- [ ] 日志正常输出
- [ ] 监控正常运行

---

## 📚 相关文档

1. **DOCKER_DEPLOYMENT_GUIDE.md** - 详细的部署指南
   - 完整的部署步骤
   - 故障排查方法
   - 安全加固指南
   - 性能优化建议

2. **DEPLOYMENT_QUICK_REFERENCE.md** - 快速参考
   - 常用命令速查
   - 配置快速参考
   - 故障排查速查

3. **PRODUCTION_DEPLOYMENT_GUIDE.md** - 生产部署指南
   - 生产环境架构
   - 监控和日志
   - 备份恢复

---

## 🎯 部署时间估算

| 阶段 | 任务 | 预估时间 |
|------|------|----------|
| 1 | 环境准备 | 5分钟 |
| 2 | 代码部署 | 3分钟 |
| 3 | 执行部署 | 10分钟 |
| 4 | 验证测试 | 5分钟 |
| **总计** | | **约25分钟** |

*注：首次部署可能需要更长时间，因为需要下载Docker镜像*

---

## 📞 技术支持

### 问题反馈
- GitHub Issues: <repository-url>/issues
- Email: support@example.com

### 紧急联系
- 运维团队: +86-xxx-xxxx-xxxx
- 技术经理: +86-xxx-xxxx-xxxx

---

## 🎉 部署成功标志

✅ 所有容器健康运行  
✅ 前端页面正常访问  
✅ API接口响应正常  
✅ 数据库连接正常  
✅ Redis缓存工作正常  
✅ 定时任务配置完成  
✅ 日志正常输出  
✅ 监控正常运行  

**恭喜！系统已成功部署到生产环境！** 🚀

---

*最后更新: 2025-10-01*

