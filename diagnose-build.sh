#!/bin/bash
set -e

echo "=========================================="
echo "诊断 Docker 构建问题"
echo "=========================================="

cd "$(dirname "$0")"

echo "📁 当前目录: $(pwd)"
echo ""

echo "📂 检查目录结构..."
echo "=== 根目录文件 ==="
ls -la | grep -E "^d|^-" | head -20
echo ""

echo "=== v1 目录内容 ==="
ls -la v1/ | grep -E "^d|^-" | head -20
echo ""

echo "🔍 检查 v1 目录下是否有后端文件..."
if [ -d "v1/src/controllers" ]; then
    echo "❌ 错误：v1/src/controllers 存在（不应该存在）"
    ls -la v1/src/controllers/
else
    echo "✅ 正常：v1/src/controllers 不存在"
fi

if [ -d "v1/src/services" ]; then
    echo "❌ 错误：v1/src/services 存在（不应该存在）"
    ls -la v1/src/services/ | head -10
else
    echo "✅ 正常：v1/src/services 不存在"
fi

echo ""
echo "📦 检查 docker-compose.yml 配置..."
grep -A 3 "frontend:" docker-compose.yml
echo ""

echo "🐳 检查当前 Docker 镜像..."
sudo docker images | grep vcard || echo "没有找到 vcard 相关镜像"
echo ""

echo "📋 检查运行中的容器..."
sudo docker ps -a | grep vcard || echo "没有找到 vcard 相关容器"
echo ""

echo "✅ 诊断完成！"
echo ""
echo "如果 v1 目录下有后端文件，请执行："
echo "  rm -rf v1/src/controllers v1/src/services v1/src/types"

