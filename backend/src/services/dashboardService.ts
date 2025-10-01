import { PrismaClient, AccountOperationType, CardTxnType } from '@prisma/client';
import logger from '../config/logger';

const prisma = new PrismaClient();

export interface DashboardData {
  totalRecharge: number;      // 总充值
  totalConsumption: number;   // 总消费
  cardLocked: number;         // 卡内锁定
  availableAmount: number;    // 可用金额
}

export interface AdminDashboardData {
  managedUsers: number;       // 管理的用户数量
  totalOperations: number;    // 总操作次数
  totalRechargeOperations: number; // 充值操作次数
  totalWithdrawOperations: number; // 提现操作次数
  recentOperations: any[];    // 最近操作记录
}

export class DashboardService {
  /**
   * 获取用户仪表盘数据
   */
  static async getDashboardData(userId: number): Promise<DashboardData> {
    try {
      logger.info('🔍 获取用户仪表盘数据', { userId });

      // 并行计算各项数据
      const [totalRecharge, totalConsumption, cardLocked] = await Promise.all([
        this.calculateTotalRecharge(userId),
        this.calculateTotalConsumption(userId),
        this.calculateCardLocked(userId)
      ]);

      // 计算可用金额
      const availableAmount = totalRecharge - totalConsumption - cardLocked;

      const dashboardData: DashboardData = {
        totalRecharge,
        totalConsumption,
        cardLocked,
        availableAmount
      };

      logger.info('✅ 仪表盘数据计算完成', {
        userId,
        ...dashboardData
      });

      return dashboardData;
    } catch (error) {
      logger.error('❌ 获取仪表盘数据失败', { userId, error });
      throw error;
    }
  }

  /**
   * 计算总充值
   * 公式：(操作对象为自己的提现+充值) - (操作者为自己的充值和提现)
   */
  private static async calculateTotalRecharge(userId: number): Promise<number> {
    try {
      // 操作对象为自己的充值和提现
      const targetFlows = await prisma.accountFlow.findMany({
        where: {
          targetUserId: userId,
          operationType: {
            in: [AccountOperationType.RECHARGE, AccountOperationType.WITHDRAW]
          }
        },
        select: {
          amount: true
        }
      });

      // 操作者为自己的充值和提现
      const operatorFlows = await prisma.accountFlow.findMany({
        where: {
          operatorId: userId,
          operationType: {
            in: [AccountOperationType.RECHARGE, AccountOperationType.WITHDRAW]
          }
        },
        select: {
          amount: true
        }
      });

      // 计算操作对象为自己的总金额
      const targetTotal = targetFlows.reduce((sum, flow) => {
        return sum + parseFloat(flow.amount.toString());
      }, 0);

      // 计算操作者为自己的总金额
      const operatorTotal = operatorFlows.reduce((sum, flow) => {
        return sum + parseFloat(flow.amount.toString());
      }, 0);

      const totalRecharge = targetTotal - operatorTotal;

      logger.info('💰 总充值计算', {
        userId,
        targetTotal,
        operatorTotal,
        totalRecharge
      });

      return totalRecharge;
    } catch (error) {
      logger.error('❌ 计算总充值失败', { userId, error });
      throw error;
    }
  }

  /**
   * 计算总消费
   * 公式：卡交易最终金额总和（除去txnType为AUTH_CANCEL的交易记录，只统计成功的交易）
   */
  private static async calculateTotalConsumption(userId: number): Promise<number> {
    try {
      const transactions = await prisma.cardTransaction.findMany({
        where: {
          userId: userId,
          txnType: {
            not: CardTxnType.AUTH_CANCEL // 排除授权撤销
          },
          txnStatus: '1' // 只统计成功的交易
        },
        select: {
          finalAmt: true
        }
      });

      const totalConsumption = transactions.reduce((sum, txn) => {
        return sum + parseFloat(txn.finalAmt.toString());
      }, 0);

      logger.info('💳 总消费计算', {
        userId,
        transactionCount: transactions.length,
        totalConsumption
      });

      return Math.abs(totalConsumption); // 取绝对值，因为消费通常是负数
    } catch (error) {
      logger.error('❌ 计算总消费失败', { userId, error });
      throw error;
    }
  }

