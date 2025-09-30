import { Request, Response } from 'express';
import { validationResult } from 'express-validator';
import { CardProviderService } from '../services/cardProviderService';
import { PrismaClient, CardStatus } from '@prisma/client';
import logger from '../config/logger';
import { successResponse, errorResponse } from '../utils/response';
import { AuthRequest } from '../middleware/auth';
import { Currency, ProductCode } from '../types/cardProvider';
import OperationLogService from '../services/operationLogService';
import { OperationType } from '../types/operationLog';
import { AccountFlowService } from '../services/accountFlowService';
import { AccountOperationType } from '@prisma/client';
import { DashboardService } from '../services/dashboardService';

const prisma = new PrismaClient();
const cardProviderService = new CardProviderService();

/**
 * 格式化有效期为 MM/YY 格式
 */
function formatExpDate(expDate: any): string {
  try {
    // 如果已经是 MM/YY 格式，直接返回
    if (typeof expDate === 'string' && /^\d{2}\/\d{2}$/.test(expDate)) {
      return expDate;
    }
    
    // 如果是日期字符串或Date对象，转换为 MM/YY 格式
    const date = new Date(expDate);
    if (isNaN(date.getTime())) {
      return '';
    }
    
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = String(date.getFullYear()).slice(-2);
    return `${month}/${year}`;
  } catch (error) {
    logger.error('Failed to format expiration date', { expDate, error });
    return '';
  }
}

/**
 * 将 MM/YY 格式的有效期转换为 Date 对象
 * MM/YY -> Date (月份最后一天)
 */
function parseExpDateToDate(expDateStr: string): Date {
  try {
    // 检查格式是否为 MM/YY
    if (!/^\d{2}\/\d{2}$/.test(expDateStr)) {
      throw new Error('Invalid expDate format');
    }
    
    const [month, year] = expDateStr.split('/');
    const fullYear = 2000 + parseInt(year); // YY -> 20YY
    
    // 创建该月的最后一天作为有效期
    return new Date(fullYear, parseInt(month), 0); // 下个月的第0天 = 当月最后一天
  } catch (error) {
    logger.error('Failed to parse expiration date', { expDateStr, error });
    // 返回一个默认的远期日期
    return new Date(2028, 11, 31);
  }
}

/**
 * 虚拟卡控制器
 */
export class CardController {
  /**
   * 测试卡商API连接
   */
  async testCardProvider(req: AuthRequest, res: Response): Promise<any> {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return errorResponse(res, 'User not authenticated', 401);
      }

      // 仅测试卡商API，不涉及数据库操作
      const requestId = `test_${Date.now()}_${userId}`;
      
      logger.info('Testing card provider API', { userId, requestId });

      const cardResponse = await cardProviderService.createCard({
        amount: 5,
        currency: 'USD',
        expDate: new Date('2028-09-20'),
        remark: '测试API连接',
        productCode: 'E0000001',
        requestId
      });

      logger.info('Card provider test successful', {
        cardId: cardResponse.cardId,
        cardNo: cardResponse.cardNo,
        balance: cardResponse.cardBal
      });

