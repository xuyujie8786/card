#!/bin/bash
set -e

echo "=========================================="
echo "前端重新构建脚本"
echo "=========================================="

# 切换到项目根目录
cd "$(dirname "$0")"

echo "✅ 当前目录: $(pwd)"

# 停止前端容器
echo "🛑 停止前端容器..."
sudo docker compose stop frontend || true
sudo docker compose rm -f frontend || true

# 删除旧镜像
echo "🗑️ 删除旧镜像..."
sudo docker rmi vcard-frontend:latest || true

# 重新构建前端 (使用 docker compose，确保 context 正确)
echo "🔨 重新构建前端..."
sudo docker compose build --no-cache frontend

# 启动所有服务
echo "🚀 启动服务..."
sudo docker compose up -d

# 等待服务启动
echo "⏳ 等待服务启动..."
sleep 10

# 检查状态
echo "📊 检查服务状态..."
sudo docker compose ps

echo ""
echo "✅ 构建完成！"
echo "📝 查看日志："
echo "   sudo docker compose logs -f frontend"