  /**
   * 计算卡内锁定金额
   * 公式：卡操作记录总和 - 卡消费总和（排除AUTH_CANCEL和已删除卡片，只统计成功交易）
   */
  private static async calculateCardLocked(userId: number): Promise<number> {
    try {
      // 获取用户所有未删除的卡片ID
      const activeCards = await prisma.virtualCard.findMany({
        where: {
          userId: userId,
          status: {
            not: 'RELEASED' // 排除已删除的卡片
          }
        },
        select: {
          cardId: true
        }
      });

      const activeCardIds = activeCards.map(card => card.cardId);

      if (activeCardIds.length === 0) {
        logger.info('📊 用户无活跃卡片，卡内锁定为0', { userId });
        return 0;
      }

      // 并行计算操作记录总和和消费总和
      const [operationTotal, consumptionTotal] = await Promise.all([
        // 卡操作记录总和（排除已删除卡片）
        prisma.operationLog.findMany({
          where: {
            cardId: {
              in: activeCardIds
            }
          },
          select: {
            amount: true
          }
        }).then(logs => 
          logs.reduce((sum, log) => sum + parseFloat(log.amount.toString()), 0)
        ),

        // 卡消费总和（排除AUTH_CANCEL和已删除卡片，只统计成功交易）
        prisma.cardTransaction.findMany({
          where: {
            cardId: {
              in: activeCardIds
            },
            txnType: {
              not: CardTxnType.AUTH_CANCEL // 排除授权撤销
            },
            txnStatus: '1' // 只统计成功的交易
          },
          select: {
            finalAmt: true
          }
        }).then(txns => 
          txns.reduce((sum, txn) => sum + parseFloat(txn.finalAmt.toString()), 0)
        )
      ]);

      const cardLocked = operationTotal - Math.abs(consumptionTotal);

      logger.info('🔒 卡内锁定计算', {
        userId,
        activeCardCount: activeCardIds.length,
        operationTotal,
        consumptionTotal,
        cardLocked
      });

      return Math.max(0, cardLocked); // 确保不为负数
    } catch (error) {
      logger.error('❌ 计算卡内锁定失败', { userId, error });
      throw error;
    }
  }

  /**
   * 获取消费趋势数据（最近N天）
   */
  static async getConsumptionTrend(userId: number, days: number = 7): Promise<Array<{date: string, consumption: number}>> {
    try {
      // 直接按日期查询，不做时区转换
      const today = new Date();
      const endDateStr = today.toISOString().split('T')[0]; // YYYY-MM-DD
      
      const startDateObj = new Date(today);
      startDateObj.setDate(today.getDate() - days + 1);
      const startDateStr = startDateObj.toISOString().split('T')[0]; // YYYY-MM-DD
      
      // 直接按日期查询，与TransactionService.getTransactions保持一致
      const startDate = new Date(startDateStr + 'T00:00:00.000Z');
      const endDate = new Date(endDateStr + 'T23:59:59.999Z');
      
      logger.info('📊 消费趋势查询时间范围', {
        userId,
        days,
        startDateStr,
        endDateStr,
        startDateUTC: startDate.toISOString(),
        endDateUTC: endDate.toISOString()
      });
      
      // 获取指定时间范围内的所有成功交易记录
      const transactions = await prisma.cardTransaction.findMany({
        where: {
          userId: userId,
          txnTime: {
            gte: startDate,
            lte: endDate
          },
          // 排除授权取消的交易
          txnType: {
            not: 'AUTH_CANCEL'
          },
          // 只统计成功的交易
          txnStatus: '1'
        },
        select: {
          txnTime: true,
          finalAmt: true
        },
        orderBy: {
          txnTime: 'asc'
        }
      });

      // 创建日期映射
      const dateMap = new Map<string, number>();
      
      // 初始化所有日期为0，使用正确的日期字符串
      for (let i = 0; i < days; i++) {
        const dateObj = new Date(startDateObj);
        dateObj.setDate(startDateObj.getDate() + i);
        const dateStr = dateObj.toISOString().split('T')[0];
        dateMap.set(dateStr, 0);
      }

      // 累计每日消费
      transactions.forEach((txn: any) => {
        // 使用UTC时间转换为日期字符串，确保时区一致性
        const dateStr = new Date(txn.txnTime).toISOString().split('T')[0];
        const currentAmount = dateMap.get(dateStr) || 0;
        const amount = parseFloat(txn.finalAmt?.toString() || '0');
        dateMap.set(dateStr, currentAmount + amount);
      });

      // 转换为数组格式
      const result = Array.from(dateMap.entries()).map(([date, consumption]) => ({
        date,
        consumption: Math.round(consumption * 100) / 100 // 保留2位小数
      }));

      logger.info('📊 消费趋势数据', {
        userId,
        days,
        resultCount: result.length,
        totalConsumption: result.reduce((sum, item) => sum + item.consumption, 0)
      });

      return result;
    } catch (error) {
      logger.error('❌ 获取消费趋势失败', { userId, days, error });
      throw error;
    }
  }

