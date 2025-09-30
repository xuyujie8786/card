import bcrypt from 'bcrypt';
import prisma from '../config/database';
import logger from '../config/logger';
import type { JwtPayload } from '../types/auth';
import { AccountFlowService } from './accountFlowService';
import { OperationLogService } from './operationLogService';
import { OperationType } from '../types/operationLog';
import { AccountOperationType } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';
import { DashboardService } from './dashboardService';

interface UserListQuery {
  current: number;
  pageSize: number;
  username?: string;
  email?: string;
  role?: string;
  status?: string;
  parentId?: number;
}

interface CreateUserData {
  username: string;
  email: string;
  name: string;
  password: string;
  role: string;
  parentId?: number;
  status: string;
  balance: number;
  currency: string;
}

interface UpdateUserData {
  email?: string;
  name?: string;
  role?: string;
  parentId?: number;
  status?: string;
  balance?: number;
  currency?: string;
}

interface BalanceOperationData {
  type: 'deposit' | 'withdraw';
  amount: number;
  remark?: string;
}

export class UserService {
  // 检查用户权限
  private static checkPermission(currentUser: JwtPayload, targetUserId?: number, targetRole?: string) {
    if (currentUser.role === 'SUPER_ADMIN') {
      return true; // 超级管理员可以操作所有用户
    }
    
    if (currentUser.role === 'ADMIN') {
      // 管理员不能操作自己
      if (targetUserId === currentUser.id) {
        throw new Error('不能操作自己的账户');
      }
      // 管理员只能操作普通用户，且不能创建超级管理员
      if (targetRole === 'SUPER_ADMIN') {
        throw new Error('无权限操作超级管理员');
      }
      return true;
    }
    
    // 普通用户只能查看自己的信息
    if (targetUserId && targetUserId !== currentUser.id) {
      throw new Error('无权限操作其他用户');
    }
    
    return true;
  }

  // 构建查询条件
  private static buildWhereCondition(query: UserListQuery, currentUser: JwtPayload) {
    const where: any = {};
    
    // 权限过滤
    if (currentUser.role === 'SUPER_ADMIN') {
      // 超级管理员可以看到所有用户，不添加权限限制
      // where 保持空对象，允许查看所有用户
    } else if (currentUser.role === 'ADMIN') {
      // 管理员只能看到自己创建的用户，不能看到自己
      where.parentId = currentUser.id;
    } else if (currentUser.role === 'user') {
      // 普通用户只能看到自己
      where.id = currentUser.id;
    }
    
    // 搜索条件
    if (query.username) {
      where.username = { contains: query.username, mode: 'insensitive' };
    }
    
    if (query.email) {
      where.email = { contains: query.email, mode: 'insensitive' };
    }
    
    if (query.role) {
      where.role = query.role;
    }
    
    if (query.status) {
      where.status = query.status;
    }
    
    if (query.parentId) {
      where.parentId = query.parentId;
    }
    
    return where;
  }

  /**
   * 基于账户流水计算用户真实余额
   * 新逻辑：总余额 = (操作对象是自己的记录总和) - (操作员是自己的记录总和)
   * - 充值记录为正数，提现记录为负数
   */
  private static async calculateBalanceFromAccountFlows(userId: number): Promise<number> {
    try {
      // 作为操作对象的记录总和（别人给我充值/提现）
      const targetFlows = await prisma.accountFlow.findMany({
        where: { targetUserId: userId },
        select: { amount: true },
      });

      // 作为操作员的记录总和（我给别人充值/提现）
      const operatorFlows = await prisma.accountFlow.findMany({
        where: { operatorId: userId },
        select: { amount: true },
      });

      const targetTotal = targetFlows.reduce((sum, flow) => {
        return sum + parseFloat(flow.amount.toString());
      }, 0);

      const operatorTotal = operatorFlows.reduce((sum, flow) => {
        return sum + parseFloat(flow.amount.toString());
      }, 0);

      const balance = targetTotal - operatorTotal;

      logger.info(`用户 ${userId} 余额计算: 目标总额=${targetTotal}, 操作员总额=${operatorTotal}, 最终余额=${balance}`);
      
      return balance;
    } catch (error) {
      logger.error(`计算用户 ${userId} 余额失败:`, error);
      return 0;
    }
  }

