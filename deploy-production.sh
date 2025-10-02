#!/bin/bash

# ==============================================
# 虚拟卡管理系统 - 生产环境一键部署脚本
# ==============================================

set -e  # 遇到错误立即退出

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 检测是否需要sudo
DOCKER_CMD="docker"
DOCKER_COMPOSE_CMD="docker-compose"

if ! docker ps >/dev/null 2>&1; then
    if sudo docker ps >/dev/null 2>&1; then
        DOCKER_CMD="sudo docker"
        DOCKER_COMPOSE_CMD="sudo docker-compose"
        echo -e "${YELLOW}[INFO]${NC} 检测到需要sudo权限运行Docker"
    fi
fi

# 打印函数
print_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# 显示横幅
show_banner() {
    echo -e "${BLUE}"
    echo "=============================================="
    echo "   虚拟卡管理系统 - 生产环境部署"
    echo "=============================================="
    echo -e "${NC}"
}

# 检查依赖
check_dependencies() {
    print_info "检查系统依赖..."
    
    # 检查Docker
    if ! command -v docker &> /dev/null; then
        print_error "Docker未安装，请先安装Docker"
        exit 1
    fi
    
    # 检查Docker Compose
    if ! command -v docker-compose &> /dev/null && ! docker compose version &> /dev/null; then
        print_error "Docker Compose未安装，请先安装Docker Compose"
        exit 1
    fi
    
    # 检查.env文件
    if [ ! -f ".env.production" ]; then
        print_warning ".env.production文件不存在"
        print_info "正在从示例文件创建..."
        
        if [ -f "env.production.example" ]; then
            cp env.production.example .env.production
            print_warning "请编辑 .env.production 文件，配置必要的环境变量"
            print_warning "特别是数据库密码、JWT密钥、卡商API Token等"
            read -p "配置完成后按Enter继续..." 
        else
            print_error "找不到 env.production.example 文件"
            exit 1
        fi
    fi
    
    print_success "依赖检查通过"
}

