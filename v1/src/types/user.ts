/**
 * 用户相关类型定义
 */

// 用户角色
export type UserRole = 'SUPER_ADMIN' | 'ADMIN' | 'USER';

// 用户状态
export type UserStatus = 'ACTIVE' | 'INACTIVE' | 'SUSPENDED';

// 角色文本映射
export const UserRoleText: Record<UserRole, string> = {
  'SUPER_ADMIN': '超级管理员',
  'ADMIN': '管理员',
  'USER': '用户',
};

// 状态文本映射
export const UserStatusText: Record<UserStatus, string> = {
  'ACTIVE': '正常',
  'INACTIVE': '未激活',
  'SUSPENDED': '已暂停',
};

/**
 * 用户接口
 */
export interface User {
  id: number;
  username: string;
  email: string;
  name: string;
  role: UserRole;
  roleText: string;
  status: UserStatus;
  statusText: string;
  balance: number;
  currency: string;
  availableAmount: number;
  totalRecharge: number;
  totalConsumption: number;
  cardLocked: number;
  parent?: {
    id: number;
    username: string;
    name: string;
  };
  totalSpent: number;
  createdAt: string;
  updatedAt: string;
}

/**
 * 创建用户请求
 */
export interface CreateUserRequest {
  username: string;
  name: string;
  email: string;
  password: string;
  role: UserRole;
  parentId?: number;
  status: UserStatus;
  balance: number;
  currency: string;
}

/**
 * 用户列表查询参数
 */
export interface UserListParams {
  current?: number;
  pageSize?: number;
  username?: string;
  email?: string;
  role?: string;
  status?: string;
  dateRange?: [string, string];
}

/**
 * 余额操作请求
 */
export interface BalanceOperationRequest {
  userId: number;
  type: 'deposit' | 'withdraw';
  amount: number;
  remark?: string;
}


