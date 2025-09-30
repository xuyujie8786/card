#!/bin/bash

# ==============================================
# 虚拟卡管理系统恢复脚本
# ==============================================

set -e  # 遇到错误立即退出

# 配置变量
BACKUP_DIR="${BACKUP_DIR:-/opt/backups/vcard}"
POSTGRES_CONTAINER="${POSTGRES_CONTAINER:-vcard-postgres}"
REDIS_CONTAINER="${REDIS_CONTAINER:-vcard-redis}"

# 日志函数
log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1"
}

# 显示使用说明
usage() {
    echo "使用方法: $0 <backup_date> [options]"
    echo ""
    echo "参数:"
    echo "  backup_date     备份日期，格式: YYYYMMDD_HHMMSS"
    echo ""
    echo "选项:"
    echo "  --db-only       仅恢复数据库"
    echo "  --redis-only    仅恢复Redis"
    echo "  --logs-only     仅恢复日志"
    echo "  --configs-only  仅恢复配置"
    echo "  --force         强制恢复，不询问确认"
    echo ""
    echo "示例:"
    echo "  $0 20231225_120000                    # 恢复所有数据"
    echo "  $0 20231225_120000 --db-only          # 仅恢复数据库"
    echo "  $0 20231225_120000 --force            # 强制恢复"
}

# 检查备份文件是否存在
check_backup_exists() {
    local backup_date=$1
    local backup_path="$BACKUP_DIR/$backup_date"
    
    if [ ! -d "$backup_path" ]; then
        log "错误: 备份目录不存在: $backup_path"
        log "可用备份列表:"
        ls -la "$BACKUP_DIR" 2>/dev/null | grep "^d" | grep "20" || log "无可用备份"
        exit 1
    fi
}

# 确认恢复操作
confirm_restore() {
    if [ "$FORCE" != "true" ]; then
        echo ""
        echo "⚠️  警告: 此操作将覆盖现有数据!"
        echo "备份日期: $BACKUP_DATE"
        echo "恢复内容: $RESTORE_TYPE"
        echo ""
        read -p "是否继续? (y/N): " -n 1 -r
        echo ""
        
        if [[ ! $REPLY =~ ^[Yy]$ ]]; then
            log "操作已取消"
            exit 0
        fi
    fi
}

# 恢复PostgreSQL数据库
restore_postgres() {
    log "开始恢复PostgreSQL数据库..."
    
    local backup_file="$BACKUP_DIR/$BACKUP_DATE/db/postgres_backup.sql.gz"
    
    if [ ! -f "$backup_file" ]; then
        log "错误: 数据库备份文件不存在: $backup_file"
        exit 1
    fi
    
    # 停止应用连接
    log "停止后端应用..."
    docker-compose stop backend 2>/dev/null || true
    
    # 等待连接关闭
    sleep 5
    
    # 恢复数据库
    log "恢复数据库数据..."
    gunzip -c "$backup_file" | docker exec -i $POSTGRES_CONTAINER psql -U ${DB_USER:-vcard_user} -d postgres
    
    log "PostgreSQL恢复完成"
}

# 恢复Redis数据
restore_redis() {
    log "开始恢复Redis数据..."
    
    local backup_file="$BACKUP_DIR/$BACKUP_DATE/redis/dump.rdb.gz"
    
    if [ ! -f "$backup_file" ]; then
        log "错误: Redis备份文件不存在: $backup_file"
        exit 1
    fi
    
    # 停止Redis服务
    log "停止Redis服务..."
    docker-compose stop redis
    
    # 恢复Redis数据文件
    log "恢复Redis数据..."
    gunzip -c "$backup_file" > /tmp/dump.rdb
    docker cp /tmp/dump.rdb $REDIS_CONTAINER:/data/dump.rdb
    rm /tmp/dump.rdb
    
    # 重启Redis服务
    log "重启Redis服务..."
    docker-compose start redis
    
    log "Redis恢复完成"
}

# 恢复应用日志
restore_logs() {
    log "开始恢复应用日志..."
    
    local backup_file="$BACKUP_DIR/$BACKUP_DATE/logs/logs_backup.tar.gz"
    
    if [ ! -f "$backup_file" ]; then
        log "警告: 日志备份文件不存在: $backup_file"
        return
    fi
    
    # 创建临时目录
    local temp_dir="/tmp/restore_logs_$$"
    mkdir -p "$temp_dir"
    
    # 解压日志文件
    tar -xzf "$backup_file" -C "$temp_dir"
    
    # 恢复到Docker卷
    if docker volume inspect vcard_backend_logs > /dev/null 2>&1; then
        docker run --rm -v "$temp_dir":/source -v vcard_backend_logs:/dest alpine \
            sh -c "cp -r /source/* /dest/ 2>/dev/null || true"
    fi
    
    if docker volume inspect vcard_nginx_logs > /dev/null 2>&1; then
        docker run --rm -v "$temp_dir":/source -v vcard_nginx_logs:/dest alpine \
            sh -c "cp -r /source/* /dest/ 2>/dev/null || true"
    fi
    
    # 清理临时目录
    rm -rf "$temp_dir"
    
    log "日志恢复完成"
}