  // 获取用户列表
  static async getUsers(query: UserListQuery, currentUser: JwtPayload) {
    try {
      const where = this.buildWhereCondition(query, currentUser);
      const skip = (query.current - 1) * query.pageSize;
      
      const [users, total] = await Promise.all([
        prisma.user.findMany({
          where,
          skip,
          take: query.pageSize,
          include: {
            parent: {
              select: { id: true, username: true, name: true }
            },
            _count: {
              select: { virtualCards: true }
            }
          },
          orderBy: { createdAt: 'desc' }
        }),
        prisma.user.count({ where })
      ]);
      
      // 并行计算所有用户的财务数据
      const userFinancialData = await Promise.all(
        users.map(async (user) => {
          try {
            const dashboardData = await DashboardService.getDashboardData(user.id);
            return {
              balance: dashboardData.availableAmount, // 可用余额
              availableAmount: dashboardData.availableAmount,
              totalRecharge: dashboardData.totalRecharge,
              totalConsumption: dashboardData.totalConsumption,
              cardLocked: dashboardData.cardLocked,
            };
          } catch (error) {
            logger.error(`计算用户 ${user.id} 财务数据失败:`, error);
            return {
              balance: 0,
              availableAmount: 0,
              totalRecharge: 0,
              totalConsumption: 0,
              cardLocked: 0,
            };
          }
        })
      );
      
      // 转换数据格式
      const list = users.map((user, index) => ({
        id: user.id,
        username: user.username,
        email: user.email,
        name: user.name,
        role: user.role,
        roleText: this.getRoleText(user.role),
        status: user.status,
        statusText: this.getStatusText(user.status),
        balance: userFinancialData[index].balance,
        currency: user.currency,
        availableAmount: userFinancialData[index].availableAmount,
        totalRecharge: userFinancialData[index].totalRecharge,
        totalConsumption: userFinancialData[index].totalConsumption,
        cardLocked: userFinancialData[index].cardLocked,
        parent: user.parent,
        cardCount: user._count.virtualCards,
        totalSpent: userFinancialData[index].totalConsumption, // 总消费就是totalConsumption
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
      }));
      
      return { list, total };
    } catch (error) {
      logger.error('UserService.getUsers error:', error);
      throw error;
    }
  }

  // 获取用户详情
  static async getUserById(userId: number, currentUser: JwtPayload) {
    try {
      this.checkPermission(currentUser, userId);
      
      const user = await prisma.user.findUnique({
        where: { id: userId },
        include: {
          parent: {
            select: { id: true, username: true, name: true }
          },
          _count: {
            select: { virtualCards: true }
          }
        }
      });
      
      if (!user) {
        return null;
      }
      
      // 获取真实可用余额
      const dashboardData = await DashboardService.getDashboardData(user.id);
      
      // 转换数据格式
      return {
        id: user.id,
        username: user.username,
        email: user.email,
        name: user.name,
        role: user.role,
        roleText: this.getRoleText(user.role),
        status: user.status,
        statusText: this.getStatusText(user.status),
        balance: Number(user.balance),
        currency: user.currency,
        availableAmount: dashboardData.availableAmount,
        parent: user.parent,
        cardCount: user._count.virtualCards,
        totalSpent: 0, // 待实现：从交易记录计算
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
      };
    } catch (error) {
      logger.error('UserService.getUserById error:', error);
      throw error;
    }
  }

