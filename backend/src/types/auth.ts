// 认证相关类型
export interface LoginRequest {
  username: string;
  password: string;
  twoFactorCode?: string; // 2FA验证码（可选）
}

export interface LoginResponse {
  token: string;
  user: {
    id: number;
    username: string;
    email: string;
    name: string;
    role: string;
    balance: number;
    currency: string;
    availableAmount: number;
  };
  requires2FA?: boolean; // 标识是否需要2FA验证
}

export interface JwtPayload {
  id: number;
  username: string;
  role: string;
  email: string;
  name?: string;
  iat?: number;
  exp?: number;
}

export interface RegisterRequest {
  username: string;
  email: string;
  name: string;
  password: string;
}

export interface ChangePasswordRequest {
  currentPassword: string;
  newPassword: string;
}

export interface ResetPasswordRequest {
  token: string;
  newPassword: string;
}

export interface ForgotPasswordRequest {
  email: string;
}

export interface User {
  id: number;
  username: string;
  email: string;
  name: string;
  role: string;
  status: string;
  balance: number;
  currency: string;
  parentId?: number;
  createdAt: Date;
  updatedAt: Date;
}
