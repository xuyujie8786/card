import rateLimit from 'express-rate-limit';
import { config } from '../config';

// 通用限流中间件
export const generalLimiter = rateLimit({
  windowMs: config.nodeEnv === 'development' ? 60 * 1000 : config.rateLimit.windowMs, // 开发环境1分钟，生产环境15分钟
  max: config.nodeEnv === 'development' ? 10000 : config.rateLimit.maxRequests, // 开发环境10000次，生产环境1000次
  message: {
    code: 429,
    message: 'Too many requests from this IP, please try again later.',
    data: null,
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// 严格限流中间件（用于敏感操作）
export const strictLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15分钟
  max: 5, // 最多5次请求
  message: {
    code: 429,
    message: 'Too many attempts, please try again later.',
    data: null,
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// 登录限流中间件
export const loginLimiter = rateLimit({
  windowMs: config.nodeEnv === 'development' ? 60 * 1000 : 15 * 60 * 1000, // 开发环境1分钟，生产环境15分钟
  max: config.nodeEnv === 'development' ? 1000 : 50, // 开发环境1000次，生产环境50次
  message: {
    code: 429,
    message: 'Too many login attempts, please try again later.',
    data: null,
  },
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true,
});
