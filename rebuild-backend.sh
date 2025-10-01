#!/bin/bash

# 仅重新构建后端服务
# 用于快速修复 TypeScript 类型问题

set -e  # 遇到错误立即退出

echo "========================================="
echo "重新构建后端服务"
echo "========================================="
echo ""

# 检测 Docker Compose 命令
if command -v docker-compose &> /dev/null; then
    DOCKER_COMPOSE="docker-compose"
elif command -v docker &> /dev/null && docker compose version &> /dev/null; then
    DOCKER_COMPOSE="docker compose"
else
    echo "错误: 未找到 docker-compose 或 docker compose 命令"
    exit 1
fi

echo "使用命令: $DOCKER_COMPOSE"
echo ""

# 1. 停止后端服务
echo "步骤 1/4: 停止后端服务..."
$DOCKER_COMPOSE stop backend
echo "✓ 后端已停止"
echo ""

# 2. 重新构建 backend（不使用缓存）
echo "步骤 2/4: 重新构建 backend 镜像..."
$DOCKER_COMPOSE build --no-cache backend
echo "✓ Backend 镜像构建完成"
echo ""

# 3. 启动后端服务
echo "步骤 3/4: 启动后端服务..."
$DOCKER_COMPOSE up -d backend
echo "✓ 后端服务已启动"
echo ""

# 4. 检查后端状态和日志
echo "步骤 4/4: 检查后端状态..."
sleep 5
echo ""
echo "后端状态："
$DOCKER_COMPOSE ps backend
echo ""

echo "========================================="
echo "后端启动日志（最后 50 行）："
echo "========================================="
$DOCKER_COMPOSE logs --tail=50 backend

echo ""
echo "========================================="
echo "后端重新构建完成！"
echo "========================================="
echo ""
echo "如需查看实时日志，请运行："
echo "  $DOCKER_COMPOSE logs -f backend"
echo ""

