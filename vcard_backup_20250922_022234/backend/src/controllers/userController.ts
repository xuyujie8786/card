import { Request, Response } from 'express';
import { z } from 'zod';
import { UserService } from '../services/userService';
import logger from '../config/logger';
import { JwtPayload } from '../types/auth';

interface AuthenticatedRequest extends Request {
  user?: JwtPayload;
}

// 用户列表查询参数验证
const UserListQuerySchema = z.object({
  current: z.string().optional().transform((val: any) => val ? parseInt(val) : 1),
  pageSize: z.string().optional().transform((val: any) => val ? parseInt(val) : 20),
  username: z.string().optional(),
  email: z.string().optional(),
  role: z.enum(['super_admin', 'admin', 'user']).optional(),
  status: z.enum(['active', 'inactive', 'suspended']).optional(),
  parentId: z.string().optional().transform((val: any) => val ? parseInt(val) : undefined),
});

// 创建用户请求验证
const CreateUserSchema = z.object({
  username: z.string().min(3, '用户名至少3个字符'),
  email: z.string().email('邮箱格式不正确'),
  name: z.string().min(1, '姓名不能为空'),
  password: z.string().min(6, '密码至少6个字符'),
  role: z.enum(['admin', 'user']).default('user'),
  parentId: z.number().optional(),
  status: z.enum(['active', 'inactive', 'suspended']).default('active'),
  balance: z.number().min(0).default(0),
  creditLimit: z.number().min(0).default(0),
  currency: z.enum(['USD', 'EUR', 'GBP']).default('USD'),
});

// 更新用户请求验证
const UpdateUserSchema = z.object({
  email: z.string().email('邮箱格式不正确').optional(),
  name: z.string().min(1, '姓名不能为空').optional(),
  role: z.enum(['admin', 'user']).optional(),
  parentId: z.number().optional(),
  status: z.enum(['active', 'inactive', 'suspended']).optional(),
  balance: z.number().min(0).optional(),
  creditLimit: z.number().min(0).optional(),
  currency: z.enum(['USD', 'EUR', 'GBP']).optional(),
});

// 资金操作请求验证
const BalanceOperationSchema = z.object({
  type: z.enum(['deposit', 'withdraw']),
  amount: z.number().min(0.01, '金额必须大于0'),
  remark: z.string().optional(),
});

export class UserController {
  // 获取用户列表
  static async getUsers(req: AuthenticatedRequest, res: Response) {
    try {
      const query = UserListQuerySchema.parse(req.query);
      const currentUser = req.user!;
      
      const result = await UserService.getUsers(query, currentUser);
      
      res.json({
        success: true,
        data: result.list,
        total: result.total,
        current: query.current,
        pageSize: query.pageSize,
      });
    } catch (error) {
      logger.error('Get users error:', error);
      res.status(500).json({
        success: false,
        message: error instanceof Error ? error.message : '获取用户列表失败',
      });
    }
  }

  // 获取用户详情
  static async getUserById(req: AuthenticatedRequest, res: Response) {
    try {
      const userId = parseInt(req.params.id);
      const currentUser = req.user!;
      
      const user = await UserService.getUserById(userId, currentUser);
      
      if (!user) {
        return res.status(404).json({
          success: false,
          message: '用户不存在',
        });
      }
      
      return res.json({
        success: true,
        data: user,
      });
    } catch (error) {
      logger.error('Get user by id error:', error);
      return res.status(500).json({
        success: false,
        message: error instanceof Error ? error.message : '获取用户详情失败',
      });
    }
  }

  // 创建用户
  static async createUser(req: AuthenticatedRequest, res: Response) {
    try {
      const userData = CreateUserSchema.parse(req.body);
      const currentUser = req.user!;
      
      const user = await UserService.createUser(userData, currentUser);
      
      res.status(201).json({
        success: true,
        data: user,
        message: '用户创建成功',
      });
    } catch (error) {
      logger.error('Create user error:', error);
      res.status(500).json({
        success: false,
        message: error instanceof Error ? error.message : '创建用户失败',
      });
    }
  }

  // 更新用户
  static async updateUser(req: AuthenticatedRequest, res: Response) {
    try {
      const userId = parseInt(req.params.id);
      const userData = UpdateUserSchema.parse(req.body);
      const currentUser = req.user!;
      
      const user = await UserService.updateUser(userId, userData, currentUser);
      
      res.json({
        success: true,
        data: user,
        message: '用户更新成功',
      });
    } catch (error) {
      logger.error('Update user error:', error);
      res.status(500).json({
        success: false,
        message: error instanceof Error ? error.message : '更新用户失败',
      });
    }
  }

  // 删除用户
  static async deleteUser(req: AuthenticatedRequest, res: Response) {
    try {
      const userId = parseInt(req.params.id);
      const currentUser = req.user!;
      
      await UserService.deleteUser(userId, currentUser);
      
      res.json({
        success: true,
        message: '用户删除成功',
      });
    } catch (error) {
      logger.error('Delete user error:', error);
      res.status(500).json({
        success: false,
        message: error instanceof Error ? error.message : '删除用户失败',
      });
    }
  }

  // 用户资金操作
  static async balanceOperation(req: AuthenticatedRequest, res: Response) {
    try {
      const userId = parseInt(req.params.id);
      const operationData = BalanceOperationSchema.parse(req.body);
      const currentUser = req.user!;
      
      const result = await UserService.balanceOperation(userId, operationData, currentUser);
      
      res.json({
        success: true,
        data: result,
        message: `${operationData.type === 'deposit' ? '充值' : '提现'}成功`,
      });
    } catch (error) {
      logger.error('Balance operation error:', error);
      res.status(500).json({
        success: false,
        message: error instanceof Error ? error.message : '资金操作失败',
      });
    }
  }

  // 获取用户资金记录
  static async getBalanceLogs(req: AuthenticatedRequest, res: Response) {
    try {
      const userId = parseInt(req.params.id);
      const query = UserListQuerySchema.parse(req.query);
      const currentUser = req.user!;
      
      const result = await UserService.getBalanceLogs(userId, query, currentUser);
      
      res.json({
        success: true,
        data: result.list,
        total: result.total,
        current: query.current,
        pageSize: query.pageSize,
      });
    } catch (error) {
      logger.error('Get balance logs error:', error);
      res.status(500).json({
        success: false,
        message: error instanceof Error ? error.message : '获取资金记录失败',
      });
    }
  }
}