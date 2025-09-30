import { Request, Response, NextFunction } from 'express';
import { AuthService } from '../services/authService';
import { UserService } from '../services/userService';
import { generateToken } from '../utils/jwt';
import { successResponse, errorResponse } from '../utils/response';
import { LoginRequest, RegisterRequest } from '../types/auth';
import { AuthRequest } from '../middleware/auth';
import logger from '../config/logger';

export class AuthController {
  /**
   * 用户登录
   */
  static async login(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const loginData: LoginRequest = req.body;
      const result = await AuthService.login(loginData);
      
      successResponse(res, result, 'Login successful');
    } catch (error) {
      logger.error('Login error:', error);
      const message = error instanceof Error ? error.message : 'Login failed';
      errorResponse(res, message, 401);
    }
  }

  /**
   * 用户注册
   */
  static async register(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const registerData: RegisterRequest = req.body;
      const result = await AuthService.register(registerData);
      
      successResponse(res, result, 'Registration successful', 201);
    } catch (error) {
      logger.error('Registration error:', error);
      const message = error instanceof Error ? error.message : 'Registration failed';
      errorResponse(res, message, 400);
    }
  }

  /**
   * 获取当前用户信息
   */
  static async getProfile(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) {
        errorResponse(res, 'User not authenticated', 401);
        return;
      }

      const user = await AuthService.getUserById(req.user.id);
      successResponse(res, user, 'User profile retrieved successfully');
    } catch (error) {
      logger.error('Get profile error:', error);
      const message = error instanceof Error ? error.message : 'Failed to get user profile';
      errorResponse(res, message, 400);
    }
  }

  /**
   * 用户登出（客户端删除 token）
   */
  static async logout(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      // 在实际应用中，可以将 token 加入黑名单
      // 这里只是返回成功响应，让客户端删除 token
      successResponse(res, null, 'Logout successful');
    } catch (error) {
      logger.error('Logout error:', error);
      errorResponse(res, 'Logout failed', 400);
    }
  }

  /**
   * 刷新 token
   */
  static async refreshToken(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) {
        errorResponse(res, 'User not authenticated', 401);
        return;
      }

      // 重新生成 token
      const result = await AuthService.login({
        username: req.user.username,
        password: '', // 这里需要特殊处理，或者使用刷新 token 机制
      });

      successResponse(res, { token: result.token }, 'Token refreshed successfully');
    } catch (error) {
      logger.error('Refresh token error:', error);
      errorResponse(res, 'Failed to refresh token', 401);
    }
  }

  /**
   * 免密登录token验证
   */
  static async passwordlessLogin(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { token, userId } = req.body;
      
      if (!token || !userId) {
        errorResponse(res, 'Token and userId are required', 400);
        return;
      }
      
      // 验证token并获取用户信息
      const user = await UserService.verifyPasswordlessToken(token, parseInt(userId));
      
      // 生成JWT token
      const jwtToken = generateToken({
        id: user.id,
        username: user.username,
        role: user.role,
        email: user.email,
        name: user.name || undefined,
      });
      
      const result = {
        token: jwtToken,
        user: {
          id: user.id,
          username: user.username,
          email: user.email,
          name: user.name,
          role: user.role,
          status: user.status,
          balance: user.balance,
          currency: user.currency,
          parentId: user.parentId,
          createdAt: user.createdAt,
          updatedAt: user.updatedAt,
        }
      };
      
      successResponse(res, result, 'Passwordless login successful');
    } catch (error) {
      logger.error('Passwordless login error:', error);
      const message = error instanceof Error ? error.message : 'Passwordless login failed';
      errorResponse(res, message, 401);
    }
  }
}
