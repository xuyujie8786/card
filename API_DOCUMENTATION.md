# 虚拟卡管理系统 API 文档

## 📋 概览

本文档描述了虚拟卡管理系统的REST API接口。所有API都遵循RESTful设计原则，使用JSON格式进行数据交换。

### 基础信息

- **Base URL**: `http://localhost:3001/api` (开发环境)
- **Content-Type**: `application/json`
- **认证方式**: Bearer Token (JWT)

### 通用响应格式

#### 成功响应
```json
{
  "code": 200,
  "message": "Success",
  "data": {
    // 实际数据
  }
}
```

#### 错误响应
```json
{
  "code": 400,
  "message": "Error message",
  "data": null
}
```

#### 分页响应
```json
{
  "code": 200,
  "message": "Success",
  "data": {
    "list": [...],
    "pagination": {
      "current": 1,
      "pageSize": 20,
      "total": 100
    }
  }
}
```

## 🔐 认证接口

### 用户登录
```http
POST /api/auth/login
```

**请求体**:
```json
{
  "username": "testuser",
  "password": "Password123"
}
```

**响应**:
```json
{
  "code": 200,
  "message": "登录成功",
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIs...",
    "user": {
      "id": 1,
      "username": "testuser",
      "email": "test@example.com",
      "name": "测试用户",
      "role": "USER"
    }
  }
}
```

### 用户注册
```http
POST /api/auth/register
```

**请求体**:
```json
{
  "username": "newuser",
  "email": "newuser@example.com",
  "name": "新用户",
  "password": "Password123"
}
```

### 免密登录（管理员功能）
```http
POST /api/auth/passwordless-login
```

**请求体**:
```json
{
  "username": "targetuser"
}
```

### 获取当前用户信息
```http
GET /api/auth/me
Authorization: Bearer <token>
```

### 刷新令牌
```http
POST /api/auth/refresh
Authorization: Bearer <token>
```

### 用户登出
```http
POST /api/auth/logout
Authorization: Bearer <token>
```

## 💳 虚拟卡管理接口

### 获取卡片列表
```http
GET /api/virtual-cards
Authorization: Bearer <token>
```

**查询参数**:
- `current` (number): 当前页码，默认1
- `pageSize` (number): 每页大小，默认20，最大100
- `cardholderUsername` (string): 持卡人用户名筛选
- `cardNo` (string): 卡号筛选
- `remark` (string): 备注筛选
- `status` (string): 状态筛选，可选值: 0,1,2,3,4,9

**响应**:
```json
{
  "code": 200,
  "message": "Success",
  "data": {
    "list": [
      {
        "id": 1,
        "cardId": "card_123",
        "cardNo": "4111111111111234",
        "cardholderUsername": "testuser",
        "status": 1,
        "balance": 1000.50,
        "createdAt": "2025-01-01T00:00:00Z"
      }
    ],
    "pagination": {
      "current": 1,
      "pageSize": 20,
      "total": 1
    }
  }
}
```

### 获取卡片详情
```http
GET /api/virtual-cards/:cardId
Authorization: Bearer <token>
```

### 创建虚拟卡
```http
POST /api/virtual-cards
Authorization: Bearer <token>
```

**请求体**:
```json
{
  "cardType": "STANDARD",
  "initialAmount": 1000,
  "remark": "测试卡片"
}
```

### 简单创建虚拟卡
```http
POST /api/virtual-cards/simple
Authorization: Bearer <token>
```

**请求体**:
```json
{
  "cardType": "STANDARD",
  "amount": 500
}
```

## 💰 交易记录接口

### 获取交易记录列表
```http
GET /api/transactions
Authorization: Bearer <token>
```

**查询参数**:
- `page` (number): 页码，默认1
- `limit` (number): 限制数量，默认20，最大100
- `cardId` (string): 卡片ID筛选
- `username` (string): 用户名筛选（管理员可用）
- `txnType` (string): 交易类型筛选
- `txnStatus` (string): 交易状态筛选
- `startDate` (string): 开始日期 (ISO 8601 格式)
- `endDate` (string): 结束日期 (ISO 8601 格式)
- `sortBy` (string): 排序字段，可选值: txnTime, finalAmt
- `sortOrder` (string): 排序方向，可选值: asc, desc

### 获取交易详情
```http
GET /api/transactions/:id
Authorization: Bearer <token>
```

### 获取交易汇总
```http
GET /api/transactions/summary
Authorization: Bearer <token>
```

