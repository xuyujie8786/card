#!/bin/bash

# ==============================================
# 虚拟卡管理系统一键部署脚本
# ==============================================

set -e  # 遇到错误立即退出

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 配置变量
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
DEPLOY_ENV="${DEPLOY_ENV:-production}"
BACKUP_BEFORE_DEPLOY="${BACKUP_BEFORE_DEPLOY:-true}"

# 日志函数
log() {
    echo -e "${GREEN}[$(date '+%Y-%m-%d %H:%M:%S')] $1${NC}"
}

warn() {
    echo -e "${YELLOW}[$(date '+%Y-%m-%d %H:%M:%S')] 警告: $1${NC}"
}

error() {
    echo -e "${RED}[$(date '+%Y-%m-%d %H:%M:%S')] 错误: $1${NC}"
    exit 1
}

info() {
    echo -e "${BLUE}[$(date '+%Y-%m-%d %H:%M:%S')] $1${NC}"
}

# 显示帮助信息
show_help() {
    cat << EOF
虚拟卡管理系统部署脚本

使用方法:
    $0 [选项] [操作]

操作:
    install     初始安装（默认）
    update      更新现有部署
    restart     重启所有服务
    stop        停止所有服务
    status      显示服务状态
    logs        显示服务日志

选项:
    -e, --env ENV          部署环境 (dev|prod) [默认: production]
    -b, --backup           部署前备份数据 [默认: true]
    -m, --monitoring       启用监控组件
    -f, --force            强制执行，跳过确认
    -h, --help             显示此帮助信息

示例:
    $0                     # 默认生产环境安装
    $0 -e dev              # 开发环境部署
    $0 -m update           # 更新并启用监控
    $0 status              # 查看服务状态

EOF
}

# 检查系统要求
check_requirements() {
    log "检查系统要求..."
    
    # 检查操作系统
    if [[ "$OSTYPE" != "linux-gnu"* ]]; then
        error "此脚本仅支持Linux系统"
    fi
    
    # 检查Docker
    if ! command -v docker &> /dev/null; then
        error "未找到Docker，请先安装Docker"
    fi
    
    # 检查Docker Compose
    if ! docker compose version &> /dev/null; then
        error "未找到Docker Compose，请安装Docker Compose Plugin"
    fi
    
    # 检查Git
    if ! command -v git &> /dev/null; then
        error "未找到Git，请先安装Git"
    fi
    
    # 检查系统资源
    local total_memory=$(free -m | grep '^Mem:' | awk '{print $2}')
    if [ "$total_memory" -lt 3800 ]; then
        warn "系统内存少于4GB，可能影响性能"
    fi
    
    local available_disk=$(df -m "$PROJECT_DIR" | tail -1 | awk '{print $4}')
    if [ "$available_disk" -lt 10240 ]; then
        warn "可用磁盘空间少于10GB，建议释放更多空间"
    fi
    
    log "系统检查完成"
}

# 创建必要的目录
create_directories() {
    log "创建必要的目录..."
    
    mkdir -p /opt/backups/vcard
    mkdir -p /var/log/vcard
    mkdir -p "$PROJECT_DIR/ssl-certs"
    
    # 设置权限
    chmod 755 /opt/backups/vcard
    chmod 755 /var/log/vcard
    
    log "目录创建完成"
}

# 配置环境变量
setup_environment() {
    log "配置环境变量..."
    
    if [ ! -f "$PROJECT_DIR/.env" ]; then
        if [ -f "$PROJECT_DIR/env.example" ]; then
            cp "$PROJECT_DIR/env.example" "$PROJECT_DIR/.env"
            warn "已创建.env文件，请根据需要修改配置"
        else
            error "未找到env.example文件"
        fi
    fi
    
    # 生成随机密码（如果未设置）
    if ! grep -q "^JWT_SECRET=" "$PROJECT_DIR/.env" || grep -q "your_jwt_secret" "$PROJECT_DIR/.env"; then
        local jwt_secret=$(openssl rand -base64 64 | tr -d "=+/" | cut -c1-64)
        sed -i "s|JWT_SECRET=.*|JWT_SECRET=$jwt_secret|" "$PROJECT_DIR/.env"
        log "已生成JWT密钥"
    fi
    
    if ! grep -q "^DB_PASSWORD=" "$PROJECT_DIR/.env" || grep -q "secure_password123" "$PROJECT_DIR/.env"; then
        local db_password=$(openssl rand -base64 32 | tr -d "=+/" | cut -c1-25)
        sed -i "s|DB_PASSWORD=.*|DB_PASSWORD=$db_password|" "$PROJECT_DIR/.env"
        log "已生成数据库密码"
    fi
    
    if ! grep -q "^REDIS_PASSWORD=" "$PROJECT_DIR/.env" || grep -q "redis_password123" "$PROJECT_DIR/.env"; then
        local redis_password=$(openssl rand -base64 32 | tr -d "=+/" | cut -c1-25)
        sed -i "s|REDIS_PASSWORD=.*|REDIS_PASSWORD=$redis_password|" "$PROJECT_DIR/.env"
        log "已生成Redis密码"
    fi
    
    log "环境变量配置完成"
}

