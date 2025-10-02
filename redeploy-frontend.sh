#!/bin/bash

# 重新部署前端（前端 8000 对外，容器内 nginx 使用 80）
# 使用方法：将此脚本上传到服务器执行

set -e

echo "🔧 重新部署前端（端口：8000 -> 80）..."

# 进入项目目录
cd ~/vcard

# 拉取最新代码
echo "📥 拉取最新代码..."
git pull origin main

# 验证配置
echo "✅ 验证配置："
echo "1. docker-compose 端口映射："
grep -A 1 "FRONTEND_PORT" docker-compose.production.yml

echo ""
echo "2. nginx.conf 监听端口："
head -3 v1/nginx.conf

echo ""
echo "3. Dockerfile EXPOSE："
grep "EXPOSE" v1/Dockerfile

# 停止并删除旧容器
echo ""
echo "🛑 停止旧容器..."
sudo docker compose -f docker-compose.production.yml down frontend

# 删除旧镜像
echo "🗑️ 删除旧镜像..."
sudo docker rmi vcard-frontend:latest 2>/dev/null || true

# 重新构建（强制不使用缓存）
echo "🔨 重新构建..."
sudo docker compose -f docker-compose.production.yml build --no-cache frontend

# 启动新容器
echo "🚀 启动新容器..."
sudo docker compose -f docker-compose.production.yml up -d frontend

# 等待容器启动
echo "⏳ 等待容器启动..."
sleep 10

# 验证部署
echo ""
echo "🔍 验证部署："

echo "1. 容器状态："
sudo docker ps | grep vcard-frontend

echo ""
echo "2. 容器内配置："
sudo docker exec vcard-frontend cat /etc/nginx/conf.d/default.conf | head -3

echo ""
echo "3. 监听端口："
sudo docker exec vcard-frontend netstat -tlnp | grep nginx

echo ""
echo "4. 测试访问（容器内）："
sudo docker exec vcard-frontend curl -I http://localhost:80

echo ""
echo "5. 测试访问（宿主机）："
curl -I http://localhost:8000

echo ""
echo "✅ 部署完成！"
echo ""
echo "访问地址：http://52.74.58.160:8000"

