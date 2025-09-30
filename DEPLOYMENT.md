# 🚀 虚拟卡管理系统部署指南

## 📋 目录
- [系统要求](#系统要求)
- [AWS Lightsail 一键部署](#aws-lightsail-一键部署)
- [快速开始](#快速开始)
- [生产环境部署](#生产环境部署)
- [开发环境部署](#开发环境部署)
- [监控部署](#监控部署)
- [备份与恢复](#备份与恢复)
- [故障排除](#故障排除)
- [升级指南](#升级指南)

## 🔧 系统要求

### 最低配置
- **CPU**: 2核心
- **内存**: 4GB RAM
- **存储**: 20GB 可用空间
- **系统**: Linux (Ubuntu 20.04+, CentOS 8+, etc.)

### 推荐配置
- **CPU**: 4核心
- **内存**: 8GB RAM
- **存储**: 50GB SSD
- **系统**: Ubuntu 22.04 LTS

### 软件依赖
- Docker 20.10+
- Docker Compose 2.0+
- Git

## 🚀 快速开始

### 1. 安装Docker和Docker Compose

```bash
# Ubuntu/Debian
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh
sudo apt-get install docker-compose-plugin

# CentOS/RHEL
sudo yum install -y yum-utils
sudo yum-config-manager --add-repo https://download.docker.com/linux/centos/docker-ce.repo
sudo yum install docker-ce docker-ce-cli containerd.io docker-compose-plugin
sudo systemctl start docker
sudo systemctl enable docker
```

### 2. 克隆项目

```bash
git clone <repository-url> vcard-system
cd vcard-system
```

### 3. 配置环境变量

```bash
# 复制环境变量模板
cp env.example .env

# 编辑环境变量
nano .env
```

**必须配置的关键变量：**
```bash
# 数据库配置
DB_PASSWORD=your_secure_database_password

# Redis配置
REDIS_PASSWORD=your_secure_redis_password

# JWT密钥（至少64个字符）
JWT_SECRET=your_super_secret_jwt_key_here_make_it_long_and_random

# 卡商API配置
CARD_PROVIDER_TOKEN=your_card_provider_token
CARD_PROVIDER_URL=https://openapi-hk.vccdaddy.com
```

### 4. 启动系统

```bash
# 生产环境启动
docker-compose up -d

# 检查服务状态
docker-compose ps
docker-compose logs -f
```

### 5. 访问系统

- **前端应用**: http://localhost:8000
- **后端API**: http://localhost:3001
- **默认账户**: admin / admin123

## 🏭 生产环境部署

### 1. 使用HTTPS

创建 `docker-compose.prod.yml`:

```yaml
version: '3.8'

services:
  nginx-proxy:
    image: nginxproxy/nginx-proxy:alpine
    container_name: nginx-proxy
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - /var/run/docker.sock:/tmp/docker.sock:ro
      - ./ssl-certs:/etc/nginx/certs:ro
      - /etc/nginx/vhost.d
      - /usr/share/nginx/html
    restart: unless-stopped

  letsencrypt:
    image: nginxproxy/acme-companion
    container_name: nginx-proxy-acme
    volumes:
      - /var/run/docker.sock:/var/run/docker.sock:ro
      - ./ssl-certs:/etc/nginx/certs:rw
      - /etc/nginx/vhost.d
      - /usr/share/nginx/html
    environment:
      - DEFAULT_EMAIL=your-email@domain.com
    restart: unless-stopped

  frontend:
    environment:
      - VIRTUAL_HOST=your-domain.com
      - LETSENCRYPT_HOST=your-domain.com
      - LETSENCRYPT_EMAIL=your-email@domain.com
    expose:
      - "80"
```

### 2. 生产环境启动

```bash
# 使用生产配置启动
docker-compose -f docker-compose.yml -f docker-compose.prod.yml up -d
```

### 3. 防火墙配置

```bash
# Ubuntu UFW
sudo ufw allow 22/tcp
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw enable

# CentOS Firewalld
sudo firewall-cmd --permanent --add-port=22/tcp
sudo firewall-cmd --permanent --add-port=80/tcp
sudo firewall-cmd --permanent --add-port=443/tcp
sudo firewall-cmd --reload
```

### 4. 系统服务配置

创建 `/etc/systemd/system/vcard-system.service`:

```ini
[Unit]
Description=VCard Management System
Requires=docker.service
After=docker.service

[Service]
Type=oneshot
RemainAfterExit=yes
WorkingDirectory=/opt/vcard-system
ExecStart=/usr/bin/docker-compose up -d
ExecStop=/usr/bin/docker-compose down
TimeoutStartSec=0

[Install]
WantedBy=multi-user.target
```

启用服务：
```bash
sudo systemctl enable vcard-system
sudo systemctl start vcard-system
```

## 🔧 开发环境部署

### 1. 启动开发环境

```bash
# 启动开发环境（支持热重载）
docker-compose -f docker-compose.yml -f docker-compose.dev.yml up -d

# 查看开发工具
echo "数据库管理: http://localhost:8080"
echo "Redis管理: http://localhost:8081"
```

### 2. 开发环境特性

- **热重载**: 代码更改自动重启
- **调试端口**: 后端调试端口 9229
- **数据库管理**: Adminer (端口 8080)
- **Redis管理**: Redis Commander (端口 8081)

## 📊 监控部署

### 1. 启动监控栈

```bash
# 启动完整监控系统
docker-compose -f docker-compose.yml -f docker-compose.monitoring.yml up -d
```

### 2. 访问监控界面

- **Grafana**: http://localhost:3000 (admin/admin123)
- **Prometheus**: http://localhost:9090
- **AlertManager**: http://localhost:9093

### 3. 配置告警

编辑 `monitoring/alertmanager/alertmanager.yml`:

```yaml
global:
  smtp_smarthost: 'localhost:587'
  smtp_from: 'alerts@your-domain.com'

route:
  group_by: ['alertname']
  group_wait: 10s
  group_interval: 10s
  repeat_interval: 1h
  receiver: 'web.hook'

receivers:
- name: 'web.hook'
  email_configs:
  - to: 'admin@your-domain.com'
    subject: 'VCard System Alert'
    body: |
      {{ range .Alerts }}
      Alert: {{ .Annotations.summary }}
      Description: {{ .Annotations.description }}
      {{ end }}
```

## 💾 备份与恢复

### 1. 自动备份配置

```bash
# 设置定时备份（每天凌晨2点）
sudo crontab -e

# 添加以下行
0 2 * * * /opt/vcard-system/scripts/backup.sh
```

### 2. 手动备份

```bash
# 执行备份
./scripts/backup.sh

# 查看备份列表
ls -la /opt/backups/vcard/
```

### 3. 数据恢复

```bash
# 恢复所有数据
./scripts/restore.sh 20231225_120000

# 仅恢复数据库
./scripts/restore.sh 20231225_120000 --db-only

# 强制恢复（不询问确认）
./scripts/restore.sh 20231225_120000 --force
```

## 🔍 故障排除

### 1. 常见问题

#### 服务启动失败
```bash
# 查看服务状态
docker-compose ps

# 查看详细日志
docker-compose logs <service-name>

# 重启服务
docker-compose restart <service-name>
```

#### 数据库连接失败
```bash
# 检查数据库容器
docker-compose logs database

# 检查网络连接
docker network ls
docker network inspect vcard_vcard-network
```

#### 内存不足
```bash
# 查看系统资源使用
docker stats

# 释放未使用的Docker资源
docker system prune -f
```

### 2. 日志查看

```bash
# 查看所有服务日志
docker-compose logs -f

# 查看特定服务日志
docker-compose logs -f backend
docker-compose logs -f frontend
docker-compose logs -f database
```

### 3. 性能优化

```bash
# 优化Docker
echo 'vm.max_map_count=262144' >> /etc/sysctl.conf
sysctl -p

# 设置Docker日志轮转
cat > /etc/docker/daemon.json << EOF
{
  "log-driver": "json-file",
  "log-opts": {
    "max-size": "10m",
    "max-file": "3"
  }
}
EOF

sudo systemctl restart docker
```

## 🔄 升级指南

### 1. 备份数据

```bash
# 升级前备份
./scripts/backup.sh
```

### 2. 更新代码

```bash
# 拉取最新代码
git pull origin main

# 检查环境变量更新
diff env.example .env
```

### 3. 重新构建和部署

```bash
# 重新构建镜像
docker-compose build --no-cache

# 停止服务
docker-compose down

# 启动新版本
docker-compose up -d

# 检查服务状态
docker-compose ps
```

### 4. 数据库迁移

```bash
# 如果有数据库变更，执行迁移
docker-compose exec backend npm run db:migrate
```

## 📞 技术支持

如遇到部署问题，请：

1. 检查 [故障排除](#故障排除) 部分
2. 查看系统日志：`docker-compose logs -f`
3. 提供详细的错误信息和系统环境

---

*最后更新：2024年12月*


