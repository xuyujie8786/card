import { Request, Response, NextFunction } from 'express';
import logger from '../config/logger';

export interface ApiError extends Error {
  statusCode?: number;
  code?: string;
}

export const errorHandler = (
  error: ApiError,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  logger.error('Error occurred:', {
    error: error.message,
    stack: error.stack,
    url: req.url,
    method: req.method,
    ip: req.ip,
  });

  // 默认错误状态码
  const statusCode = error.statusCode || 500;
  
  // 默认错误信息
  let message = error.message || 'Internal Server Error';

  // Prisma 错误处理
  if (error.code === 'P2002') {
    message = 'Duplicate entry found';
  } else if (error.code === 'P2025') {
    message = 'Record not found';
  }

  // 验证错误处理
  if (error.name === 'ValidationError') {
    message = 'Validation failed';
  }

  // JWT 错误处理
  if (error.name === 'JsonWebTokenError') {
    message = 'Invalid token';
  } else if (error.name === 'TokenExpiredError') {
    message = 'Token expired';
  }

  res.status(statusCode).json({
    code: statusCode,
    message: message,
    data: null,
    ...(process.env.NODE_ENV === 'development' && { stack: error.stack }),
  });
};

export const notFound = (req: Request, res: Response, next: NextFunction) => {
  const error: ApiError = new Error(`Not Found - ${req.originalUrl}`);
  error.statusCode = 404;
  next(error);
};


