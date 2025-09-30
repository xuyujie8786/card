/**
 * 🔐 系统安全配置
 * 
 * 集中管理所有安全相关的配置参数
 */

export const SecurityConfig = {
  // 🔑 加密配置
  encryption: {
    // 主密钥（生产环境应从环境变量获取）
    masterKey: process.env.ENCRYPTION_MASTER_KEY || 'your-super-secret-master-key-change-this-in-production-256bit',
    
    // 数据过期时间
    defaultTTL: 365 * 24 * 60 * 60 * 1000, // 1年
    
    // 密码哈希迭代次数
    pbkdf2Iterations: 100000,
    
    // CSRF令牌有效期
    csrfTokenMaxAge: 60 * 60 * 1000, // 1小时
  },

  // 🚦 限流配置
  rateLimiting: {
    // 是否启用限流
    enabled: true,
    
    // 清理间隔（毫秒）
    cleanupInterval: 5 * 60 * 1000, // 5分钟
    
    // 默认限流规则
    defaultRules: {
      windowMs: 60 * 1000, // 1分钟
      maxRequests: 100,
    },
    
    // IP白名单（不受限流影响）
    ipWhitelist: [
      '127.0.0.1',
      '::1',
      'localhost',
    ],
  },

  // 🛡️ 输入验证配置
  validation: {
    // 是否启用XSS防护
    xssProtection: true,
    
    // 是否启用SQL注入防护
    sqlInjectionProtection: true,
    
    // 最大请求体大小（字节）
    maxRequestSize: 10 * 1024 * 1024, // 10MB
    
    // 字符串最大长度
    maxStringLength: 10000,
  },

  // 📱 设备指纹配置
  deviceFingerprint: {
    // 是否启用设备指纹
    enabled: true,
    
    // 指纹有效期（毫秒）
    validityPeriod: 7 * 24 * 60 * 60 * 1000, // 7天
    
    // 信任度阈值
    trustThreshold: 70,
    
    // 相似度阈值
    similarityThreshold: 0.7,
    
    // 存储键名
    storageKey: 'vcard_device_fingerprint',
  },

  // 🔐 JWT配置
  jwt: {
    // 访问令牌有效期
    accessTokenExpiry: '15m',
    
    // 刷新令牌有效期
    refreshTokenExpiry: '7d',
    
    // 签名算法
    algorithm: 'HS256',
    
    // 密钥（生产环境应从环境变量获取）
    secret: process.env.JWT_SECRET || 'your-jwt-secret-key-change-this-in-production',
    
    // 发行者
    issuer: 'vcard-system',
    
    // 受众
    audience: 'vcard-users',
  },

  // 🔒 会话配置
  session: {
    // 会话有效期
    maxAge: 24 * 60 * 60 * 1000, // 24小时
    
    // 会话密钥
    secret: process.env.SESSION_SECRET || 'your-session-secret-change-this-in-production',
    
    // Cookie配置
    cookie: {
      secure: process.env.NODE_ENV === 'production', // 生产环境启用HTTPS
      httpOnly: true,
      sameSite: 'strict' as const,
    },
  },

  // 🌐 CORS配置
  cors: {
    // 允许的源
    allowedOrigins: [
      'http://localhost:8002',
      'http://127.0.0.1:8002',
      process.env.FRONTEND_URL || 'http://localhost:8002',
    ],
    
    // 允许的方法
    allowedMethods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    
    // 允许的头部
    allowedHeaders: [
      'Content-Type',
      'Authorization',
      'X-Requested-With',
      'X-CSRF-Token',
      'X-Device-Fingerprint',
    ],
    
    // 是否允许凭据
    credentials: true,
  },

  // 📊 审计日志配置
  audit: {
    // 是否启用审计日志
    enabled: true,
    
    // 日志级别
    level: process.env.NODE_ENV === 'production' ? 'info' : 'debug',
    
    // 敏感操作列表
    sensitiveOperations: [
      'user_login',
      'user_register',
      'password_change',
      'card_create',
      'card_recharge',
      'card_withdraw',
      'user_role_change',
      'system_config_change',
    ],
    
    // 日志保留时间（天）
    retentionDays: 90,
  },

  // ⚠️ 安全警报配置
  alerts: {
    // 是否启用安全警报
    enabled: true,
    
    // 警报阈值
    thresholds: {
      // 失败登录次数
      failedLoginAttempts: 5,
      
      // 异常设备检测
      anomalousDeviceScore: 30,
      
      // 短时间内大量请求
      rapidRequests: 100,
      
      // 单日最大操作次数
      dailyOperationLimit: 1000,
    },
    
    // 通知方式
    notifications: {
      email: true,
      webhook: false,
      sms: false,
    },
  },

  // 🔧 开发环境配置
  development: {
    // 是否启用详细错误信息
    verboseErrors: process.env.NODE_ENV !== 'production',
    
    // 是否启用调试日志
    debugLogs: process.env.NODE_ENV !== 'production',
    
    // 是否跳过某些安全检查
    skipSecurityChecks: false,
    
    // 测试模式
    testMode: process.env.NODE_ENV === 'test',
  },
};

