/**
 * 🔒 API限流器 - 防止暴力攻击和滥用
 * 
 * 功能：
 * - 基于IP地址的请求限流
 * - 基于用户的操作限流
 * - 滑动窗口算法
 * - 自动清理过期记录
 */

interface RateLimitConfig {
  windowMs: number;      // 时间窗口（毫秒）
  maxRequests: number;   // 最大请求数
  skipSuccessfulRequests?: boolean; // 是否跳过成功请求
  skipFailedRequests?: boolean;     // 是否跳过失败请求
}

interface RateLimitRecord {
  count: number;
  resetTime: number;
  lastRequest: number;
}

class RateLimiter {
  private store: Map<string, RateLimitRecord> = new Map();
  private cleanupInterval: NodeJS.Timeout;

  // 🎯 预定义限流规则
  static readonly RULES = {
    // 登录限流：每5分钟最多5次尝试
    LOGIN: { windowMs: 5 * 60 * 1000, maxRequests: 5 },
    
    // 注册限流：每小时最多3次注册
    REGISTER: { windowMs: 60 * 60 * 1000, maxRequests: 3 },
    
    // 创建虚拟卡：每分钟最多10张卡
    CREATE_CARD: { windowMs: 60 * 1000, maxRequests: 10 },
    
    // 充值提现：每分钟最多5次操作
    FINANCIAL_OPS: { windowMs: 60 * 1000, maxRequests: 5 },
    
    // 普通API：每分钟最多100次请求
    GENERAL_API: { windowMs: 60 * 1000, maxRequests: 100 },
    
    // 密码重置：每小时最多3次
    PASSWORD_RESET: { windowMs: 60 * 60 * 1000, maxRequests: 3 },
  };

  constructor() {
    // 每5分钟清理一次过期记录
    this.cleanupInterval = setInterval(() => {
      this.cleanup();
    }, 5 * 60 * 1000);
  }

  /**
   * 检查是否超出限流
   * @param key 限流键（通常是 IP + 操作类型）
   * @param config 限流配置
   * @returns 限流信息
   */
  check(key: string, config: RateLimitConfig) {
    const now = Date.now();
    const record = this.store.get(key);

    // 首次请求
    if (!record) {
      this.store.set(key, {
        count: 1,
        resetTime: now + config.windowMs,
        lastRequest: now,
      });
      
      return {
        allowed: true,
        count: 1,
        remaining: config.maxRequests - 1,
        resetTime: now + config.windowMs,
        retryAfter: 0,
      };
    }

    // 检查是否需要重置窗口
    if (now >= record.resetTime) {
      this.store.set(key, {
        count: 1,
        resetTime: now + config.windowMs,
        lastRequest: now,
      });
      
      return {
        allowed: true,
        count: 1,
        remaining: config.maxRequests - 1,
        resetTime: now + config.windowMs,
        retryAfter: 0,
      };
    }

    // 检查是否超出限制
    if (record.count >= config.maxRequests) {
      return {
        allowed: false,
        count: record.count,
        remaining: 0,
        resetTime: record.resetTime,
        retryAfter: Math.ceil((record.resetTime - now) / 1000),
      };
    }

    // 增加计数
    record.count++;
    record.lastRequest = now;
    this.store.set(key, record);

    return {
      allowed: true,
      count: record.count,
      remaining: config.maxRequests - record.count,
      resetTime: record.resetTime,
      retryAfter: 0,
    };
  }

  /**
   * 生成限流键
   * @param ip IP地址
   * @param userId 用户ID（可选）
   * @param action 操作类型
   * @returns 限流键
   */
  static generateKey(ip: string, userId: string | null, action: string): string {
    if (userId) {
      return `${action}:user:${userId}`;
    }
    return `${action}:ip:${ip}`;
  }

  /**
   * 清理过期记录
   */
  private cleanup(): void {
    const now = Date.now();
    const keysToDelete: string[] = [];

    for (const [key, record] of this.store.entries()) {
      if (now >= record.resetTime) {
        keysToDelete.push(key);
      }
    }

    keysToDelete.forEach(key => this.store.delete(key));
    
    if (keysToDelete.length > 0) {
      console.log(`🧹 清理了 ${keysToDelete.length} 条过期限流记录`);
    }
  }

  /**
   * 重置指定键的限流记录
   * @param key 限流键
   */
  reset(key: string): void {
    this.store.delete(key);
  }

  /**
   * 获取当前限流状态
   * @param key 限流键
   * @returns 限流状态
   */
  getStatus(key: string) {
    const record = this.store.get(key);
    if (!record) {
      return null;
    }

    const now = Date.now();
    return {
      count: record.count,
      resetTime: record.resetTime,
      isExpired: now >= record.resetTime,
      timeRemaining: Math.max(0, record.resetTime - now),
    };
  }

  /**
   * 销毁限流器
   */
  destroy(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }
    this.store.clear();
  }
}

// 全局限流器实例
export const globalRateLimiter = new RateLimiter();

// 限流中间件工厂
export function createRateLimitMiddleware(
  action: keyof typeof RateLimiter.RULES,
  customConfig?: Partial<RateLimitConfig>
) {
  return (req: any, res: any, next: any) => {
    const config = { ...RateLimiter.RULES[action], ...customConfig };
    const ip = req.ip || req.connection.remoteAddress || 'unknown';
    const userId = req.user?.id || null;
    const key = RateLimiter.generateKey(ip, userId, action);
    
    const result = globalRateLimiter.check(key, config);
    
    // 设置响应头
    res.set({
      'X-RateLimit-Limit': config.maxRequests,
      'X-RateLimit-Remaining': result.remaining,
      'X-RateLimit-Reset': new Date(result.resetTime).toISOString(),
    });

    if (!result.allowed) {
      res.set('Retry-After', result.retryAfter);
      return res.status(429).json({
        success: false,
        error: 'TOO_MANY_REQUESTS',
        message: `请求过于频繁，请在 ${result.retryAfter} 秒后重试`,
        retryAfter: result.retryAfter,
      });
    }

    next();
  };
}

export default RateLimiter;


