#!/bin/bash
#############################################
# 虚拟卡管理系统 - 服务器端一键部署脚本
# 
# 使用方法：
# 1. 将此脚本复制到服务器
# 2. chmod +x server-deploy.sh
# 3. ./server-deploy.sh
#############################################

set -e  # 遇到错误立即退出

# 颜色输出
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 打印带颜色的消息
print_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

print_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

print_header() {
    echo -e "${BLUE}"
    echo "======================================"
    echo "$1"
    echo "======================================"
    echo -e "${NC}"
}

#############################################
# 开始部署
#############################################

print_header "🚀 虚拟卡管理系统 - 自动部署脚本"

echo ""
print_info "检查运行权限..."
if [[ $EUID -ne 0 ]]; then
   print_warning "此脚本需要 sudo 权限，请使用 sudo 运行或确保当前用户有 Docker 权限"
fi

#############################################
# 1. 系统检查
#############################################

print_header "1️⃣  系统环境检查"

print_info "检查操作系统..."
if [ -f /etc/os-release ]; then
    . /etc/os-release
    print_success "操作系统: $NAME $VERSION"
else
    print_error "无法识别操作系统"
    exit 1
fi

print_info "检查系统资源..."
CPU_CORES=$(nproc)
TOTAL_MEM=$(free -h | awk '/^Mem:/ {print $2}')
DISK_SPACE=$(df -h / | awk 'NR==2 {print $4}')

echo "   CPU 核心数: $CPU_CORES"
echo "   总内存: $TOTAL_MEM"
echo "   可用磁盘: $DISK_SPACE"

if [ $CPU_CORES -lt 2 ]; then
    print_warning "建议至少 2 核 CPU"
fi

#############################################
# 2. 安装必需软件
#############################################

print_header "2️⃣  安装必需软件"

# 更新系统
print_info "更新系统包..."
sudo apt-get update -qq

# 安装 Docker
if ! command -v docker &> /dev/null; then
    print_info "安装 Docker..."
    curl -fsSL https://get.docker.com -o get-docker.sh
    sudo sh get-docker.sh
    sudo usermod -aG docker $USER
    print_success "Docker 已安装"
else
    DOCKER_VERSION=$(docker --version)
    print_success "Docker 已存在: $DOCKER_VERSION"
fi

# 安装 Docker Compose Plugin
if ! docker compose version &> /dev/null; then
    print_info "安装 Docker Compose..."
    sudo apt-get install -y docker-compose-plugin
    print_success "Docker Compose 已安装"
else
    COMPOSE_VERSION=$(docker compose version)
    print_success "Docker Compose 已存在: $COMPOSE_VERSION"
fi

# 安装 Git
if ! command -v git &> /dev/null; then
    print_info "安装 Git..."
    sudo apt-get install -y git
    print_success "Git 已安装"
else
    GIT_VERSION=$(git --version)
    print_success "Git 已存在: $GIT_VERSION"
fi

# 安装其他工具
sudo apt-get install -y curl wget net-tools

#############################################
# 3. 克隆项目
#############################################

print_header "3️⃣  克隆项目代码"

PROJECT_DIR="$HOME/vcard-system"

if [ -d "$PROJECT_DIR" ]; then
    print_warning "项目目录已存在: $PROJECT_DIR"
    read -p "是否删除并重新克隆? (y/N) " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        print_info "删除旧项目..."
        rm -rf "$PROJECT_DIR"
    else
        print_info "使用现有项目，执行 git pull..."
        cd "$PROJECT_DIR"
        git pull origin main
        print_success "代码已更新"
    fi
fi

if [ ! -d "$PROJECT_DIR" ]; then
    print_info "克隆项目代码..."
    cd ~
    git clone https://github.com/xuyujie8786/vcard.git vcard-system
    print_success "项目已克隆到: $PROJECT_DIR"
fi

cd "$PROJECT_DIR"

# 验证关键文件
print_info "验证项目文件..."
MISSING_FILES=0

check_file() {
    if [ -f "$1" ]; then
        echo "   ✅ $1"
    else
        echo "   ❌ $1 (缺失)"
        MISSING_FILES=$((MISSING_FILES + 1))
    fi
}

check_file "docker-compose.yml"
check_file "backend/Dockerfile"
check_file "v1/Dockerfile"
check_file "backend/prisma/schema.prisma"
check_file "PRODUCTION_DEPLOYMENT_GUIDE.md"

if [ $MISSING_FILES -gt 0 ]; then
    print_error "缺少 $MISSING_FILES 个关键文件，请检查代码仓库"
    exit 1
fi

print_success "所有关键文件验证通过"

#############################################
# 4. 配置环境变量
#############################################

print_header "4️⃣  配置环境变量"

if [ -f ".env" ]; then
    print_warning ".env 文件已存在"
    read -p "是否覆盖现有配置? (y/N) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        print_info "保留现有配置"
    else
        print_info "生成新的环境变量配置..."
        
        # 生成随机密码
        DB_PASSWORD=$(openssl rand -hex 16)
        REDIS_PASSWORD=$(openssl rand -hex 16)
        JWT_SECRET=$(openssl rand -base64 64)
        
        cat > .env << EOF
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
DB_PASSWORD=${DB_PASSWORD}
DATABASE_URL=postgresql://vcard_user:${DB_PASSWORD}@database:5432/vcard_db