// 🎯 安全策略配置
export const SecurityPolicies = {
  // 密码策略
  password: {
    minLength: 8,
    maxLength: 50,
    requireUppercase: true,
    requireLowercase: true,
    requireNumbers: true,
    requireSpecialChars: true,
    preventCommonPasswords: true,
    maxAge: 90 * 24 * 60 * 60 * 1000, // 90天
  },

  // 账户锁定策略
  accountLockout: {
    maxFailedAttempts: 5,
    lockoutDuration: 30 * 60 * 1000, // 30分钟
    resetAfterSuccess: true,
  },

  // 操作限制策略
  operationLimits: {
    // 每日创建卡片数量限制
    dailyCardCreation: {
      user: 10,
      admin: 100,
      superAdmin: 1000,
    },
    
    // 单次充值限制
    singleRecharge: {
      min: 1,
      max: 10000,
    },
    
    // 单次提现限制
    singleWithdraw: {
      min: 1,
      max: 5000,
    },
    
    // 每日交易限制
    dailyTransactionLimit: {
      user: 50000,
      admin: 200000,
      superAdmin: 1000000,
    },
  },

  // 数据保护策略
  dataProtection: {
    // 敏感数据字段
    sensitiveFields: [
      'password',
      'cardNumber',
      'cvv',
      'expDate',
      'socialSecurityNumber',
      'bankAccount',
    ],
    
    // 数据脱敏规则
    maskingRules: {
      cardNumber: (value: string) => value.replace(/\d(?=\d{4})/g, '*'),
      email: (value: string) => value.replace(/(.{2}).*(@.*)/, '$1***$2'),
      phone: (value: string) => value.replace(/(\d{3})\d{4}(\d{4})/, '$1****$2'),
    },
    
    // 数据加密级别
    encryptionLevels: {
      high: ['cardNumber', 'cvv', 'password'],
      medium: ['email', 'phone', 'address'],
      low: ['name', 'username'],
    },
  },
};

// 🚨 安全事件类型
export enum SecurityEventType {
  // 认证相关
  LOGIN_SUCCESS = 'login_success',
  LOGIN_FAILED = 'login_failed',
  LOGOUT = 'logout',
  PASSWORD_CHANGE = 'password_change',
  
  // 授权相关
  UNAUTHORIZED_ACCESS = 'unauthorized_access',
  PERMISSION_DENIED = 'permission_denied',
  ROLE_CHANGE = 'role_change',
  
  // 操作相关
  CARD_CREATED = 'card_created',
  CARD_DELETED = 'card_deleted',
  BALANCE_CHANGED = 'balance_changed',
  SENSITIVE_DATA_ACCESS = 'sensitive_data_access',
  
  // 安全相关
  SUSPICIOUS_ACTIVITY = 'suspicious_activity',
  RATE_LIMIT_EXCEEDED = 'rate_limit_exceeded',
  DEVICE_FINGERPRINT_MISMATCH = 'device_fingerprint_mismatch',
  SQL_INJECTION_ATTEMPT = 'sql_injection_attempt',
  XSS_ATTEMPT = 'xss_attempt',
  
  // 系统相关
  SYSTEM_ERROR = 'system_error',
  CONFIG_CHANGE = 'config_change',
  BACKUP_CREATED = 'backup_created',
}

export default SecurityConfig;


