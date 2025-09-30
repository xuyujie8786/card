import { request } from '@umijs/max';
import { API_CONFIG } from '@/config/api';

// 用户接口类型定义
export interface CreateUserRequest {
  username: string;
  name: string;
  email: string;
  password: string;
  role: 'SUPER_ADMIN' | 'ADMIN' | 'USER';
  parentId?: number;
  status: 'ACTIVE' | 'INACTIVE' | 'SUSPENDED';
  balance: number;
  currency: string;
}

export interface UserListParams {
  current?: number;
  pageSize?: number;
  username?: string;
  email?: string;
  role?: string;
  status?: string;
  dateRange?: [string, string];
}

export interface BalanceOperationRequest {
  userId: number;
  type: 'deposit' | 'withdraw';
  amount: number;
  remark?: string;
}

export interface UserResponse {
  id: number;
  username: string;
  email: string;
  name: string;
  role: string;
  roleText: string;
  status: string;
  statusText: string;
  balance: number;
  currency: string;
  availableAmount: number;
  parent?: {
    id: number;
    username: string;
    name: string;
  };
  totalSpent: number;
  createdAt: string;
  updatedAt: string;
}

// API 函数
export async function getUserList(params?: UserListParams) {
  const response = await request<{
    success: boolean;
    data: UserResponse[];
    total: number;
    current: number;
    pageSize: number;
  }>(`${API_CONFIG.baseURL}/users`, {
    method: 'GET',
    params,
  });

  // 转换响应格式以匹配ProTable期望的格式
  return {
    success: response.success,
    data: response.data,
    total: response.total,
    current: response.current,
    pageSize: response.pageSize,
  };
}

export async function createUser(data: CreateUserRequest) {
  return request<{
    data: UserResponse;
    code: number;
    message: string;
  }>(`${API_CONFIG.baseURL}/users`, {
    method: 'POST',
    data,
  });
}

export async function updateUser(userId: number, data: Partial<CreateUserRequest>) {
  return request<{
    data: UserResponse;
    code: number;
    message: string;
  }>(`${API_CONFIG.baseURL}/users/${userId}`, {
    method: 'PUT',
    data,
  });
}

export async function getUserById(userId: number) {
  return request<{
    data: UserResponse;
    code: number;
    message: string;
  }>(`${API_CONFIG.baseURL}/users/${userId}`, {
    method: 'GET',
  });
}

export async function balanceOperation(data: BalanceOperationRequest) {
  return request<{
    data: {
      message: string;
      newBalance: number;
    };
    code: number;
    message: string;
  }>(`${API_CONFIG.baseURL}/users/balance-operation`, {
    method: 'POST',
    data,
  });
}

export async function getUserBalanceLogs(userId: number, params?: { page?: number; pageSize?: number }) {
  return request<{
    data: {
      list: any[];
      pagination: {
        current: number;
        pageSize: number;
        total: number;
      };
    };
    code: number;
    message: string;
  }>(`${API_CONFIG.baseURL}/users/${userId}/balance-logs`, {
    method: 'GET',
    params,
  });
}

export async function getAvailableParents() {
  return request<{
    data: Array<{
      label: string;
      value: number;
    }>;
    code: number;
    message: string;
  }>(`${API_CONFIG.baseURL}/users/parents`, {
    method: 'GET',
  });
}
