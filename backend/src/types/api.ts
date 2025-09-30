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
  currency: string;
}

export interface UpdateUserRequest {
  name?: string;
  email?: string;
  role?: string;
  parentId?: number;
  status?: string;
  balance?: number;
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
  productCode?: string; // 产品代码，默认香港卡
  amt?: string; // 开卡金额，格式：123.45，默认0.01
  expdate: string; // 过期时间，格式：YYYY-MM-DD
  currency?: string; // 货币类型，默认USD
  remark?: string; // 卡备注
  // 注意：持卡人信息会自动使用当前登录用户的信息
}

export interface CardListParams {
  current?: number;
  pageSize?: number;
  cardholderUsername?: string;
  cardNo?: string;
  status?: string;
  dateRange?: [string, string];
}