  // 创建用户
  static async createUser(userData: CreateUserData, currentUser: JwtPayload) {
    try {
      this.checkPermission(currentUser, undefined, userData.role);
      
      // 检查用户名是否已存在
      const existingUser = await prisma.user.findFirst({
        where: {
          username: userData.username
        }
      });
      
      if (existingUser) {
        throw new Error('用户名已存在');
      }
      
      // 如果提供了邮箱且不是占位符邮箱，检查邮箱是否已存在
      if (userData.email && !userData.email.includes('@placeholder.com')) {
        const existingEmail = await prisma.user.findFirst({
          where: {
            email: userData.email
          }
        });
        
        if (existingEmail) {
          throw new Error('邮箱已存在');
        }
      }
      
      // 加密密码
      const passwordHash = await bcrypt.hash(userData.password, 10);
      
      // 设置父级用户ID
      let parentId = userData.parentId;
      if (!parentId && currentUser.role === 'admin') {
        parentId = currentUser.id;
      }
      
      const user = await prisma.user.create({
        data: {
          username: userData.username,
          email: userData.email,
          name: userData.name,
          passwordHash,
          role: userData.role.toUpperCase() as any,
          parentId,
          status: userData.status.toUpperCase() as any,
          balance: userData.balance,
          currency: userData.currency,
        },
        include: {
          parent: {
            select: { id: true, username: true, name: true }
          }
        }
      });
      
      // 初始资金日志已移除，仅记录操作日志
      if (userData.balance > 0) {
        logger.info(`Initial balance set for user ${user.id}: ${userData.balance} ${userData.currency} by ${currentUser.username}`);
      }
      
      logger.info(`User created: ${user.username} by ${currentUser.username}`);
      
      return {
        id: user.id,
        username: user.username,
        email: user.email,
        name: user.name,
        role: user.role,
        status: user.status,
        balance: Number(user.balance),
        currency: user.currency,
        parent: user.parent,
        createdAt: user.createdAt,
      };
    } catch (error) {
      logger.error('UserService.createUser error:', error);
      throw error;
    }
  }

  // 更新用户
  static async updateUser(userId: number, userData: UpdateUserData, currentUser: JwtPayload) {
    try {
      this.checkPermission(currentUser, userId, userData.role);
      
      const user = await prisma.user.update({
        where: { id: userId },
        data: {
          ...userData,
          role: userData.role ? userData.role.toUpperCase() as any : undefined,
          status: userData.status ? userData.status.toUpperCase() as any : undefined,
        },
        include: {
          parent: {
            select: { id: true, username: true, name: true }
          }
        }
      });
      
      logger.info(`User updated: ${user.username} by ${currentUser.username}`);
      
      return {
        id: user.id,
        username: user.username,
        email: user.email,
        name: user.name,
        role: user.role,
        status: user.status,
        balance: Number(user.balance),
        currency: user.currency,
        parent: user.parent,
        updatedAt: user.updatedAt,
      };
    } catch (error) {
      logger.error('UserService.updateUser error:', error);
      throw error;
    }
  }

  // 删除用户
  static async deleteUser(userId: number, currentUser: JwtPayload) {
    try {
      this.checkPermission(currentUser, userId);
      
      // 检查是否有关联的虚拟卡
      const cardCount = await prisma.virtualCard.count({
        where: { userId }
      });
      
      if (cardCount > 0) {
        throw new Error('用户还有关联的虚拟卡，无法删除');
      }
      
      await prisma.user.delete({
        where: { id: userId }
      });
      
      logger.info(`User deleted: ${userId} by ${currentUser.username}`);
    } catch (error) {
      logger.error('UserService.deleteUser error:', error);
      throw error;
    }
  }

  // 资金操作
  static async balanceOperation(userId: number, operationData: BalanceOperationData, currentUser: JwtPayload) {
    try {
      this.checkPermission(currentUser, userId);
      
      return await prisma.$transaction(async (tx) => {
        const user = await tx.user.findUnique({
          where: { id: userId }
        });
        
        if (!user) {
          throw new Error('用户不存在');
        }
        
        const currentBalance = Number(user.balance);
        let newBalance: number;
        
        if (operationData.type === 'deposit') {
          // 充值时检查操作者（上级）的可用余额
          const operatorDashboardData = await DashboardService.getDashboardData(currentUser.id);
          const operatorAvailableAmount = operatorDashboardData.availableAmount;
          
          if (operationData.amount > operatorAvailableAmount) {
            throw new Error('充值金额超过您的可用余额');
          }
          
          newBalance = currentBalance + operationData.amount;
        } else {
          // 提现检查被操作用户的可用余额
          const dashboardData = await DashboardService.getDashboardData(userId);
          const availableAmount = dashboardData.availableAmount;
          
          if (operationData.amount > availableAmount) {
            throw new Error('提现金额超过可用余额');
          }
          newBalance = currentBalance - operationData.amount;
        }
        
        // 更新用户余额
        const updatedUser = await tx.user.update({
          where: { id: userId },
          data: { balance: newBalance }
        });
        
        // 记录账户流水 - 直接在事务中创建，避免嵌套事务
        await tx.accountFlow.create({
          data: {
            operatorId: currentUser.id,
            operatorName: currentUser.username,
            targetUserId: userId,
            targetName: user.name || user.username,
            operationType: operationData.type === 'deposit' ? AccountOperationType.RECHARGE : AccountOperationType.WITHDRAW,
            amount: new Decimal(operationData.type === 'deposit' ? operationData.amount : -operationData.amount),
            currency: 'USD',
            description: operationData.remark,
            businessType: operationData.type === 'deposit' ? 'user_recharge' : 'user_withdraw'
          } as any
        });

        // 注意：用户充值/提现已经通过 AccountFlow 记录，不需要重复记录到 OperationLog 表
        
        logger.info(`Balance operation: ${operationData.type} ${operationData.amount} for user ${userId} by ${currentUser.username}`);
        
        return {
          user: {
            id: updatedUser.id,
            balance: Number(updatedUser.balance),
            currency: updatedUser.currency,
          }
        };
      });
    } catch (error) {
      logger.error('UserService.balanceOperation error:', error);
      throw error;
    }
  }


