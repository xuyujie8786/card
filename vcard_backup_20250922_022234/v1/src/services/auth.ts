import { request } from '@umijs/max';
import { API_CONFIG } from '@/config/api';

// 认证相关接口类型定义
export interface LoginRequest {
  username: string;
  password: string;
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
    creditLimit: number;
    currency: string;
    availableAmount: number;
  };
}

export interface RegisterRequest {
  username: string;
  email: string;
  name: string;
  password: string;
}

// Mock数据 - 用于开发调试
const mockLoginResponse: LoginResponse = {
  token: 'mock_jwt_token_123456789',
  user: {
    id: 1,
    username: 'admin',
    email: 'admin@vcard.com',
    name: '管理员',
    role: 'SUPER_ADMIN',
    balance: 100000,
    creditLimit: 50000,
    currency: 'USD',
    availableAmount: 150000,
  },
};

/**
 * 用户登录
 */
export async function login(params: LoginRequest) {
  // 如果使用Mock且认证模块配置为Mock
  if (API_CONFIG.useMock && !API_CONFIG.modules.auth) {
    console.log('🔧 使用Mock登录数据');
    
    // 模拟API延迟
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // 简单的用户名密码验证
    if (params.username === 'admin' && params.password === 'admin123') {
      return {
        code: 200,
        message: 'Login successful',
        data: mockLoginResponse,
      };
    } else {
      throw new Error('用户名或密码错误');
    }
  }

  // 使用真实API
  console.log('🌐 使用真实API登录');
  return request<{
    code: number;
    message: string;
    data: LoginResponse;
  }>(`${API_CONFIG.baseURL}/auth/login`, {
    method: 'POST',
    data: params,
    timeout: API_CONFIG.timeout,
  });
}

/**
 * 用户注册
 */
export async function register(params: RegisterRequest) {
  if (API_CONFIG.useMock && !API_CONFIG.modules.auth) {
    console.log('🔧 使用Mock注册数据');
    
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    return {
      code: 200,
      message: 'Register successful',
      data: { message: 'User registered successfully' },
    };
  }

  return request<{
    code: number;
    message: string;
    data: { message: string };
  }>(`${API_CONFIG.baseURL}/auth/register`, {
    method: 'POST',
    data: params,
    timeout: API_CONFIG.timeout,
  });
}

/**
 * 获取当前用户信息
 */
export async function getCurrentUser() {
  if (API_CONFIG.useMock && !API_CONFIG.modules.auth) {
    console.log('🔧 使用Mock用户信息');
    
    await new Promise(resolve => setTimeout(resolve, 500));
    
    return {
      code: 200,
      message: 'success',
      data: mockLoginResponse.user,
    };
  }

  return request<{
    code: number;
    message: string;
    data: LoginResponse['user'];
  }>(`${API_CONFIG.baseURL}/auth/profile`, {
    method: 'GET',
    timeout: API_CONFIG.timeout,
  });
}

/**
 * 用户退出登录
 */
export async function logout() {
  if (API_CONFIG.useMock && !API_CONFIG.modules.auth) {
    console.log('🔧 使用Mock退出登录');
    
    await new Promise(resolve => setTimeout(resolve, 500));
    
    return {
      code: 200,
      message: 'Logout successful',
      data: null,
    };
  }

  return request<{
    code: number;
    message: string;
    data: null;
  }>(`${API_CONFIG.baseURL}/auth/logout`, {
    method: 'POST',
    timeout: API_CONFIG.timeout,
  });
}
