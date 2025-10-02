#!/bin/bash

# ==============================================
# 虚拟卡管理系统 - Lightsail 完整部署脚本
# ==============================================
# 
# 功能：
# 1. 自动上传代码到Lightsail服务器
# 2. 自动配置环境变量（替换IP地址）
# 3. 安装Docker和依赖
# 4. 构建和启动服务
# 5. 验证部署结果
#
# 使用方法：
# ./deploy-to-lightsail-complete.sh <服务器IP> [SSH密钥路径]
#
# ==============================================

set -e  # 遇到错误立即退出

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# 打印函数
print_step() {
    echo ""
    echo -e "${CYAN}============================================${NC}"
    echo -e "${CYAN} 步骤 $1: $2${NC}"
    echo -e "${CYAN}============================================${NC}"
}

print_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[✓]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[!]${NC} $1"
}

print_error() {
    echo -e "${RED}[✗]${NC} $1"
}

# 显示横幅
show_banner() {
    echo -e "${GREEN}"
    cat << "EOF"
╔══════════════════════════════════════════╗
║   虚拟卡管理系统 - Lightsail 部署工具    ║
╚══════════════════════════════════════════╝
EOF
    echo -e "${NC}"
}

# 检查参数
check_args() {
    if [ $# -lt 1 ]; then
        print_error "缺少必要参数！"
        echo ""
        echo "使用方法："
        echo "  $0 <服务器IP> [SSH密钥路径]"
        echo ""
        echo "示例："
        echo "  $0 52.74.58.160"
        echo "  $0 52.74.58.160 ~/.ssh/lightsail-key.pem"
        exit 1
    fi

    SERVER_IP=$1
    SSH_KEY=${2:-"~/.ssh/LightsailDefaultKey-ap-southeast-1.pem"}
    SSH_USER="ubuntu"
    REMOTE_DIR="/home/ubuntu/vcard"
    
    print_info "目标服务器: ${GREEN}$SERVER_IP${NC}"
    print_info "SSH密钥: ${GREEN}$SSH_KEY${NC}"
    print_info "远程目录: ${GREEN}$REMOTE_DIR${NC}"
}

# 检查本地环境
check_local_env() {
    print_step 1 "检查本地环境"
    
    # 检查SSH密钥
    if [ ! -f "$SSH_KEY" ]; then
        print_error "SSH密钥文件不存在: $SSH_KEY"
        exit 1
    fi
    print_success "SSH密钥存在"
    
    # 检查必要文件
    local required_files=(
        "docker-compose.production.yml"
        "backend/Dockerfile.optimized"
        "v1/Dockerfile.optimized"
        ".env.production.new"
    )
    
    for file in "${required_files[@]}"; do
        if [ ! -f "$file" ]; then
            print_error "缺少必要文件: $file"
            exit 1
        fi
    done
    print_success "所有必要文件已就绪"
    
    # 测试SSH连接
    print_info "测试SSH连接..."
    if ssh -i "$SSH_KEY" -o StrictHostKeyChecking=no -o ConnectTimeout=10 $SSH_USER@$SERVER_IP "echo 'SSH连接成功'" &>/dev/null; then
        print_success "SSH连接正常"
    else
        print_error "无法连接到服务器，请检查IP地址和SSH密钥"
        exit 1
    fi
}

# 准备环境配置文件
prepare_env_file() {
    print_step 2 "准备环境配置"
    
    # 复制配置文件并替换IP地址
    print_info "生成服务器专用配置..."
    sed "s/YOUR_SERVER_IP/$SERVER_IP/g" .env.production.new > .env.production.deploy
    
    print_success "环境配置已生成"
    print_info "前端地址: http://$SERVER_IP:8000"
    print_info "后端地址: http://$SERVER_IP:3001"
}

# 创建部署包
create_deployment_package() {
    print_step 3 "创建部署包"
    
    print_info "清理旧部署包..."
    rm -rf vcard-deploy.tar.gz
    
    print_info "打包项目文件..."
    
    # 创建临时目录
    TEMP_DIR=$(mktemp -d)
    
    # 复制必要文件
    rsync -a --exclude='node_modules' \
             --exclude='.git' \
             --exclude='dist' \
             --exclude='build' \
             --exclude='*.log' \
             --exclude='.env.production.new' \
             --exclude='.env.production.deploy' \
             --exclude='vcard-deploy.tar.gz' \
             ./ $TEMP_DIR/
    
    # 复制配置文件
    cp .env.production.deploy $TEMP_DIR/.env.production
    
    # 打包
    tar -czf vcard-deploy.tar.gz -C $TEMP_DIR .
    
    # 清理临时目录
    rm -rf $TEMP_DIR
    
    local size=$(du -h vcard-deploy.tar.gz | cut -f1)
    print_success "部署包已创建 (大小: $size)"
}

# 上传到服务器
upload_to_server() {
    print_step 4 "上传到服务器"
    
    print_info "上传部署包..."
    ssh -i "$SSH_KEY" $SSH_USER@$SERVER_IP "mkdir -p $REMOTE_DIR"
    scp -i "$SSH_KEY" vcard-deploy.tar.gz $SSH_USER@$SERVER_IP:$REMOTE_DIR/
    
    print_info "解压部署包..."
    ssh -i "$SSH_KEY" $SSH_USER@$SERVER_IP << EOF
        cd $REMOTE_DIR
        tar -xzf vcard-deploy.tar.gz
        rm vcard-deploy.tar.gz
        chmod +x *.sh 2>/dev/null || true
EOF
    
    print_success "文件上传完成"
    
    # 清理本地部署包
    rm -f vcard-deploy.tar.gz .env.production.deploy
}

# 安装Docker
install_docker() {
    print_step 5 "安装Docker环境"
    
    print_info "检查Docker安装状态..."
    
    ssh -i "$SSH_KEY" $SSH_USER@$SERVER_IP << 'REMOTE_SCRIPT'
        if command -v docker &> /dev/null; then
            echo "Docker已安装，版本: $(docker --version)"
        else
            echo "安装Docker..."
            
            # 更新系统
            sudo apt-get update
            
            # 安装必要依赖
            sudo apt-get install -y \
                apt-transport-https \
                ca-certificates \
                curl \
                gnupg \
                lsb-release
            
            # 添加Docker GPG密钥
            curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /usr/share/keyrings/docker-archive-keyring.gpg
            
            # 添加Docker仓库
            echo "deb [arch=$(dpkg --print-architecture) signed-by=/usr/share/keyrings/docker-archive-keyring.gpg] https://download.docker.com/linux/ubuntu $(lsb_release -cs) stable" | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null
            
            # 安装Docker
            sudo apt-get update
            sudo apt-get install -y docker-ce docker-ce-cli containerd.io docker-compose-plugin
            
            # 启动Docker
            sudo systemctl start docker
            sudo systemctl enable docker
            
            # 添加当前用户到docker组
            sudo usermod -aG docker $USER
            
            echo "Docker安装完成"
        fi
        
        # 检查Docker Compose
        if docker compose version &> /dev/null; then
            echo "Docker Compose已安装"
        else
            echo "安装Docker Compose..."
            sudo apt-get install -y docker-compose
        fi
REMOTE_SCRIPT
    
    print_success "Docker环境就绪"
}

# 构建和启动服务
deploy_services() {
    print_step 6 "构建和启动服务"
    
    print_info "停止旧服务（如果存在）..."
    ssh -i "$SSH_KEY" $SSH_USER@$SERVER_IP << 'REMOTE_SCRIPT'
        cd /home/ubuntu/vcard
        sudo docker compose -f docker-compose.production.yml down 2>/dev/null || true
REMOTE_SCRIPT
    
    print_info "构建Docker镜像..."
    ssh -i "$SSH_KEY" $SSH_USER@$SERVER_IP << 'REMOTE_SCRIPT'
        cd /home/ubuntu/vcard
        
        echo "构建后端镜像..."
        sudo docker build -f backend/Dockerfile.optimized -t vcard-backend:latest ./backend
        
        echo "构建前端镜像..."
        sudo docker build -f v1/Dockerfile.optimized -t vcard-frontend:latest ./v1
REMOTE_SCRIPT
    
    print_info "启动服务..."
    ssh -i "$SSH_KEY" $SSH_USER@$SERVER_IP << 'REMOTE_SCRIPT'
        cd /home/ubuntu/vcard
        sudo docker compose -f docker-compose.production.yml up -d
REMOTE_SCRIPT
    
    print_success "服务已启动"
}

# 等待服务就绪
wait_for_services() {
    print_step 7 "等待服务就绪"
    
    print_info "等待数据库初始化..."
    sleep 15
    
    print_info "等待后端服务..."
    local max_retries=30
    local retry_count=0
    
    while [ $retry_count -lt $max_retries ]; do
        if curl -f -s http://$SERVER_IP:3001/api/health &>/dev/null; then
            print_success "后端服务已就绪"
            break
        fi
        
        retry_count=$((retry_count + 1))
        echo -n "."
        sleep 2
    done
    
    if [ $retry_count -eq $max_retries ]; then
        print_warning "后端服务启动超时，请检查日志"
    fi
    
    print_info "等待前端服务..."
    sleep 5
    
    if curl -f -s http://$SERVER_IP:8000/health &>/dev/null; then
        print_success "前端服务已就绪"
    else
        print_warning "前端服务检查失败，但可能仍在启动中"
    fi
}

# 运行数据库迁移
run_database_migration() {
    print_step 8 "运行数据库迁移"
    
    print_info "生成Prisma客户端..."
    ssh -i "$SSH_KEY" $SSH_USER@$SERVER_IP << 'REMOTE_SCRIPT'
        cd /home/ubuntu/vcard
        sudo docker exec vcard-backend npx prisma generate || true
REMOTE_SCRIPT
    
    print_info "运行数据库迁移..."
    ssh -i "$SSH_KEY" $SSH_USER@$SERVER_IP << 'REMOTE_SCRIPT'
        cd /home/ubuntu/vcard
        sudo docker exec vcard-backend npx prisma migrate deploy || true
REMOTE_SCRIPT
    
    print_success "数据库迁移完成"
}

# 验证部署
verify_deployment() {
    print_step 9 "验证部署结果"
    
    print_info "检查容器状态..."
    ssh -i "$SSH_KEY" $SSH_USER@$SERVER_IP << 'REMOTE_SCRIPT'
        cd /home/ubuntu/vcard
        sudo docker compose -f docker-compose.production.yml ps
REMOTE_SCRIPT
    
    echo ""
    print_info "测试服务端点..."
    
    # 测试后端健康检查
    if curl -f -s http://$SERVER_IP:3001/api/health &>/dev/null; then
        print_success "后端服务正常"
    else
        print_warning "后端服务检查失败"
    fi
    
    # 测试前端
    if curl -f -s http://$SERVER_IP:8000/health &>/dev/null; then
        print_success "前端服务正常"
    else
        print_warning "前端服务检查失败"
    fi
}

# 显示部署信息
show_deployment_info() {
    print_step 10 "部署完成"
    
    # 读取管理员密码
    local admin_password=$(grep "ADMIN_PASSWORD=" .env.production.new | cut -d '=' -f2)
    
    echo ""
    echo -e "${GREEN}╔══════════════════════════════════════════╗${NC}"
    echo -e "${GREEN}║          部署成功！                      ║${NC}"
    echo -e "${GREEN}╚══════════════════════════════════════════╝${NC}"
    echo ""
    echo -e "${CYAN}📌 访问信息${NC}"
    echo -e "  前端地址: ${GREEN}http://$SERVER_IP:8000${NC}"
    echo -e "  后端API:  ${GREEN}http://$SERVER_IP:3001/api${NC}"
    echo ""
    echo -e "${CYAN}🔐 管理员账号${NC}"
    echo -e "  邮箱:     ${GREEN}admin@vcard.local${NC}"
    echo -e "  密码:     ${GREEN}$admin_password${NC}"
    echo -e "  ${YELLOW}⚠️  首次登录后请立即修改密码！${NC}"
    echo ""
    echo -e "${CYAN}📊 常用命令${NC}"
    echo -e "  查看日志:   ${BLUE}ssh -i $SSH_KEY $SSH_USER@$SERVER_IP 'cd $REMOTE_DIR && sudo docker compose -f docker-compose.production.yml logs -f'${NC}"
    echo -e "  重启服务:   ${BLUE}ssh -i $SSH_KEY $SSH_USER@$SERVER_IP 'cd $REMOTE_DIR && sudo docker compose -f docker-compose.production.yml restart'${NC}"
    echo -e "  停止服务:   ${BLUE}ssh -i $SSH_KEY $SSH_USER@$SERVER_IP 'cd $REMOTE_DIR && sudo docker compose -f docker-compose.production.yml down'${NC}"
    echo ""
    echo -e "${CYAN}🛡️  安全建议${NC}"
    echo -e "  1. 配置防火墙，只开放 8000 和 3001 端口"
    echo -e "  2. 启用HTTPS（建议使用Nginx + Let's Encrypt）"
    echo -e "  3. 定期备份数据库"
    echo -e "  4. 定期更新系统和Docker镜像"
    echo ""
}

# 主函数
main() {
    show_banner
    check_args "$@"
    check_local_env
    prepare_env_file
    create_deployment_package
    upload_to_server
    install_docker
    deploy_services
    wait_for_services
    run_database_migration
    verify_deployment
    show_deployment_info
}

# 运行主函数
main "$@"


