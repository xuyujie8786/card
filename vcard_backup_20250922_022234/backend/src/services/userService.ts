import bcrypt from 'bcrypt';
import prisma from '../config/database';
import logger from '../config/logger';
import type { JwtPayload } from '../types/auth';

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
  creditLimit: number;
  currency: string;
}

interface UpdateUserData {
  email?: string;
  name?: string;
  role?: string;
  parentId?: number;
  status?: string;
  balance?: number;
  creditLimit?: number;
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
    if (currentUser.role === 'ADMIN') {
      // 管理员只能看到自己创建的用户
      where.OR = [
        { id: currentUser.id }, // 自己
        { parentId: currentUser.id }, // 自己创建的用户
      ];
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
      
      // 转换数据格式
      const list = users.map(user => ({
        id: user.id,
        username: user.username,
        email: user.email,
        name: user.name,
        role: user.role,
        roleText: this.getRoleText(user.role),
        status: user.status,
        statusText: this.getStatusText(user.status),
        balance: Number(user.balance),
        creditLimit: Number(user.creditLimit),
        currency: user.currency,
        availableAmount: Number(user.balance) + Number(user.creditLimit),
        parent: user.parent,
        cardCount: user._count.virtualCards,
        totalSpent: 0, // 待实现：从交易记录计算
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
        creditLimit: Number(user.creditLimit),
        currency: user.currency,
        availableAmount: Number(user.balance) + Number(user.creditLimit),
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
      
      // 检查用户名和邮箱是否已存在
      const existingUser = await prisma.user.findFirst({
        where: {
          OR: [
            { username: userData.username },
            { email: userData.email }
          ]
        }
      });
      
      if (existingUser) {
        throw new Error('用户名或邮箱已存在');
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
          creditLimit: userData.creditLimit,
          currency: userData.currency,
        },
        include: {
          parent: {
            select: { id: true, username: true, name: true }
          }
        }
      });
      
      // 记录初始资金日志
      if (userData.balance > 0) {
        await prisma.userBalanceLog.create({
          data: {
            userId: user.id,
            type: 'DEPOSIT' as any,
            amount: userData.balance,
            balanceBefore: 0,
            balanceAfter: userData.balance,
            currency: userData.currency,
            description: '初始余额',
            operatedBy: currentUser.id,
          }
        });
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
        creditLimit: Number(user.creditLimit),
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
        creditLimit: Number(user.creditLimit),
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
          newBalance = currentBalance + operationData.amount;
        } else {
          // 提现检查可用余额
          const availableAmount = currentBalance + Number(user.creditLimit);
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
        
        // 记录资金日志
        const balanceLog = await tx.userBalanceLog.create({
          data: {
            userId,
            type: operationData.type.toUpperCase() as any,
            amount: operationData.amount,
            balanceBefore: currentBalance,
            balanceAfter: newBalance,
            currency: user.currency,
            description: operationData.type === 'deposit' ? '管理员充值' : '管理员提现',
            remark: operationData.remark,
            operatedBy: currentUser.id,
          }
        });
        
        logger.info(`Balance operation: ${operationData.type} ${operationData.amount} for user ${userId} by ${currentUser.username}`);
        
        return {
          user: {
            id: updatedUser.id,
            balance: Number(updatedUser.balance),
            currency: updatedUser.currency,
          },
          log: balanceLog
        };
      });
    } catch (error) {
      logger.error('UserService.balanceOperation error:', error);
      throw error;
    }
  }

  // 获取资金记录
  static async getBalanceLogs(userId: number, query: UserListQuery, currentUser: JwtPayload) {
    try {
      this.checkPermission(currentUser, userId);
      
      const skip = (query.current - 1) * query.pageSize;
      
      const [logs, total] = await Promise.all([
        prisma.userBalanceLog.findMany({
          where: { userId },
          skip,
          take: query.pageSize,
          include: {
            operator: {
              select: { id: true, username: true, name: true }
            }
          },
          orderBy: { createdAt: 'desc' }
        }),
        prisma.userBalanceLog.count({ where: { userId } })
      ]);
      
      const list = logs.map(log => ({
        id: log.id,
        type: log.type,
        typeText: this.getBalanceLogTypeText(log.type),
        amount: Number(log.amount),
        balanceBefore: Number(log.balanceBefore),
        balanceAfter: Number(log.balanceAfter),
        currency: log.currency,
        description: log.description,
        remark: log.remark,
        operatedBy: log.operator,
        createdAt: log.createdAt,
      }));
      
      return { list, total };
    } catch (error) {
      logger.error('UserService.getBalanceLogs error:', error);
      throw error;
    }
  }

  // 辅助方法
  private static getRoleText(role: string): string {
    const roleMap: Record<string, string> = {
      super_admin: '超级管理员',
      admin: '管理员',
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

  private static getBalanceLogTypeText(type: string): string {
    const typeMap: Record<string, string> = {
      deposit: '充值',
      withdraw: '提现',
      transfer_in: '转入',
      transfer_out: '转出',
      card_charge: '开卡扣费',
      refund: '退款',
    };
    return typeMap[type] || type;
  }

  private static maskCardNo(cardNo: string): string {
    if (cardNo.length <= 8) return cardNo;
    return cardNo.substring(0, 4) + '*'.repeat(cardNo.length - 8) + cardNo.substring(cardNo.length - 4);
  }
}