# 虚拟卡管理系统开发指南

本指南旨在帮助开发者快速理解和参与虚拟卡管理系统的开发工作。

## 📁 项目结构

```
vcard/
├── backend/              # Node.js + TypeScript 后端服务
│   ├── src/
│   │   ├── config/       # 配置文件
│   │   ├── controllers/  # 控制器层
│   │   ├── middleware/   # 中间件
│   │   ├── models/       # 数据模型
│   │   ├── routes/       # 路由定义
│   │   ├── services/     # 业务逻辑层
│   │   ├── types/        # TypeScript 类型定义
│   │   └── utils/        # 工具函数
│   ├── prisma/           # 数据库模式和迁移
│   └── Dockerfile        # Docker 配置
├── v1/                   # React + Ant Design Pro 前端应用
│   ├── src/
│   │   ├── components/   # React 组件
│   │   ├── pages/        # 页面组件
│   │   ├── services/     # API 服务
│   │   └── types/        # TypeScript 类型
│   └── package.json
└── docs/                 # 文档目录
```

## 🛠 技术栈

### 后端技术栈
- **运行时**: Node.js 18+
- **语言**: TypeScript
- **框架**: Express.js
- **数据库**: PostgreSQL
- **ORM**: Prisma
- **缓存**: Redis
- **日志**: Winston
- **身份认证**: JWT
- **定时任务**: node-cron
- **容器化**: Docker

### 前端技术栈
- **框架**: React 18
- **开发框架**: UmiJS 4
- **UI 库**: Ant Design Pro
- **状态管理**: Redux Toolkit
- **HTTP 客户端**: Axios
- **路由**: React Router
- **构建工具**: Webpack/ESBuild

## 🚀 快速开始

### 环境要求

- Node.js >= 18
- PostgreSQL >= 13
- Redis >= 6
- Docker (可选)

### 安装步骤

#### 1. 克隆项目
```bash
git clone <repository-url>
cd vcard
```

#### 2. 设置后端
```bash
cd backend

# 安装依赖
npm install

# 复制配置文件
cp .env.example .env

# 编辑配置文件
nano .env
```

**重要配置项：**
```env
# 数据库配置
DATABASE_URL="postgresql://username:password@localhost:5432/vcard_db"

# Redis 配置
REDIS_HOST=localhost
REDIS_PORT=6379

# JWT 配置
JWT_SECRET=your-super-secret-jwt-key
JWT_EXPIRES_IN=7d

# 卡片服务商配置
CARD_PROVIDER_BASE_URL=https://openapi-hk.vccdaddy.com
CARD_PROVIDER_TOKEN=your-api-token

# 应用配置
NODE_ENV=development
PORT=3001
```

#### 3. 初始化数据库
```bash
# 生成 Prisma 客户端
npx prisma generate

# 运行数据库迁移
npx prisma migrate deploy

# 可选：添加种子数据
npx prisma db seed
```

#### 4. 启动后端服务
```bash
# 开发模式
npm run dev

# 生产模式
npm run build
npm start
```

#### 5. 设置前端
```bash
cd ../v1

# 安装依赐
npm install

# 启动开发服务器
npm start
```

### Docker 部署（推荐）

#### 使用 Docker Compose
```bash
# 启动所有服务
docker-compose up -d

# 查看日志
docker-compose logs -f

# 停止服务
docker-compose down
```

#### 单独构建后端镜像
```bash
cd backend
docker build -t vcard-backend .
```

## 📊 数据库设计

### 核心表结构

