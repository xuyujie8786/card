import dotenv from 'dotenv';

// 加载环境变量
dotenv.config();

export const config = {
  port: parseInt(process.env.PORT || '3001', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  
  // 数据库配置
  databaseUrl: process.env.DATABASE_URL || '',
  redisUrl: process.env.REDIS_URL || 'redis://localhost:6379',
  
  // JWT 配置
  jwtSecret: process.env.JWT_SECRET || 'your-super-secret-jwt-key',
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '7d',
  
  // 卡商 API 配置
  cardProvider: {
    apiUrl: process.env.CARD_PROVIDER_API_URL || '',
    apiKey: process.env.CARD_PROVIDER_API_KEY || '',
    aesKey: process.env.CARD_PROVIDER_AES_KEY || '',
  },
  
  // 限流配置
  rateLimit: {
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000', 10), // 15分钟
    maxRequests: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '1000', 10), // 提高到1000次
  },
  
  // 日志配置
  logging: {
    level: process.env.LOG_LEVEL || 'info',
    file: process.env.LOG_FILE || 'logs/app.log',
  },
};

export default config;
