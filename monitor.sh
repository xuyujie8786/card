#!/bin/bash

# 虚拟卡系统监控脚本
echo "=== VCard System Monitor ==="
echo "Time: $(date)"
echo ""

# 检查Docker服务
echo "Docker Services:"
docker-compose ps

echo ""
echo "System Resources:"
echo "Memory Usage:"
free -h

echo ""
echo "Disk Usage:"
df -h /

echo ""
echo "Docker Stats:"
docker stats --no-stream --format "table {{.Container}}\t{{.CPUPerc}}\t{{.MemUsage}}\t{{.MemPerc}}"

echo ""
echo "Recent Logs (last 10 lines):"
docker-compose logs --tail=10

