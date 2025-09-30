# 虚拟卡管理系统前端开发指南

本指南详细介绍了虚拟卡管理系统前端的架构设计、开发规范和最佳实践，帮助开发者快速理解和参与前端开发工作。

## 📋 目录

- [技术栈与架构](#技术栈与架构)
- [项目结构](#项目结构)
- [开发环境设置](#开发环境设置)
- [页面组件详解](#页面组件详解)
- [状态管理](#状态管理)
- [API服务层](#api服务层)
- [权限控制](#权限控制)
- [样式规范](#样式规范)
- [开发最佳实践](#开发最佳实践)
- [常见问题解决](#常见问题解决)

## 🛠 技术栈与架构

### 核心技术栈

- **框架**: React 19.1.1 + TypeScript 5.6.3
- **开发框架**: UmiJS 4.3.24 (Max版本)
- **UI组件库**: Ant Design 5.26.4 + ProComponents 2.8.9
- **样式方案**: antd-style 3.7.0
- **构建工具**: Mako (基于Rust的高性能构建器)
- **状态管理**: UmiJS内置状态管理 + Model
- **路由**: UmiJS内置路由系统
- **HTTP客户端**: UmiJS内置request (基于axios)
- **代码规范**: Biome + Husky

### 架构特点

1. **企业级架构**: 基于Ant Design Pro企业级解决方案
2. **类型安全**: 完整的TypeScript类型定义
3. **组件化开发**: 高度组件化的开发方式
4. **权限控制**: 完善的RBAC权限控制体系
5. **国际化支持**: 多语言支持框架
6. **响应式设计**: 支持多设备适配

## 📁 项目结构

```
v1/                                    # 前端应用根目录
├── config/                           # 配置文件
│   ├── config.ts                     # 主配置文件
│   ├── defaultSettings.ts            # 默认设置
│   ├── proxy.ts                      # 代理配置
│   └── routes.ts                     # 路由配置
├── mock/                             # Mock数据
│   ├── listTableList.ts              # 表格列表Mock
│   ├── user.ts                       # 用户相关Mock
│   └── virtual-cards.mock.ts         # 虚拟卡Mock
├── public/                           # 静态资源
│   ├── icons/                        # 图标资源
│   └── favicon.ico                   # 网站图标
├── src/                              # 源代码目录
│   ├── access.ts                     # 权限定义
│   ├── app.tsx                       # 应用入口配置
│   ├── components/                   # 公共组件
│   │   ├── RightContent/             # 顶部右侧内容
│   │   └── ...                       # 其他公共组件
│   ├── config/                       # 前端配置
│   │   └── api.ts                    # API配置
│   ├── locales/                      # 国际化文件
│   │   ├── zh-CN/                    # 中文语言包
│   │   └── en-US/                    # 英文语言包
│   ├── pages/                        # 页面组件
│   │   ├── Dashboard/                # 仪表盘
│   │   ├── virtual-cards/            # 虚拟卡管理
│   │   ├── user-management/          # 用户管理
│   │   ├── statement/                # 对账单
│   │   ├── audit/                    # 账单审核
│   │   ├── operation-logs/           # 操作记录
│   │   ├── account-flows/            # 账户流水
│   │   ├── announcements/            # 公告管理
│   │   └── user/                     # 用户相关页面
│   ├── services/                     # API服务
│   │   ├── auth.ts                   # 认证服务
│   │   ├── virtual-card.ts           # 虚拟卡服务
│   │   ├── user.ts                   # 用户服务
│   │   └── ...                       # 其他服务
│   ├── types/                        # TypeScript类型定义
│   │   ├── global.d.ts               # 全局类型
│   │   ├── transaction.ts            # 交易类型
│   │   └── ...                       # 其他类型定义
│   └── utils/                        # 工具函数
│       ├── time.ts                   # 时间处理
│       └── ...                       # 其他工具
├── package.json                      # 依赖配置
└── tsconfig.json                     # TypeScript配置
```

## 🚀 开发环境设置

### 环境要求

```bash
Node.js >= 20.0.0
npm >= 8.0.0
```

### 快速启动

```bash
# 1. 安装依赖
cd v1
npm install

# 2. 启动开发服务器
npm run dev

# 3. 访问应用
# 开发环境: http://localhost:8002
# 后端API: http://localhost:3001
```

### 可用脚本

```bash
# 开发模式 (无Mock)
npm run start:dev

# 开发模式 (启用Mock)
npm run start

# 生产构建
npm run build

# 预览生产版本
npm run preview

# 代码检查
npm run lint

# 类型检查
npm run tsc

# 测试
npm run test
```

### 环境配置

开发环境会自动代理API请求到后端服务：

```typescript
// config/proxy.ts
export default {
  '/api/': {
    target: 'http://localhost:3001',
    changeOrigin: true,
    pathRewrite: { '^': '' },
  },
};
```

## 📄 页面组件详解

### 1. 仪表盘 (Dashboard)

**位置**: `src/pages/Dashboard/index.tsx`

**功能**:
- 显示用户财务概览
- 实时余额和锁定资金
- 快速操作入口

**关键特性**:
```typescript
interface DashboardData {
  totalRecharge: number;      // 总充值
  totalConsumption: number;   // 总消费
  cardLocked: number;         // 卡内锁定
  availableAmount: number;    // 可用金额
  currency: string;           // 币种
}
```

### 2. 虚拟卡管理 (Virtual Cards)

**位置**: `src/pages/virtual-cards/`

**核心功能**:
- 虚拟卡列表展示和管理
- 创建、充值、提现、冻结/解冻
- 卡片详情查看和交易记录

**组件结构**:
```
virtual-cards/
├── index.tsx                  # 主列表页面
├── components/
│   ├── CreateCardForm.tsx     # 创建卡片表单
│   ├── RechargeForm.tsx       # 充值表单
│   ├── WithdrawForm.tsx       # 提现表单
│   ├── EditCardModal.tsx      # 编辑卡片
│   └── CardDetailDrawer.tsx   # 卡片详情抽屉
└── README.md                  # 功能说明
```

**关键功能示例**:
```typescript
// 卡片操作
const handleRecharge = async (cardId: string, amount: number) => {
  const result = await rechargeCard(cardId, { amount });
  if (result.success) {
    message.success('充值成功');
    actionRef.current?.reload();
  }
};

// 卡片状态显示
const renderStatus = (status: string) => {
  const statusMap = {
    ACTIVE: { color: 'green', text: '已激活' },
    FROZEN: { color: 'red', text: '已冻结' },
    RELEASED: { color: 'gray', text: '已释放' },
  };
  return <Tag color={statusMap[status]?.color}>{statusMap[status]?.text}</Tag>;
};
```

### 3. 用户管理 (User Management)

**位置**: `src/pages/user-management/`

**功能范围**:
- 用户列表和详情管理
- 创建子用户和管理员
- 用户余额操作
- 密码重置和2FA管理

**权限控制**:
```typescript
// 权限检查示例
const canCreateAdmin = currentUser?.role === 'SUPER_ADMIN';
const canManageBalance = ['SUPER_ADMIN', 'ADMIN'].includes(currentUser?.role);
```

### 4. 对账单 (Statement)

**位置**: `src/pages/statement/`

**核心功能**:
- 交易记录查询和展示
- 数据同步管理
- Excel导出功能
- 统计分析

**特色组件**:
```typescript
// 同步模态框
<SyncModal
  visible={syncModalVisible}
  onClose={() => setSyncModalVisible(false)}
  onSuccess={() => {
    message.success('同步成功');
    actionRef.current?.reload();
  }}
/>
```

### 5. 账单审核 (Audit)

**位置**: `src/pages/audit/`

**专门功能**:
- D类型（授权撤销）交易审核
- F类型（撤销）交易审核
- 补偿充值操作
- 重试提现功能

**操作示例**:
```typescript
// 补偿充值
const handleCompensation = async (record: AuditRecord) => {
  const result = await compensationRecharge(record.txnId);
  if (result.success) {
    message.success('补偿充值成功');
    actionRef.current?.reload();
  }
};
```

## 🗂 状态管理

### UmiJS Model 模式

系统采用UmiJS内置的状态管理模式：

```typescript
// src/models/user.ts
import { useState, useCallback } from 'react';

export default function useUserModel() {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(false);

  const fetchCurrentUser = useCallback(async () => {
    setLoading(true);
    try {
      const user = await getCurrentUser();
      setCurrentUser(user);
    } catch (error) {
      console.error('获取用户信息失败:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    currentUser,
    loading,
    fetchCurrentUser,
  };
}
```

### 初始状态管理

```typescript
// src/app.tsx
export async function getInitialState(): Promise<{
  currentUser?: User;
  loading?: boolean;
}> {
  const token = localStorage.getItem('token');
  if (token) {
    try {
      const currentUser = await getCurrentUser();
      return { currentUser };
    } catch (error) {
      localStorage.removeItem('token');
    }
  }
  return {};
}
```

## 🌐 API服务层

### 统一API配置

```typescript
// src/config/api.ts
export const API_CONFIG = {
  baseURL: 'http://localhost:3001/api',
  timeout: 10000,
  useMock: false, // 全局Mock开关
  modules: {
    auth: false,        // 认证模块强制使用真实API
    transaction: false, // 交易模块强制使用真实API
    user: false,       // 用户模块强制使用真实API
  }
};
```

### 服务层架构

```typescript
// src/services/virtual-card.ts
import { request } from '@umijs/max';
import { API_CONFIG } from '@/config/api';

export async function getVirtualCards(params: VirtualCardListParams) {
  return request<ApiResponse<PagedResponse<VirtualCard>>>('/virtual-cards', {
    method: 'GET',
    params,
  });
}

export async function createVirtualCard(data: CreateVirtualCardRequest) {
  return request<ApiResponse<VirtualCard>>('/virtual-cards', {
    method: 'POST',
    data,
  });
}
```

### 错误处理

```typescript
// src/requestErrorConfig.ts
export const errorConfig: RequestConfig = {
  errorHandler: (error: any) => {
    const { response } = error;
    if (response && response.status) {
      const errorText = codeMessage[response.status] || response.statusText;
      message.error(`请求错误 ${response.status}: ${errorText}`);
    }
    throw error;
  },
  requestInterceptors: [
    (config: RequestOptionsInit) => {
      const token = localStorage.getItem('token');
      if (token) {
        config.headers = {
          ...config.headers,
          Authorization: `Bearer ${token}`,
        };
      }
      return config;
    },
  ],
};
```

## 🔐 权限控制

### 权限定义

```typescript
// src/access.ts
export default function access(initialState: InitialState | undefined) {
  const { currentUser } = initialState ?? {};
  
  return {
    canSuperAdmin: currentUser?.role === 'SUPER_ADMIN',
    canAdmin: ['SUPER_ADMIN', 'ADMIN'].includes(currentUser?.role || ''),
    canManageUsers: ['SUPER_ADMIN', 'ADMIN'].includes(currentUser?.role || ''),
    canViewAudit: currentUser?.role === 'SUPER_ADMIN',
  };
}
```

### 路由权限

```typescript
// config/routes.ts
{
  name: 'audit',
  icon: 'audit',
  path: '/audit',
  component: './audit',
  access: 'canSuperAdmin', // 只有超级管理员可访问
},
{
  name: 'user-management',
  icon: 'team',
  path: '/user-management',
  component: './user-management',
  access: 'canManageUsers', // 管理员及以上可访问
}
```

### 组件级权限

```typescript
// 在组件中使用权限
import { useAccess } from '@umijs/max';

const UserManagement: React.FC = () => {
  const access = useAccess();

  return (
    <div>
      {access.canSuperAdmin && (
        <Button type="primary">创建管理员</Button>
      )}
      {access.canManageUsers && (
        <Button>创建用户</Button>
      )}
    </div>
  );
};
```

## 🎨 样式规范

### 主题配置

```typescript
// config/defaultSettings.ts
const Settings: ProLayoutProps = {
  navTheme: 'light',
  primaryColor: '#1890ff',
  layout: 'mix',
  contentWidth: 'Fluid',
  fixedHeader: false,
  fixSiderbar: true,
  colorWeak: false,
  title: '虚拟卡管理系统',
  pwa: false,
  logo: '/logo.svg',
  iconfontUrl: '',
};
```

### 样式最佳实践

1. **使用antd-style进行样式开发**:
```typescript
import { createStyles } from 'antd-style';

const useStyles = createStyles(({ token, css }) => ({
  container: css`
    padding: ${token.padding}px;
    background: ${token.colorBgContainer};
    border-radius: ${token.borderRadius}px;
  `,
  title: css`
    font-size: ${token.fontSizeLG}px;
    font-weight: ${token.fontWeightStrong};
    color: ${token.colorText};
  `,
}));
```

2. **响应式设计**:
```typescript
const useStyles = createStyles(({ token, css, responsive }) => ({
  container: css`
    ${responsive.mobile} {
      padding: ${token.paddingSM}px;
    }
    ${responsive.tablet} {
      padding: ${token.padding}px;
    }
  `,
}));
```

## 🔧 开发最佳实践

### 1. 组件开发规范

```typescript
// 组件Props接口定义
interface VirtualCardTableProps {
  loading?: boolean;
  dataSource: VirtualCard[];
  onRecharge: (cardId: string, amount: number) => Promise<void>;
  onWithdraw: (cardId: string, amount: number) => Promise<void>;
}

// 使用React.FC定义组件
const VirtualCardTable: React.FC<VirtualCardTableProps> = ({
  loading = false,
  dataSource,
  onRecharge,
  onWithdraw,
}) => {
  // 组件逻辑
  return (
    <ProTable
      loading={loading}
      dataSource={dataSource}
      // ... 其他props
    />
  );
};

export default VirtualCardTable;
```

### 2. Hook使用规范

```typescript
// 自定义Hook
export function useVirtualCards() {
  const [loading, setLoading] = useState(false);
  const [dataSource, setDataSource] = useState<VirtualCard[]>([]);
  
  const fetchCards = useCallback(async (params: any) => {
    setLoading(true);
    try {
      const response = await getVirtualCards(params);
      setDataSource(response.data);
    } catch (error) {
      message.error('获取卡片失败');
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    loading,
    dataSource,
    fetchCards,
  };
}
```

### 3. 表单处理

```typescript
// 使用ProForm处理表单
const CreateCardForm: React.FC<CreateCardFormProps> = ({ onSubmit }) => {
  const [form] = Form.useForm();

  const handleSubmit = async (values: CreateVirtualCardRequest) => {
    try {
      await onSubmit(values);
      form.resetFields();
    } catch (error) {
      // 错误已在上层处理
    }
  };

  return (
    <ModalForm
      title="创建虚拟卡"
      form={form}
      onFinish={handleSubmit}
      modalProps={{
        destroyOnClose: true,
      }}
    >
      <ProFormSelect
        name="cardType"
        label="卡片类型"
        options={cardTypeOptions}
        rules={[{ required: true, message: '请选择卡片类型' }]}
      />
      <ProFormDigit
        name="initialAmount"
        label="初始金额"
        min={5}
        max={10000}
        fieldProps={{ precision: 2 }}
        rules={[{ required: true, message: '请输入初始金额' }]}
      />
    </ModalForm>
  );
};
```

### 4. 类型安全

```typescript
// 严格的类型定义
export interface VirtualCard {
  id: number;
  cardId: string;
  cardNo: string;
  cvv: string;
  expDate: string;
  balance: number;
  currency: string;
  status: 'ACTIVE' | 'FROZEN' | 'RELEASED';
  cardholderName: string;
  remark?: string;
  createdAt: string;
  updatedAt: string;
}

// API响应类型
export interface ApiResponse<T> {
  success: boolean;
  data: T;
  message: string;
}

// 分页响应类型
export interface PagedResponse<T> {
  data: T[];
  pagination: {
    current: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
}
```

### 5. 错误边界

```typescript
// 错误边界组件
class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean }
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('Error caught by boundary:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <Result
          status="500"
          title="500"
          subTitle="页面发生错误，请刷新重试"
          extra={
            <Button type="primary" onClick={() => window.location.reload()}>
              刷新页面
            </Button>
          }
        />
      );
    }

    return this.props.children;
  }
}
```

## 🐛 常见问题解决

### 1. API请求失败

**问题**: 开发环境API请求失败
**解决**:
```bash
# 确保后端服务运行在3001端口
cd backend && npm run dev

# 检查代理配置
# config/proxy.ts中确保代理设置正确
```

### 2. Mock数据问题

**问题**: Mock数据不生效
**解决**:
```typescript
// 确保启用Mock模式
npm run start

// 或者检查config/config.ts中的mock配置
```

### 3. 权限问题

**问题**: 页面权限控制不生效
**解决**:
```typescript
// 检查access.ts中的权限定义
// 确保用户角色正确设置
// 验证路由配置中的access字段
```

### 4. 构建问题

**问题**: 生产构建失败
**解决**:
```bash
# 清理依赖重新安装
rm -rf node_modules package-lock.json
npm install

# 检查TypeScript类型错误
npm run tsc

# 清理构建缓存
rm -rf dist .umi
npm run build
```

### 5. 样式问题

**问题**: 样式不生效或冲突
**解决**:
```typescript
// 使用CSS-in-JS方案
import { createStyles } from 'antd-style';

// 避免全局样式污染
// 使用模块化CSS或CSS-in-JS
```

## 📝 开发工作流

### 1. 新功能开发流程

```bash
# 1. 创建功能分支
git checkout -b feature/new-feature

# 2. 创建页面组件
mkdir src/pages/new-feature
touch src/pages/new-feature/index.tsx

# 3. 添加路由配置
# 编辑 config/routes.ts

# 4. 创建API服务
touch src/services/new-feature.ts

# 5. 添加类型定义
touch src/types/new-feature.ts

# 6. 开发测试
npm run dev

# 7. 提交代码
git add .
git commit -m "feat: add new feature"
git push origin feature/new-feature
```

### 2. 代码提交规范

```bash
# 提交类型
feat: 新功能
fix: 修复bug
docs: 文档更新
style: 代码格式化
refactor: 代码重构
test: 测试相关
chore: 构建配置等

# 示例
git commit -m "feat: add virtual card export functionality"
git commit -m "fix: resolve login token refresh issue"
```

### 3. 代码审查检查项

- [ ] TypeScript类型定义完整
- [ ] 组件Props接口清晰
- [ ] 错误处理完善
- [ ] 权限控制正确
- [ ] 响应式设计适配
- [ ] 无console.log等调试代码
- [ ] 国际化文本使用正确
- [ ] 性能优化（useMemo, useCallback等）

---

## 📚 参考资源

- [Ant Design Pro 官方文档](https://pro.ant.design/)
- [UmiJS 官方文档](https://umijs.org/)
- [Ant Design 组件库](https://ant.design/)
- [TypeScript 官方文档](https://www.typescriptlang.org/)
- [React 官方文档](https://react.dev/)

---

**更新日期**: 2025-09-25  
**文档版本**: 1.0.0  
**维护者**: 虚拟卡管理系统开发团队

