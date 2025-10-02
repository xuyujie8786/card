#!/bin/bash

# ==============================================
# 虚拟卡管理系统 - 健康检查脚本
# ==============================================

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# 检查结果统计
TOTAL_CHECKS=0
PASSED_CHECKS=0
FAILED_CHECKS=0

# 打印函数
print_header() {
    echo -e "${BLUE}=============================================="
    echo -e "   虚拟卡管理系统 - 健康检查报告"
    echo -e "   $(date '+%Y-%m-%d %H:%M:%S')"
    echo -e "==============================================\n${NC}"
}

print_check() {
    local name=$1
    local status=$2
    local message=$3
    
    TOTAL_CHECKS=$((TOTAL_CHECKS + 1))
    
    if [ "$status" = "ok" ]; then
        echo -e "${GREEN}✓${NC} $name: ${GREEN}正常${NC}"
        [ -n "$message" ] && echo -e "  └─ $message"
        PASSED_CHECKS=$((PASSED_CHECKS + 1))
    elif [ "$status" = "warn" ]; then
        echo -e "${YELLOW}⚠${NC} $name: ${YELLOW}警告${NC}"
        [ -n "$message" ] && echo -e "  └─ $message"
    else
        echo -e "${RED}✗${NC} $name: ${RED}失败${NC}"
        [ -n "$message" ] && echo -e "  └─ $message"
        FAILED_CHECKS=$((FAILED_CHECKS + 1))
    fi
}

print_section() {
    echo -e "\n${BLUE}▶ $1${NC}"
}

# 检查Docker服务
check_docker() {
    print_section "Docker 服务检查"
    
    if systemctl is-active --quiet docker 2>/dev/null || docker info &>/dev/null; then
        print_check "Docker服务" "ok" "运行中"
    else
        print_check "Docker服务" "fail" "未运行"
        return 1
    fi
    
    # 检查Docker Compose
    if command -v docker-compose &> /dev/null || docker compose version &> /dev/null; then
        COMPOSE_VERSION=$(docker-compose --version 2>/dev/null || docker compose version 2>/dev/null | head -1)
        print_check "Docker Compose" "ok" "$COMPOSE_VERSION"
    else
        print_check "Docker Compose" "fail" "未安装"
    fi
}

# 检查容器状态
check_containers() {
    print_section "容器状态检查"
    
    CONTAINERS=("vcard-postgres" "vcard-redis" "vcard-backend" "vcard-frontend")
    
    for container in "${CONTAINERS[@]}"; do
        if docker ps --format '{{.Names}}' | grep -q "^${container}$"; then
            STATUS=$(docker inspect --format='{{.State.Status}}' $container)
            HEALTH=$(docker inspect --format='{{.State.Health.Status}}' $container 2>/dev/null || echo "none")
            
            if [ "$STATUS" = "running" ]; then
                if [ "$HEALTH" = "healthy" ] || [ "$HEALTH" = "none" ]; then
                    print_check "$container" "ok" "运行中${HEALTH:+ (健康)}"
                else
                    print_check "$container" "warn" "运行中但健康检查失败: $HEALTH"
                fi
            else
                print_check "$container" "fail" "状态: $STATUS"
            fi
        else
            print_check "$container" "fail" "容器未运行"
        fi
    done
}

# 检查服务端点
check_endpoints() {
    print_section "服务端点检查"
    
    # 检查后端API
    if curl -f -s http://localhost:3001/api/health > /dev/null 2>&1; then
        print_check "后端API" "ok" "http://localhost:3001/api/health"
    else
        print_check "后端API" "fail" "无法访问 http://localhost:3001/api/health"
    fi
    
    # 检查前端
    if curl -f -s http://localhost:8000/health > /dev/null 2>&1; then
        print_check "前端服务" "ok" "http://localhost:8000/health"
    else
        print_check "前端服务" "fail" "无法访问 http://localhost:8000/health"
    fi
    
    # 检查数据库
    if docker exec vcard-postgres pg_isready -U vcard_user > /dev/null 2>&1; then
        print_check "PostgreSQL" "ok" "可连接"
    else
        print_check "PostgreSQL" "fail" "连接失败"
    fi
    
    # 检查Redis
    if docker exec vcard-redis redis-cli ping > /dev/null 2>&1; then
        print_check "Redis" "ok" "可连接"
    else
        print_check "Redis" "fail" "连接失败"
    fi
}

