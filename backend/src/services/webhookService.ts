/**
 * Webhook 处理服务
 * 提供webhook签名验证和安全处理
 */

import crypto from 'crypto';
import logger from '../config/logger';

export class WebhookService {
  private readonly secretKey: string;

  constructor(secretKey?: string) {
    this.secretKey = secretKey || process.env.WEBHOOK_SECRET_KEY || 'default-webhook-secret';
  }

  /**
   * 验证webhook签名
   */
  verifySignature(payload: string, signature: string, timestamp?: string): boolean {
    try {
      // 检查时间戳（可选，防重放攻击）
      if (timestamp) {
        const requestTime = parseInt(timestamp);
        const currentTime = Math.floor(Date.now() / 1000);
        const timeDiff = Math.abs(currentTime - requestTime);
        
        // 允许5分钟的时间差
        if (timeDiff > 300) {
          logger.warn('Webhook timestamp too old', { timestamp, currentTime, timeDiff });
          return false;
        }
      }

      // 计算期望的签名
      const expectedSignature = this.calculateSignature(payload, timestamp);
      
      // 使用安全的字符串比较
      return this.safeCompare(signature, expectedSignature);
    } catch (error) {
      logger.error('Webhook signature verification failed', { error });
      return false;
    }
  }

  /**
   * 计算webhook签名
   */
  private calculateSignature(payload: string, timestamp?: string): string {
    const data = timestamp ? `${timestamp}.${payload}` : payload;
    return crypto
      .createHmac('sha256', this.secretKey)
      .update(data, 'utf8')
      .digest('hex');
  }

  /**
   * 安全的字符串比较，防止时间攻击
   */
  private safeCompare(a: string, b: string): boolean {
    if (a.length !== b.length) {
      return false;
    }

    let result = 0;
    for (let i = 0; i < a.length; i++) {
      result |= a.charCodeAt(i) ^ b.charCodeAt(i);
    }

    return result === 0;
  }

  /**
   * 生成webhook签名（用于测试）
   */
  generateSignature(payload: string, timestamp?: string): string {
    return this.calculateSignature(payload, timestamp);
  }

  /**
   * 处理webhook重试机制
   */
  async processWithRetry<T>(
    operation: () => Promise<T>,
    maxRetries: number = 3,
    baseDelay: number = 1000
  ): Promise<T> {
    let lastError: Error = new Error('Unknown error');

    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error as Error;
        
        if (attempt < maxRetries - 1) {
          const delay = baseDelay * Math.pow(2, attempt); // 指数退避
          logger.warn(`Webhook operation failed, retrying in ${delay}ms`, {
            attempt: attempt + 1,
            maxRetries,
            error: error instanceof Error ? error.message : 'Unknown error'
          });
          
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }

    logger.error('Webhook operation failed after all retries', {
      maxRetries,
      error: lastError.message
    });
    
    throw lastError;
  }

  /**
   * 记录webhook事件
   */
  logWebhookEvent(eventType: string, data: any, success: boolean, error?: string): void {
    logger.info('Webhook event processed', {
      eventType,
      success,
      error,
      dataSize: JSON.stringify(data).length,
      timestamp: new Date().toISOString()
    });
  }
}

export default new WebhookService();
