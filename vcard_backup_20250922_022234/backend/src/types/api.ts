// API 响应类型
export interface ApiResponse<T = any> {
  code: number;
  message: string;
  data: T;
}

export interface PaginationResponse<T> {
  list: T[];
  pagination: {
    current: number;
    pageSize: number;
    total: number;
  };
}

// 用户相关类型
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
  creditLimit: number;
  currency: string;
  availableAmount: number;
  parent?: {
    id: number;
    username: string;
    name: string;
  };
  cardCount: number;
  totalSpent: number;
  createdAt: string;
  updatedAt: string;
}

export interface CreateUserRequest {
  username: string;
  name: string;
  email: string;
  password: string;
  role: string;
  parentId?: number;
  status: string;
  balance: number;
  creditLimit: number;
  currency: string;
}

export interface UpdateUserRequest {
  name?: string;
  email?: string;
  role?: string;
  parentId?: number;
  status?: string;
  balance?: number;
  creditLimit?: number;
  currency?: string;
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

// 用户资金记录类型
export interface UserBalanceLogResponse {
  id: number;
  type: string;
  typeText: string;
  amount: number;
  balanceBefore: number;
  balanceAfter: number;
  currency: string;
  description: string;
  remark?: string;
  operatedBy: {
    id: number;
    username: string;
    name: string;
  };
  relatedCard?: {
    id: number;
    cardNo: string;
  };
  relatedUser?: {
    id: number;
    username: string;
    name: string;
  };
  createdAt: string;
}

export interface BalanceOperationRequest {
  userId: number;
  type: 'deposit' | 'withdraw';
  amount: number;
  remark?: string;
}

// 虚拟卡相关类型
export interface VirtualCardResponse {
  id: number;
  cardId: string;
  cardNo: string;
  balance: number;
  currency: string;
  status: string;
  statusText: string;
  expDate: string;
  cardholderName: string;
  cardholderUsername: string;
  cardholderEmail?: string;
  createdBy: {
    id: number;
    username: string;
    name: string;
  };
  createdAt: string;
  updatedAt: string;
  remark?: string;
}

export interface CreateCardRequest {
  cardholderUsername: string;
  cardholderName: string;
  cardholderEmail: string;
  currency: string;
  initialAmount: number;
  remark?: string;
}

export interface CardListParams {
  current?: number;
  pageSize?: number;
  cardholderUsername?: string;
  cardNo?: string;
  status?: string;
  dateRange?: [string, string];
}