**查询参数**:
- `startDate` (string, 必需): 开始日期
- `endDate` (string, 必需): 结束日期
- `username` (string, 可选): 用户名筛选

**响应**:
```json
{
  "code": 200,
  "message": "Success",
  "data": {
    "authSummary": {
      "totalCount": 50,
      "totalAmount": 25000.00,
      "successCount": 45,
      "successAmount": 22500.00
    },
    "settleSummary": {
      "totalCount": 40,
      "totalAmount": 20000.00,
      "successCount": 38,
      "successAmount": 19500.00
    }
  }
}
```

### 导出交易记录
```http
GET /api/transactions/export
Authorization: Bearer <token>
```

**查询参数**: 与获取交易记录列表相同

**响应**: Excel文件下载

### 获取交易提现状态
```http
GET /api/transactions/:txnId/withdrawal-status
Authorization: Bearer <token>
```

## 🔄 数据同步接口

### 获取同步调度器状态
```http
GET /api/sync/scheduler/status
Authorization: Bearer <token>
```

**响应**:
```json
{
  "code": 200,
  "message": "获取调度器状态成功",
  "data": {
    "isRunning": true,
    "tasks": [
      {
        "name": "daily-auth-sync-previous",
        "isRunning": true,
        "nextExecutionTime": "2025-01-02T01:00:00Z",
        "lastExecutionTime": "2025-01-01T01:00:00Z"
      }
    ]
  }
}
```

### 手动触发同步任务
```http
POST /api/sync/scheduler/trigger
Authorization: Bearer <token>
```

**请求体**:
```json
{
  "syncType": "auth-current"
}
```

**可选的同步类型**:
- `auth-previous`: 同步前一天授权交易
- `auth-current`: 同步当天授权交易
- `settle-previous`: 同步前一天结算交易
- `settle-current`: 同步当天结算交易

### 手动同步交易记录（原始接口）
```http
POST /api/sync/manual
Authorization: Bearer <token>
```

**请求体**:
```json
{
  "syncType": "auth",
  "dateStart": "2025-01-01",
  "dateEnd": "2025-01-01",
  "cardId": "card_123"
}
```

## 📊 仪表盘接口

### 获取仪表盘数据
```http
GET /api/dashboard/data
Authorization: Bearer <token>
```

**响应**:
```json
{
  "code": 200,
  "message": "Success",
  "data": {
    "totalCards": 10,
    "activeCards": 8,
    "totalBalance": 15000.50,
    "todayTransactions": 25,
    "monthlySpending": 5000.00
  }
}
```

### 获取财务详情
```http
GET /api/dashboard/financial-details
Authorization: Bearer <token>
```

## 📋 操作记录接口

### 获取操作记录列表
```http
GET /api/operation-logs
Authorization: Bearer <token>
```

**查询参数**:
- `current` (number): 当前页码
- `pageSize` (number): 每页大小
- `cardId` (string): 卡片ID筛选
- `cardNo` (string): 卡号筛选
- `operationType` (string): 操作类型筛选
- `startDate` (string): 开始日期
- `endDate` (string): 结束日期
- `operatorName` (string): 操作员名称筛选

### 创建操作记录
```http
POST /api/operation-logs
Authorization: Bearer <token>
```

**请求体**:
```json
{
  "cardId": "card_123",
  "cardNo": "4111111111111234",
  "operationType": "RECHARGE",
  "amount": 500.00,
  "currency": "USD",
  "description": "手动充值"
}
```

### 获取操作记录统计
```http
GET /api/operation-logs/stats
Authorization: Bearer <token>
```

## 📢 公告管理接口

### 获取公告列表
```http
GET /api/announcements
Authorization: Bearer <token>
```

**查询参数**:
- `page` (number): 页码
- `limit` (number): 每页大小
- `type` (string): 公告类型筛选
- `status` (string): 状态筛选

### 获取单个公告
```http
GET /api/announcements/:id
Authorization: Bearer <token>
```

### 创建公告（管理员）
```http
POST /api/announcements
Authorization: Bearer <token>
```

**请求体**:
```json
{
  "title": "系统维护通知",
  "content": "系统将于明晚进行维护...",
  "type": "MAINTENANCE",
  "priority": "HIGH"
}
```

### 更新公告（管理员）
```http
PUT /api/announcements/:id
Authorization: Bearer <token>
```

### 删除公告（管理员）
```http
DELETE /api/announcements/:id
Authorization: Bearer <token>
```

