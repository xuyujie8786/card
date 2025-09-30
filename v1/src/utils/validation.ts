/**
 * 🛡️ API输入验证中间件
 * 
 * 功能：
 * - 请求参数验证
 * - SQL注入防护
 * - XSS攻击防护
 * - 数据类型验证
 * - 业务规则验证
 */

import { Request, Response, NextFunction } from 'express';

// 🎯 常用验证规则
export const ValidationRules = {
  // 用户名：3-20位，字母数字下划线
  USERNAME: /^[a-zA-Z0-9_]{3,20}$/,
  
  // 邮箱格式
  EMAIL: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
  
  // 密码：8-50位，至少包含字母和数字
  PASSWORD: /^(?=.*[A-Za-z])(?=.*\d)[A-Za-z\d@$!%*#?&]{8,50}$/,
  
  // 卡号：13-19位数字
  CARD_NUMBER: /^\d{13,19}$/,
  
  // CVV：3-4位数字
  CVV: /^\d{3,4}$/,
  
  // 金额：最多2位小数
  AMOUNT: /^\d+(\.\d{1,2})?$/,
  
  // UUID格式
  UUID: /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
  
  // 手机号（国际格式）
  PHONE: /^\+?[1-9]\d{1,14}$/,
  
  // IP地址
  IP_ADDRESS: /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/,
};

// 🚫 危险字符和SQL注入关键词
const DANGEROUS_PATTERNS = [
  // SQL注入关键词
  /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|EXEC|UNION|SCRIPT)\b)/gi,
  
  // XSS攻击模式
  /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
  /<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi,
  /javascript:/gi,
  /on\w+\s*=/gi,
  
  // 路径遍历攻击
  /\.\.[\/\\]/g,
  
  // 命令注入
  /[;&|`$(){}]/g,
];

interface ValidationSchema {
  [key: string]: {
    type: 'string' | 'number' | 'boolean' | 'email' | 'uuid' | 'array' | 'object';
    required?: boolean;
    min?: number;
    max?: number;
    pattern?: RegExp;
    enum?: any[];
    custom?: (value: any) => boolean | string;
    sanitize?: boolean;
  };
}

interface ValidationError {
  field: string;
  message: string;
  value?: any;
}

class InputValidator {
  /**
   * 验证请求数据
   * @param data 待验证数据
   * @param schema 验证规则
   * @returns 验证结果
   */
  static validate(data: any, schema: ValidationSchema): {
    isValid: boolean;
    errors: ValidationError[];
    sanitizedData: any;
  } {
    const errors: ValidationError[] = [];
    const sanitizedData: any = {};

    for (const [field, rules] of Object.entries(schema)) {
      const value = data[field];
      
      // 检查必填字段
      if (rules.required && (value === undefined || value === null || value === '')) {
        errors.push({
          field,
          message: `${field} 是必填字段`,
          value,
        });
        continue;
      }

      // 跳过非必填的空值
      if (!rules.required && (value === undefined || value === null || value === '')) {
        continue;
      }

      // 类型验证
      const typeValidation = this.validateType(value, rules.type, field);
      if (!typeValidation.isValid) {
        errors.push(...typeValidation.errors);
        continue;
      }

      // 长度验证
      if (rules.min !== undefined || rules.max !== undefined) {
        const lengthValidation = this.validateLength(value, rules.min, rules.max, field);
        if (!lengthValidation.isValid) {
          errors.push(...lengthValidation.errors);
          continue;
        }
      }

      // 模式验证
      if (rules.pattern) {
        const patternValidation = this.validatePattern(value, rules.pattern, field);
        if (!patternValidation.isValid) {
          errors.push(...patternValidation.errors);
          continue;
        }
      }

      // 枚举验证
      if (rules.enum && rules.enum.length > 0) {
        if (!rules.enum.includes(value)) {
          errors.push({
            field,
            message: `${field} 必须是以下值之一: ${rules.enum.join(', ')}`,
            value,
          });
          continue;
        }
      }

      // 自定义验证
      if (rules.custom) {
        const customResult = rules.custom(value);
        if (customResult !== true) {
          errors.push({
            field,
            message: typeof customResult === 'string' ? customResult : `${field} 验证失败`,
            value,
          });
          continue;
        }
      }

      // 数据清洗
      let sanitizedValue = value;
      if (rules.sanitize && typeof value === 'string') {
        sanitizedValue = this.sanitizeString(value);
      }

      sanitizedData[field] = sanitizedValue;
    }

    return {
      isValid: errors.length === 0,
      errors,
      sanitizedData,
    };
  }

  /**
   * 类型验证
   */
  private static validateType(value: any, type: string, field: string): {
    isValid: boolean;
    errors: ValidationError[];
  } {
    const errors: ValidationError[] = [];

    switch (type) {
      case 'string':
        if (typeof value !== 'string') {
          errors.push({
            field,
            message: `${field} 必须是字符串类型`,
            value,
          });
        }
        break;

      case 'number':
        if (typeof value !== 'number' || isNaN(value)) {
          errors.push({
            field,
            message: `${field} 必须是有效数字`,
            value,
          });
        }
        break;

      case 'boolean':
        if (typeof value !== 'boolean') {
          errors.push({
            field,
            message: `${field} 必须是布尔值`,
            value,
          });
        }
        break;

      case 'email':
        if (typeof value !== 'string' || !ValidationRules.EMAIL.test(value)) {
          errors.push({
            field,
            message: `${field} 必须是有效的邮箱地址`,
            value,
          });
        }
        break;

      case 'uuid':
        if (typeof value !== 'string' || !ValidationRules.UUID.test(value)) {
          errors.push({
            field,
            message: `${field} 必须是有效的UUID格式`,
            value,
          });
        }
        break;

      case 'array':
        if (!Array.isArray(value)) {
          errors.push({
            field,
            message: `${field} 必须是数组类型`,
            value,
          });
        }
        break;

      case 'object':
        if (typeof value !== 'object' || value === null || Array.isArray(value)) {
          errors.push({
            field,
            message: `${field} 必须是对象类型`,
            value,
          });
        }
        break;
    }

    return { isValid: errors.length === 0, errors };
  }

  /**
   * 长度验证
   */
  private static validateLength(value: any, min?: number, max?: number, field?: string): {
    isValid: boolean;
    errors: ValidationError[];
  } {
    const errors: ValidationError[] = [];
    let length = 0;

    if (typeof value === 'string' || Array.isArray(value)) {
      length = value.length;
    } else if (typeof value === 'number') {
      length = Math.abs(value);
    }

    if (min !== undefined && length < min) {
      errors.push({
        field: field || 'unknown',
        message: `${field} 长度不能少于 ${min}`,
        value,
      });
    }

    if (max !== undefined && length > max) {
      errors.push({
        field: field || 'unknown',
        message: `${field} 长度不能超过 ${max}`,
        value,
      });
    }

    return { isValid: errors.length === 0, errors };
  }

  /**
   * 模式验证
   */
  private static validatePattern(value: string, pattern: RegExp, field: string): {
    isValid: boolean;
    errors: ValidationError[];
  } {
    const errors: ValidationError[] = [];

    if (!pattern.test(value)) {
      errors.push({
        field,
        message: `${field} 格式不正确`,
        value,
      });
    }

    return { isValid: errors.length === 0, errors };
  }

  /**
   * 字符串清洗（防XSS）
   */
  private static sanitizeString(input: string): string {
    return input
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#x27;')
      .replace(/\//g, '&#x2F;')
      .trim();
  }

  /**
   * 检查危险模式
   */
  static checkDangerousPatterns(input: string): boolean {
    return DANGEROUS_PATTERNS.some(pattern => pattern.test(input));
  }

  /**
   * 深度清洗对象
   */
  static deepSanitize(obj: any): any {
    if (typeof obj === 'string') {
      return this.sanitizeString(obj);
    }

    if (Array.isArray(obj)) {
      return obj.map(item => this.deepSanitize(item));
    }

    if (typeof obj === 'object' && obj !== null) {
      const sanitized: any = {};
      for (const [key, value] of Object.entries(obj)) {
        sanitized[key] = this.deepSanitize(value);
      }
      return sanitized;
    }

    return obj;
  }
}

// 🎯 预定义验证规则
export const ValidationSchemas = {
  // 用户注册
  USER_REGISTER: {
    username: {
      type: 'string' as const,
      required: true,
      min: 3,
      max: 20,
      pattern: ValidationRules.USERNAME,
      sanitize: true,
    },
    email: {
      type: 'email' as const,
      required: true,
      sanitize: true,
    },
    password: {
      type: 'string' as const,
      required: true,
      pattern: ValidationRules.PASSWORD,
    },
    role: {
      type: 'string' as const,
      enum: ['admin', 'user'],
    },
  },

  // 用户登录
  USER_LOGIN: {
    username: {
      type: 'string' as const,
      required: true,
      sanitize: true,
    },
    password: {
      type: 'string' as const,
      required: true,
    },
  },

  // 虚拟卡创建
  CARD_CREATE: {
    cardholderName: {
      type: 'string' as const,
      required: true,
      min: 2,
      max: 50,
      sanitize: true,
    },
    cardholderUsername: {
      type: 'string' as const,
      required: true,
      pattern: ValidationRules.USERNAME,
      sanitize: true,
    },
    currency: {
      type: 'string' as const,
      required: true,
      enum: ['USD', 'EUR', 'GBP'],
    },
    initialAmount: {
      type: 'number' as const,
      min: 0,
      max: 10000,
      custom: (value: number) => {
        if (value < 0) return '金额不能为负数';
        if (value % 0.01 !== 0) return '金额最多保留2位小数';
        return true;
      },
    },
  },

  // 充值/提现
  CARD_TRANSACTION: {
    cardId: {
      type: 'uuid' as const,
      required: true,
    },
    amount: {
      type: 'number' as const,
      required: true,
      min: 0.01,
      max: 50000,
      custom: (value: number) => {
        if (value <= 0) return '金额必须大于0';
        if (value % 0.01 !== 0) return '金额最多保留2位小数';
        return true;
      },
    },
    remark: {
      type: 'string' as const,
      max: 200,
      sanitize: true,
    },
  },
};

/**
 * 创建验证中间件
 */
export function createValidationMiddleware(schema: ValidationSchema) {
  return (req: Request, res: Response, next: NextFunction) => {
    // 合并所有输入数据
    const inputData = {
      ...req.body,
      ...req.query,
      ...req.params,
    };

    // 检查危险模式
    const inputString = JSON.stringify(inputData);
    if (InputValidator.checkDangerousPatterns(inputString)) {
      return res.status(400).json({
        success: false,
        error: 'DANGEROUS_INPUT',
        message: '检测到潜在的安全威胁',
      });
    }

    // 执行验证
    const validation = InputValidator.validate(inputData, schema);

    if (!validation.isValid) {
      return res.status(400).json({
        success: false,
        error: 'VALIDATION_ERROR',
        message: '输入数据验证失败',
        details: validation.errors,
      });
    }

    // 将清洗后的数据附加到请求对象
    req.validatedData = validation.sanitizedData;

    next();
  };
}

/**
 * 安全中间件：检查请求头和IP
 */
export function securityMiddleware(req: Request, res: Response, next: NextFunction) {
  // 检查User-Agent
  const userAgent = req.get('User-Agent');
  if (!userAgent || userAgent.length < 10) {
    return res.status(400).json({
      success: false,
      error: 'INVALID_USER_AGENT',
      message: '无效的User-Agent',
    });
  }

  // 检查Content-Type（对于POST/PUT请求）
  if (['POST', 'PUT', 'PATCH'].includes(req.method)) {
    const contentType = req.get('Content-Type');
    if (!contentType || !contentType.includes('application/json')) {
      return res.status(400).json({
        success: false,
        error: 'INVALID_CONTENT_TYPE',
        message: '无效的Content-Type，必须是application/json',
      });
    }
  }

  // 记录请求信息（用于安全审计）
  console.log(`🔍 安全检查 - IP: ${req.ip}, Method: ${req.method}, Path: ${req.path}, UA: ${userAgent.substring(0, 100)}`);

  next();
}

export default InputValidator;