  // 辅助方法
  private static getRoleText(role: string): string {
    const roleMap: Record<string, string> = {
      SUPER_ADMIN: '超级管理员',
      super_admin: '超级管理员',
      ADMIN: '管理员',
      admin: '管理员',
      USER: '普通用户',
      user: '普通用户',
    };
    return roleMap[role] || role;
  }

  private static getStatusText(status: string): string {
    const statusMap: Record<string, string> = {
      active: '正常',
      inactive: '停用',
      suspended: '暂停',
    };
    return statusMap[status] || status;
  }

  // 获取可用的上级账户
  static async getAvailableParents(currentUser: JwtPayload) {
    try {
      // 查询可以作为上级的用户（管理员和超级管理员）
      const users = await prisma.user.findMany({
        where: {
          role: {
            in: ['ADMIN', 'SUPER_ADMIN']
          },
          status: 'ACTIVE'
        },
        select: {
          id: true,
          username: true,
          name: true,
          role: true
        },
        orderBy: {
          createdAt: 'desc'
        }
      });

      // 转换为前端需要的格式
      return users.map(user => ({
        label: `${user.username}${user.name ? ` (${user.name})` : ''} - ${this.getRoleText(user.role)}`,
        value: user.id
      }));
    } catch (error) {
      logger.error('UserService.getAvailableParents error:', error);
      throw error;
    }
  }

  // 管理员重置用户密码
  static async adminResetPassword(userId: number, newPassword: string, currentUser: JwtPayload) {
    try {
      this.checkPermission(currentUser, userId);
      
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { id: true, username: true, role: true }
      });
      
      if (!user) {
        throw new Error('用户不存在');
      }

      // 检查是否有权限重置此用户密码
      if (currentUser.role === 'ADMIN' && user.role === 'SUPER_ADMIN') {
        throw new Error('无权限重置超级管理员密码');
      }
      
      // 加密新密码
      const passwordHash = await bcrypt.hash(newPassword, 10);
      
      await prisma.user.update({
        where: { id: userId },
        data: { passwordHash }
      });
      
      logger.info(`Admin ${currentUser.username} reset password for user ${user.username}`);
      