#### 用户表 (User)
```sql
CREATE TABLE "User" (
  id SERIAL PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  name VARCHAR(100),
  role UserRole NOT NULL DEFAULT 'USER',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

#### 虚拟卡表 (VirtualCard)
```sql
CREATE TABLE "VirtualCard" (
  id SERIAL PRIMARY KEY,
  card_id VARCHAR(50) UNIQUE NOT NULL,
  user_id INTEGER REFERENCES "User"(id),
  card_number VARCHAR(19),
  card_status CardStatus NOT NULL,
  balance DECIMAL(12,2) DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

#### 交易记录表 (Transaction)
```sql
CREATE TABLE "Transaction" (
  id SERIAL PRIMARY KEY,
  transaction_id VARCHAR(100) UNIQUE,
  card_id VARCHAR(50) REFERENCES "VirtualCard"(card_id),
  type TransactionType NOT NULL,
  amount DECIMAL(12,2) NOT NULL,
  status TransactionStatus NOT NULL,
  processed_at TIMESTAMP DEFAULT NOW()
);
```

## 🔌 API 接口

### 认证接口

#### 用户登录
```http
POST /api/auth/login
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "password123"
}
```

#### 响应格式
```json
{
  "code": 200,
  "message": "登录成功",
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIs...",
    "user": {
      "id": 1,
      "email": "user@example.com",
      "name": "张三",
      "role": "USER"
    }
  }
}
```

### 虚拟卡接口

#### 获取卡片列表
```http
GET /api/cards?page=1&pageSize=10&status=ACTIVE
Authorization: Bearer <token>
```

#### 创建虚拟卡
```http
POST /api/cards
Authorization: Bearer <token>
Content-Type: application/json

{
  "cardType": "STANDARD",
  "initialAmount": 1000
}
```

### 同步接口

#### 获取同步状态
```http
GET /api/sync/scheduler/status
Authorization: Bearer <token>
```

#### 手动触发同步
```http
POST /api/sync/scheduler/trigger
Authorization: Bearer <token>
Content-Type: application/json

{
  "syncType": "auth-current"
}
```

## 🧩 核心功能模块

### 1. 身份认证模块

**位置**: `backend/src/middleware/auth.ts`

**功能**:
- JWT 令牌验证
- 角色权限控制
- 请求拦截

**使用示例**:
```typescript
import { authenticateToken, requireSuperAdmin } from '../middleware/auth';

// 需要认证的路由
router.get('/protected', authenticateToken, handler);

// 需要超级管理员权限的路由
router.post('/admin-only', authenticateToken, requireSuperAdmin, handler);
```

### 2. 虚拟卡管理模块

**位置**: `backend/src/services/cardService.ts`

**功能**:
- 卡片生命周期管理
- 余额查询和充值
- 交易记录追踪

### 3. 数据同步模块

**位置**: `backend/src/services/syncScheduler.ts`

**功能**:
- 定时同步交易数据
- 手动触发同步
- 同步状态监控

**定时任务配置**:
```typescript
const cronJobs = [
  {
    name: 'daily-auth-sync-previous',
    cronExpression: '0 1 * * *',  // 每天凌晨1点
    description: '同步前一天授权交易'
  },
  {
    name: 'daily-settle-sync-current', 
    cronExpression: '30 13 * * *', // 每天下午1点30分
    description: '同步当天结算交易'
  }
];
```

### 4. 响应处理模块

**位置**: `backend/src/utils/response.ts`

**功能**:
- 统一 API 响应格式
- 错误处理封装
- 分页响应支持

**使用示例**:
```typescript
import { successResponse, errorResponse } from '../utils/response';

// 成功响应
successResponse(res, data, '操作成功');

// 错误响应
errorResponse(res, '参数错误', 400);
```

## 🎨 前端开发

### 组件结构

#### 页面组件
- **位置**: `v1/src/pages/`
- **规范**: 每个页面一个文件夹，包含 `index.tsx` 和样式文件

#### 通用组件
- **位置**: `v1/src/components/`
- **规范**: 可复用组件，支持 Props 传递

### 状态管理

使用 UmiJS 内置的状态管理:

```typescript
// 定义 model
export default {
  namespace: 'cards',
  state: {
    list: [],
    loading: false,
  },
  reducers: {
    updateList(state, { payload }) {
      return { ...state, list: payload };
    },
  },
  effects: {
    *fetchCards({ payload }, { call, put }) {
      const response = yield call(cardService.getCards, payload);
      yield put({ type: 'updateList', payload: response.data });
    },
  },
};
```

### API 服务

**位置**: `v1/src/services/`

**示例**:
```typescript
import { request } from '@umijs/max';

export const cardService = {
  // 获取卡片列表
  async getCards(params: any) {
    return request('/api/cards', {
      method: 'GET',
      params,
    });
  },

  // 创建虚拟卡
  async createCard(data: any) {
    return request('/api/cards', {
      method: 'POST',
      data,
    });
  },
};
```

## 🔒 安全考虑

### 1. 身份认证
- 使用 JWT 令牌认证
- 令牌过期时间设置为 7 天
- 支持令牌刷新机制

### 2. 权限控制
- 基于角色的访问控制 (RBAC)
- 用户角色: USER, ADMIN, SUPER_ADMIN
- API 端点权限验证

### 3. 数据安全
- 敏感数据加密存储
- 数据库连接使用 SSL
- API 请求参数验证

### 4. 网络安全
- CORS 配置
- 请求限速
- SQL 注入防护

## 📝 代码规范

### TypeScript 规范
- 严格类型检查
- 接口定义规范
- 错误处理标准化

### 命名规范
- 文件名: kebab-case (user-service.ts)
- 类名: PascalCase (UserService)
- 变量名: camelCase (userName)
- 常量: UPPER_SNAKE_CASE (API_BASE_URL)

### 目录结构规范
```
src/
├── components/     # 组件按功能分组
├── services/       # 服务按模块分组
├── types/          # 类型定义按领域分组
├── utils/          # 工具函数按用途分组
└── config/         # 配置文件分环境
```

## 🧪 测试策略

### 单元测试
- 使用 Jest 框架
- 覆盖率要求 > 80%
- 重点测试业务逻辑

### 集成测试
- API 接口测试
- 数据库操作测试
- 第三方服务模拟

### E2E 测试
- 关键业务流程测试
- 用户交互测试

## 🚀 部署指南

### 环境准备
1. 生产服务器配置
2. 数据库设置
3. Redis 配置
4. SSL 证书安装

### 部署步骤
1. 代码构建和打包
2. 数据库迁移
3. 服务启动和监控
4. 健康检查配置

### 监控和日志
- 应用性能监控
- 错误日志收集
- 业务指标统计

## 🛠 开发工具

### 推荐 IDE
- Visual Studio Code
- WebStorm

### 必备插件
- ESLint
- Prettier
- TypeScript Importer
- GitLens

### 调试工具
- Chrome DevTools
- Postman/Insomnia
- pgAdmin (PostgreSQL)
- Redis Commander

## 📞 技术支持

### 常见问题
1. **数据库连接失败**: 检查 DATABASE_URL 配置
2. **Redis 连接超时**: 确认 Redis 服务状态
3. **JWT 验证失败**: 检查令牌格式和密钥

### 获取帮助
- 项目 Wiki
- 技术文档
- 开发团队联系方式

---

此开发指南会根据项目演进持续更新，建议开发者定期查看最新版本。


