import { request } from '@umijs/max';
import { API_CONFIG } from '@/config/api';
import TokenManager from '@/utils/tokenManager';
import InputSanitizer from '@/utils/inputSanitizer';

// 认证相关接口类型定义
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

export interface RegisterRequest {
  username: string;
  email: string;
  name: string;
  password: string;
}

// ⚠️ 临时Mock数据 - 仅用于开发调试，生产环境将移除
const mockLoginResponse: LoginResponse = {
  token: `mock_jwt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`, // 动态生成，避免固定值
  user: {
    id: 1,
    username: 'admin',
    email: 'admin@vcard.com',
    name: '管理员',
    role: 'SUPER_ADMIN',
    balance: 100000,
    currency: 'USD',
    availableAmount: 100000,
  },
};

/**
 * 用户登录
 */
export async function login(params: LoginRequest) {
  // ✅ 清理和验证输入数据
  const sanitizedParams = {
    username: InputSanitizer.sanitizeUsername(params.username),
    password: params.password, // 密码保持原样，只在后端验证
    ...(params.twoFactorCode && { twoFactorCode: InputSanitizer.sanitizeText(params.twoFactorCode) }),
  };

  // 验证输入数据
  if (!sanitizedParams.username || !sanitizedParams.password) {
    throw new Error('用户名和密码不能为空');
  }

  if (sanitizedParams.username.length < 3 || sanitizedParams.username.length > 50) {
    throw new Error('用户名长度必须在3-50字符之间');
  }

  // 如果使用Mock且认证模块配置为Mock
  if (API_CONFIG.useMock && !API_CONFIG.modules.auth) {
    console.log('🔧 使用Mock登录数据');
    
    // 模拟API延迟
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // ⚠️ 临时的简单验证 - 生产环境将移除
    const validCredentials = [
      { username: 'admin', password: 'admin123' },
      { username: 'test', password: 'test123' },
    ];

    const isValidCredential = validCredentials.some(
      cred => cred.username === sanitizedParams.username && cred.password === sanitizedParams.password
    );

    if (isValidCredential) {
      const response = {
        code: 200,
        message: 'Login successful',
        data: mockLoginResponse,
      };

      // ✅ 使用安全的Token管理器存储token
      TokenManager.setAccessToken(response.data.token);
      
      return response;
    } else {
      throw new Error('用户名或密码错误');
    }
  }

  // 使用真实API
  console.log('🌐 使用真实API登录');
  const response = await request<{
    code: number;
    message: string;
    data: LoginResponse;
  }>(`/auth/login`, {
    method: 'POST',
    data: sanitizedParams,
    timeout: API_CONFIG.timeout,
  });

  // ✅ 登录成功后安全存储token
  if (response.code === 200 && response.data.token) {
    TokenManager.setAccessToken(response.data.token);
  }

  return response;
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
  }>(`/auth/register`, {
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
  }>(`/auth/profile`, {
    method: 'GET',
    timeout: API_CONFIG.timeout,
  });
}

/**
 * 用户退出登录
 */
export async function logout() {
  try {
    if (API_CONFIG.useMock && !API_CONFIG.modules.auth) {
      console.log('🔧 使用Mock退出登录');
      
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // ✅ 安全清除本地tokens
      TokenManager.clearTokens();
      
      return {
        code: 200,
        message: 'Logout successful',
        data: null,
      };
    }

    // 调用后端登出API
    const response = await request<{
      code: number;
      message: string;
      data: null;
    }>(`/auth/logout`, {
      method: 'POST',
      timeout: API_CONFIG.timeout,
    });

    // ✅ 无论API调用是否成功，都要清除本地tokens
    TokenManager.clearTokens();
    
    return response;
  } catch (error) {
    // ✅ 即使登出API失败，也要清除本地tokens
    TokenManager.clearTokens();
    console.error('Logout API failed, but tokens cleared:', error);
    
    // 返回成功，因为本地已经清除了认证信息
    return {
      code: 200,
      message: 'Logout completed (local cleanup)',
      data: null,
    };
  }
}

/**
 * 免密登录
 */
export async function passwordlessLogin(token: string, userId: number) {
  if (API_CONFIG.useMock && !API_CONFIG.modules.auth) {
    console.log('🔧 使用Mock免密登录');
    
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // 简单验证
    if (token && userId) {
      return {
        code: 200,
        message: 'Passwordless login successful',
        data: mockLoginResponse,
      };
    } else {
      throw new Error('无效的免密登录token');
    }
  }

  return request<{
    code: number;
    message: string;
    data: LoginResponse;
  }>(`/auth/passwordless-login`, {
    method: 'POST',
    data: {
      token,
      userId,
    },
    timeout: API_CONFIG.timeout,
  });
}
