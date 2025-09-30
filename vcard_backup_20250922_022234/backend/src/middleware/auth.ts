import { Request, Response, NextFunction } from 'express';
import { config } from '../config';
import logger from '../config/logger';
import { verifyToken } from '../utils/jwt';
import { JwtPayload } from '../types/auth';

export interface AuthRequest extends Request {
  user?: JwtPayload;
}

export const authenticateToken = (req: AuthRequest, res: Response, next: NextFunction): void => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

  if (!token) {
    res.status(401).json({
      code: 401,
      message: 'Access token is required',
      data: null,
    });
    return;
  }

  try {
    const decoded = verifyToken(token);
    req.user = decoded;
    next();
  } catch (error) {
    logger.error('JWT verification failed:', error);
    res.status(403).json({
      code: 403,
      message: 'Invalid or expired token',
      data: null,
    });
  }
};

export const authorizeRoles = (roles: string[]) => {
  return (req: AuthRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({
        code: 401,
        message: 'User not authenticated',
        data: null,
      });
      return;
    }

    if (!roles.includes(req.user.role)) {
      res.status(403).json({
        code: 403,
        message: 'Insufficient permissions',
        data: null,
      });
      return;
    }

    next();
  };
};
