#!/bin/bash

# 修复前端 Nginx 配置脚本
# 确保 nginx.conf 监听 80 端口

set -e

echo "🔧 修复前端 Nginx 配置..."

# 检查当前配置
echo "📋 当前配置："
cat v1/nginx.conf | head -5

# 备份
echo "💾 创建备份..."
cp v1/nginx.conf v1/nginx.conf.backup.$(date +%Y%m%d_%H%M%S)

# 修复配置（如果是 3001，改为 80）
echo "✏️ 修复配置..."
sed -i 's/listen 3001;/listen 80;/g' v1/nginx.conf

# 显示修改后的配置
echo "✅ 修改后的配置："
cat v1/nginx.conf | head -5

# 重新构建
echo "🔨 重新构建前端容器..."
sudo docker compose down frontend
sudo docker rmi vcard-frontend:latest 2>/dev/null || true
sudo docker compose build --no-cache frontend
sudo docker compose up -d frontend

# 等待启动
echo "⏳ 等待容器启动..."
sleep 8

# 验证
echo "🔍 验证配置..."
echo "容器内配置："
sudo docker exec vcard-frontend cat /etc/nginx/conf.d/default.conf | head -3

echo ""
echo "监听端口："
sudo docker exec vcard-frontend netstat -tlnp | grep nginx

echo ""
echo "🧪 测试访问..."
curl -I http://localhost:8000

echo ""
echo "✅ 修复完成！"