      return {
        message: '密码重置成功',
        username: user.username
      };
    } catch (error) {
      logger.error('UserService.adminResetPassword error:', error);
      throw error;
    }
  }

  // 生成免密登录token
  static async generatePasswordlessLogin(userId: number, currentUser: JwtPayload) {
    try {
      this.checkPermission(currentUser, userId);
      
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { id: true, username: true, role: true, email: true }
      });
      
      if (!user) {
        throw new Error('用户不存在');
      }

      // 检查是否有权限为此用户生成免密登录
      if (currentUser.role === 'ADMIN' && user.role === 'SUPER_ADMIN') {
        throw new Error('无权限为超级管理员生成免密登录');
      }

      // 生成一个临时token，有效期1小时
      const crypto = require('crypto');
      const loginToken = crypto.randomBytes(32).toString('hex');
      const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1小时后过期
      
      // 将token存储到Redis，设置1小时过期
      const redisClient = require('../config/redis').default;
      await redisClient.setEx(`passwordless_token:${loginToken}`, 3600, JSON.stringify({
        userId: user.id,
        username: user.username,
        role: user.role,
        email: user.email,
        createdBy: currentUser.username,
        createdAt: new Date().toISOString()
      }));
      
      logger.info(`Admin ${currentUser.username} generated passwordless login for user ${user.username}`);
      
      // 构建登录链接
      const loginUrl = `${process.env.FRONTEND_URL || 'http://localhost:8000'}/user/login?token=${loginToken}&userId=${userId}`;
      
      return {
        loginUrl,
        loginToken,
        expiresAt,
        username: user.username,
        validFor: '1小时'
      };
    } catch (error) {
      logger.error('UserService.generatePasswordlessLogin error:', error);
      throw error;
    }
  }

  // 验证免密登录token
  static async verifyPasswordlessToken(token: string, userId: number) {
    try {
      logger.info(`🔍 验证免密登录token: ${token.substring(0, 10)}..., userId: ${userId}`);
      
      const redisClient = require('../config/redis').default;
      const tokenData = await redisClient.get(`passwordless_token:${token}`);
      
      if (!tokenData) {
        logger.error(`❌ Token不存在或已过期: ${token.substring(0, 10)}...`);
        throw new Error('Token不存在或已过期');
      }
      
      const parsedData = JSON.parse(tokenData);
      logger.info(`📋 Token数据:`, parsedData);
      
      // 验证用户ID是否匹配
      if (parsedData.userId !== userId) {
        logger.error(`❌ Token与用户ID不匹配: token中的userId=${parsedData.userId}, 请求的userId=${userId}`);
        throw new Error('Token与用户ID不匹配');
      }
      
      // 获取用户完整信息
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: {
          id: true,
          username: true,
          email: true,
          name: true,
          role: true,
          status: true,
          balance: true,
          currency: true,
          createdAt: true,
          updatedAt: true,
          parentId: true
        }
      });
      
      if (!user) {
        logger.error(`❌ 用户不存在: userId=${userId}`);
        throw new Error('用户不存在');
      }
      
      logger.info(`👤 用户信息: id=${user.id}, username=${user.username}, status=${user.status}`);
      
      if (user.status !== 'ACTIVE') {
        logger.error(`❌ 用户账户状态异常: status=${user.status}, 期望状态=ACTIVE`);
        throw new Error('用户账户已被禁用');
      }
      
      // 🔄 删除token，确保一次性使用
      await redisClient.del(`passwordless_token:${token}`);
      logger.info(`✅ 免密登录token验证成功，token已删除（一次性使用）`);
      
      logger.info(`User ${user.username} logged in via passwordless token`);
      
      return user;
    } catch (error) {
      logger.error('UserService.verifyPasswordlessToken error:', error);
      throw error;
    }
  }

  // 管理员重置用户2FA
  static async adminReset2FA(userId: number, currentUser: JwtPayload) {
    try {
      this.checkPermission(currentUser, userId);
      
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { id: true, username: true, role: true, twoFAEnabled: true }
      });
      
      if (!user) {
        throw new Error('用户不存在');
      }

      // 检查是否有权限重置此用户2FA
      if (currentUser.role === 'ADMIN' && user.role === 'SUPER_ADMIN') {
        throw new Error('无权限重置超级管理员2FA');
      }
      
      // 重置2FA设置
      await prisma.user.update({
        where: { id: userId },
        data: { 
          twoFAEnabled: false,
          twoFASecret: null,
          twoFABackupCodes: null
        }
      });
      
      logger.info(`Admin ${currentUser.username} reset 2FA for user ${user.username}`);
      
      return {
        message: '2FA重置成功',
        username: user.username,
        previouslyEnabled: user.twoFAEnabled
      };
    } catch (error) {
      logger.error('UserService.adminReset2FA error:', error);
      throw error;
    }
  }

  private static maskCardNo(cardNo: string): string {
    if (cardNo.length <= 8) return cardNo;
    return cardNo.substring(0, 4) + '*'.repeat(cardNo.length - 8) + cardNo.substring(cardNo.length - 4);
  }
}