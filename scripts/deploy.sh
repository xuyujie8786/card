#!/bin/bash

# ================================================
# 虚拟卡管理系统 - 自动部署脚本
# ================================================

set -e  # 遇到错误立即退出

# 颜色定义
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

# 检查是否为 root 或有 sudo 权限
check_permissions() {
    if [[ $EUID -ne 0 ]] && ! sudo -n true 2>/dev/null; then
        print_error "需要 root 权限或 sudo 权限"
        exit 1
    fi
    print_success "权限检查通过"
}

# 检查系统要求
check_system() {
    print_info "检查系统要求..."
    
    # 检查内存
    total_mem=$(free -m | awk '/^Mem:/{print $2}')
    if [ "$total_mem" -lt 3800 ]; then
        print_warning "系统内存少于4GB，可能影响性能"
    else
        print_success "内存充足: ${total_mem}MB"
    fi
    
    # 检查磁盘空间
    available_space=$(df -BG / | awk 'NR==2 {print $4}' | sed 's/G//')
    if [ "$available_space" -lt 10 ]; then
        print_error "可用磁盘空间少于10GB"
        exit 1
    else
        print_success "磁盘空间充足: ${available_space}GB"
    fi
}

# 安装 Docker
install_docker() {
    if command -v docker &> /dev/null; then
        print_success "Docker 已安装"
        docker --version
    else
        print_info "正在安装 Docker..."
        curl -fsSL https://get.docker.com -o get-docker.sh
        sudo sh get-docker.sh
        sudo systemctl enable docker
        sudo systemctl start docker
        rm get-docker.sh
        print_success "Docker 安装完成"
    fi
    
    # 检查 Docker Compose
    if docker compose version &> /dev/null; then
        print_success "Docker Compose 已安装"
        docker compose version
    else
        print_info "正在安装 Docker Compose..."
        sudo apt-get update
        sudo apt-get install -y docker-compose-plugin
        print_success "Docker Compose 安装完成"
    fi
}

# 克隆或更新项目
setup_project() {
    PROJECT_DIR="$HOME/vcard-system"
    
    if [ -d "$PROJECT_DIR" ]; then
        print_warning "项目目录已存在，是否要重新克隆？(y/n)"
        read -r response
        if [[ "$response" =~ ^[Yy]$ ]]; then
            print_info "备份旧项目..."
            mv "$PROJECT_DIR" "${PROJECT_DIR}_backup_$(date +%Y%m%d_%H%M%S)"
            print_info "克隆项目..."
            git clone https://github.com/xuyujie8786/vcard.git "$PROJECT_DIR"
        else
            print_info "更新现有项目..."
            cd "$PROJECT_DIR"
            git pull origin main
        fi
    else
        print_info "克隆项目..."
        git clone https://github.com/xuyujie8786/vcard.git "$PROJECT_DIR"
    fi
    
    cd "$PROJECT_DIR"
    print_success "项目准备完成"
}

# 配置环境变量
setup_environment() {
    print_info "配置环境变量..."
    
    if [ -f ".env" ]; then
        print_warning ".env 文件已存在，是否覆盖？(y/n)"
        read -r response
        if [[ ! "$response" =~ ^[Yy]$ ]]; then
            print_info "保留现有 .env 文件"
            return
        fi
        # 备份现有文件
        cp .env .env.backup.$(date +%Y%m%d_%H%M%S)
    fi
    
    # 生成随机密码
    DB_PASSWORD=$(openssl rand -base64 32 | tr -d "=+/" | cut -c1-32)
    REDIS_PASSWORD=$(openssl rand -base64 32 | tr -d "=+/" | cut -c1-32)
    JWT_SECRET=$(openssl rand -base64 64 | tr -d "=+/" | cut -c1-64)
    
    # 创建 .env 文件
    cat > .env << EOF
# ==============================================
# 虚拟卡管理系统环境变量配置
# 自动生成于: $(date)
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

# ==================== 定时同步配置 ====================
SYNC_ENABLED=true
SYNC_AUTH_PREVIOUS_CRON=0 1 * * *
SYNC_AUTH_CURRENT_CRON=0 13 * * *
SYNC_SETTLE_PREVIOUS_CRON=30 1 * * *
SYNC_SETTLE_CURRENT_CRON=30 13 * * *
EOF
    
    chmod 600 .env
    print_success "环境变量配置完成（密码已自动生成）"
}