  /**
   * 获取管理员仪表盘数据
   */
  static async getAdminDashboardData(adminId: number): Promise<AdminDashboardData> {
    try {
      logger.info('🔍 获取管理员仪表盘数据', { adminId });

      // 并行计算各项数据
      const [
        managedUsers,
        totalOperations,
        rechargeOperations,
        withdrawOperations,
        recentOperations
      ] = await Promise.all([
        // 管理的用户数量
        prisma.user.count({
          where: {
            parentId: adminId
          }
        }),

        // 总操作次数
        prisma.accountFlow.count({
          where: {
            operatorId: adminId
          }
        }),

        // 充值操作次数
        prisma.accountFlow.count({
          where: {
            operatorId: adminId,
            operationType: AccountOperationType.RECHARGE
          }
        }),

        // 提现操作次数
        prisma.accountFlow.count({
          where: {
            operatorId: adminId,
            operationType: AccountOperationType.WITHDRAW
          }
        }),

        // 最近10条操作记录
        prisma.accountFlow.findMany({
          where: {
            operatorId: adminId
          },
          include: {
            targetUser: {
              select: {
                id: true,
                username: true,
                name: true
              }
            }
          },
          orderBy: {
            createdAt: 'desc'
          },
          take: 10
        })
      ]);

      const adminDashboardData: AdminDashboardData = {
        managedUsers,
        totalOperations,
        totalRechargeOperations: rechargeOperations,
        totalWithdrawOperations: withdrawOperations,
        recentOperations
      };

      logger.info('✅ 管理员仪表盘数据计算完成', {
        adminId,
        managedUsers,
        totalOperations
      });

      return adminDashboardData;
    } catch (error) {
      logger.error('❌ 获取管理员仪表盘数据失败', { adminId, error });
      throw error;
    }
  }

  /**
   * 获取系统总览数据（管理员使用）
   */
  static async getSystemOverview(): Promise<{
    totalUsers: number;
    totalCards: number;
    totalTransactions: number;
    systemTotalRecharge: number;
    systemTotalConsumption: number;
  }> {
    try {
      logger.info('🔍 获取系统总览数据');

      const [
        totalUsers,
        totalCards,
        totalTransactions,
        rechargeFlows,
        allTransactions
      ] = await Promise.all([
        prisma.user.count(),
        prisma.virtualCard.count(),
        prisma.cardTransaction.count(),
        prisma.accountFlow.findMany({
          where: {
            operationType: {
              in: [AccountOperationType.RECHARGE, AccountOperationType.WITHDRAW]
            }
          },
          select: { amount: true }
        }),
        prisma.cardTransaction.findMany({
          where: {
            txnType: {
              not: CardTxnType.AUTH_CANCEL
            },
            txnStatus: '1' // 只统计成功的交易
          },
          select: { finalAmt: true }
        })
      ]);

      const systemTotalRecharge = rechargeFlows.reduce((sum, flow) => {
        return sum + parseFloat(flow.amount.toString());
      }, 0);

      const systemTotalConsumption = Math.abs(
        allTransactions.reduce((sum, txn) => {
          return sum + parseFloat(txn.finalAmt.toString());
        }, 0)
      );

      const systemOverview = {
        totalUsers,
        totalCards,
        totalTransactions,
        systemTotalRecharge,
        systemTotalConsumption
      };

      logger.info('✅ 系统总览数据获取完成', systemOverview);

      return systemOverview;
    } catch (error) {
      logger.error('❌ 获取系统总览数据失败', { error });
      throw error;
    }
  }
}