# 恢复配置文件
restore_configs() {
    log "开始恢复配置文件..."
    
    local backup_file="$BACKUP_DIR/$BACKUP_DATE/configs/configs_backup.tar.gz"
    
    if [ ! -f "$backup_file" ]; then
        log "警告: 配置备份文件不存在: $backup_file"
        return
    fi
    
    # 备份当前配置
    local current_backup_dir="/tmp/current_configs_backup_$$"
    mkdir -p "$current_backup_dir"
    
    cp docker-compose*.yml "$current_backup_dir/" 2>/dev/null || true
    cp env.example "$current_backup_dir/" 2>/dev/null || true
    cp -r monitoring "$current_backup_dir/" 2>/dev/null || true
    cp v1/nginx.conf "$current_backup_dir/" 2>/dev/null || true
    
    # 恢复配置文件
    tar -xzf "$backup_file" -C .
    
    log "配置恢复完成"
    log "当前配置已备份到: $current_backup_dir"
}

# 重启服务
restart_services() {
    log "重启所有服务..."
    
    docker-compose down
    sleep 5
    docker-compose up -d
    
    # 等待服务启动
    log "等待服务启动..."
    sleep 30
    
    # 检查服务状态
    if docker-compose ps | grep -q "Up"; then
        log "服务启动成功"
    else
        log "警告: 部分服务可能启动失败，请检查"
        docker-compose ps
    fi
}

# 验证恢复结果
verify_restore() {
    log "验证恢复结果..."
    
    # 检查数据库连接
    if docker exec $POSTGRES_CONTAINER pg_isready -U ${DB_USER:-vcard_user} -d ${DB_NAME:-vcard_db} > /dev/null 2>&1; then
        log "✅ PostgreSQL连接正常"
    else
        log "❌ PostgreSQL连接失败"
    fi
    
    # 检查Redis连接
    if docker exec $REDIS_CONTAINER redis-cli --no-auth-warning -a ${REDIS_PASSWORD:-redis_password123} ping > /dev/null 2>&1; then
        log "✅ Redis连接正常"
    else
        log "❌ Redis连接失败"
    fi
    
    # 检查应用健康状态
    sleep 10
    if curl -f http://localhost:${BACKEND_PORT:-3001}/api/health > /dev/null 2>&1; then
        log "✅ 后端应用健康检查通过"
    else
        log "❌ 后端应用健康检查失败"
    fi
    
    if curl -f http://localhost:${FRONTEND_PORT:-8000}/health > /dev/null 2>&1; then
        log "✅ 前端应用健康检查通过"
    else
        log "❌ 前端应用健康检查失败"
    fi
}

# 主恢复流程
main() {
    local backup_date="$1"
    
    if [ -z "$backup_date" ]; then
        usage
        exit 1
    fi
    
    BACKUP_DATE="$backup_date"
    RESTORE_TYPE="所有数据"
    FORCE="false"
    
    # 解析选项
    shift
    while [[ $# -gt 0 ]]; do
        case $1 in
            --db-only)
                DB_ONLY="true"
                RESTORE_TYPE="数据库"
                shift
                ;;
            --redis-only)
                REDIS_ONLY="true"
                RESTORE_TYPE="Redis"
                shift
                ;;
            --logs-only)
                LOGS_ONLY="true"
                RESTORE_TYPE="日志"
                shift
                ;;
            --configs-only)
                CONFIGS_ONLY="true"
                RESTORE_TYPE="配置"
                shift
                ;;
            --force)
                FORCE="true"
                shift
                ;;
            *)
                log "未知选项: $1"
                usage
                exit 1
                ;;
        esac
    done
    
    log "开始恢复操作..."
    
    # 检查备份是否存在
    check_backup_exists "$backup_date"
    
    # 确认操作
    confirm_restore
    
    # 执行恢复
    if [ "$DB_ONLY" = "true" ]; then
        restore_postgres
    elif [ "$REDIS_ONLY" = "true" ]; then
        restore_redis
    elif [ "$LOGS_ONLY" = "true" ]; then
        restore_logs
    elif [ "$CONFIGS_ONLY" = "true" ]; then
        restore_configs
    else
        # 完整恢复
        restore_postgres
        restore_redis
        restore_logs
        restore_configs
    fi
    
    # 重启服务
    restart_services
    
    # 验证恢复结果
    verify_restore
    
    log "恢复操作完成!"
}

# 脚本入口
if [ "${BASH_SOURCE[0]}" = "${0}" ]; then
    main "$@"
fi


