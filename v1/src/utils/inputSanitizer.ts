/**
 * 输入数据清理和验证工具
 * 防止XSS攻击和恶意输入
 */

import DOMPurify from 'dompurify';

export class InputSanitizer {
  /**
   * 清理HTML内容，防止XSS攻击
   */
  static sanitizeHtml(input: string): string {
    if (!input || typeof input !== 'string') {
      return '';
    }
    
    return DOMPurify.sanitize(input, {
      ALLOWED_TAGS: [], // 不允许任何HTML标签
      ALLOWED_ATTR: [], // 不允许任何属性
    });
  }

  /**
   * 清理用户输入的文本（保留基本格式）
   */
  static sanitizeText(input: string): string {
    if (!input || typeof input !== 'string') {
      return '';
    }
    
    return DOMPurify.sanitize(input, {
      ALLOWED_TAGS: ['b', 'i', 'em', 'strong'], // 允许基本格式标签
      ALLOWED_ATTR: [], // 不允许任何属性
    });
  }

  /**
   * 清理用户名（只允许字母、数字、下划线、连字符）
   */
  static sanitizeUsername(input: string): string {
    if (!input || typeof input !== 'string') {
      return '';
    }
    
    // 移除所有非法字符
    return input.replace(/[^a-zA-Z0-9_-]/g, '').substring(0, 50);
  }

  /**
   * 清理邮箱地址
   */
  static sanitizeEmail(input: string): string {
    if (!input || typeof input !== 'string') {
      return '';
    }
    
    // 基本的邮箱格式清理
    return input.toLowerCase().trim().substring(0, 254);
  }

  /**
   * 清理持卡人姓名（只允许字母和空格）
   */
  static sanitizeCardholderName(input: string): string {
    if (!input || typeof input !== 'string') {
      return '';
    }
    
    // 只允许字母、空格和常见的名字字符
    return input.replace(/[^a-zA-Z\s'-]/g, '').trim().substring(0, 50);
  }

  /**
   * 清理备注信息
   */
  static sanitizeRemark(input: string): string {
    if (!input || typeof input !== 'string') {
      return '';
    }
    
    // 移除HTML标签但保留文本内容
    const cleaned = DOMPurify.sanitize(input, {
      ALLOWED_TAGS: [],
      ALLOWED_ATTR: [],
    });
    
    return cleaned.trim().substring(0, 200);
  }

  /**
   * 验证和清理金额
   */
  static sanitizeAmount(input: string | number): number {
    if (typeof input === 'number') {
      return Math.max(0, Math.round(input * 100) / 100); // 保留2位小数
    }
    
    if (typeof input === 'string') {
      const num = parseFloat(input.replace(/[^0-9.-]/g, ''));
      return isNaN(num) ? 0 : Math.max(0, Math.round(num * 100) / 100);
    }
    
    return 0;
  }

  /**
   * 验证和清理产品代码
   */
  static sanitizeProductCode(input: string): string {
    if (!input || typeof input !== 'string') {
      return '';
    }
    
    // 只允许字母和数字
    const cleaned = input.replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
    
    // 验证是否为有效的产品代码
    const validCodes = ['E0000001', 'G0000001'];
    return validCodes.includes(cleaned) ? cleaned : '';
  }

  /**
   * 批量清理对象中的字符串字段
   */
  static sanitizeObject<T extends Record<string, any>>(
    obj: T,
    fieldConfig: Record<keyof T, 'html' | 'text' | 'username' | 'email' | 'cardholderName' | 'remark' | 'amount' | 'productCode'>
  ): T {
    const sanitized = { ...obj };
    
    for (const [field, type] of Object.entries(fieldConfig)) {
      const value = obj[field];
      
      if (value !== undefined && value !== null) {
        switch (type) {
          case 'html':
            sanitized[field] = this.sanitizeHtml(String(value));
            break;
          case 'text':
            sanitized[field] = this.sanitizeText(String(value));
            break;
          case 'username':
            sanitized[field] = this.sanitizeUsername(String(value));
            break;
          case 'email':
            sanitized[field] = this.sanitizeEmail(String(value));
            break;
          case 'cardholderName':
            sanitized[field] = this.sanitizeCardholderName(String(value));
            break;
          case 'remark':
            sanitized[field] = this.sanitizeRemark(String(value));
            break;
          case 'amount':
            sanitized[field] = this.sanitizeAmount(value);
            break;
          case 'productCode':
            sanitized[field] = this.sanitizeProductCode(String(value));
            break;
          default:
            // 默认进行基本的HTML清理
            sanitized[field] = this.sanitizeHtml(String(value));
        }
      }
    }
    
    return sanitized;
  }

  /**
   * 验证输入是否包含潜在的恶意内容
   */
  static containsMaliciousContent(input: string): boolean {
    if (!input || typeof input !== 'string') {
      return false;
    }
    
    // 检查常见的恶意模式
    const maliciousPatterns = [
      /<script/i,
      /javascript:/i,
      /on\w+\s*=/i,
      /<iframe/i,
      /<object/i,
      /<embed/i,
      /eval\s*\(/i,
      /expression\s*\(/i,
    ];
    
    return maliciousPatterns.some(pattern => pattern.test(input));
  }

  /**
   * 生成安全的随机字符串（用于CSRF token等）
   */
  static generateSecureRandomString(length: number = 32): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    
    // 使用crypto.getRandomValues如果可用，否则降级到Math.random
    if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
      const array = new Uint8Array(length);
      crypto.getRandomValues(array);
      
      for (let i = 0; i < length; i++) {
        result += chars[array[i] % chars.length];
      }
    } else {
      for (let i = 0; i < length; i++) {
        result += chars[Math.floor(Math.random() * chars.length)];
      }
    }
    
    return result;
  }
}

export default InputSanitizer;


