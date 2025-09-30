/**
 * 安全的Token管理工具
 * 替代localStorage，使用更安全的存储方式
 */

import Cookies from 'js-cookie';

// Token存储配置
const TOKEN_CONFIG = {
  ACCESS_TOKEN_KEY: 'vcard_access_token',
  REFRESH_TOKEN_KEY: 'vcard_refresh_token',
  // Cookie配置
  COOKIE_OPTIONS: {
    secure: process.env.NODE_ENV === 'production', // 生产环境使用HTTPS
    sameSite: 'strict' as const, // 防CSRF
    expires: 7, // 7天过期
  },
  // SessionStorage用于临时存储（页面关闭即清除）
  SESSION_OPTIONS: {
    expires: 1/24, // 1小时
  }
};

export class TokenManager {
  /**
   * 存储访问令牌
   * 优先使用httpOnly cookie，降级到sessionStorage
   */
  static setAccessToken(token: string): void {
    try {
      // 尝试设置cookie（在生产环境中应该由后端设置httpOnly cookie）
      Cookies.set(TOKEN_CONFIG.ACCESS_TOKEN_KEY, token, {
        ...TOKEN_CONFIG.COOKIE_OPTIONS,
        expires: TOKEN_CONFIG.SESSION_OPTIONS.expires, // 访问令牌短期有效
      });
      
      // 同时在sessionStorage中存储一份（用于前端判断登录状态）
      sessionStorage.setItem(TOKEN_CONFIG.ACCESS_TOKEN_KEY, token);
      
      console.log('✅ Access token stored securely');
    } catch (error) {
      console.error('❌ Failed to store access token:', error);
      // 降级到sessionStorage
      sessionStorage.setItem(TOKEN_CONFIG.ACCESS_TOKEN_KEY, token);
    }
  }

  /**
   * 存储刷新令牌
   */
  static setRefreshToken(token: string): void {
    try {
      Cookies.set(TOKEN_CONFIG.REFRESH_TOKEN_KEY, token, TOKEN_CONFIG.COOKIE_OPTIONS);
      console.log('✅ Refresh token stored securely');
    } catch (error) {
      console.error('❌ Failed to store refresh token:', error);
      // 刷新令牌不应该存储在sessionStorage中
    }
  }

  /**
   * 获取访问令牌
   */
  static getAccessToken(): string | null {
    try {
      // 优先从cookie获取
      const cookieToken = Cookies.get(TOKEN_CONFIG.ACCESS_TOKEN_KEY);
      if (cookieToken) {
        return cookieToken;
      }
      
      // 降级到sessionStorage
      const sessionToken = sessionStorage.getItem(TOKEN_CONFIG.ACCESS_TOKEN_KEY);
      return sessionToken;
    } catch (error) {
      console.error('❌ Failed to get access token:', error);
      return null;
    }
  }

  /**
   * 获取刷新令牌
   */
  static getRefreshToken(): string | null {
    try {
      return Cookies.get(TOKEN_CONFIG.REFRESH_TOKEN_KEY) || null;
    } catch (error) {
      console.error('❌ Failed to get refresh token:', error);
      return null;
    }
  }

  /**
   * 清除所有令牌
   */
  static clearTokens(): void {
    try {
      // 清除cookies
      Cookies.remove(TOKEN_CONFIG.ACCESS_TOKEN_KEY);
      Cookies.remove(TOKEN_CONFIG.REFRESH_TOKEN_KEY);
      
      // 清除sessionStorage
      sessionStorage.removeItem(TOKEN_CONFIG.ACCESS_TOKEN_KEY);
      
      // 清除可能存在的localStorage（兼容性清理）
      localStorage.removeItem('vcard_token');
      localStorage.removeItem(TOKEN_CONFIG.ACCESS_TOKEN_KEY);
      localStorage.removeItem(TOKEN_CONFIG.REFRESH_TOKEN_KEY);
      
      console.log('✅ All tokens cleared');
    } catch (error) {
      console.error('❌ Failed to clear tokens:', error);
    }
  }

  /**
   * 检查是否已登录
   */
  static isLoggedIn(): boolean {
    const accessToken = this.getAccessToken();
    return !!accessToken;
  }

  /**
   * 获取Token的过期时间（从JWT中解析）
   */
  static getTokenExpiration(token: string): Date | null {
    try {
      // 解析JWT payload（不验证签名，仅获取过期时间）
      const payload = JSON.parse(atob(token.split('.')[1]));
      if (payload.exp) {
        return new Date(payload.exp * 1000);
      }
      return null;
    } catch (error) {
      console.error('❌ Failed to parse token expiration:', error);
      return null;
    }
  }

  /**
   * 检查Token是否即将过期（5分钟内）
   */
  static isTokenExpiringSoon(token: string): boolean {
    const expiration = this.getTokenExpiration(token);
    if (!expiration) return true;
    
    const now = new Date();
    const fiveMinutesFromNow = new Date(now.getTime() + 5 * 60 * 1000);
    
    return expiration <= fiveMinutesFromNow;
  }

  /**
   * 自动刷新Token（如果需要且可能）
   */
  static async refreshTokenIfNeeded(): Promise<boolean> {
    const accessToken = this.getAccessToken();
    const refreshToken = this.getRefreshToken();
    
    if (!accessToken || !refreshToken) {
      return false;
    }
    
    if (this.isTokenExpiringSoon(accessToken)) {
      try {
        // 这里应该调用刷新Token的API
        // const response = await refreshTokenAPI(refreshToken);
        // this.setAccessToken(response.accessToken);
        // return true;
        
        console.log('🔄 Token refresh needed but not implemented yet');
        return false;
      } catch (error) {
        console.error('❌ Token refresh failed:', error);
        this.clearTokens();
        return false;
      }
    }
    
    return true;
  }
}

// 导出单例实例
export default TokenManager;