## 👥 用户管理接口

### 获取用户列表（管理员）
```http
GET /api/users
Authorization: Bearer <token>
```

### 获取用户详情（管理员）
```http
GET /api/users/:id
Authorization: Bearer <token>
```

### 更新用户信息
```http
PUT /api/users/:id
Authorization: Bearer <token>
```

### 删除用户（管理员）
```http
DELETE /api/users/:id
Authorization: Bearer <token>
```

## 🔒 安全相关接口

### 修改密码
```http
POST /api/security/change-password
Authorization: Bearer <token>
```

**请求体**:
```json
{
  "currentPassword": "oldPassword123",
  "newPassword": "newPassword456"
}
```

### 获取登录日志
```http
GET /api/security/login-logs
Authorization: Bearer <token>
```

## 🔄 Webhook回调接口

### 授权交易回调
```http
POST /api/auth-callback
```

**请求体**:
```json
{
  "cardId": "card_123",
  "txnId": "txn_456",
  "txnType": "A",
  "txnStatus": "SUCCESS",
  "billCcy": "USD",
  "billAmt": "100.50",
  "txnCcy": "USD",
  "txnAmt": "100.50"
}
```

### 结算交易回调
```http
POST /api/settle-callback
```

**请求体**:
```json
{
  "cardId": "card_123",
  "txnId": "txn_456",
  "txnType": "S",
  "txnStatus": "SUCCESS",
  "settleCcy": "USD",
  "settleAmt": "100.50"
}
```

### 结算状态回调
```http
POST /api/settlement-callback
```

## 📊 错误代码

| 错误码 | 说明 |
|--------|------|
| 400 | 请求参数错误 |
| 401 | 未授权访问 |
| 403 | 权限不足 |
| 404 | 资源不存在 |
| 422 | 请求格式正确但内容有误 |
| 429 | 请求过于频繁 |
| 500 | 服务器内部错误 |

## 🔐 权限说明

### 角色类型
- **USER**: 普通用户，只能访问自己的数据
- **ADMIN**: 管理员，可以访问所有用户数据
- **SUPER_ADMIN**: 超级管理员，拥有所有权限

### 权限控制
- 所有API都需要有效的JWT令牌
- 数据访问基于用户角色进行控制
- 敏感操作需要管理员或超级管理员权限

## 📝 请求示例

### 使用curl获取卡片列表
```bash
curl -H "Authorization: Bearer YOUR_TOKEN" \
     "http://localhost:3001/api/virtual-cards?current=1&pageSize=10"
```

### 使用curl创建虚拟卡
```bash
curl -X POST \
     -H "Authorization: Bearer YOUR_TOKEN" \
     -H "Content-Type: application/json" \
     -d '{"cardType":"STANDARD","initialAmount":1000}' \
     "http://localhost:3001/api/virtual-cards"
```

### 使用JavaScript获取交易记录
```javascript
const response = await fetch('/api/transactions', {
  method: 'GET',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json',
  },
});

const data = await response.json();
console.log(data);
```

## 🔄 同步管理接口

### 获取同步调度器状态
```http
GET /api/sync/status
Authorization: Bearer <token>
```

**响应格式**:
```json
{
  "success": true,
  "data": {
    "isEnabled": true,
    "tasks": [
      {
        "name": "daily-auth-sync-previous",
        "description": "每日01:00同步前一天授权账单",
        "cronExpression": "0 1 * * *",
        "isRunning": false,
        "lastRunTime": "2025-09-25T01:00:00Z",
        "nextRunTime": "2025-09-26T01:00:00Z"
      }
    ],
    "uptime": "2天15小时30分钟"
  },
  "message": "获取同步状态成功"
}
```

### 手动触发同步任务
```http
POST /api/sync/trigger
Authorization: Bearer <token>
Content-Type: application/json
```

**请求体**:
```json
{
  "syncType": "auth",
  "dateStart": "2025-09-24",
  "dateEnd": "2025-09-25",
  "cardId": "HKD001"
}
```

**响应格式**:
```json
{
  "success": true,
  "data": {
    "taskId": "sync_20250925_001",
    "status": "started",
    "startTime": "2025-09-25T18:45:00Z"
  },
  "message": "同步任务已启动"
}
```

## 🔐 安全设置接口

### 启用/禁用2FA
```http
POST /api/security/2fa/toggle
Authorization: Bearer <token>
Content-Type: application/json
```

**请求体**:
```json
{
  "enabled": true,
  "verificationCode": "123456"
}
```