      return successResponse(res, cardResponse, 'Card provider test successful');

    } catch (error) {
      logger.error('Card provider test failed', {
        error: error instanceof Error ? error.message : 'Unknown error',
        userId: req.user?.id
      });
      return errorResponse(res, 'Card provider test failed', 500);
    }
  }

  /**
   * 创建虚拟卡（简化版本，用于前端快速创建）
   */
  async createCardSimple(req: AuthRequest, res: Response): Promise<any> {
    try {
      // 验证输入
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return errorResponse(res, 'Validation failed', 400, errors.array());
      }

      const {
        productCode = 'E0000001', // 默认香港卡
        amt = '5.00',
        expdate,
        currency = 'USD',
        remark
      } = req.body;

      // 调试日志：记录接收到的有效期数据
      logger.info('Received card creation request', {
        expdate,
        expdateType: typeof expdate,
        parsedDate: new Date(expdate),
        parsedDateISO: new Date(expdate).toISOString()
      });

      const userId = req.user?.id;
      const userName = req.user?.username;
      const userDisplayName = req.user?.name || userName;

      if (!userId) {
        return errorResponse(res, 'User not authenticated', 401);
      }

      // 检查用户是否存在
      const user = await prisma.user.findUnique({
        where: { id: userId }
      });

      if (!user) {
        return errorResponse(res, 'User not found', 404);
      }

      const initialAmount = parseFloat(amt);
      
      // 检查用户余额是否足够（只需要初始充值金额）
      // 获取真实可用余额
      const dashboardData = await DashboardService.getDashboardData(user.id);
      const availableAmount = dashboardData.availableAmount;

      if (availableAmount < initialAmount) {
        return errorResponse(res, 'Insufficient balance', 400, {
          required: initialAmount,
          available: availableAmount,
          balance: Number(user.balance)
        });
      }

      // 生成请求ID
      const requestId = `card_${Date.now()}_${userId}`;

      // 调用卡商API创建卡片（不传递备注给卡商）
      const cardResponse = await cardProviderService.createCard({
        amount: initialAmount,
        currency: currency as Currency,
        expDate: new Date(expdate),
        // remark, // 不传递给卡商，只保存到数据库
        productCode: productCode as ProductCode,
        requestId
      });

      // 开始数据库事务
      const result = await prisma.$transaction(async (tx: any) => {
        // 扣除用户余额
        const updatedUser = await tx.user.update({
          where: { id: userId },
          data: {
            balance: {
              decrement: initialAmount
            }
          }
        });

        // 资金变动日志已移除，仅记录操作日志
        logger.info(`Card creation charge: ${initialAmount} for user ${userId}, balance: ${user.balance} -> ${updatedUser.balance} (Card: ${cardResponse.cardNo})`);

        // 保存卡片信息到数据库
        const virtualCard = await tx.virtualCard.create({
          data: {
            userId: userId,
            cardId: cardResponse.cardId,
            cardNo: cardResponse.cardNo,
            cvv: cardResponse.cvv,
            expDate: new Date(expdate), // 直接使用前端传入的日期
            balance: parseFloat(cardResponse.cardBal),
            currency: cardResponse.curId,
            status: 'ACTIVE',
            cardholderName: user.name || userDisplayName,
            cardholderUsername: userName,
            cardholderEmail: user.email,
            createdBy: userId,
            remark
          }
        });

        return virtualCard;
      });

      logger.info('Virtual card created successfully', {
        cardId: result.cardId,
        userId,
        amount: initialAmount
      });

      // 记录开卡操作到审计日志
      await OperationLogService.logCardOperation(
        OperationType.CREATE_CARD,
        result.cardId,
        result.cardNo,
        initialAmount,
        userId,
        userDisplayName || userName || 'Unknown',
        `开卡 - ${user.name || userName || 'Unknown User'}`,
        result.currency
      );

      return successResponse(res, {
        userId: cardResponse.userId,
        cardId: cardResponse.cardId,
        cardNo: cardResponse.cardNo,
        expDate: cardResponse.expDate,
        cvv: cardResponse.cvv,
        cardBal: cardResponse.cardBal,
        curId: cardResponse.curId,
        tradeNo: cardResponse.tradeNo,
        sub_id: cardResponse.sub_id,
        request_id: cardResponse.request_id
      }, 'Virtual card created successfully');

    } catch (error) {
      logger.error('Failed to create virtual card', {
        error: error instanceof Error ? error.message : 'Unknown error',
        userId: req.user?.id,
        body: req.body
      });
      return errorResponse(res, 'Failed to create card', 500);
    }
  }

  /**
   * 创建虚拟卡（完整版本）
   */
  async createCard(req: AuthRequest, res: Response): Promise<any> {
    try {
      // 验证输入
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return errorResponse(res, 'Validation failed', 400, errors.array());
      }

      const {
        cardholderUsername,
        cardholderName,
        cardholderEmail,
        currency,
        initialAmount,
        expDate,
        remark,
        productCode
      } = req.body;

      const userId = req.user?.id;
      if (!userId) {
        return errorResponse(res, 'User not authenticated', 401);
      }

      // 检查用户是否存在
      const user = await prisma.user.findUnique({
        where: { id: userId }
      });

      if (!user) {
        return errorResponse(res, 'User not found', 404);
      }

      // 检查用户余额是否足够（只需要初始充值金额）
      // 获取真实可用余额
      const dashboardData = await DashboardService.getDashboardData(user.id);
      const availableAmount = dashboardData.availableAmount;

      if (availableAmount < initialAmount) {
        return errorResponse(res, 'Insufficient balance', 400, {
          required: initialAmount,
          available: availableAmount,
          balance: Number(user.balance)
        });
      }

      // 生成请求ID
      const requestId = `card_${Date.now()}_${userId}`;

      // 调用卡商API创建卡片（不传递备注给卡商）
      const cardResponse = await cardProviderService.createCard({
        amount: initialAmount,
        currency: currency as Currency,
        expDate: new Date(expDate),
        // remark, // 不传递给卡商，只保存到数据库
        productCode: productCode as ProductCode,
        requestId
      });

      // 开始数据库事务
      const result = await prisma.$transaction(async (tx: any) => {
        // 扣除用户余额
        const updatedUser = await tx.user.update({
          where: { id: userId },
          data: {
            balance: {
              decrement: initialAmount
            }
          }
        });

        // 资金变动日志已移除，仅记录操作日志
        logger.info(`Card creation charge: ${initialAmount} for user ${userId}, balance: ${user.balance} -> ${updatedUser.balance} (Card: ${cardResponse.cardNo})`);

        // 保存卡片信息到数据库
        const virtualCard = await tx.virtualCard.create({
          data: {
            userId: userId,
            cardId: cardResponse.cardId,
            cardNo: cardResponse.cardNo,
            cvv: cardResponse.cvv,
            expDate: parseExpDateToDate(cardResponse.expDate), // MM/YY -> Date
            balance: parseFloat(cardResponse.cardBal),
            currency: cardResponse.curId,
            status: 'ACTIVE',
            cardholderName,
            cardholderUsername,
            cardholderEmail,
            createdBy: userId,
            remark
          }
        });

        // 资金记录关联卡片ID更新已移除（UserBalanceLog表已删除）

        return virtualCard;
      });

      logger.info('Virtual card created successfully', {
        userId,
        cardId: result.cardId,
        cardholderUsername,
        initialAmount,
        currency
      });

      // 记录开卡操作
      await OperationLogService.logCardOperation(
        OperationType.CREATE_CARD,
        result.cardId,
        result.cardNo,
        initialAmount,
        userId,
        user.name || user.username,
        `开卡 - ${cardholderName || cardholderUsername}`,
        result.currency
      );

      return successResponse(res, {
        id: result.id,
        cardId: result.cardId,
        cardNo: result.cardNo.replace(/(\d{4})(\d{4})(\d{4})(\d{4})/, '$1****$3$4'), // 脱敏
        balance: result.balance,
        currency: result.currency,
        status: result.status,
        cardholderName: result.cardholderName,
        cardholderUsername: result.cardholderUsername,
        createdAt: result.createdAt
      }, 'Card created successfully', 201);

    } catch (error) {
      logger.error('Failed to create virtual card', {
        error: error instanceof Error ? error.message : 'Unknown error',
        userId: req.user?.id,
        body: req.body
      });
      return errorResponse(res, 'Failed to create card', 500);
    }
  }

  /**
   * 获取卡片列表
   */
  async getCards(req: AuthRequest, res: Response): Promise<any> {
    try {
      const userId = req.user?.id;
      const userRole = req.user?.role;

      if (!userId) {
        return errorResponse(res, 'User not authenticated', 401);
      }

      const {
        current = 1,
        pageSize = 20,
        cardholderUsername,
        cardNo,
        status,
        remark
      } = req.query;

      // 构建查询条件
      let whereClause: any = {};

      // 权限控制：除了超级管理员，所有人只能看到自己的数据
      if (userRole !== 'SUPER_ADMIN') {
        // 普通用户和管理员都只能看到自己创建的卡片
        whereClause.createdBy = userId;
      }
      // 超级管理员可以看到所有卡片（不添加额外条件）

      // 添加搜索条件
      if (cardholderUsername) {
        whereClause.cardholderUsername = {
          contains: cardholderUsername as string,
          mode: 'insensitive'
        };
      }

      if (cardNo) {
        whereClause.cardNo = {
          contains: cardNo as string
        };
      }

      if (status) {
        // 将前端传来的状态代码转换为数据库中的状态文本
        const statusToTextMap: Record<string, string> = {
          '1': 'ACTIVE',
          '2': 'FROZEN', 
          '0': 'RELEASED',
          '3': 'EXPIRED',
          '4': 'LOCKED',
          '9': 'PENDING'
        };
        const dbStatus = statusToTextMap[status as string];
        if (dbStatus) {
          whereClause.status = dbStatus;
        }
      }

      if (remark) {
        whereClause.remark = {
          contains: remark as string,
          mode: 'insensitive'
        };
      }

      const skip = (Number(current) - 1) * Number(pageSize);

      const [cards, total] = await Promise.all([
        prisma.virtualCard.findMany({
          where: whereClause,
          include: {
            creator: {
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
          skip,
          take: Number(pageSize)
        }),
        prisma.virtualCard.count({ where: whereClause })
      ]);

      // 状态映射 - 使用数据库中的实际状态值（大写）
      const statusTextMap: Record<string, string> = {
        'ACTIVE': '已激活',
        'FROZEN': '已冻结',
        'RELEASED': '已注销',
        'EXPIRED': '已过期',
        'LOCKED': '已锁定',
        'PENDING': '待激活'
      };

      const statusCodeMap: Record<string, string> = {
        'ACTIVE': '1',
        'FROZEN': '2',
        'RELEASED': '0',
        'EXPIRED': '3',
        'LOCKED': '4',
        'PENDING': '9'
      };

      // 格式转换（移除脱敏处理，显示完整信息）
      const sanitizedCards = await Promise.all(cards.map(async (card: any) => {
        // 计算实时余额（与卡片详情API保持一致）
        // 计算总充值金额（所有操作记录的金额相加）
        const totalRechargeResult = await prisma.operationLog.aggregate({
          where: {
            cardId: card.cardId
            // 包含所有操作类型：开卡、删卡、充值、提现、冻结、解冻
          },
          _sum: {
            amount: true
          }
        });
        const totalRecharge = totalRechargeResult._sum?.amount || 0;

        // 计算总消费金额（从交易记录中统计，不包括授权撤销）
        const totalConsumptionResult = await prisma.cardTransaction.aggregate({
          where: {
            cardId: card.cardId,
            txnType: {
              not: 'AUTH_CANCEL' // 排除授权撤销
            },
            txnStatus: '1' // 只统计成功的交易
          },
          _sum: {
            finalAmt: true
          }
        });
        const totalConsumption = Math.abs(parseFloat(totalConsumptionResult._sum?.finalAmt?.toString() || '0'));

        // 计算卡片余额（总充值 - 总消费）
        const calculatedBalance = parseFloat(totalRecharge.toString()) - totalConsumption;

        return {
          id: card.id,
          cardId: card.cardId,
          cardNo: card.cardNo, // 显示完整卡号
          cvv: card.cvv, // 显示真实CVV
          expDate: card.expDate ? formatExpDate(card.expDate) : '',
          balance: calculatedBalance, // 使用计算出的实时余额
          currency: card.currency,
          status: statusCodeMap[card.status] || '1',
          statusText: statusTextMap[card.status] || '已激活',
          remark: card.remark,
          cardholderName: card.cardholderName,
          cardholderUsername: card.cardholderUsername,
          cardholderEmail: card.cardholderEmail,
          createdBy: card.creator ? {
            id: card.creator.id,
            username: card.creator.username,
            name: card.creator.name
          } : null,
          createdAt: card.createdAt,
          updatedAt: card.updatedAt
        };
      }));

      return successResponse(res, {
        list: sanitizedCards,
        pagination: {
          current: Number(current),
          pageSize: Number(pageSize),
          total
        }
      }, 'Cards retrieved successfully');

    } catch (error) {
      logger.error('Failed to get cards', {
        error: error instanceof Error ? error.message : 'Unknown error',
        userId: req.user?.id,
        query: req.query
      });
      return errorResponse(res, 'Failed to get cards', 500);
    }
  }

  /**
   * 获取卡片详情
   */
  async getCardDetail(req: AuthRequest, res: Response): Promise<any> {
    try {
      const { cardId } = req.params;
      const userId = req.user?.id;
      const userRole = req.user?.role;

      if (!userId) {
        return errorResponse(res, 'User not authenticated', 401);
      }

      // 查找卡片
      const card = await prisma.virtualCard.findUnique({
        where: { cardId: cardId },
        include: {
          creator: {
            select: {
              id: true,
              username: true,
              name: true
            }
          }
        }
      });

      if (!card) {
        return errorResponse(res, 'Card not found', 404);
      }

      // 权限检查：除了超级管理员，所有人只能查看自己的卡片
      if (userRole !== 'SUPER_ADMIN' && card.createdBy !== userId) {
        return errorResponse(res, 'Access denied', 403);
      }

      // 只使用本地数据库数据，不调用卡商API
      logger.info('Returning card detail from local database only', {
        cardId: card.cardId,
        balance: card.balance,
        status: card.status
      });

      // 计算总充值金额（所有操作记录的金额相加）
      const totalRechargeResult = await prisma.operationLog.aggregate({
        where: {
          cardId: card.cardId
          // 包含所有操作类型：开卡、删卡、充值、提现、冻结、解冻
        },
        _sum: {
          amount: true
        }
      });
      const totalRecharge = totalRechargeResult._sum?.amount || 0;

      // 计算总消费金额（从交易记录中统计，不包括授权撤销）
      const totalConsumptionResult = await prisma.cardTransaction.aggregate({
        where: {
          cardId: card.cardId,
          txnType: {
            not: 'AUTH_CANCEL' // 排除授权撤销
          },
          txnStatus: '1' // 只统计成功的交易
        },
        _sum: {
          finalAmt: true
        }
      });
      const totalConsumption = Math.abs(parseFloat(totalConsumptionResult._sum?.finalAmt?.toString() || '0'));

      // 计算卡片余额（总充值 - 总消费）
      const calculatedBalance = parseFloat(totalRecharge.toString()) - totalConsumption;

      // 状态映射
      const statusCodeMap: Record<string, string> = {
        'ACTIVE': '1',
        'FROZEN': '2',
        'RELEASED': '0',
        'EXPIRED': '3',
        'LOCKED': '4',
        'PENDING': '9'
      };

      const statusTextMap: Record<string, string> = {
        'ACTIVE': '已激活',
        'FROZEN': '已冻结',
        'RELEASED': '已注销',
        'EXPIRED': '已过期',
        'LOCKED': '已锁定',
        'PENDING': '待激活'
      };

      return successResponse(res, {
        ...card,
        cardNo: card.cardNo, // 显示完整卡号
        cvv: card.cvv, // 显示真实CVV
        expDate: formatExpDate(card.expDate), // 格式化有效期
        balance: calculatedBalance, // 使用计算出的余额
        status: statusCodeMap[card.status] || '1',
        statusText: statusTextMap[card.status] || '已激活',
        // 添加新的统计字段
        totalRecharge: parseFloat(totalRecharge.toString()), // 总充值
        totalConsumption: totalConsumption, // 总消费
        usedAmt: totalConsumption.toFixed(2), // 已使用金额（总消费）
        totalAmt: parseFloat(totalRecharge.toString()).toFixed(2) // 总金额（总充值）
      }, 'Card detail retrieved successfully');

    } catch (error) {
      logger.error('Failed to get card detail', {
        error: error instanceof Error ? error.message : 'Unknown error',
        cardId: req.params.id,
        userId: req.user?.id
      });
      return errorResponse(res, 'Failed to get card detail', 500);
    }
  }

  /**
   * 卡片充值
   */
  async rechargeCard(req: AuthRequest, res: Response): Promise<any> {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return errorResponse(res, 'Validation failed', 400, errors.array());
      }

      const { cardId } = req.params;
      const { amount } = req.body;
      const userId = req.user?.id;

      if (!userId) {
        return errorResponse(res, 'User not authenticated', 401);
      }

      // 查找卡片并检查权限
      const card = await prisma.virtualCard.findFirst({
        where: { cardId: cardId }
      });

      if (!card) {
        return errorResponse(res, 'Card not found', 404);
      }

      // 权限检查：除了超级管理员，所有人只能操作自己的卡片
      if (req.user?.role !== 'SUPER_ADMIN' && card.createdBy !== userId) {
        return errorResponse(res, 'Access denied', 403);
      }

      // 获取用户信息并检查余额
      const user = await prisma.user.findUnique({
        where: { id: userId }
      });

      if (!user) {
        return errorResponse(res, 'User not found', 404);
      }

      // 获取真实可用余额
      const dashboardData = await DashboardService.getDashboardData(user.id);
      const availableAmount = dashboardData.availableAmount;

      if (availableAmount < amount) {
        return errorResponse(res, 'Insufficient balance', 400, {
          required: amount,
          available: availableAmount,
          balance: Number(user.balance)
        });
      }

      // 生成请求ID
      const requestId = `recharge_${Date.now()}_${userId}`;

      // 调用卡商API充值
      const rechargeResponse = await cardProviderService.rechargeCard(
        card.cardId,
        amount,
        requestId
      );

      // 更新本地数据库
      const updatedCard = await prisma.virtualCard.update({
        where: { id: card.id },
        data: {
          balance: parseFloat(rechargeResponse.cardBal),
          updatedAt: new Date()
        }
      });

      logger.info('Card recharged successfully', {
        cardId: card.cardId,
        amount,
        newBalance: rechargeResponse.cardBal,
        operatedBy: userId
      });

      // 记录充值操作
      const operator = req.user!;
      await OperationLogService.logCardOperation(
        OperationType.RECHARGE,
        card.cardId,
        card.cardNo,
        amount,
        userId,
        operator.name || operator.username,
        `充值 - ${card.cardholderName || card.cardholderUsername}`,
        card.currency
      );


      return successResponse(res, {
        cardId: card.cardId,
        amount: rechargeResponse.amount,
        newBalance: rechargeResponse.cardBal,
        currency: rechargeResponse.curId
      }, 'Card recharged successfully');

    } catch (error) {
      logger.error('Failed to recharge card', {
        error: error instanceof Error ? error.message : 'Unknown error',
        cardId: req.params.id,
        amount: req.body.amount,
        userId: req.user?.id
      });
      return errorResponse(res, 'Failed to recharge card', 500);
    }
  }

  /**
   * 卡片提现
   */
  async withdrawCard(req: AuthRequest, res: Response): Promise<any> {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return errorResponse(res, 'Validation failed', 400, errors.array());
      }

      const { cardId } = req.params;
      const { amount } = req.body;
      const userId = req.user?.id;

      if (!userId) {
        return errorResponse(res, 'User not authenticated', 401);
      }

      // 查找卡片并检查权限
      const card = await prisma.virtualCard.findFirst({
        where: { cardId: cardId }
      });

      if (!card) {
        return errorResponse(res, 'Card not found', 404);
      }

      // 权限检查：除了超级管理员，所有人只能操作自己的卡片
      if (req.user?.role !== 'SUPER_ADMIN' && card.createdBy !== userId) {
        return errorResponse(res, 'Access denied', 403);
      }

      // 检查余额是否足够
      if (card.balance < amount) {
        return errorResponse(res, 'Insufficient balance', 400);
      }

      // 生成请求ID
      const requestId = `withdraw_${Date.now()}_${userId}`;

      // 调用卡商API提现
      const withdrawResponse = await cardProviderService.withdrawCard(
        card.cardId,
        amount,
        requestId
      );

      // 更新本地数据库
      await prisma.virtualCard.update({
        where: { id: card.id },
        data: {
          balance: parseFloat(withdrawResponse.cardBal),
          updatedAt: new Date()
        }
      });

      logger.info('Card withdrawal successful', {
        cardId: card.cardId,
        amount,
        newBalance: withdrawResponse.cardBal,
        operatedBy: userId
      });

      // 记录提现操作
      const operator = req.user!;
      await OperationLogService.logCardOperation(
        OperationType.WITHDRAW,
        card.cardId,
        card.cardNo,
        amount,
        userId,
        operator.name || operator.username,
        `提现 - ${card.cardholderName || card.cardholderUsername}`,
        card.currency
      );


      return successResponse(res, {
        cardId: card.cardId,
        amount: withdrawResponse.amount,
        newBalance: withdrawResponse.cardBal,
        currency: withdrawResponse.curId
      }, 'Card withdrawal successful');

    } catch (error) {
      logger.error('Failed to withdraw from card', {
        error: error instanceof Error ? error.message : 'Unknown error',
        cardId: req.params.id,
        amount: req.body.amount,
        userId: req.user?.id
      });
      return errorResponse(res, 'Failed to withdraw from card', 500);
    }
  }

  /**
   * 获取交易记录
   */
  async getTransactions(req: AuthRequest, res: Response): Promise<any> {
    try {
      const { id } = req.params;
      const { type = 'auth', page = 1 } = req.query;
      const userId = req.user?.id;

      if (!userId) {
        return errorResponse(res, 'User not authenticated', 401);
      }

      // 查找卡片并检查权限
      const card = await prisma.virtualCard.findUnique({
        where: { id: Number(id) }
      });

      if (!card) {
        return errorResponse(res, 'Card not found', 404);
      }

      // 权限检查：除了超级管理员，所有人只能操作自己的卡片
      if (req.user?.role !== 'SUPER_ADMIN' && card.createdBy !== userId) {
        return errorResponse(res, 'Access denied', 403);
      }

      // 从卡商API获取交易记录
      let transactions;
      if (type === 'auth') {
        transactions = await cardProviderService.getAuthRecords(card.cardId, Number(page));
      } else {
        transactions = await cardProviderService.getSettleRecords(card.cardId, Number(page));
      }

      return successResponse(res, transactions, 'Transactions retrieved successfully');

    } catch (error) {
      logger.error('Failed to get transactions', {
        error: error instanceof Error ? error.message : 'Unknown error',
        cardId: req.params.id,
        type: req.query.type,
        userId: req.user?.id
      });
      return errorResponse(res, 'Failed to get transactions', 500);
    }
  }

  /**
   * 检查用户是否为下属用户
   */
  private async isSubordinateUser(adminId: number, userId: number): Promise<boolean> {
    const user = await prisma.user.findUnique({
      where: { id: userId }
    });
    return user?.parentId === adminId;
  }

  /**
   * 映射卡商状态到本地状态
   */
  private mapCardStatus(providerStatus: string): string {
    const statusMap: Record<string, string> = {
      '0': 'released',  // 已注销
      '1': 'active',    // 已激活
      '2': 'frozen',    // 已冻结
      '3': 'expired',   // 已过期
      '4': 'locked',    // 已锁定
      '9': 'pending'    // 待激活
    };
    return statusMap[providerStatus] || 'unknown';
  }

  /**
   * 冻结/激活卡片
   */
  async toggleCardStatus(req: AuthRequest, res: Response): Promise<any> {
    try {
      const { cardId } = req.params;
      const userId = req.user?.id;
      const userRole = req.user?.role;

      if (!userId) {
        return errorResponse(res, 'User not authenticated', 401);
      }

      // 查找卡片并检查权限
      const card = await prisma.virtualCard.findUnique({
        where: { cardId: cardId }
      });

      if (!card) {
        return errorResponse(res, 'Card not found', 404);
      }

      // 权限检查：除了超级管理员，所有人只能操作自己的卡片
      if (userRole !== 'SUPER_ADMIN' && card.createdBy !== userId) {
        return errorResponse(res, 'Access denied', 403);
      }

      // 获取当前状态
      const currentStatus = card.status;
      const isActive = currentStatus === CardStatus.ACTIVE;

      try {
        // 根据当前状态执行相应操作
        if (isActive) {
          // 当前是激活状态，执行冻结
          await cardProviderService.freezeCard(card.cardId);
          await prisma.$transaction(async (tx) => {
            // 更新虚拟卡状态
            await tx.virtualCard.update({
              where: { cardId: cardId },
              data: { status: CardStatus.FROZEN }
            });
            
            // 同步更新相关交易记录状态
            await tx.cardTransaction.updateMany({
              where: { cardId: cardId },
              data: { status: CardStatus.FROZEN }
            });
          });
          
          logger.info('Card frozen successfully', {
            cardId: card.cardId,
            operatedBy: userId
          });

          // 记录冻结操作
          const operator = req.user!;
          await OperationLogService.logCardOperation(
            OperationType.FREEZE,
            card.cardId,
            card.cardNo,
            0, // 冻结操作金额为0
            userId,
            operator.name || operator.username,
            `冻结 - ${card.cardholderName || card.cardholderUsername}`,
            card.currency
          );

          return successResponse(res, {
            cardId: card.cardId,
            status: 'FROZEN',
            message: 'Card frozen successfully'
          });

        } else {
          // 当前是冻结状态，执行激活
          await cardProviderService.activateCard(card.cardId);
          await prisma.$transaction(async (tx) => {
            // 更新虚拟卡状态
            await tx.virtualCard.update({
              where: { cardId: cardId },
              data: { status: CardStatus.ACTIVE }
            });
            
            // 同步更新相关交易记录状态
            await tx.cardTransaction.updateMany({
              where: { cardId: cardId },
              data: { status: CardStatus.ACTIVE }
            });
          });

          logger.info('Card activated successfully', {
            cardId: card.cardId,
            operatedBy: userId
          });

          // 记录解冻操作
          const operator = req.user!;
          await OperationLogService.logCardOperation(
            OperationType.UNFREEZE,
            card.cardId,
            card.cardNo,
            0, // 解冻操作金额为0
            userId,
            operator.name || operator.username,
            `解冻 - ${card.cardholderName || card.cardholderUsername}`,
            card.currency
          );

          return successResponse(res, {
            cardId: card.cardId,
            status: 'ACTIVE',
            message: 'Card activated successfully'
          });
        }

      } catch (error) {
        logger.error('Failed to toggle card status', {
          error: error instanceof Error ? error.message : 'Unknown error',
          cardId: card.cardId,
          currentStatus,
          operatedBy: userId
        });
        throw error;
      }

    } catch (error) {
      logger.error('Card status toggle failed', {
        error: error instanceof Error ? error.message : 'Unknown error',
        userId: req.user?.id,
        cardId: req.params.cardId
      });
      return errorResponse(res, 'Failed to toggle card status');
    }
  }

  /**
   * 更新卡片备注
   */
  async updateCardRemark(req: AuthRequest, res: Response): Promise<any> {
    try {
      const { cardId } = req.params;
      const { remark } = req.body;
      const userId = req.user?.id;

      if (!userId) {
        return errorResponse(res, 'User not authenticated', 401);
      }

      if (!cardId) {
        return errorResponse(res, 'Card ID is required', 400);
      }

      // 验证备注长度
      if (remark && remark.length > 32) {
        return errorResponse(res, 'Remark must not exceed 32 characters', 400);
      }

      // 查找卡片
      const card = await prisma.virtualCard.findUnique({
        where: { cardId },
        include: { user: true }
      });

      if (!card) {
        return errorResponse(res, 'Card not found', 404);
      }

      // 权限检查：除了超级管理员，所有人只能操作自己的卡片
      if (req.user?.role !== 'SUPER_ADMIN' && card.createdBy !== userId) {
        return errorResponse(res, 'Access denied', 403);
      }

      // 更新备注
      const updatedCard = await prisma.virtualCard.update({
        where: { cardId },
        data: { remark: remark || null },
        include: {
          user: {
            select: {
              id: true,
              username: true,
              name: true
            }
          }
        }
      });

      logger.info('Card remark updated', {
        cardId,
        remark,
        userId,
        cardholderUsername: card.cardholderUsername
      });

      return successResponse(res, {
        cardId: updatedCard.cardId,
        remark: updatedCard.remark
      }, 'Card remark updated successfully');

    } catch (error) {
      logger.error('Failed to update card remark', {
        error: error instanceof Error ? error.message : 'Unknown error',
        cardId: req.params.cardId,
        userId: req.user?.id
      });
      return errorResponse(res, 'Failed to update card remark', 500);
    }
  }

  /**
   * 删除卡片（释放卡片）
   */
  async deleteCard(req: AuthRequest, res: Response): Promise<any> {
    try {
      const { cardId } = req.params;
      const userId = req.user?.id;
      const userRole = req.user?.role;

      if (!userId) {
        return errorResponse(res, 'User not authenticated', 401);
      }

      // 查找卡片并检查权限
      const card = await prisma.virtualCard.findUnique({
        where: { cardId: cardId }
      });

      if (!card) {
        return errorResponse(res, 'Card not found', 404);
      }

      // 权限检查：除了超级管理员，所有人只能删除自己的卡片
      if (userRole !== 'SUPER_ADMIN' && card.createdBy !== userId) {
        return errorResponse(res, 'Access denied', 403);
      }

      // 允许删除有余额的卡片

      try {
        // 生成请求ID
        const requestId = `release_${Date.now()}_${userId}`;

        // 调用卡商API释放卡片
        const releaseResponse = await cardProviderService.releaseCard(card.cardId, requestId);

        // 更新数据库状态为已释放
        await prisma.$transaction(async (tx) => {
          // 更新虚拟卡状态
          await tx.virtualCard.update({
            where: { cardId: cardId },
            data: { status: CardStatus.RELEASED }
          });
          
          // 同步更新相关交易记录状态
          await tx.cardTransaction.updateMany({
            where: { cardId: cardId },
            data: { status: CardStatus.RELEASED }
          });
        });

        logger.info('Card deleted successfully', {
          cardId: card.cardId,
          releasedBalance: releaseResponse.releaseBal,
          operatedBy: userId
        });

        // 记录删卡操作
        const operator = req.user!;
        const releasedBalance = parseFloat(releaseResponse.releaseBal || '0');
        await OperationLogService.logCardOperation(
          OperationType.DELETE_CARD,
          card.cardId,
          card.cardNo,
          releasedBalance, // 删卡记录剩余余额（负数）
          userId,
          operator.name || operator.username,
          `删卡 - ${card.cardholderName || card.cardholderUsername}，释放余额：${releasedBalance}`,
          card.currency
        );

        return successResponse(res, {
          cardId: card.cardId,
          releasedBalance: releaseResponse.releaseBal,
          message: 'Card deleted successfully'
        });

      } catch (error) {
        logger.error('Failed to delete card', {
          error: error instanceof Error ? error.message : 'Unknown error',
          cardId: card.cardId,
          operatedBy: userId
        });
        throw error;
      }

    } catch (error) {
      logger.error('Card deletion failed', {
        error: error instanceof Error ? error.message : 'Unknown error',
        userId: req.user?.id,
        cardId: req.params.cardId
      });
      return errorResponse(res, 'Failed to delete card');
    }
  }
}

export default new CardController();
