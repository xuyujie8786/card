import { PrismaClient, CardStatus as PrismaCardStatus } from '@prisma/client';
import logger from '../config/logger';
import {
  OperationType,
  CardStatus,
  CreateOperationLogRequest,
  OperationLogResponse,
  OperationLogListRequest,
  OperationLogListResponse,
} from '../types/operationLog';

const prisma = new PrismaClient();

// 枚举类型映射 - operationType 存储为字符串，不需要映射
const operationTypeToString: Record<OperationType, string> = {
  [OperationType.CREATE_CARD]: 'CREATE_CARD',
  [OperationType.DELETE_CARD]: 'DELETE_CARD',
  [OperationType.RECHARGE]: 'RECHARGE',
  [OperationType.WITHDRAW]: 'WITHDRAW',
  [OperationType.FREEZE]: 'FREEZE',
  [OperationType.UNFREEZE]: 'UNFREEZE',
};

const cardStatusMapping: Record<CardStatus, PrismaCardStatus> = {
  [CardStatus.ACTIVE]: PrismaCardStatus.ACTIVE,
  [CardStatus.FROZEN]: PrismaCardStatus.FROZEN,
  [CardStatus.RELEASED]: PrismaCardStatus.RELEASED,
};

export class OperationLogService {
  /**
   * 创建操作记录
   */
  static async createOperationLog(
    request: CreateOperationLogRequest,
    operatorId: number,
    operatorName: string
  ): Promise<OperationLogResponse> {
    try {
      logger.info('📝 创建操作记录', {
        cardId: request.cardId,
        operationType: request.operationType,
        amount: request.amount,
        operatorId,
        operatorName,
      });

      // 根据操作类型确定金额符号
      let finalAmount = request.amount;
      switch (request.operationType) {
        case OperationType.DELETE_CARD:
        case OperationType.WITHDRAW:
          // 删卡和提现记录为负数
          finalAmount = -Math.abs(request.amount);
          break;
        case OperationType.CREATE_CARD:
        case OperationType.RECHARGE:
          // 开卡和充值记录为正数
          finalAmount = Math.abs(request.amount);
          break;
        case OperationType.FREEZE:
        case OperationType.UNFREEZE:
          finalAmount = 0;
          break;
        default:
          break;
      }

      const operationLog = await prisma.operationLog.create({
        data: {
          cardId: request.cardId,
          cardNo: request.cardNo,
          operationType: request.operationType as string,
          amount: finalAmount,
          currency: request.currency || 'USD',
          operatorId,
          operatorName,
          description: request.description,
        },
        include: {
          operator: {
            select: {
              id: true,
              username: true,
              name: true,
            },
          },
        },
      });

      logger.info('✅ 操作记录创建成功', {
        id: operationLog.id,
        cardId: request.cardId,
        operationType: request.operationType,
        amount: finalAmount,
      });

      // 获取虚拟卡的当前状态
      const virtualCard = await prisma.virtualCard.findUnique({
        where: { cardId: operationLog.cardId },
        select: { status: true },
      });

      return {
        id: operationLog.id,
        cardId: operationLog.cardId,
        cardNo: operationLog.cardNo,
        operationType: operationLog.operationType as OperationType,
        amount: operationLog.amount.toString(),
        currency: operationLog.currency,
        operatorId: operationLog.operatorId,
        operatorName: operationLog.operatorName,
        description: operationLog.description || undefined,
        cardStatus: (virtualCard?.status || 'RELEASED') as CardStatus,
        createdAt: operationLog.createdAt.toISOString(),
      };
    } catch (error) {
      logger.error('❌ 创建操作记录失败', {
        error: error instanceof Error ? error.message : 'Unknown error',
        cardId: request.cardId,
        operationType: request.operationType,
      });
      throw error;
    }
  }