# 验证环境变量
validate_env() {
    print_info "验证环境变量..."
    
    # 安全地加载环境变量
    set -a
    source .env.production
    set +a
    
    # 检查必要的环境变量
    REQUIRED_VARS=(
        "DB_PASSWORD"
        "REDIS_PASSWORD"
        "JWT_SECRET"
        "CARD_PROVIDER_TOKEN"
    )
    
    for var in "${REQUIRED_VARS[@]}"; do
        if [ -z "${!var}" ] || [ "${!var}" == "your_"* ] || [ "${!var}" == "Your"* ]; then
            print_error "环境变量 $var 未正确配置"
            exit 1
        fi
    done
    
    # 检查JWT_SECRET长度
    if [ ${#JWT_SECRET} -lt 64 ]; then
        print_warning "JWT_SECRET长度不足64位，建议使用更长的密钥"
    fi
    
    print_success "环境变量验证通过"
}

# 备份数据库
backup_database() {
    if [ -f ".env.production" ]; then
        set -a
        source .env.production
        set +a
        
        print_info "备份数据库..."
        BACKUP_FILE="vcard_db_backup_$(date +%Y%m%d_%H%M%S).dump"
        
        # 检查容器是否运行
        if $DOCKER_CMD ps | grep -q vcard-postgres; then
            # 尝试备份，如果失败则继续
            if $DOCKER_CMD exec vcard-postgres pg_dump -U ${DB_USER} ${DB_NAME} > "$BACKUP_FILE" 2>/dev/null; then
                print_success "数据库已备份至: $BACKUP_FILE"
            else
                print_warning "数据库备份失败（可能是新部署或配置不匹配），继续部署..."
            fi
        else
            print_warning "数据库容器未运行，跳过备份"
        fi
    fi
}

# 停止旧容器
stop_old_containers() {
    print_info "停止旧容器..."
    $DOCKER_COMPOSE_CMD -f docker-compose.production.yml --env-file .env.production down || true
    print_success "旧容器已停止"
}

# 清理旧镜像
cleanup_old_images() {
    print_info "清理未使用的Docker资源..."
    $DOCKER_CMD system prune -f
    print_success "清理完成"
}

# 构建镜像
build_images() {
    print_info "构建Docker镜像..."
    
    # 构建后端
    print_info "构建后端镜像..."
    $DOCKER_CMD build -f backend/Dockerfile.optimized -t vcard-backend:latest ./backend
    
    # 构建前端
    print_info "构建前端镜像..."
    $DOCKER_CMD build -f v1/Dockerfile.optimized -t vcard-frontend:latest ./v1
    
    print_success "镜像构建完成"
}

# 启动服务
start_services() {
    print_info "启动服务..."
    $DOCKER_COMPOSE_CMD -f docker-compose.production.yml --env-file .env.production up -d
    print_success "服务已启动"
}

# 等待服务就绪
wait_for_services() {
    print_info "等待服务就绪..."
    
    # 等待数据库
    print_info "等待数据库启动..."
    sleep 10
    
    # 等待后端
    print_info "等待后端服务..."
    MAX_RETRIES=30
    RETRY_COUNT=0
    
    while [ $RETRY_COUNT -lt $MAX_RETRIES ]; do
        if curl -f http://localhost:3001/api/health &> /dev/null; then
            print_success "后端服务已就绪"
            break
        fi
        
        RETRY_COUNT=$((RETRY_COUNT + 1))
        echo -n "."
        sleep 2
    done
    
    if [ $RETRY_COUNT -eq $MAX_RETRIES ]; then
        print_error "后端服务启动超时"
        $DOCKER_COMPOSE_CMD -f docker-compose.production.yml logs backend
        exit 1
    fi
    
    # 等待前端
    print_info "等待前端服务..."
    sleep 5
    
    if curl -f http://localhost:8000/health &> /dev/null; then
        print_success "前端服务已就绪"
    else
        print_warning "前端健康检查失败，但可能仍在启动中"
    fi
}

# 运行数据库迁移
run_migrations() {
    print_info "运行数据库迁移..."
    
    # 生成Prisma客户端
    $DOCKER_CMD exec vcard-backend npx prisma generate || true
    
    # 运行迁移
    $DOCKER_CMD exec vcard-backend npx prisma migrate deploy || true
    
    print_success "数据库迁移完成"
}

# 显示状态
show_status() {
    echo ""
    print_info "服务状态："
    $DOCKER_COMPOSE_CMD -f docker-compose.production.yml ps
    
    echo ""
    print_info "访问信息："
    source .env.production
    echo -e "  前端地址: ${GREEN}http://localhost:${FRONTEND_PORT}${NC}"
    echo -e "  后端API:  ${GREEN}http://localhost:${BACKEND_PORT}/api${NC}"
    
    echo ""
    print_info "常用命令："
    echo "  查看日志: docker-compose -f docker-compose.production.yml logs -f"
    echo "  停止服务: docker-compose -f docker-compose.production.yml down"
    echo "  重启服务: docker-compose -f docker-compose.production.yml restart"
    echo "  查看状态: docker-compose -f docker-compose.production.yml ps"
}

# 主函数
main() {
    show_banner
    
    # 解析参数
    SKIP_BACKUP=false
    SKIP_BUILD=false
    
    while [[ $# -gt 0 ]]; do
        case $1 in
            --skip-backup)
                SKIP_BACKUP=true
                shift
                ;;
            --skip-build)
                SKIP_BUILD=true
                shift
                ;;
            --help)
                echo "使用方法: $0 [选项]"
                echo "选项:"
                echo "  --skip-backup  跳过数据库备份"
                echo "  --skip-build   跳过镜像构建（使用已有镜像）"
                echo "  --help         显示此帮助信息"
                exit 0
                ;;
            *)
                print_error "未知选项: $1"
                echo "使用 --help 查看帮助"
                exit 1
                ;;
        esac
    done
    
    # 执行部署步骤
    check_dependencies
    validate_env
    
    if [ "$SKIP_BACKUP" = false ]; then
        backup_database
    fi
    
    stop_old_containers
    cleanup_old_images
    
    if [ "$SKIP_BUILD" = false ]; then
        build_images
    fi
    
    start_services
    wait_for_services
    run_migrations
    show_status
    
    echo ""
    print_success "部署完成！"
    print_info "请访问 http://localhost:8000 查看应用"
}

# 运行主函数
main "$@"

