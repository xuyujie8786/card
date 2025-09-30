#!/bin/bash

# ==============================================
# 虚拟卡管理系统备份脚本
# ==============================================

set -e  # 遇到错误立即退出

# 配置变量
BACKUP_DIR="${BACKUP_DIR:-/opt/backups/vcard}"
POSTGRES_CONTAINER="${POSTGRES_CONTAINER:-vcard-postgres}"
REDIS_CONTAINER="${REDIS_CONTAINER:-vcard-redis}"
DATE=$(date +"%Y%m%d_%H%M%S")
RETENTION_DAYS="${BACKUP_RETENTION_DAYS:-30}"

# 日志函数
log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1"
}

# 创建备份目录
create_backup_dir() {
    mkdir -p "$BACKUP_DIR/db/$DATE"
    mkdir -p "$BACKUP_DIR/redis/$DATE"
    mkdir -p "$BACKUP_DIR/logs/$DATE"
    mkdir -p "$BACKUP_DIR/configs/$DATE"
}

# 备份PostgreSQL数据库
backup_postgres() {
    log "开始备份PostgreSQL数据库..."
    
    docker exec $POSTGRES_CONTAINER pg_dumpall -U ${DB_USER:-vcard_user} > \
        "$BACKUP_DIR/db/$DATE/postgres_backup.sql"
    
    # 压缩备份文件
    gzip "$BACKUP_DIR/db/$DATE/postgres_backup.sql"
    
    log "PostgreSQL备份完成: $BACKUP_DIR/db/$DATE/postgres_backup.sql.gz"
}

# 备份Redis数据
backup_redis() {
    log "开始备份Redis数据..."
    
    # 触发Redis保存
    docker exec $REDIS_CONTAINER redis-cli --no-auth-warning -a ${REDIS_PASSWORD:-redis_password123} BGSAVE
    
    # 等待保存完成
    sleep 5
    
    # 复制RDB文件
    docker cp $REDIS_CONTAINER:/data/dump.rdb "$BACKUP_DIR/redis/$DATE/"
    
    # 压缩备份文件
    gzip "$BACKUP_DIR/redis/$DATE/dump.rdb"
    
    log "Redis备份完成: $BACKUP_DIR/redis/$DATE/dump.rdb.gz"
}

# 备份应用日志
backup_logs() {
    log "开始备份应用日志..."
    
    # 复制后端日志
    if docker volume inspect vcard_backend_logs > /dev/null 2>&1; then
        docker run --rm -v vcard_backend_logs:/source -v "$BACKUP_DIR/logs/$DATE":/dest alpine \
            sh -c "cp -r /source/* /dest/ 2>/dev/null || true"
    fi
    
    # 复制Nginx日志
    if docker volume inspect vcard_nginx_logs > /dev/null 2>&1; then
        docker run --rm -v vcard_nginx_logs:/source -v "$BACKUP_DIR/logs/$DATE":/dest alpine \
            sh -c "cp -r /source/* /dest/ 2>/dev/null || true"
    fi
    
    # 压缩日志文件
    if [ "$(ls -A $BACKUP_DIR/logs/$DATE)" ]; then
        tar -czf "$BACKUP_DIR/logs/$DATE/logs_backup.tar.gz" -C "$BACKUP_DIR/logs/$DATE" . \
            --exclude="logs_backup.tar.gz" 2>/dev/null || true
        
        # 删除原始日志文件，保留压缩包
        find "$BACKUP_DIR/logs/$DATE" -type f ! -name "logs_backup.tar.gz" -delete 2>/dev/null || true
    fi
    
    log "日志备份完成: $BACKUP_DIR/logs/$DATE/"
}

# 备份配置文件
backup_configs() {
    log "开始备份配置文件..."
    
    # 备份Docker配置
    cp docker-compose*.yml "$BACKUP_DIR/configs/$DATE/" 2>/dev/null || true
    cp env.example "$BACKUP_DIR/configs/$DATE/" 2>/dev/null || true
    
    # 备份监控配置
    if [ -d "monitoring" ]; then
        cp -r monitoring "$BACKUP_DIR/configs/$DATE/" 2>/dev/null || true
    fi
    
    # 备份Nginx配置
    if [ -f "v1/nginx.conf" ]; then
        cp v1/nginx.conf "$BACKUP_DIR/configs/$DATE/" 2>/dev/null || true
    fi
    
    # 压缩配置文件
    tar -czf "$BACKUP_DIR/configs/$DATE/configs_backup.tar.gz" -C "$BACKUP_DIR/configs/$DATE" . \
        --exclude="configs_backup.tar.gz" 2>/dev/null || true
    
    log "配置备份完成: $BACKUP_DIR/configs/$DATE/"
}

# 清理过期备份
cleanup_old_backups() {
    log "清理$RETENTION_DAYS天前的备份..."
    
    find "$BACKUP_DIR" -type d -name "20*" -mtime +$RETENTION_DAYS -exec rm -rf {} \; 2>/dev/null || true
    
    log "清理完成"
}

# 上传到云存储（可选）
upload_to_cloud() {
    if [ -n "$AWS_ACCESS_KEY_ID" ] && [ -n "$BACKUP_S3_BUCKET" ]; then
        log "上传备份到S3..."
        
        # 创建备份压缩包
        BACKUP_ARCHIVE="$BACKUP_DIR/vcard_backup_$DATE.tar.gz"
        tar -czf "$BACKUP_ARCHIVE" -C "$BACKUP_DIR" "$DATE"
        
        # 上传到S3（需要安装aws-cli）
        if command -v aws >/dev/null 2>&1; then
            aws s3 cp "$BACKUP_ARCHIVE" "s3://$BACKUP_S3_BUCKET/vcard-backups/" \
                --storage-class STANDARD_IA
            
            # 删除本地压缩包
            rm "$BACKUP_ARCHIVE"
            
            log "S3上传完成"
        else
            log "警告: aws-cli未安装，跳过S3上传"
        fi
    fi
}

# 发送备份通知
send_notification() {
    if [ -n "$BACKUP_WEBHOOK_URL" ]; then
        log "发送备份通知..."
        
        curl -X POST "$BACKUP_WEBHOOK_URL" \
            -H "Content-Type: application/json" \
            -d "{
                \"text\": \"✅ 虚拟卡系统备份完成\",
                \"attachments\": [{
                    \"color\": \"good\",
                    \"fields\": [{
                        \"title\": \"备份时间\",
                        \"value\": \"$DATE\",
                        \"short\": true
                    }, {
                        \"title\": \"备份位置\",
                        \"value\": \"$BACKUP_DIR/$DATE\",
                        \"short\": true
                    }]
                }]
            }" 2>/dev/null || true
    fi
}

# 主备份流程
main() {
    log "开始执行备份任务..."
    
    # 检查Docker容器是否运行
    if ! docker ps | grep -q $POSTGRES_CONTAINER; then
        log "错误: PostgreSQL容器未运行"
        exit 1
    fi
    
    if ! docker ps | grep -q $REDIS_CONTAINER; then
        log "错误: Redis容器未运行"
        exit 1
    fi
    
    # 执行备份
    create_backup_dir
    backup_postgres
    backup_redis
    backup_logs
    backup_configs
    cleanup_old_backups
    upload_to_cloud
    send_notification
    
    log "备份任务完成!"
}

# 脚本入口
if [ "${BASH_SOURCE[0]}" = "${0}" ]; then
    main "$@"
fi