# 备份现有数据
backup_data() {
    if [ "$BACKUP_BEFORE_DEPLOY" = "true" ] && docker-compose ps | grep -q "Up"; then
        log "备份现有数据..."
        
        if [ -f "$PROJECT_DIR/scripts/backup.sh" ]; then
            "$PROJECT_DIR/scripts/backup.sh"
            log "数据备份完成"
        else
            warn "备份脚本不存在，跳过备份"
        fi
    fi
}

# 拉取最新镜像
pull_images() {
    log "拉取Docker镜像..."
    
    cd "$PROJECT_DIR"
    
    case $DEPLOY_ENV in
        "dev")
            docker-compose -f docker-compose.yml -f docker-compose.dev.yml pull
            ;;
        "prod"|"production")
            docker-compose pull
            ;;
        *)
            error "未知的部署环境: $DEPLOY_ENV"
            ;;
    esac
    
    log "镜像拉取完成"
}

# 构建应用镜像
build_images() {
    log "构建应用镜像..."
    
    cd "$PROJECT_DIR"
    
    case $DEPLOY_ENV in
        "dev")
            docker-compose -f docker-compose.yml -f docker-compose.dev.yml build --no-cache
            ;;
        "prod"|"production")
            docker-compose build --no-cache
            ;;
    esac
    
    log "镜像构建完成"
}

# 启动服务
start_services() {
    log "启动服务..."
    
    cd "$PROJECT_DIR"
    
    # 构建compose命令
    local compose_files="docker-compose.yml"
    
    if [ "$DEPLOY_ENV" = "dev" ]; then
        compose_files="$compose_files -f docker-compose.dev.yml"
    fi
    
    if [ "$ENABLE_MONITORING" = "true" ]; then
        compose_files="$compose_files -f docker-compose.monitoring.yml"
    fi
    
    # 启动服务
    docker-compose $compose_files up -d
    
    log "服务启动完成"
}

# 等待服务就绪
wait_for_services() {
    log "等待服务就绪..."
    
    local max_attempts=60
    local attempt=0
    
    while [ $attempt -lt $max_attempts ]; do
        if curl -f http://localhost:${BACKEND_PORT:-3001}/api/health &> /dev/null; then
            log "后端服务就绪"
            break
        fi
        
        attempt=$((attempt + 1))
        sleep 5
        info "等待后端服务启动... ($attempt/$max_attempts)"
    done
    
    if [ $attempt -eq $max_attempts ]; then
        error "后端服务启动超时"
    fi
    
    # 检查前端服务
    attempt=0
    while [ $attempt -lt $max_attempts ]; do
        if curl -f http://localhost:${FRONTEND_PORT:-8000}/health &> /dev/null; then
            log "前端服务就绪"
            break
        fi
        
        attempt=$((attempt + 1))
        sleep 5
        info "等待前端服务启动... ($attempt/$max_attempts)"
    done
    
    if [ $attempt -eq $max_attempts ]; then
        error "前端服务启动超时"
    fi
}

# 运行数据库迁移
run_migrations() {
    log "运行数据库迁移..."
    
    cd "$PROJECT_DIR"
    
    # 等待数据库就绪
    sleep 10
    
    # 运行Prisma迁移
    if docker-compose exec -T backend npx prisma migrate deploy; then
        log "数据库迁移完成"
    else
        warn "数据库迁移失败，可能是首次部署"
    fi
}

# 创建初始管理员用户
create_admin_user() {
    log "创建初始管理员用户..."
    
    cd "$PROJECT_DIR"
    
    # 检查是否已存在管理员用户
    if docker-compose exec -T backend node -e "
        const { PrismaClient } = require('@prisma/client');
        const prisma = new PrismaClient();
        prisma.user.findFirst({ where: { role: 'super_admin' } })
            .then(user => {
                if (user) {
                    console.log('EXISTS');
                } else {
                    console.log('NOT_EXISTS');
                }
            })
            .catch(() => console.log('ERROR'));
    " 2>/dev/null | grep -q "EXISTS"; then
        info "管理员用户已存在"
        return
    fi
    
    # 创建管理员用户
    if docker-compose exec -T backend npm run db:seed &> /dev/null; then
        log "初始管理员用户创建完成"
        info "默认管理员账户: admin / admin123"
        warn "请及时修改默认密码"
    else
        warn "管理员用户创建失败"
    fi
}

