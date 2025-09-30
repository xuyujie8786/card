#!/bin/bash

# VCard项目部署脚本 - Lightsail
# 使用方法: ./deploy-to-lightsail.sh

set -e

echo "🚀 开始部署 VCard 项目到 Lightsail..."

# 服务器信息
SERVER="vcard-lightsail"
REMOTE_DIR="/home/ubuntu/vcard"

echo "📦 准备项目文件..."

# 创建部署包
echo "创建临时部署目录..."
mkdir -p /tmp/vcard-deploy
cp -r . /tmp/vcard-deploy/
cd /tmp/vcard-deploy

# 清理不需要的文件
echo "清理临时文件..."
rm -rf node_modules
rm -rf .git
rm -rf backend/node_modules
rm -f *.log
rm -f deploy-to-lightsail.sh

echo "📋 检查SSH连接..."
if ! ssh -o ConnectTimeout=10 $SERVER "echo 'SSH连接正常'"; then
    echo "❌ SSH连接失败，请检查："
    echo "1. Lightsail实例是否运行中"
    echo "2. 防火墙是否允许SSH"
    echo "3. 密钥是否正确"
    exit 1
fi

echo "🔧 安装服务器依赖..."
ssh $SERVER << 'EOF'
# 更新系统
sudo apt update

# 安装Docker和Docker Compose
if ! command -v docker &> /dev/null; then
    echo "安装Docker..."
    curl -fsSL https://get.docker.com -o get-docker.sh
    sudo sh get-docker.sh
    sudo usermod -aG docker ubuntu
    rm get-docker.sh
fi

if ! command -v docker-compose &> /dev/null; then
    echo "安装Docker Compose..."
    sudo curl -L "https://github.com/docker/compose/releases/download/v2.21.0/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
    sudo chmod +x /usr/local/bin/docker-compose
fi

# 安装Node.js (备用)
if ! command -v node &> /dev/null; then
    echo "安装Node.js..."
    curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
    sudo apt-get install -y nodejs
fi

echo "依赖安装完成"
EOF

echo "📂 上传项目文件..."
ssh $SERVER "mkdir -p $REMOTE_DIR"
rsync -avz --exclude='node_modules' --exclude='.git' --exclude='*.log' \
      ./ $SERVER:$REMOTE_DIR/

echo "🐳 启动Docker服务..."
ssh $SERVER << EOF
cd $REMOTE_DIR

# 确保Docker服务运行
sudo systemctl start docker
sudo systemctl enable docker

# 停止现有服务
docker-compose -f docker-compose.prod.yml down 2>/dev/null || true

# 构建并启动服务
docker-compose -f docker-compose.prod.yml up -d --build

# 显示服务状态
echo "等待服务启动..."
sleep 10
docker-compose -f docker-compose.prod.yml ps

echo "🎉 部署完成！"
echo "访问地址: http://\$(curl -s ifconfig.me):80"
EOF

echo "✅ 部署脚本执行完成！"
echo "🌐 你的应用应该现在可以通过 http://52.74.58.160 访问了"

# 清理临时文件
cd /Users/yujiexu/vcard
rm -rf /tmp/vcard-deploy

echo "📝 下一步："
echo "1. 打开浏览器访问 http://52.74.58.160"
echo "2. 检查应用是否正常运行"
echo "3. 如需要，配置域名和SSL证书"