# 检查资源使用
check_resources() {
    print_section "资源使用检查"
    
    # CPU使用率
    if command -v top &> /dev/null; then
        CPU_USAGE=$(top -bn1 | grep "Cpu(s)" | sed "s/.*, *\([0-9.]*\)%* id.*/\1/" | awk '{print 100 - $1}')
        if (( $(echo "$CPU_USAGE < 80" | bc -l) )); then
            print_check "CPU使用率" "ok" "${CPU_USAGE}%"
        else
            print_check "CPU使用率" "warn" "${CPU_USAGE}% (超过80%)"
        fi
    fi
    
    # 内存使用率
    if command -v free &> /dev/null; then
        MEM_USAGE=$(free | grep Mem | awk '{printf("%.1f", $3/$2 * 100.0)}')
        if (( $(echo "$MEM_USAGE < 80" | bc -l) )); then
            print_check "内存使用率" "ok" "${MEM_USAGE}%"
        else
            print_check "内存使用率" "warn" "${MEM_USAGE}% (超过80%)"
        fi
    fi
    
    # 磁盘使用率
    DISK_USAGE=$(df -h / | awk 'NR==2 {print $5}' | sed 's/%//')
    if [ "$DISK_USAGE" -lt 80 ]; then
        print_check "磁盘使用率" "ok" "${DISK_USAGE}%"
    else
        print_check "磁盘使用率" "warn" "${DISK_USAGE}% (超过80%)"
    fi
}

# 检查Docker卷
check_volumes() {
    print_section "数据卷检查"
    
    VOLUMES=("vcard_postgres_data" "vcard_redis_data" "vcard_backend_logs" "vcard_nginx_logs")
    
    for volume in "${VOLUMES[@]}"; do
        if docker volume ls --format '{{.Name}}' | grep -q "^${volume}$"; then
            SIZE=$(docker system df -v | grep "$volume" | awk '{print $3}' || echo "unknown")
            print_check "$volume" "ok" "大小: $SIZE"
        else
            print_check "$volume" "warn" "数据卷不存在"
        fi
    done
}

# 检查日志大小
check_logs() {
    print_section "日志检查"
    
    # 检查后端日志
    if docker exec vcard-backend sh -c "ls -lh /app/logs/*.log 2>/dev/null" > /dev/null 2>&1; then
        LOG_SIZE=$(docker exec vcard-backend sh -c "du -sh /app/logs 2>/dev/null" | awk '{print $1}')
        print_check "后端日志" "ok" "大小: $LOG_SIZE"
    else
        print_check "后端日志" "warn" "日志目录为空或不存在"
    fi
    
    # 检查Docker日志大小
    BACKEND_LOG_SIZE=$(docker inspect vcard-backend --format='{{.LogPath}}' | xargs ls -lh 2>/dev/null | awk '{print $5}')
    if [ -n "$BACKEND_LOG_SIZE" ]; then
        print_check "Docker日志" "ok" "大小: $BACKEND_LOG_SIZE"
    fi
}

# 检查网络连接
check_network() {
    print_section "网络连接检查"
    
    # 检查容器间网络
    if docker exec vcard-backend ping -c 1 database > /dev/null 2>&1; then
        print_check "Backend -> Database" "ok" "可连接"
    else
        print_check "Backend -> Database" "fail" "无法连接"
    fi
    
    if docker exec vcard-backend ping -c 1 redis > /dev/null 2>&1; then
        print_check "Backend -> Redis" "ok" "可连接"
    else
        print_check "Backend -> Redis" "fail" "无法连接"
    fi
    
    if docker exec vcard-frontend ping -c 1 backend > /dev/null 2>&1; then
        print_check "Frontend -> Backend" "ok" "可连接"
    else
        print_check "Frontend -> Backend" "fail" "无法连接"
    fi
}

# 检查定时任务
check_cron_jobs() {
    print_section "定时任务检查"
    
    # 检查是否启用定时任务
    if docker exec vcard-backend sh -c 'echo $SYNC_ENABLED' | grep -q "true"; then
        print_check "定时任务状态" "ok" "已启用"
        
        # 检查定时任务配置
        AUTH_CRON=$(docker exec vcard-backend sh -c 'echo $SYNC_AUTH_PREVIOUS_CRON')
        print_check "授权同步定时" "ok" "$AUTH_CRON"
    else
        print_check "定时任务状态" "warn" "未启用"
    fi
}

# 生成报告摘要
print_summary() {
    echo -e "\n${BLUE}=============================================="
    echo -e "   检查摘要"
    echo -e "===============================================${NC}"
    echo -e "总检查项: $TOTAL_CHECKS"
    echo -e "${GREEN}通过: $PASSED_CHECKS${NC}"
    echo -e "${RED}失败: $FAILED_CHECKS${NC}"
    
    if [ $FAILED_CHECKS -eq 0 ]; then
        echo -e "\n${GREEN}✓ 所有检查通过，系统运行正常${NC}\n"
        exit 0
    else
        echo -e "\n${RED}✗ 发现 $FAILED_CHECKS 个问题，请检查日志${NC}\n"
        exit 1
    fi
}

# 主函数
main() {
    print_header
    
    check_docker
    check_containers
    check_endpoints
    check_resources
    check_volumes
    check_logs
    check_network
    check_cron_jobs
    
    print_summary
}

# 运行主函数
main "$@"