  /**
   * 获取操作记录列表
   */
  static async getOperationLogs(
    request: OperationLogListRequest
  ): Promise<OperationLogListResponse> {
    try {
      const {
        current = 1,
        pageSize = 20,
        cardId,
        cardNo,
        operationType,
        startDate,
        endDate,
        operatorName,
        cardStatus,
      } = request;

      const skip = (current - 1) * pageSize;

      // 构建查询条件
      const where: any = {};

      if (cardId) {
        where.cardId = {
          contains: cardId,
        };
      }

      if (cardNo) {
        where.cardNo = {
          contains: cardNo,
        };
      }

      if (operationType) {
        where.operationType = operationType as string;
      }

      if (operatorName) {
        where.operatorName = {
          contains: operatorName,
        };
      }

      if (startDate || endDate) {
        where.createdAt = {};
        if (startDate) {
          where.createdAt.gte = new Date(startDate);
        }
        if (endDate) {
          where.createdAt.lte = new Date(endDate + 'T23:59:59.999Z');
        }
      }

      // 如果有卡状态筛选，需要先找到符合条件的卡ID
      if (cardStatus) {
        const cardsWithStatus = await prisma.virtualCard.findMany({
          where: {
            status: cardStatusMapping[cardStatus],
          },
          select: {
            cardId: true,
          },
        });
        const filteredCardIds = cardsWithStatus.map(card => card.cardId);
        
        if (filteredCardIds.length > 0) {
          where.cardId = {
            in: filteredCardIds,
          };
        } else {
          // 如果没有找到符合条件的卡，返回空结果
          return {
            data: [],
            total: 0,
            current,
            pageSize,
          };
        }
      }

      // 获取总数
      const total = await prisma.operationLog.count({ where });

      // 获取数据
      const operationLogs = await prisma.operationLog.findMany({
        where,
        skip,
        take: pageSize,
        orderBy: {
          createdAt: 'desc',
        },
        include: {
          operator: {
            select: {
              id: true,
              username: true,
              name: true,
            },
          },
        },
      });

      // 获取对应虚拟卡的实时状态
      const cardIds = [...new Set(operationLogs.map(log => log.cardId))];
      const virtualCards = await prisma.virtualCard.findMany({
        where: {
          cardId: {
            in: cardIds,
          },
        },
        select: {
          cardId: true,
          status: true,
        },
      });

      // 创建卡状态映射
      const cardStatusMap = new Map(
        virtualCards.map(card => [card.cardId, card.status])
      );

      const data: OperationLogResponse[] = operationLogs.map((log) => {
        // 优先使用虚拟卡的实时状态，如果虚拟卡已删除则使用默认状态
        const currentCardStatus = cardStatusMap.get(log.cardId) || 'RELEASED';
        
        return {
          id: log.id,
          cardId: log.cardId,
          cardNo: log.cardNo,
          operationType: log.operationType as OperationType,
          amount: log.amount.toString(),
          currency: log.currency,
          operatorId: log.operatorId,
          operatorName: log.operatorName,
          description: log.description || undefined,
          cardStatus: currentCardStatus as CardStatus,
          createdAt: log.createdAt.toISOString(),
        };
      });

      logger.info('🔍 获取操作记录列表', {
        total,
        current,
        pageSize,
        filters: { cardId, cardNo, operationType, startDate, endDate, operatorName, cardStatus },
      });

      return {
        data,
        total,
        current,
        pageSize,
      };
    } catch (error) {
      logger.error('❌ 获取操作记录列表失败', {
        error: error instanceof Error ? error.message : 'Unknown error',
        request,
      });
      throw error;
    }
  }

  /**
   * 获取操作记录统计信息
   */
  static async getOperationStats(startDate?: string, endDate?: string) {
    try {
      const where: any = {};

      if (startDate || endDate) {
        where.createdAt = {};
        if (startDate) {
          where.createdAt.gte = new Date(startDate);
        }
        if (endDate) {
          where.createdAt.lte = new Date(endDate + 'T23:59:59.999Z');
        }
      }

      const stats = await prisma.operationLog.groupBy({
        by: ['operationType'],
        where,
        _count: {
          id: true,
        },
        _sum: {
          amount: true,
        },
      });

      const result: any = {};
      stats.forEach((stat) => {
        result[stat.operationType] = {
          count: stat._count.id,
          totalAmount: stat._sum.amount?.toString() || '0',
        };
      });

      logger.info('📊 获取操作记录统计', {
        stats: result,
        period: { startDate, endDate },
      });

      return result;
    } catch (error) {
      logger.error('❌ 获取操作记录统计失败', {
        error: error instanceof Error ? error.message : 'Unknown error',
        period: { startDate, endDate },
      });
      throw error;
    }
  }

  /**
   * 批量记录操作日志（用于集成到现有功能中）
   */
  static async logCardOperation(
    operationType: OperationType,
    cardId: string,
    cardNo: string,
    amount: number,
    operatorId: number,
    operatorName: string,
    description?: string,
    currency: string = 'USD'
  ): Promise<void> {
    try {
      await this.createOperationLog(
        {
          cardId,
          cardNo,
          operationType,
          amount,
          currency,
          description,
        },
        operatorId,
        operatorName
      );
    } catch (error) {
      // 记录日志但不抛出异常，避免影响主流程
      logger.error('❌ 记录操作日志失败', {
        error: error instanceof Error ? error.message : 'Unknown error',
        operationType,
        cardId,
        cardNo,
      });
    }
  }
}

export default OperationLogService;
