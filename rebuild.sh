#!/bin/bash

# 虚拟卡系统重新构建脚本
# 用于修复 Prisma 枚举类型缺失问题

set -e  # 遇到错误立即退出

echo "========================================="
echo "虚拟卡系统重新构建"
echo "========================================="
echo ""

# 1. 拉取最新代码
echo "步骤 1/6: 拉取最新代码..."
git pull origin main
echo "✓ 代码更新完成"
echo ""

# 2. 停止所有服务
echo "步骤 2/6: 停止所有服务..."
docker-compose down
echo "✓ 服务已停止"
echo ""

# 3. 清理 Docker 缓存
echo "步骤 3/6: 清理 Docker 缓存..."
docker system prune -f
docker builder prune -f
echo "✓ 缓存清理完成"
echo ""

# 4. 重新构建 backend（不使用缓存）
echo "步骤 4/6: 重新构建 backend 镜像..."
docker-compose build --no-cache backend
echo "✓ Backend 镜像构建完成"
echo ""

# 5. 启动服务
echo "步骤 5/6: 启动服务..."
docker-compose up -d
echo "✓ 服务已启动"
echo ""

# 6. 等待服务就绪并检查状态
echo "步骤 6/6: 检查服务状态..."
sleep 10
echo ""
echo "服务状态："
docker-compose ps
echo ""

# 检查后端日志
echo "========================================="
echo "后端启动日志（最后 30 行）："
echo "========================================="
docker-compose logs --tail=30 backend

echo ""
echo "========================================="
echo "重新构建完成！"
echo "========================================="
echo ""
echo "如需查看实时日志，请运行："
echo "  docker-compose logs -f backend"
echo ""


