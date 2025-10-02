#!/bin/bash

echo "=========================================="
echo "📋 生成上传命令"
echo "=========================================="
echo ""
echo "请在 Lightsail 网页 SSH 中依次执行以下命令："
echo ""
echo "# 1. 上传后端代码（压缩为 base64）"
echo "cd ~/vcard/backend"
tar -czf - src prisma package.json tsconfig.json 2>/dev/null | base64 | sed 's/^/echo /' | sed 's/$/ | base64 -d | tar -xzf -/' | head -1

echo ""
echo "# 2. 上传前端代码（压缩为 base64）"
cd v1
tar -czf - src config public package.json tsconfig.json 2>/dev/null | base64 | sed 's/^/echo /' | sed 's/$/ | base64 -d | tar -xzf -/' | head -1

echo ""
echo "=========================================="