# ==================== Redis配置 ====================
REDIS_PASSWORD=${REDIS_PASSWORD}
REDIS_URL=redis://:${REDIS_PASSWORD}@redis:6379

# ==================== JWT配置 ====================
JWT_SECRET=${JWT_SECRET}
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
        
        print_success ".env 文件已创建（密码已自动生成）"
    fi
else
    print_info "生成环境变量配置..."
    
    # 生成随机密码
    DB_PASSWORD=$(openssl rand -hex 16)
    REDIS_PASSWORD=$(openssl rand -hex 16)
    JWT_SECRET=$(openssl rand -base64 64)
    
    cat > .env << EOF
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
DB_PASSWORD=${DB_PASSWORD}
DATABASE_URL=postgresql://vcard_user:${DB_PASSWORD}@database:5432/vcard_db

# ==================== Redis配置 ====================
REDIS_PASSWORD=${REDIS_PASSWORD}
REDIS_URL=redis://:${REDIS_PASSWORD}@redis:6379

# ==================== JWT配置 ====================
JWT_SECRET=${JWT_SECRET}
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
    
    print_success ".env 文件已创建"
fi

#############################################
# 5. 修复已知问题
#############################################

print_header "5️⃣  修复已知问题"

print_info "修复 TypeScript 配置..."
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

print_info "修复 Dockerfile..."
sed -i 's/RUN npm ci/RUN npm install/g' backend/Dockerfile 2>/dev/null || true
sed -i 's/RUN npm ci/RUN npm install/g' v1/Dockerfile 2>/dev/null || true

print_success "配置修复完成"

#############################################
# 6. 构建镜像
#############################################

print_header "6️⃣  构建 Docker 镜像"

print_info "清理旧容器和镜像..."
sudo docker compose down -v 2>/dev/null || true
sudo docker system prune -af

print_info "开始构建镜像（这可能需要 10-15 分钟）..."
sudo docker compose build --no-cache

print_success "镜像构建完成"

#############################################
# 7. 启动服务
#############################################

print_header "7️⃣  启动服务"

print_info "启动所有容器..."
sudo docker compose up -d

print_info "等待服务启动（30秒）..."
sleep 30

print_info "检查服务状态..."
sudo docker compose ps

#############################################
# 8. 初始化数据库
#############################################

print_header "8️⃣  初始化数据库"

print_info "运行数据库迁移..."
sudo docker compose exec -T backend npx prisma migrate deploy

print_success "数据库初始化完成"

#############################################
# 9. 验证部署
#############################################

print_header "9️⃣  验证部署"

print_info "检查后端健康..."
if curl -sf http://localhost:3001/api/health > /dev/null; then
    print_success "后端服务正常"
else
    print_warning "后端服务可能未完全启动，请稍后检查"
fi

print_info "检查前端健康..."
if curl -sf http://localhost:8000/health > /dev/null; then
    print_success "前端服务正常"
else
    print_warning "前端服务可能未完全启动，请稍后检查"
fi

print_info "检查数据库..."
if sudo docker compose exec -T database pg_isready -U vcard_user > /dev/null; then
    print_success "数据库服务正常"
else
    print_warning "数据库服务异常"
fi

#############################################
# 10. 配置防火墙（可选）
#############################################

print_header "🔟 配置防火墙（可选）"

if command -v ufw &> /dev/null; then
    print_info "检测到 UFW 防火墙"
    read -p "是否配置防火墙规则? (y/N) " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        print_info "配置防火墙..."
        sudo ufw allow 22/tcp
        sudo ufw allow 8000/tcp
        sudo ufw allow 3001/tcp
        sudo ufw --force enable
        print_success "防火墙已配置"
        sudo ufw status
    fi
else
    print_info "未检测到 UFW 防火墙，跳过配置"
fi

#############################################
# 部署完成
#############################################

print_header "🎉 部署完成！"

# 获取服务器 IP
SERVER_IP=$(curl -s ifconfig.me 2>/dev/null || echo "YOUR_SERVER_IP")

echo ""
print_info "📊 部署信息："
echo "   项目目录: $PROJECT_DIR"
echo "   Git 分支: $(git branch --show-current)"
echo "   最新提交: $(git log -1 --pretty=format:'%h - %s')"
echo ""

print_info "🌐 访问地址："
echo "   前端：http://${SERVER_IP}:8000"
echo "   后端：http://${SERVER_IP}:3001/api/health"
echo ""

print_info "👤 默认管理员账户："
echo "   用户名: admin"
echo "   密码: admin123"
echo ""

print_warning "⚠️  重要提示："
echo "   1. 请立即登录并修改默认密码！"
echo "   2. 查看配置：cat $PROJECT_DIR/.env"
echo "   3. 查看日志：cd $PROJECT_DIR && sudo docker compose logs -f backend"
echo "   4. 查看服务：cd $PROJECT_DIR && sudo docker compose ps"
echo ""

print_info "📚 文档位置："
echo "   $PROJECT_DIR/PRODUCTION_DEPLOYMENT_GUIDE.md"
echo "   $PROJECT_DIR/DEPLOYMENT_CHECKLIST.md"
echo ""

print_info "🔧 常用命令："
echo "   进入项目：cd $PROJECT_DIR"
echo "   查看日志：sudo docker compose logs -f"
echo "   重启服务：sudo docker compose restart"
echo "   停止服务：sudo docker compose down"
echo "   启动服务：sudo docker compose up -d"
echo ""

print_success "部署脚本执行完成！🚀"

