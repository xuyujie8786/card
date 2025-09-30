# Virtual Card Management System - Backend

虚拟卡管理系统后端 API，基于 Node.js + Express + TypeScript + Prisma + PostgreSQL 构建。

## 功能特性

- 🔐 JWT 身份认证和权限管理
- 👥 三级用户权限体系（超级管理员/管理员/普通用户）
- 💳 虚拟卡管理（开卡、充值、提现、冻结等）
- 💰 用户资金管理（余额、信用额度、资金记录）
- 📊 完整的审计日志
- 🚀 RESTful API 设计
- 🔒 安全防护（限流、CORS、Helmet等）

## 技术栈

- **框架**: Node.js + Express.js + TypeScript
- **数据库**: PostgreSQL + Redis
- **ORM**: Prisma
- **认证**: JWT + bcrypt
- **日志**: Winston
- **验证**: express-validator
- **安全**: Helmet + CORS + Rate Limiting

## 快速开始

### 1. 环境要求

- Node.js >= 18.0.0
- PostgreSQL >= 13
- Redis >= 6.0

### 2. 安装依赖

```bash
npm install
```

### 3. 环境配置

复制环境变量模板：

```bash
cp env.example .env
```

编辑 `.env` 文件，配置数据库连接等信息：

```env
# Database
DATABASE_URL="postgresql://username:password@localhost:5432/vcard_db"

# Redis
REDIS_URL="redis://localhost:6379"

# JWT
JWT_SECRET="your-super-secret-jwt-key-change-this-in-production"
JWT_EXPIRES_IN="7d"

# Server
PORT=3001
NODE_ENV="development"
```

### 4. 数据库设置

创建数据库：

```bash
createdb vcard_db
```

运行数据库迁移：

```bash
npm run db:migrate
```

生成 Prisma 客户端：

```bash
npm run db:generate
```

运行种子数据（创建默认管理员账户）：

```bash
npm run db:seed
```

### 5. 启动服务

开发模式：

```bash
npm run dev
```

生产模式：

```bash
npm run build
npm start
```

## 默认账户

种子数据会创建以下测试账户：

| 角色 | 用户名 | 密码 | 邮箱 |
|------|--------|------|------|
| 超级管理员 | superadmin | admin123 | admin@vcard.com |
| 管理员 | admin001 | admin123 | admin001@vcard.com |
| 普通用户 | user001 | user123 | user001@vcard.com |

## API 文档

### 健康检查

```
GET /health
```

### 认证相关

```
POST /api/auth/login     # 登录
POST /api/auth/register  # 注册
POST /api/auth/refresh   # 刷新令牌
POST /api/auth/logout    # 登出
```

### 用户管理

```
GET    /api/users        # 用户列表
POST   /api/users        # 创建用户
GET    /api/users/:id    # 用户详情
PUT    /api/users/:id    # 更新用户
DELETE /api/users/:id    # 删除用户
```

### 虚拟卡管理

```
GET    /api/cards        # 卡片列表
POST   /api/cards        # 创建卡片
GET    /api/cards/:id    # 卡片详情
PUT    /api/cards/:id    # 更新卡片
DELETE /api/cards/:id    # 删除卡片
```

## 开发命令

```bash
# 开发模式启动
npm run dev

# 构建项目
npm run build

# 启动生产环境
npm start

# 数据库相关
npm run db:generate  # 生成 Prisma 客户端
npm run db:migrate   # 运行数据库迁移
npm run db:push      # 推送 schema 到数据库
npm run db:studio    # 启动 Prisma Studio
npm run db:seed      # 运行种子数据
```

## 项目结构

```
src/
├── config/          # 配置文件
├── controllers/     # 控制器
├── middleware/      # 中间件
├── models/          # 数据模型
├── routes/          # 路由定义
├── services/        # 业务逻辑
├── types/           # TypeScript 类型定义
├── utils/           # 工具函数
├── app.ts           # Express 应用配置
└── index.ts         # 应用入口

prisma/
├── schema.prisma    # 数据库模式定义
└── seed.ts          # 种子数据
```

## 部署说明

1. 设置环境变量
2. 安装依赖：`npm ci --production`
3. 构建项目：`npm run build`
4. 运行数据库迁移：`npm run db:migrate`
5. 启动服务：`npm start`

建议使用 PM2 进行进程管理：

```bash
npm install -g pm2
pm2 start dist/index.js --name vcard-backend
```

## 许可证

ISC