### 生成2FA密钥
```http
POST /api/security/2fa/generate
Authorization: Bearer <token>
```

**响应格式**:
```json
{
  "success": true,
  "data": {
    "secret": "JBSWY3DPEHPK3PXP",
    "qrCode": "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAA...",
    "backupCodes": [
      "ABC123DEF",
      "XYZ789GHI"
    ]
  },
  "message": "2FA密钥生成成功"
}
```

## 🔧 管理员接口

### 重置用户密码 (管理员)
```http
POST /api/admin/users/:id/reset-password
Authorization: Bearer <token>
```

**响应格式**:
```json
{
  "success": true,
  "data": {
    "newPassword": "temp123456",
    "mustChangePassword": true
  },
  "message": "密码重置成功"
}
```

### 重置用户2FA (管理员)
```http
POST /api/admin/users/:id/reset-2fa
Authorization: Bearer <token>
```

### 生成免密登录链接 (管理员)
```http
POST /api/admin/users/:id/passwordless-login
Authorization: Bearer <token>
```

**响应格式**:
```json
{
  "success": true,
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "loginUrl": "http://localhost:8002/user/login?token=...",
    "expiresAt": "2025-09-25T19:45:00Z"
  },
  "message": "免密登录链接生成成功"
}
```

### 用户余额操作 (管理员)
```http
POST /api/admin/users/:id/balance-operation
Authorization: Bearer <token>
Content-Type: application/json
```

**请求体**:
```json
{
  "operationType": "RECHARGE",
  "amount": 1000.00,
  "description": "管理员充值"
}
```

## 🔄 系统信息接口

### 获取系统状态
```http
GET /api/system/status
Authorization: Bearer <token>
```

**响应格式**:
```json
{
  "success": true,
  "data": {
    "version": "1.0.0",
    "uptime": "3天12小时45分钟",
    "database": "connected",
    "redis": "connected",
    "cardProvider": "connected",
    "environment": "development"
  },
  "message": "系统状态正常"
}
```

## 📈 数据统计接口

### 获取系统总览 (管理员)
```http
GET /api/dashboard/system-overview
Authorization: Bearer <token>
```

**响应格式**:
```json
{
  "success": true,
  "data": {
    "totalUsers": 12,
    "totalCards": 45,
    "totalTransactions": 1250,
    "systemStatus": "healthy"
  },
  "message": "获取系统总览成功"
}
```

## 🔒 错误代码

| 错误代码 | HTTP状态码 | 描述 |
|---------|-----------|------|
| AUTH_001 | 401 | 认证失败 |
| AUTH_002 | 401 | Token已过期 |
| AUTH_003 | 403 | 权限不足 |
| CARD_001 | 400 | 卡片创建失败 |
| CARD_002 | 404 | 卡片不存在 |
| CARD_003 | 400 | 余额不足 |
| CARD_004 | 400 | 卡片状态异常 |
| USER_001 | 400 | 用户创建失败 |
| USER_002 | 404 | 用户不存在 |
| TXN_001 | 400 | 交易处理失败 |
| TXN_002 | 404 | 交易记录不存在 |
| SYNC_001 | 500 | 同步任务启动失败 |
| SYS_001 | 500 | 系统内部错误 |

## 🔄 版本信息

- **API版本**: v1.0
- **最后更新**: 2025-09-25
- **文档版本**: 2.0.0
- **系统架构**: 
  - 后端: Node.js + Express + TypeScript + Prisma
  - 前端: React + Ant Design Pro + UmiJS
  - 数据库: PostgreSQL + Redis
  - 认证: JWT + 2FA

## 🚀 快速测试

### 使用curl测试登录
```bash
curl -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"admin123"}'
```

### 使用token访问API
```bash
# 获取用户信息
curl -X GET http://localhost:3001/api/auth/profile \
  -H "Authorization: Bearer YOUR_TOKEN"

# 创建虚拟卡
curl -X POST http://localhost:3001/api/virtual-cards \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "cardType": "E0000001",
    "initialAmount": 5.00,
    "validityYears": 3,
    "cardholderName": "John Doe",
    "remark": "测试卡片"
  }'
```

---

**注意**: 
1. 本文档基于生产环境的实际API接口编写
2. 所有API都需要有效的JWT Token认证
3. 管理员接口需要相应的权限级别
4. 生产环境建议使用HTTPS协议
5. 建议配置合适的Rate Limiting和监控
