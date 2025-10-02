#!/bin/bash

# 上传代码到 Lightsail 服务器
# 用法: ./upload-to-server.sh <服务器IP>

set -e

SERVER_IP=${1:-"52.74.58.160"}
SSH_KEY="${2:-$HOME/.ssh/LightsailDefaultKey-ap-southeast-1.pem}"
REMOTE_USER="ubuntu"
REMOTE_DIR="/home/ubuntu/vcard"

echo "=========================================="
echo "📦 上传代码到服务器"
echo "=========================================="
echo "服务器IP: $SERVER_IP"
echo "SSH密钥: $SSH_KEY"
echo ""

# 检查 SSH 密钥
if [ ! -f "$SSH_KEY" ]; then
    echo "❌ SSH密钥不存在: $SSH_KEY"
    echo "请使用 Lightsail 网页 SSH 上传代码"
    exit 1
fi

echo "1️⃣ 打包项目文件..."
tar -czf /tmp/vcard-code.tar.gz \
    --exclude='node_modules' \
    --exclude='dist' \
    --exclude='.git' \
    --exclude='*.log' \
    --exclude='*.db' \
    --exclude='vcard_backup_*' \
    --exclude='.playwright-mcp' \
    backend/ v1/ docker-compose.production.yml

echo "✅ 打包完成: $(du -h /tmp/vcard-code.tar.gz | cut -f1)"

echo ""
echo "2️⃣ 上传到服务器..."
scp -i "$SSH_KEY" \
    -o StrictHostKeyChecking=no \
    /tmp/vcard-code.tar.gz \
    ${REMOTE_USER}@${SERVER_IP}:/tmp/

echo ""
echo "3️⃣ 解压文件..."
ssh -i "$SSH_KEY" \
    -o StrictHostKeyChecking=no \
    ${REMOTE_USER}@${SERVER_IP} << 'ENDSSH'
cd /home/ubuntu/vcard
tar -xzf /tmp/vcard-code.tar.gz
rm /tmp/vcard-code.tar.gz
echo "✅ 文件已解压到: /home/ubuntu/vcard"
ls -la
ENDSSH

echo ""
echo "=========================================="
echo "✅ 代码上传完成！"
echo "=========================================="