# 显示部署信息
show_deployment_info() {
    log "部署完成！"
    
    echo ""
    echo "==================== 部署信息 ===================="
    echo "部署环境: $DEPLOY_ENV"
    echo "项目目录: $PROJECT_DIR"
    echo ""
    echo "服务访问地址:"
    echo "  前端应用: http://localhost:${FRONTEND_PORT:-8000}"
    echo "  后端API:  http://localhost:${BACKEND_PORT:-3001}"
    echo ""
    
    if [ "$ENABLE_MONITORING" = "true" ]; then
        echo "监控服务:"
        echo "  Grafana:     http://localhost:3000 (admin/admin123)"
        echo "  Prometheus:  http://localhost:9090"
        echo "  AlertManager: http://localhost:9093"
        echo ""
    fi
    
    if [ "$DEPLOY_ENV" = "dev" ]; then
        echo "开发工具:"
        echo "  数据库管理: http://localhost:8080"
        echo "  Redis管理:  http://localhost:8081"
        echo ""
    fi
    
    echo "默认管理员账户:"
    echo "  用户名: admin"
    echo "  密码:   admin123"
    echo ""
    echo "重要提醒:"
    echo "  1. 请及时修改默认密码"
    echo "  2. 请配置HTTPS证书（生产环境）"
    echo "  3. 请设置防火墙规则"
    echo "  4. 请配置定时备份"
    echo "=================================================="
}

# 显示服务状态
show_status() {
    cd "$PROJECT_DIR"
    
    echo "==================== 服务状态 ===================="
    docker-compose ps
    echo ""
    
    echo "==================== 系统资源 ===================="
    docker stats --no-stream
    echo ""
    
    echo "==================== 健康检查 ===================="
    
    # 检查后端健康状态
    if curl -f http://localhost:${BACKEND_PORT:-3001}/api/health &> /dev/null; then
        echo "✅ 后端服务: 正常"
    else
        echo "❌ 后端服务: 异常"
    fi
    
    # 检查前端健康状态
    if curl -f http://localhost:${FRONTEND_PORT:-8000}/health &> /dev/null; then
        echo "✅ 前端服务: 正常"
    else
        echo "❌ 前端服务: 异常"
    fi
    
    echo "=================================================="
}

# 显示服务日志
show_logs() {
    cd "$PROJECT_DIR"
    
    local service="$1"
    
    if [ -n "$service" ]; then
        docker-compose logs -f "$service"
    else
        docker-compose logs -f
    fi
}

# 停止服务
stop_services() {
    log "停止服务..."
    
    cd "$PROJECT_DIR"
    docker-compose down
    
    log "服务已停止"
}

# 重启服务
restart_services() {
    log "重启服务..."
    
    stop_services
    start_services
    wait_for_services
    
    log "服务重启完成"
}

# 更新部署
update_deployment() {
    log "更新部署..."
    
    # 备份数据
    backup_data
    
    # 拉取最新代码（如果是git仓库）
    if [ -d "$PROJECT_DIR/.git" ]; then
        cd "$PROJECT_DIR"
        git pull origin main || git pull origin master
    fi
    
    # 重新构建和启动
    build_images
    stop_services
    start_services
    wait_for_services
    run_migrations
    
    log "更新完成"
}

# 主函数
main() {
    local action="install"
    local force_flag=""
    
    # 解析命令行参数
    while [[ $# -gt 0 ]]; do
        case $1 in
            -e|--env)
                DEPLOY_ENV="$2"
                shift 2
                ;;
            -b|--backup)
                BACKUP_BEFORE_DEPLOY="true"
                shift
                ;;
            -m|--monitoring)
                ENABLE_MONITORING="true"
                shift
                ;;
            -f|--force)
                force_flag="--force"
                shift
                ;;
            -h|--help)
                show_help
                exit 0
                ;;
            install|update|restart|stop|status|logs)
                action="$1"
                shift
                ;;
            *)
                error "未知选项: $1"
                ;;
        esac
    done
    
    # 切换到项目目录
    cd "$PROJECT_DIR"
    
    # 执行操作
    case $action in
        "install")
            log "开始安装虚拟卡管理系统..."
            check_requirements
            create_directories
            setup_environment
            backup_data
            pull_images
            build_images
            start_services
            wait_for_services
            run_migrations
            create_admin_user
            show_deployment_info
            ;;
        "update")
            update_deployment
            show_deployment_info
            ;;
        "restart")
            restart_services
            ;;
        "stop")
            stop_services
            ;;
        "status")
            show_status
            ;;
        "logs")
            show_logs "$2"
            ;;
        *)
            error "未知操作: $action"
            ;;
    esac
}

# 脚本入口
if [ "${BASH_SOURCE[0]}" = "${0}" ]; then
    main "$@"
fi


