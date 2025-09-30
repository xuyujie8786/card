# 🐳 Docker容器化定时同步部署指南

## 📋 概述

本指南详细说明如何在Docker容器中部署带有定时同步功能的虚拟卡管理系统。

## 🔧 环境变量配置

### 📅 定时同步相关配置

| 环境变量 | 默认值 | 说明 |
|---------|--------|------|
| `SYNC_ENABLED` | `true` | 是否启用定时同步功能 |
| `SYNC_AUTH_PREVIOUS_CRON` | `0 1 * * *` | 同步前一天授权账单的cron表达式 |
| `SYNC_AUTH_CURRENT_CRON` | `0 13 * * *` | 同步当天授权账单的cron表达式 |
| `SYNC_SETTLE_PREVIOUS_CRON` | `30 1 * * *` | 同步前一天结算账单的cron表达式 |
| `SYNC_SETTLE_CURRENT_CRON` | `30 13 * * *` | 同步当天结算账单的cron表达式 |

### ⏰ 时区配置

| 环境变量 | 默认值 | 说明 |
|---------|--------|------|
| `TZ` | `Asia/Shanghai` | 容器时区设置 |

### 🔧 Cron表达式格式

```
分 时 日 月 星期
*  *  *  *  *
```

- 分: 0-59
- 时: 0-23
- 日: 1-31
- 月: 1-12
- 星期: 0-7 (0和7都表示星期日)

## 🚀 部署方式

### 1. 生产环境部署

```bash
# 使用主要的docker-compose文件
docker-compose up -d

# 检查定时任务日志
docker logs vcard-backend -f
```

### 2. 开发/测试环境部署

```bash
# 使用测试配置文件，包含更频繁的定时任务
docker-compose -f docker-compose.test.yml up backend-test

# 观察定时任务执行情况
docker logs vcard-backend-test -f
```

## 🧪 验证定时同步功能

### 1. 时区验证

```bash
# 运行时区测试容器
docker-compose -f docker-compose.test.yml up timezone-test

# 或者在运行的容器中验证
docker exec vcard-backend node timezone-test.js
```

### 2. 定时任务验证

查看后端日志，确认定时任务正确注册和执行：

```bash
docker logs vcard-backend | grep "定时"
```

期望看到的日志：

```
info: 🚀 初始化定时同步调度器
info: 📅 注册定时任务: daily-auth-sync-previous
info: 📅 注册定时任务: daily-settle-sync-previous  
info: 📅 注册定时任务: daily-auth-sync-current
info: 📅 注册定时任务: daily-settle-sync-current
info: ✅ 定时同步调度器初始化完成
```

### 3. 同步执行验证

在定时任务触发时，查看日志：

```bash
docker logs vcard-backend | grep "同步"
```

## 📝 自定义配置示例

### 修改定时任务时间

在 `docker-compose.yml` 中修改环境变量：

```yaml
environment:
  # 每日凌晨2:00同步前一天数据
  SYNC_AUTH_PREVIOUS_CRON: "0 2 * * *"
  SYNC_SETTLE_PREVIOUS_CRON: "30 2 * * *"
  
  # 每日下午3:00同步当天数据  
  SYNC_AUTH_CURRENT_CRON: "0 15 * * *"
  SYNC_SETTLE_CURRENT_CRON: "30 15 * * *"
```

### 禁用定时同步

```yaml
environment:
  SYNC_ENABLED: false
```

## 🔍 故障排查

### 1. 定时任务未执行

**检查项目：**
- [ ] `SYNC_ENABLED` 是否为 `true`
- [ ] Cron表达式格式是否正确
- [ ] 容器时区是否正确设置
- [ ] 日志中是否有错误信息

**调试命令：**
```bash
# 检查环境变量
docker exec vcard-backend env | grep SYNC

# 检查时区
docker exec vcard-backend date

# 查看详细日志
docker logs vcard-backend --tail 100
```

### 2. 时区问题

**验证时区：**
```bash
# 在容器中检查时区
docker exec vcard-backend sh -c "date && echo 'TZ='$TZ"

# 应该显示北京时间
```

### 3. 数据库连接问题

**检查数据库连接：**
```bash
# 查看数据库连接日志
docker logs vcard-backend | grep -i "database\|postgresql"

# 检查数据库服务状态
docker ps | grep postgres
```

## 📊 监控建议

### 1. 日志监控

使用日志收集工具监控以下关键词：
- `定时同步`
- `sync error`
- `同步失败`

### 2. 健康检查

Docker容器已配置健康检查：

```yaml
healthcheck:
  test: ["CMD-SHELL", "curl -f http://localhost:3001/api/health || exit 1"]
  interval: 30s
  timeout: 10s
  retries: 3
```

### 3. 性能监控

监控定时任务的执行时间和资源使用情况。

## 🎯 最佳实践

1. **时区一致性**: 确保所有服务使用相同时区
2. **错峰执行**: 不同类型的同步任务错开执行时间
3. **失败重试**: 在同步服务中实现重试机制
4. **监控告警**: 设置同步失败的告警机制
5. **数据备份**: 定期备份关键数据

## 📚 相关文件

- `docker-compose.yml` - 生产环境配置
- `docker-compose.test.yml` - 测试环境配置
- `backend/Dockerfile` - 后端镜像构建文件
- `docker-timezone-test.js` - 时区验证脚本
- `backend/src/services/syncScheduler.ts` - 定时任务调度器


