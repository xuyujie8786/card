import rateLimit from 'express-rate-limit';
import { config } from '../config';

// 通用限流中间件
export const generalLimiter = rateLimit({
  windowMs: config.rateLimit.windowMs,
  max: config.rateLimit.maxRequests,
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
  windowMs: 15 * 60 * 1000, // 15分钟
  max: 10, // 最多10次登录尝试
  message: {
    code: 429,
    message: 'Too many login attempts, please try again later.',
    data: null,
  },
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true,
});
