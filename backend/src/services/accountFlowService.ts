import { PrismaClient, AccountOperationType } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';

const prisma = new PrismaClient();

export interface CreateFlowRequest {
  operatorId: number;
  operatorName: string;
  targetUserId: number;
  targetName: string;
  operationType: AccountOperationType;
  amount: number; // 充值为正数，提现为负数
  description?: string;
  businessType?: string;
  businessId?: string;
}

export interface FlowSummary {
  totalRecharge: number;
  totalWithdraw: number;
  netAmount: number;
  count: number;
}

export class AccountFlowService {
  /**
   * 创建账户流水记录
   * 新逻辑：每个操作只创建一条记录
   * - 充值：operatorId给targetUserId充值，amount为正数
   * - 提现：operatorId从targetUserId提现，amount为负数
   */
  static async createFlow(data: CreateFlowRequest) {
    const flow = await prisma.accountFlow.create({
      data: {
        operatorId: data.operatorId,
        operatorName: data.operatorName,
        targetUserId: data.targetUserId,
        targetName: data.targetName,
        operationType: data.operationType,
        amount: new Decimal(data.amount),
        currency: 'USD',
        description: data.description,
        businessType: data.businessType,
        businessId: data.businessId,
      } as any,
      include: {
        operator: true,
        targetUser: true,
      }
    });

    // 更新用户余额
    await AccountFlowService.updateUserBalance(data.targetUserId);
    
    return flow;
  }

  /**
   * 用户充值
   * operatorId给targetUserId充值amount金额
   */
  static async recharge(operatorId: number, targetUserId: number, amount: number, description?: string) {
    const operator = await prisma.user.findUnique({ where: { id: operatorId } });
    const target = await prisma.user.findUnique({ where: { id: targetUserId } });
    
    if (!operator || !target) {
      throw new Error('用户不存在');
    }

    return AccountFlowService.createFlow({
      operatorId,
      operatorName: operator.name || operator.username,
      targetUserId,
      targetName: target.name || target.username,
      operationType: 'RECHARGE' as AccountOperationType,
      amount: Math.abs(amount), // 确保充值金额为正数
      description: description || `${operator.name || operator.username}给${target.name || target.username}充值`,
      businessType: 'recharge',
    });
  }

  /**
   * 用户提现
   * operatorId从targetUserId提现amount金额
   */
  static async withdraw(operatorId: number, targetUserId: number, amount: number, description?: string) {
    const operator = await prisma.user.findUnique({ where: { id: operatorId } });
    const target = await prisma.user.findUnique({ where: { id: targetUserId } });
    
    if (!operator || !target) {
      throw new Error('用户不存在');
    }

    return AccountFlowService.createFlow({
      operatorId,
      operatorName: operator.name || operator.username,
      targetUserId,
      targetName: target.name || target.username,
      operationType: 'WITHDRAW' as AccountOperationType,
      amount: -Math.abs(amount), // 确保提现金额为负数
      description: description || `${operator.name || operator.username}从${target.name || target.username}提现`,
      businessType: 'withdraw',
    });
  }

  /**
   * 计算用户余额
   * 新逻辑：总余额 = (操作对象是自己的记录总和) - (操作员是自己的记录总和)
   */
  static async calculateUserBalance(userId: number): Promise<number> {
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

    console.log(`用户 ${userId} 余额计算: 目标总额=${targetTotal}, 操作员总额=${operatorTotal}, 最终余额=${balance}`);
    
    return balance;
  }

  /**
   * 更新用户余额到users表
   */
  static async updateUserBalance(userId: number) {
    const balance = await AccountFlowService.calculateUserBalance(userId);
    
    await prisma.user.update({
      where: { id: userId },
      data: { balance: new Decimal(balance) },
    });

    return balance;
  }

  /**
   * 获取用户流水记录
   */
  static async getUserFlows(userId: number, page = 1, pageSize = 20) {
    const skip = (page - 1) * pageSize;

    // 获取用户相关的所有流水（作为操作员或操作对象）
    const flows = await prisma.accountFlow.findMany({
      where: {
        OR: [
          { operatorId: userId },
          { targetUserId: userId },
        ],
      },
      include: {
        operator: {
          select: { id: true, username: true, name: true },
        },
        targetUser: {
          select: { id: true, username: true, name: true },
        },
      },
      orderBy: { createdAt: 'desc' },
      skip,
      take: pageSize,
    });

    const total = await prisma.accountFlow.count({
      where: {
        OR: [
          { operatorId: userId },
          { targetUserId: userId },
        ],
      },
    });

    // 转换Decimal字段为number
    const convertedFlows = flows.map(flow => ({
      ...flow,
      amount: parseFloat(flow.amount.toString()),
    }));

    return {
      data: convertedFlows,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    };
  }

  /**
   * 获取所有流水记录（管理员用）
   */
  static async getAllFlows(page = 1, pageSize = 20) {
    const skip = (page - 1) * pageSize;

    const flows = await prisma.accountFlow.findMany({
      include: {
        operator: {
          select: { id: true, username: true, name: true },
        },
        targetUser: {
          select: { id: true, username: true, name: true },
        },
      },
      orderBy: { createdAt: 'desc' },
      skip,
      take: pageSize,
    });

    const total = await prisma.accountFlow.count();

    // 转换Decimal字段为number
    const convertedFlows = flows.map(flow => ({
      ...flow,
      amount: parseFloat(flow.amount.toString()),
    }));

    return {
      data: convertedFlows,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    };
  }

  /**
   * 获取流水统计
   */
  static async getFlowSummary(): Promise<FlowSummary> {
    const flows = await prisma.accountFlow.findMany({
      select: { amount: true, operationType: true },
    });

    let totalRecharge = 0;
    let totalWithdraw = 0;

    flows.forEach(flow => {
      const amount = parseFloat(flow.amount.toString());
      if (flow.operationType === AccountOperationType.RECHARGE) {
        totalRecharge += amount;
      } else if (flow.operationType === AccountOperationType.WITHDRAW) {
        totalWithdraw += Math.abs(amount); // 提现记录为负数，取绝对值
      }
    });

    return {
      totalRecharge,
      totalWithdraw,
      netAmount: totalRecharge - totalWithdraw,
      count: flows.length,
    };
  }

  /**
   * 刷新所有用户余额
   */
  static async refreshAllBalances() {
    const users = await prisma.user.findMany({
      select: { id: true },
    });

    const results = [];
    for (const user of users) {
      await AccountFlowService.updateUserBalance(user.id);
      const balance = await AccountFlowService.calculateUserBalance(user.id);
      results.push({ userId: user.id, balance });
    }

    return results;
  }
}

export default new AccountFlowService();