# 构建和启动服务
deploy_services() {
    print_info "构建 Docker 镜像..."
    sudo docker-compose build --no-cache
    print_success "镜像构建完成"
    
    print_info "启动服务..."
    sudo docker-compose up -d
    print_success "服务已启动"
    
    # 等待服务启动
    print_info "等待数据库启动..."
    sleep 30
    
    # 检查服务状态
    print_info "检查服务状态..."
    sudo docker-compose ps
}

# 初始化数据库
init_database() {
    print_info "运行数据库迁移..."
    
    # 等待数据库完全启动
    max_attempts=30
    attempt=0
    
    while [ $attempt -lt $max_attempts ]; do
        if sudo docker-compose exec -T database pg_isready -U vcard_user &> /dev/null; then
            print_success "数据库已就绪"
            break
        fi
        attempt=$((attempt + 1))
        echo -n "."
        sleep 2
    done
    
    if [ $attempt -eq $max_attempts ]; then
        print_error "数据库启动超时"
        return 1
    fi
    
    # 运行迁移
    sudo docker-compose exec backend npx prisma migrate deploy || {
        print_warning "迁移失败，尝试生成 Prisma 客户端..."
        sudo docker-compose exec backend npx prisma generate
        sudo docker-compose exec backend npx prisma migrate deploy
    }
    
    print_success "数据库初始化完成"
}

# 配置防火墙
setup_firewall() {
    if command -v ufw &> /dev/null; then
        print_info "配置 UFW 防火墙..."
        sudo ufw allow 22/tcp comment 'SSH'
        sudo ufw allow 8000/tcp comment 'Frontend'
        sudo ufw allow 3001/tcp comment 'Backend API'
        sudo ufw --force enable
        print_success "防火墙配置完成"
    else
        print_warning "UFW 未安装，请手动配置防火墙"
    fi
}

# 显示部署信息
show_deploy_info() {
    SERVER_IP=$(hostname -I | awk '{print $1}')
    
    echo ""
    echo "═══════════════════════════════════════════════════════"
    print_success "部署完成！"
    echo "═══════════════════════════════════════════════════════"
    echo ""
    echo "📱 前端访问地址:"
    echo "   http://${SERVER_IP}:8000"
    echo ""
    echo "🔌 后端API地址:"
    echo "   http://${SERVER_IP}:3001"
    echo ""
    echo "🔑 默认管理员账户:"
    echo "   用户名: admin"
    echo "   密码: admin123"
    echo "   ⚠️  请立即登录后修改密码！"
    echo ""
    echo "📊 查看服务状态:"
    echo "   sudo docker-compose ps"
    echo ""
    echo "📝 查看日志:"
    echo "   sudo docker-compose logs -f backend"
    echo ""
    echo "🔄 重启服务:"
    echo "   sudo docker-compose restart"
    echo ""
    echo "═══════════════════════════════════════════════════════"
}

# 主函数
main() {
    echo ""
    echo "═══════════════════════════════════════════════════════"
    echo "  虚拟卡管理系统 - 自动部署脚本"
    echo "═══════════════════════════════════════════════════════"
    echo ""
    
    check_permissions
    check_system
    install_docker
    setup_project
    setup_environment
    deploy_services
    init_database
    setup_firewall
    show_deploy_info
    
    print_success "全部完成！🎉"
}

# 运行主函数
main "$@"
