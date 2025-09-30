/**
 * 交易处理业务逻辑服务
 */

import { PrismaClient, CardTxnType } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';
import { 
  AuthCallbackRequest, 
  SettleCallbackRequest,
  SettlementCallbackRequest,
  TransactionQueryParams,
  TransactionResponse,
  PaginatedTransactionResponse,
  ErrorCodes 
} from '../types/transaction';
import logger from '../config/logger';
import cardProviderService from './cardProviderService';

const prisma = new PrismaClient();

export class TransactionService {
  private prisma: PrismaClient;
  private cardProviderService: typeof cardProviderService;

  constructor() {
    this.prisma = prisma;
    this.cardProviderService = cardProviderService;
  }
  
  /**
   * 处理授权账单回调
   */
  async processAuthCallback(data: AuthCallbackRequest): Promise<{ success: boolean; transactionId?: number; error?: string }> {
    try {
      console.log('🔍 Processing auth callback with data:', JSON.stringify(data, null, 2));
      
      // 1. 验证卡片是否存在 - 使用select优化查询，只获取必要字段
      const card = await prisma.virtualCard.findUnique({
        where: { cardId: data.cardId },
        include: { 
          user: {
            select: {
              id: true,
              username: true,
              status: true
            }
          }
        }
      });
      
      console.log('🃏 Found card:', card ? { id: card.id, cardId: card.cardId, status: card.status, userId: card.userId } : 'null');

      if (!card) {
        return { success: false, error: ErrorCodes.CARD_NOT_FOUND };
      }

      // 只要卡片存在就接受回调，不限制卡片状态
      // 因为已注销的卡片可能仍有延迟的结算账单
      console.log(`💡 Processing auth callback for card status: ${card.status}`);

      if (card.user.status !== 'ACTIVE') {
        return { success: false, error: ErrorCodes.USER_INACTIVE };
      }

      // 2. 检查交易ID是否已存在
      const existingTxn = await prisma.cardTransaction.findUnique({
        where: { txnId: data.txnId }
      });

      if (existingTxn) {
        return { success: false, error: ErrorCodes.DUPLICATE_TRANSACTION };
      }

      // 3. 验证交易类型 - 授权回调只处理授权相关交易
      if (!['A', 'D'].includes(data.txnType)) {
        return { success: false, error: `授权回调不支持交易类型: ${data.txnType}` };
      }

      // 4. 将字符串txnType转换为枚举值
      let txnTypeEnum: CardTxnType;
      switch (data.txnType) {
        case 'A':
          txnTypeEnum = CardTxnType.AUTH;
          break;
        case 'D':
          txnTypeEnum = CardTxnType.AUTH_CANCEL;
          break;
        default:
          return { success: false, error: `Invalid transaction type: ${data.txnType}` };
      }

      // 5. 授权回调是卡商发来的真实交易结果，无条件接受并记录
      // 不应该在回调中验证余额，因为这是已经发生的交易事实

      // 5. 创建交易记录
      const transaction = await prisma.cardTransaction.create({
        data: {
          cardId: data.cardId,
          userId: card.userId,
          username: card.user.username,  // 从卡片关联的用户获取username
          txnId: data.txnId,
          originTxnId: data.originTxnId || '0',
          txnType: txnTypeEnum,  // 使用转换后的枚举值
          txnStatus: data.txnStatus,
          bizType: data.bizType,
          authTxnCcy: data.txnCcy,
          authTxnAmt: data.txnAmt ? new Decimal(data.txnAmt) : null,
          authBillCcy: data.billCcy,
          authBillAmt: data.billAmt ? new Decimal(data.billAmt) : null,
          finalCcy: data.finalCcy || data.billCcy || data.txnCcy || 'USD',
          finalAmt: new Decimal(data.finalAmt || 0),
          merchantName: data.merchName,
          merchantCountry: data.merchCtry,
          mcc: data.mcc,
          authCode: data.authCode,
          declineReason: data.declineReason,
          forcePost: data.forcePost,
          preAuth: data.preAuth,
          txnTime: data.txnTime ? new Date(data.txnTime) : new Date(),
          rawCallbackData: data.rawData || {},
          isSettled: false
        }
      });

      // 6. 对于成功的消费授权，冻结卡片余额
      // 卡商API: "1" = 成功, "0" = 失败
      const finalAmount = data.finalAmt || parseFloat(data.billAmt || data.txnAmt || '0');
      if (data.txnType === 'A' && data.txnStatus === '1' && finalAmount > 0) {
        await prisma.virtualCard.update({
          where: { id: card.id },
          data: {
            balance: card.balance.sub(new Decimal(finalAmount))
          }
        });

        // 记录余额变动日志
        await prisma.userBalanceLog.create({
          data: {
            userId: card.userId,
            type: 'CARD_CHARGE',
            amount: new Decimal(finalAmount),
            balanceBefore: card.balance,
            balanceAfter: card.balance.sub(new Decimal(finalAmount)),
            currency: data.finalCcy || data.billCcy || data.txnCcy || 'USD',
            relatedCardId: card.id,
            description: `授权交易冻结: ${data.merchName || '未知商户'}`,
            remark: `交易ID: ${data.txnId}`,
            operatedBy: card.userId
          }
        });
      }

      // 7. 对于D类型（授权撤销）交易且状态为成功，自动触发提现
      if (txnTypeEnum === CardTxnType.AUTH_CANCEL && data.txnStatus === '1') {
        try {
          logger.info('🏦 检测到授权撤销交易，开始自动提现', { 
            txnId: data.txnId, 
            cardId: data.cardId, 
            finalAmt: data.finalAmt,
            finalCcy: data.finalCcy
          });

          // 异步触发提现，不影响主流程
          this.processAutoWithdrawal(
            data.txnId,
            data.cardId,
            parseFloat(String(data.finalAmt || '0')),
            data.finalCcy || data.billCcy || data.txnCcy || 'USD'
          ).catch(error => {
            logger.error('⚠️ 自动提现处理失败', { 
              txnId: data.txnId, 
              cardId: data.cardId, 
              error 
            });
          });
        } catch (error) {
          logger.error('🚨 提现触发异常', { txnId: data.txnId, cardId: data.cardId, error });
        }
      }

      return { success: true, transactionId: transaction.id };

    } catch (error) {
      console.error('处理授权回调失败:', error);
      return { success: false, error: ErrorCodes.INTERNAL_ERROR };
    }
  }

  /**
   * 处理结算账单回调
   */
  async processSettleCallback(data: SettleCallbackRequest): Promise<{ success: boolean; error?: string }> {
    try {
      // 1. 查找对应的授权交易
      const authTransaction = await prisma.cardTransaction.findUnique({
        where: { txnId: data.authTxnId },
        include: { user: true }
      });

      if (!authTransaction) {
        return { success: false, error: ErrorCodes.TRANSACTION_NOT_FOUND };
      }

      // 2. 检查是否已经结算过
      if (authTransaction.isSettled) {
        return { success: false, error: 'ALREADY_SETTLED' };
      }

      // 3. 更新授权交易的结算信息
      await prisma.cardTransaction.update({
        where: { id: authTransaction.id },
        data: {
          settleBillCcy: data.settleBillCcy,
          settleBillAmt: data.settleBillAmt ? new Decimal(data.settleBillAmt) : null,
          finalAmt: new Decimal(data.finalAmt), // 更新最终金额（可能与授权金额不同）
          clearingDate: new Date(),
          isSettled: true,
          settleTxnId: data.settleTxnId,
          rawCallbackData: {
            ...(authTransaction.rawCallbackData as object || {}),
            settleData: data.rawData || {}
          }
        }
      });

      // 4. 处理金额差异（如果结算金额与授权金额不同）
      const authAmount = authTransaction.finalAmt;
      const settleAmount = new Decimal(data.finalAmt);
      const amountDiff = settleAmount.sub(authAmount);

      if (!amountDiff.isZero()) {
        // 查找卡片信息
        const card = await prisma.virtualCard.findUnique({
          where: { cardId: authTransaction.cardId }
        });

        if (card) {
          if (amountDiff.gt(0)) {
            // 结算金额大于授权金额，需要额外扣费
            await prisma.virtualCard.update({
              where: { id: card.id },
              data: {
                balance: card.balance.sub(amountDiff)
              }
            });

            await prisma.userBalanceLog.create({
              data: {
                userId: authTransaction.userId,
                type: 'CARD_CHARGE',
                amount: amountDiff,
                balanceBefore: card.balance,
                balanceAfter: card.balance.sub(amountDiff),
                currency: data.finalCcy,
                relatedCardId: card.id,
                description: `结算金额调整 - 额外扣费`,
                remark: `授权交易ID: ${data.authTxnId}, 结算交易ID: ${data.settleTxnId}`,
                operatedBy: authTransaction.userId
              }
            });
          } else {
            // 结算金额小于授权金额，退还差额
            await prisma.virtualCard.update({
              where: { id: card.id },
              data: {
                balance: card.balance.add(amountDiff.abs())
              }
            });

            await prisma.userBalanceLog.create({
              data: {
                userId: authTransaction.userId,
                type: 'REFUND',
                amount: amountDiff.abs(),
                balanceBefore: card.balance,
                balanceAfter: card.balance.add(amountDiff.abs()),
                currency: data.finalCcy,
                relatedCardId: card.id,
                description: `结算金额调整 - 退还差额`,
                remark: `授权交易ID: ${data.authTxnId}, 结算交易ID: ${data.settleTxnId}`,
                operatedBy: authTransaction.userId
              }
            });
          }
        }
      }

      return { success: true };

    } catch (error) {
      console.error('处理结算回调失败:', error);
      return { success: false, error: ErrorCodes.INTERNAL_ERROR };
    }
  }

  /**
   * 处理结算交易回调 (消费C/退款R)
   */
  async processSettlementCallback(data: SettlementCallbackRequest): Promise<{ success: boolean; transactionId?: number; error?: string }> {
    console.log('🚨 FUNCTION START - processSettlementCallback called with:', data);
    try {
      console.log('🚨🚨🚨 SETTLEMENT CALLBACK FUNCTION CALLED 🚨🚨🚨');
      console.log('🔍 Processing settlement callback with data:', JSON.stringify(data, null, 2));
      
      // 1. 验证卡片是否存在
      const card = await prisma.virtualCard.findUnique({
        where: { cardId: data.cardId },
        include: { user: true }
      });
      
      console.log('🃏 Found card:', card ? { id: card.id, cardId: card.cardId, status: card.status, userId: card.userId } : 'null');

      if (!card) {
        return { success: false, error: ErrorCodes.CARD_NOT_FOUND };
      }

      // 只要卡片存在就接受回调，不限制卡片状态
      // 因为已注销的卡片可能仍有延迟的结算账单
      console.log(`💡 Processing settlement callback for card status: ${card.status}`);

      if (card.user.status !== 'ACTIVE') {
        return { success: false, error: ErrorCodes.USER_INACTIVE };
      }

      // 2. 验证交易类型 - 结算回调只处理结算相关交易
      if (!['C', 'R'].includes(data.txnType)) {
        return { success: false, error: `结算回调不支持交易类型: ${data.txnType}` };
      }

      // 3. 检查交易ID是否已存在
      const existingTxn = await prisma.cardTransaction.findUnique({
        where: { txnId: data.txnId }
      });

      if (existingTxn) {
        return { success: false, error: ErrorCodes.DUPLICATE_TRANSACTION };
      }

      // 4. 将字符串txnType转换为枚举值
      let txnTypeEnum: CardTxnType;
      switch (data.txnType) {
        case 'C':
          txnTypeEnum = CardTxnType.SETTLEMENT;
          break;
        case 'R':
          txnTypeEnum = CardTxnType.REFUND;
          break;
        default:
          return { success: false, error: `Invalid transaction type: ${data.txnType}` };
      }

      // 5. 如果有 authTxnId，尝试合并到现有授权交易
      if (data.authTxnId) {
        console.log(`🔗 Found authTxnId: ${data.authTxnId}, attempting to merge with existing auth transaction`);
        
        const authTransaction = await prisma.cardTransaction.findUnique({
          where: { txnId: data.authTxnId }
        });

        if (authTransaction) {
          console.log(`✅ Found existing auth transaction (ID: ${authTransaction.id}), updating with settlement data`);
          console.log(`🔢 Current finalAmt: ${authTransaction.finalAmt}, data.billAmt: ${data.billAmt}, data.finalAmt: ${data.finalAmt}`);
          
          const newFinalAmt = new Decimal(data.billAmt || data.finalAmt || authTransaction.finalAmt);
          console.log(`💰 New finalAmt will be: ${newFinalAmt}`);
          
          // 更新现有授权交易，添加结算信息
          const updatedTransaction = await prisma.cardTransaction.update({
            where: { id: authTransaction.id },
            data: {
              // 保持原有的授权信息，添加结算信息
              settleTxnId: data.txnId,
              // 重要：更新最终金额为结算后的金额
              finalCcy: data.billCcy || data.finalCcy || authTransaction.finalCcy,
              finalAmt: newFinalAmt,
              isSettled: true,
              // 保持原有的授权状态，不要用结算状态覆盖
              // txnStatus: data.txnStatus, // 移除这行，保持原有授权状态
              
              // 添加结算账单信息
              settleBillCcy: data.billCcy || data.finalCcy,
              settleBillAmt: new Decimal(data.billAmt || data.finalAmt || 0),
              
              // 如果有新的商户信息，可以更新
              merchantName: data.merchantName || authTransaction.merchantName,
              merchantCountry: data.merchantCountry || authTransaction.merchantCountry,
              mcc: data.mcc || authTransaction.mcc,
              authCode: data.authCode || authTransaction.authCode,
              // 合并原始回调数据
              rawCallbackData: {
                ...(typeof authTransaction.rawCallbackData === 'object' && authTransaction.rawCallbackData !== null ? authTransaction.rawCallbackData as Record<string, any> : {}),
                settlementCallback: data.rawData || {}
              }
            }
          });

          console.log(`🎉 Successfully merged settlement transaction ${data.txnId} with auth transaction ${data.authTxnId}`);

          // 处理卡片余额变更（基于结算账单金额）
          // 卡商API: "1" = 成功, "0" = 失败
          if (data.txnStatus === '1') {
            // 使用结算账单金额而不是最终金额，因为结算金额是实际扣费金额
            const settlementAmount = data.billAmt || data.finalAmt;
            if (txnTypeEnum === CardTxnType.SETTLEMENT && settlementAmount > 0) {
              // 消费结算 - 扣除余额
              const balanceBefore = card.balance;
              const balanceAfter = card.balance.sub(new Decimal(settlementAmount));
              
              await prisma.virtualCard.update({
                where: { id: card.id },
                data: { balance: balanceAfter }
              });

              console.log(`💰 Updated card balance: ${balanceBefore} → ${balanceAfter}`);
            } else if (txnTypeEnum === CardTxnType.REFUND && settlementAmount > 0) {
              // 退款结算 - 增加余额
              const balanceBefore = card.balance;
              const balanceAfter = card.balance.add(new Decimal(settlementAmount));
              
              await prisma.virtualCard.update({
                where: { id: card.id },
                data: { balance: balanceAfter }
              });

              console.log(`💰 Updated card balance: ${balanceBefore} → ${balanceAfter}`);
            }
          }

          return { success: true, transactionId: updatedTransaction.id };
        } else {
          console.log(`⚠️ Auth transaction with txnId ${data.authTxnId} not found, creating independent settlement transaction`);
        }
      }

      // 6. 创建独立的结算交易记录（如果没有 authTxnId 或找不到对应的授权交易）
      const transaction = await prisma.cardTransaction.create({
        data: {
          txnId: data.txnId,
          cardId: card.cardId,
          userId: card.userId,
          username: card.user.username,
          txnType: txnTypeEnum,
          txnStatus: data.txnStatus,
          authTxnCcy: data.txnCcy || data.finalCcy,
          authTxnAmt: new Decimal(typeof data.txnAmt === 'string' ? parseFloat(data.txnAmt) : (data.txnAmt || data.finalAmt)),
          authBillCcy: data.billCcy || data.finalCcy,
          authBillAmt: new Decimal(typeof data.billAmt === 'string' ? parseFloat(data.billAmt) : (data.billAmt || data.finalAmt)),
          finalCcy: data.finalCcy,
          finalAmt: new Decimal(data.finalAmt),
          merchantName: data.merchantName,
          merchantCountry: data.merchantCountry,
          mcc: data.mcc,
          authCode: data.authCode,
          declineReason: data.declineReason,
          txnTime: data.txnTime ? new Date(data.txnTime) : new Date(),
          rawCallbackData: data.rawData || {},
          isSettled: true, // 结算交易默认已结算
          settleTxnId: data.txnId // 结算交易的结算ID就是自己
        }
      });

      // 6. 处理卡片余额变更 - 结算交易直接影响余额
      // 卡商API: "1" = 成功, "0" = 失败
      if (data.txnStatus === '1') {
        // 使用结算账单金额而不是最终金额，因为结算金额是实际扣费金额
        const settlementAmount = data.billAmt || data.finalAmt;
        if (txnTypeEnum === CardTxnType.SETTLEMENT && settlementAmount > 0) {
          // 消费结算 - 扣除余额
          const balanceBefore = card.balance;
          const balanceAfter = card.balance.sub(new Decimal(settlementAmount));
          
          await prisma.virtualCard.update({
            where: { id: card.id },
            data: {
              balance: balanceAfter
            }
          });

          // 记录余额变动
          await prisma.userBalanceLog.create({
            data: {
              userId: card.userId,
              type: 'CARD_CHARGE',
              amount: new Decimal(settlementAmount),
              balanceBefore: balanceBefore,
              balanceAfter: balanceAfter,
              currency: data.finalCcy,
              relatedCardId: card.id,
              description: `结算扣费: ${data.merchantName || '未知商户'}`,
              remark: `交易ID: ${data.txnId}`,
              operatedBy: card.userId
            }
          });
        } else if (txnTypeEnum === CardTxnType.REFUND && settlementAmount > 0) {
          // 退款 - 增加余额
          const balanceBefore = card.balance;
          const balanceAfter = card.balance.add(new Decimal(settlementAmount));
          
          await prisma.virtualCard.update({
            where: { id: card.id },
            data: {
              balance: balanceAfter
            }
          });

          // 记录余额变动
          await prisma.userBalanceLog.create({
            data: {
              userId: card.userId,
              type: 'REFUND',
              amount: new Decimal(data.finalAmt),
              balanceBefore: balanceBefore,
              balanceAfter: balanceAfter,
              currency: data.finalCcy,
              relatedCardId: card.id,
              description: `退款: ${data.merchantName || '未知商户'}`,
              remark: `交易ID: ${data.txnId}`,
              operatedBy: card.userId
            }
          });
        }
      }

      return { success: true, transactionId: transaction.id };

    } catch (error) {
      logger.error('处理结算回调失败:', {
        error: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined,
        data: data
      });
      return { success: false, error: ErrorCodes.INTERNAL_ERROR };
    }
  }

  /**
   * 查询交易记录
   */
  async getTransactions(params: TransactionQueryParams): Promise<PaginatedTransactionResponse> {
    try {
      const {
        cardId,
        username,
        txnType,
        txnStatus,
        startDate,
        endDate,
        page = 1,
        limit = 20,
        sortBy = 'txnTime',
        sortOrder = 'desc'
      } = params;
      

    const where: any = {};

    if (cardId) where.cardId = cardId;
    if (username) where.username = username;
    if (txnType) {
      // 支持逗号分隔的多个交易类型
      if (typeof txnType === 'string' && txnType.includes(',')) {
        const types = txnType.split(',').map(t => {
          const trimmed = t.trim();
          // 映射简短代码到完整枚举名
          const typeMap: Record<string, string> = {
            'A': 'AUTH',
            'D': 'AUTH_CANCEL', 
            'F': 'CANCEL',  // F类型表示撤销
            'S': 'SETTLEMENT',
            'R': 'REFUND'
          };
          return typeMap[trimmed] || trimmed;
        }).filter(t => 
          ['AUTH', 'AUTH_CANCEL', 'CANCEL', 'SETTLEMENT', 'REFUND'].includes(t)
        );
        where.txnType = { in: types };
      } else {
        // 单个类型处理
        const typeMap: Record<string, string> = {
          'A': 'AUTH',
          'D': 'AUTH_CANCEL', 
          'F': 'CANCEL',  // F类型表示撤销
          'S': 'SETTLEMENT', 
          'R': 'REFUND'
        };
        where.txnType = typeMap[txnType] || txnType;
      }
    }
    if (txnStatus) where.txnStatus = txnStatus;

    if (startDate || endDate) {
      where.txnTime = {};
      if (startDate) {
        // 使用UTC时间，设置为当天的开始时间
        where.txnTime.gte = new Date(startDate + 'T00:00:00.000Z');
      }
      if (endDate) {
        // 使用UTC时间，设置为当天的结束时间
        where.txnTime.lte = new Date(endDate + 'T23:59:59.999Z');
      }
    }

    const orderBy = { [sortBy]: sortOrder };

    const [transactions, total] = await Promise.all([
      prisma.cardTransaction.findMany({
        where,
        orderBy,
        skip: (page - 1) * limit,
        take: limit,
        include: {
          virtualCard: {
            select: {
              cardId: true,
              status: true,
              user: {
                select: {
                  id: true,
                  username: true,
                  status: true
                }
              }
            }
          }
        }
      }),
      prisma.cardTransaction.count({ where })
    ]);

    const data: TransactionResponse[] = transactions.map(txn => ({
      id: txn.id,
      cardId: txn.cardId,
      username: txn.username,
      txnId: txn.txnId,
      authTxnId: txn.authTxnId ?? undefined,
      originTxnId: txn.originTxnId,
      txnType: txn.txnType,
      txnStatus: txn.txnStatus,
      bizType: txn.bizType ?? undefined,
      authTxnCcy: txn.authTxnCcy ?? undefined,
      authTxnAmt: txn.authTxnAmt?.toNumber(),
      authBillCcy: txn.authBillCcy ?? undefined,
      authBillAmt: txn.authBillAmt?.toNumber(),
      settleBillCcy: txn.settleBillCcy ?? undefined,
      settleBillAmt: txn.settleBillAmt?.toNumber(),
      finalCcy: txn.finalCcy,
      finalAmt: txn.finalAmt.toNumber(),
      merchantName: txn.merchantName ?? undefined,
      merchantCountry: txn.merchantCountry ?? undefined,
      mcc: txn.mcc ?? undefined,
      authCode: txn.authCode ?? undefined,
      declineReason: txn.declineReason ?? undefined,
      txnTime: txn.txnTime.toISOString(),
      clearingDate: txn.clearingDate?.toISOString(),
      isSettled: txn.isSettled,
      settleTxnId: txn.settleTxnId ?? undefined,
      relatedTxnId: (txn as any).relatedTxnId ?? undefined,
      withdrawalStatus: (txn as any).withdrawalStatus ?? undefined,
      createdAt: txn.createdAt.toISOString(),
      updatedAt: txn.updatedAt.toISOString()
    }));

    return {
      data,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    };
    } catch (error) {
      console.error('Error in getTransactions:', error);
      const errorMessage = error instanceof Error ? error.message : String(error);
      const errorStack = error instanceof Error ? error.stack : '';
      require('fs').appendFileSync('/tmp/debug.log', `Error: ${errorMessage}\n${errorStack}\n`);
      throw error;
    }
  }

  /**
   * 获取交易详情
   */
  async getTransactionById(id: number): Promise<TransactionResponse | null> {
    const transaction = await prisma.cardTransaction.findUnique({
      where: { id }
    });

    if (!transaction) {
      return null;
    }

    return {
      id: transaction.id,
      cardId: transaction.cardId,
      username: transaction.username,
      txnId: transaction.txnId,
      authTxnId: transaction.authTxnId ?? undefined,
      originTxnId: transaction.originTxnId,
      txnType: transaction.txnType,
      txnStatus: transaction.txnStatus,
      bizType: transaction.bizType ?? undefined,
      authTxnCcy: transaction.authTxnCcy ?? undefined,
      authTxnAmt: transaction.authTxnAmt?.toNumber(),
      authBillCcy: transaction.authBillCcy ?? undefined,
      authBillAmt: transaction.authBillAmt?.toNumber(),
      settleBillCcy: transaction.settleBillCcy ?? undefined,
      settleBillAmt: transaction.settleBillAmt?.toNumber(),
      finalCcy: transaction.finalCcy,
      finalAmt: transaction.finalAmt.toNumber(),
      merchantName: transaction.merchantName ?? undefined,
      merchantCountry: transaction.merchantCountry ?? undefined,
      mcc: transaction.mcc ?? undefined,
      authCode: transaction.authCode ?? undefined,
      declineReason: transaction.declineReason ?? undefined,
      txnTime: transaction.txnTime.toISOString(),
      clearingDate: transaction.clearingDate?.toISOString(),
      isSettled: transaction.isSettled,
      settleTxnId: transaction.settleTxnId ?? undefined,
      createdAt: transaction.createdAt.toISOString(),
      updatedAt: transaction.updatedAt.toISOString()
    };
  }

  /**
   * 获取交易汇总统计
   */
  async getTransactionSummary(
    type: 'AUTH' | 'SETTLE',
    startDate: string,
    endDate: string,
    username?: string
  ): Promise<{
    totalCount: number;
    totalAmount: number;
    successCount: number;
    failedCount: number;
  }> {
    try {
      const startDateTime = new Date(startDate);
      const endDateTime = new Date(endDate);
      endDateTime.setHours(23, 59, 59, 999); // 包含整个结束日期

      // 构建查询条件
      const whereCondition: any = {
        txnTime: {
          gte: startDateTime,
          lte: endDateTime,
        },
      };

      // 根据类型过滤
      if (type === 'AUTH') {
        whereCondition.txnType = {
          in: [CardTxnType.AUTH, CardTxnType.AUTH_CANCEL, CardTxnType.SETTLEMENT, CardTxnType.REFUND] // 授权相关交易类型
        };
      } else if (type === 'SETTLE') {
        whereCondition.settleTxnId = {
          not: null // 有结算ID的记录
        };
      }

      // 如果指定了用户名，通过卡片关联查询
      if (username) {
        whereCondition.virtualCard = {
          user: {
            username: username
          }
        };
      }

      // 获取统计数据
      const [totalCount, transactions] = await Promise.all([
        // 总交易数量
        prisma.cardTransaction.count({
          where: whereCondition,
        }),
        
        // 获取所有匹配的交易记录用于计算金额和状态
        prisma.cardTransaction.findMany({
          where: whereCondition,
          select: {
            finalAmt: true,
            txnStatus: true,
          }
        })
      ]);

      // 计算汇总数据
      let totalAmount = 0;
      let successCount = 0;
      let failedCount = 0;

      transactions.forEach(txn => {
        totalAmount += txn.finalAmt.toNumber();
        if (txn.txnStatus === '1') {
          successCount++;
        } else {
          failedCount++;
        }
      });

      return {
        totalCount,
        totalAmount,
        successCount,
        failedCount,
      };

    } catch (error) {
      console.error('获取交易汇总失败:', error);
      throw error;
    }
  }

  /**
   * 根据交易ID查找交易
   */
  async findByTxnId(txnId: string) {
    try {
      return await prisma.cardTransaction.findUnique({
        where: { txnId }
      });
    } catch (error) {
      logger.error('查找交易失败', { txnId, error });
      throw error;
    }
  }

  /**
   * 根据卡商返回的cardId查找虚拟卡
   */
  async findCardByCardId(cardId: string) {
    try {
      return await prisma.virtualCard.findUnique({
        where: { cardId }
      });
    } catch (error) {
      logger.error('查找卡片失败', { cardId, error });
      throw error;
    }
  }

  /**
   * 创建新交易记录
   */
  async createTransaction(data: {
    cardId: number;
    txnId: string;
    txnType: string;
    txnStatus: string;
    txnTime: string;
    txnCcy: string;
    txnAmt: number;
    billCcy: string;
    billAmt: number;
    finalCcy: string;
    finalAmt: number;
    merchantName: string;
    merchantCountry: string;
    mcc: string;
    declineReason?: string;
    authCode?: string;
    type: string;
    authTxnId?: string;
  }) {
    try {
      // 转换交易类型
      let txnTypeEnum: CardTxnType;
      if (data.type === 'AUTH') {
        txnTypeEnum = data.txnType === 'A' ? CardTxnType.AUTH : CardTxnType.AUTH_CANCEL;
      } else {
        txnTypeEnum = data.txnType === 'C' ? CardTxnType.SETTLEMENT : CardTxnType.REFUND;
      }

      // 获取卡片信息以获取用户信息
      const card = await prisma.virtualCard.findUnique({
        where: { id: data.cardId },
        include: { user: true }
      });

      if (!card) {
        throw new Error(`Card not found: ${data.cardId}`);
      }

      const transaction = await prisma.cardTransaction.create({
        data: {
          cardId: card.cardId, // 使用卡商的cardId
          userId: card.userId,
          username: card.user.username,
          txnId: data.txnId,
          txnType: txnTypeEnum,
          txnStatus: data.txnStatus,
          txnTime: new Date(data.txnTime),
          authTxnAmt: new Decimal(data.txnAmt),
          authTxnCcy: data.txnCcy,
          authBillAmt: new Decimal(data.billAmt),
          authBillCcy: data.billCcy,
          finalCcy: data.finalCcy,
          finalAmt: new Decimal(data.finalAmt),
          merchantName: data.merchantName,
          merchantCountry: data.merchantCountry,
          mcc: data.mcc,
          declineReason: data.declineReason,
          authCode: data.authCode,
          authTxnId: data.authTxnId,
          rawCallbackData: data as any
        }
      });

      // 7. 对于D类型（授权撤销）交易且状态为成功，自动触发提现
      if (txnTypeEnum === CardTxnType.AUTH_CANCEL && data.txnStatus === '1') {
        try {
          logger.info('🏦 检测到授权撤销交易（手动同步），开始自动提现', { 
            txnId: data.txnId, 
            cardId: data.cardId, 
            finalAmt: data.finalAmt,
            finalCcy: data.finalCcy
          });

          // 异步触发提现，不影响主流程
          this.processAutoWithdrawal(
            data.txnId,
            card.cardId,
            parseFloat(String(data.finalAmt || '0')),
            data.finalCcy || data.billCcy || data.txnCcy || 'USD'
          ).catch(error => {
            logger.error('⚠️ 自动提现处理失败（手动同步）', { 
              txnId: data.txnId, 
              cardId: data.cardId, 
              error 
            });
          });
        } catch (error) {
          logger.error('💥 自动提现触发失败（手动同步）', { 
            txnId: data.txnId, 
            cardId: data.cardId, 
            error 
          });
        }
      }

      return transaction;
    } catch (error) {
      logger.error('创建交易失败', { data, error });
      throw error;
    }
  }

  /**
   * 合并结算信息到现有授权交易
   */
  async mergeSettlement(transactionId: number, data: {
    settleTxnId: string;
    settleTxnType: string;
    billAmt: number;
    billCcy: string;
    finalAmt: number;
    finalCcy: string;
    txnAmt: number;
    txnCcy: string;
    clearingDate?: string;
    authCode?: string;
  }) {
    try {
      return await prisma.cardTransaction.update({
        where: { id: transactionId },
        data: {
          settleTxnId: data.settleTxnId,
          settleBillAmt: new Decimal(data.billAmt),
          settleBillCcy: data.billCcy,
          finalAmt: new Decimal(data.finalAmt),
          finalCcy: data.finalCcy,
          authTxnAmt: new Decimal(data.txnAmt),
          authTxnCcy: data.txnCcy,
          clearingDate: data.clearingDate ? new Date(data.clearingDate) : null,
          authCode: data.authCode || undefined,
          isSettled: true
        }
      });
    } catch (error) {
      logger.error('合并结算信息失败', { transactionId, data, error });
      throw error;
    }
  }

  /**
   * 处理自动提现逻辑
   * 当D类型交易写入数据库时自动调用
   */
  async processAutoWithdrawal(txnId: string, cardId: string, amount: number, currency: string): Promise<{ success: boolean; withdrawalId?: string; error?: string }> {
    try {
      logger.info('🏦 开始自动提现处理', { txnId, cardId, amount, currency });

      // 1. 验证卡片存在性
      const card = await prisma.virtualCard.findUnique({
        where: { cardId },
        include: { user: true }
      });

      if (!card) {
        return { success: false, error: 'CARD_NOT_FOUND' };
      }

      // 2. 检查是否已经处理过提现（防重复处理）
      const existingTransaction = await prisma.cardTransaction.findUnique({
        where: { txnId }
      });

      if (existingTransaction && existingTransaction.withdrawalStatus === 'SUCCESS') {
        logger.warn('⚠️ 此交易已经成功提现，跳过重复处理', { txnId, cardId });
        return { success: true, withdrawalId: 'ALREADY_PROCESSED' };
      }

      if (existingTransaction && existingTransaction.withdrawalStatus === 'PROCESSING') {
        logger.warn('⚠️ 此交易正在提现处理中，跳过重复处理', { txnId, cardId });
        return { success: false, error: 'ALREADY_PROCESSING' };
      }

      // 3. 先标记为处理中，防止并发重复提现
      if (existingTransaction) {
        await prisma.cardTransaction.update({
          where: { txnId },
          data: { withdrawalStatus: 'PROCESSING' } as any
        });
      }

      // 4. 调用第三方提现API
      const withdrawalResult = await this.callWithdrawalAPI(cardId, Math.abs(amount), currency);
      
      if (!withdrawalResult.success) {
        logger.error('❌ 提现API调用失败', { txnId, cardId, error: withdrawalResult.error });
        
        // 更新授权撤销记录的提现状态为失败
        await prisma.cardTransaction.update({
          where: { txnId },
          data: { withdrawalStatus: 'FAILED' } as any
        });
        
        // 提现失败，记录日志但不创建数据库记录
        logger.error('❌ 自动提现失败', { txnId, cardId, amount, currency });

        return { success: false, error: withdrawalResult.error };
      }

      // 5. 自动提现成功，更新授权撤销记录的提现状态
      await prisma.cardTransaction.update({
        where: { txnId },
        data: { withdrawalStatus: 'SUCCESS' } as any
      });
      
      logger.info('✅ 自动提现成功', { 
        txnId, 
        cardId, 
        withdrawalId: withdrawalResult.withdrawalId
      });

      return { 
        success: true, 
        withdrawalId: withdrawalResult.withdrawalId 
      };

    } catch (error) {
      // 更新授权撤销记录的提现状态为失败
      try {
        await prisma.cardTransaction.update({
          where: { txnId },
          data: { withdrawalStatus: 'FAILED' } as any
        });
      } catch (updateError) {
        logger.error('更新提现状态失败', { txnId, updateError });
      }
      
      logger.error('💥 自动提现处理失败', { txnId, cardId, amount, currency, error });
      return { success: false, error: 'INTERNAL_ERROR' };
    }
  }

  /**
   * 调用第三方提现API（真实实现）
   */
  private async callWithdrawalAPI(cardId: string, amount: number, currency: string): Promise<{ success: boolean; withdrawalId?: string; error?: string }> {
    try {
      // 生成请求ID
      const requestId = `WD_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      logger.info('🎯 调用真实提现API', { cardId, amount, currency, requestId });
      
      // 调用真实的卡商提现API
      const result = await cardProviderService.withdrawCard(cardId, amount, requestId);
      
      logger.info('✅ 提现API调用成功', { 
        cardId, 
        amount, 
        currency, 
        withdrawalId: requestId,
        newBalance: result.cardBal,
        resultAmount: result.amount
      });
      
      return {
        success: true,
        withdrawalId: requestId
      };
      
    } catch (error) {
      logger.error('💥 提现API调用失败', { cardId, amount, currency, error: error instanceof Error ? error.message : 'Unknown error' });
      return {
        success: false,
        error: error instanceof Error ? error.message : 'API_EXCEPTION'
      };
    }
  }

  /**
   * 获取交易的提现状态
   */
  async getWithdrawalStatus(txnId: string): Promise<{ status: 'NONE' | 'PENDING' | 'SUCCESS' | 'FAILED'; withdrawalId?: string }> {
    try {
      const withdrawalRecord = await prisma.cardTransaction.findFirst({
        where: {
          relatedTxnId: txnId,
          txnType: 'WITHDRAWAL' as any
        } as any,
        orderBy: {
          txnTime: 'desc'
        }
      });

      if (!withdrawalRecord) {
        return { status: 'NONE' };
      }

      const status = (withdrawalRecord as any).withdrawalStatus as 'PENDING' | 'SUCCESS' | 'FAILED' || 
                    (withdrawalRecord.txnStatus === '1' ? 'SUCCESS' : 'FAILED');

      return {
        status,
        withdrawalId: withdrawalRecord.txnId
      };

    } catch (error) {
      logger.error('获取提现状态失败', { txnId, error });
      return { status: 'NONE' };
    }
  }

  /**
   * 补偿充值处理
   * 1. 调用卡商API给该卡充值相应的金额
   * 2. 将该账单的交易类型改为撤销（F）
   * 3. 将该账单数据库的授权时间改为当前时间（北京时间）
   * 4. 交易进程变为已经平账
   */
  async processCompensationRecharge(txnId: string) {
    logger.info('📝 开始处理补偿充值', { txnId });

    try {
      // 1. 查找交易记录
      const transaction = await this.prisma.cardTransaction.findUnique({
        where: { txnId },
        include: { virtualCard: true }
      });

      if (!transaction) {
        throw new Error(`交易记录不存在: ${txnId}`);
      }

      if (!transaction.virtualCard) {
        throw new Error(`卡片信息不存在: ${transaction.cardId}`);
      }

      logger.info('🔍 找到交易记录', { 
        txnId, 
        cardId: transaction.cardId, 
        amount: transaction.finalAmt,
        currentType: transaction.txnType 
      });

      // 2. 调用卡商API充值（补偿充值应该是给卡片充值，而不是提现）
      const rechargeAmount = Math.abs(Number(transaction.finalAmt)); // 确保金额为正数
      logger.info('💰 开始调用卡商API充值', {
        cardId: transaction.cardId,
        amount: rechargeAmount,
        currency: transaction.finalCcy
      });

      let rechargeResult;
      try {
        rechargeResult = await this.cardProviderService.rechargeCard(
          transaction.cardId,
          rechargeAmount
        );

        logger.info('✅ 卡商API充值成功', {
          cardId: transaction.cardId,
          rechargeResult
        });
      } catch (cardError: any) {
        // 处理卡商API错误
        const errorMessage = cardError.message || '卡商API调用失败';
        logger.error('❌ 卡商API充值失败', {
          cardId: transaction.cardId,
          amount: rechargeAmount,
          error: errorMessage
        });

        // 根据错误类型返回更友好的错误信息
        if (errorMessage.includes('not enough') || errorMessage.includes('余额不足')) {
          throw new Error('账户余额不足，无法执行补偿充值');
        } else if (errorMessage.includes('over card limit') || errorMessage.includes('超限')) {
          throw new Error('超过卡片充值限额，无法执行补偿充值');
        } else if (errorMessage.includes('code: 6')) {
          throw new Error('卡片状态异常，无法执行补偿充值');
        } else {
          throw new Error(`补偿充值失败: ${errorMessage}`);
        }
      }

      // 3. 更新交易记录 - 使用当前本地时间
      const beijingTime = new Date(); // 直接使用当前时间，系统已经是北京时区

      const updatedTransaction = await this.prisma.cardTransaction.update({
        where: { txnId },
        data: {
          txnType: 'CANCEL' as any, // F类型表示撤销
          txnTime: beijingTime, // 更新授权时间为当前北京时间
          withdrawalStatus: 'SUCCESS', // 设置为已平账
          updatedAt: new Date()
        }
      });

      logger.info('📝 交易记录更新成功', {
        txnId,
        newType: updatedTransaction.txnType,
        newTime: updatedTransaction.txnTime,
        withdrawalStatus: updatedTransaction.withdrawalStatus
      });

      return {
        txnId,
        success: true,
        message: '补偿充值处理完成',
        rechargeResult,
        updatedTransaction: {
          txnType: updatedTransaction.txnType,
          txnTime: updatedTransaction.txnTime,
          withdrawalStatus: updatedTransaction.withdrawalStatus
        }
      };

    } catch (error) {
      logger.error('❌ 补偿充值处理失败', { txnId, error });
      throw error;
    }
  }

  /**
   * 重试提现
   * 重新调用卡商API进行提现操作
   */
  async retryWithdrawal(txnId: string) {
    logger.info('🔄 开始重试提现', { txnId });

    try {
      // 1. 查找交易记录
      const transaction = await this.prisma.cardTransaction.findUnique({
        where: { txnId },
        include: { virtualCard: true }
      });

      if (!transaction) {
        throw new Error(`交易记录不存在: ${txnId}`);
      }

      if (!transaction.virtualCard) {
        throw new Error(`卡片信息不存在: ${transaction.cardId}`);
      }

      // 2. 检查是否已经提现成功
      if (transaction.withdrawalStatus === 'SUCCESS') {
        logger.warn('⚠️ 交易已经提现成功，无需重试', { txnId });
        return {
          txnId,
          success: true,
          message: '交易已经提现成功',
          alreadyWithdrawn: true
        };
      }

      logger.info('🔍 找到交易记录，开始重试提现', { 
        txnId, 
        cardId: transaction.cardId, 
        amount: transaction.finalAmt,
        currentStatus: transaction.withdrawalStatus
      });

      // 3. 设置提现状态为进行中
      await this.prisma.cardTransaction.update({
        where: { txnId },
        data: {
          withdrawalStatus: 'PENDING',
          updatedAt: new Date()
        }
      });

      // 4. 调用卡商API提现
      // 确保提现金额为正数（D类型交易通常是负数，需要取绝对值）
      const withdrawalAmount = Math.abs(Number(transaction.finalAmt));
      
      logger.info('🏦 开始调用卡商API提现', {
        cardId: transaction.cardId,
        originalAmount: transaction.finalAmt,
        withdrawalAmount: withdrawalAmount,
        currency: transaction.finalCcy
      });

      let withdrawalResult;
      try {
        withdrawalResult = await this.cardProviderService.withdrawCard(
          transaction.cardId,
          withdrawalAmount
        );
      } catch (cardError: any) {
        // 处理卡商API错误
        const errorMessage = cardError.message || '卡商API调用失败';
        logger.error('❌ 重试提现API调用失败', {
          cardId: transaction.cardId,
          originalAmount: transaction.finalAmt,
          withdrawalAmount: withdrawalAmount,
          error: errorMessage
        });

        // 根据错误类型返回更友好的错误信息
        if (errorMessage.includes('not enough') || errorMessage.includes('余额不足')) {
          throw new Error('卡片余额不足，无法重试提现');
        } else if (errorMessage.includes('over card limit') || errorMessage.includes('超限')) {
          throw new Error('超过卡片提现限额，无法重试提现');
        } else if (errorMessage.includes('code: 6')) {
          throw new Error('卡片状态异常或余额不足，无法重试提现');
        } else {
          throw new Error(`重试提现失败: ${errorMessage}`);
        }
      }

      // 5. 更新提现状态为成功
      const updatedTransaction = await this.prisma.cardTransaction.update({
        where: { txnId },
        data: {
          withdrawalStatus: 'SUCCESS',
          updatedAt: new Date()
        }
      });

      logger.info('✅ 重试提现成功', {
        txnId,
        withdrawalResult,
        withdrawalStatus: updatedTransaction.withdrawalStatus
      });

      return {
        txnId,
        success: true,
        message: '重试提现成功',
        withdrawalResult,
        withdrawalStatus: updatedTransaction.withdrawalStatus
      };

    } catch (error) {
      logger.error('❌ 重试提现失败', { txnId, error });
      
      // 更新提现状态为失败
      try {
        await this.prisma.cardTransaction.update({
          where: { txnId },
          data: {
            withdrawalStatus: 'FAILED',
            updatedAt: new Date()
          }
        });
      } catch (updateError) {
        logger.error('更新提现失败状态时出错', { txnId, updateError });
      }
      
      throw error;
    }
  }

  /**
   * 处理无偿通过
   * 1. 将交易类型改为撤销（CANCEL/F）
   * 2. 将授权时间改为当前北京时间
   * @param txnId 交易ID
   */
  async processFreePass(txnId: string) {
    logger.info('📝 开始处理无偿通过', { txnId });
    
    try {
      // 1. 查找交易记录
      const transaction = await this.prisma.cardTransaction.findUnique({
        where: { txnId },
        include: {
          virtualCard: true
        }
      });

      if (!transaction) {
        throw new Error('交易不存在');
      }

      logger.info('🔍 找到交易记录', { 
        txnId, 
        cardId: transaction.cardId,
        currentType: transaction.txnType,
        amount: transaction.finalAmt
      });

      // 2. 使用当前本地时间
      const beijingTime = new Date(); // 直接使用当前时间，系统已经是北京时区

      // 3. 更新交易记录
      const updatedTransaction = await this.prisma.cardTransaction.update({
        where: { txnId },
        data: {
          txnType: 'CANCEL' as any, // F类型表示撤销
          txnTime: beijingTime, // 更新授权时间为当前北京时间
          withdrawalStatus: 'SUCCESS', // 设置为已平账
          updatedAt: new Date()
        }
      });

      logger.info('📝 交易记录更新成功', { 
        txnId, 
        newType: 'CANCEL', 
        newTime: beijingTime.toISOString(),
        withdrawalStatus: 'SUCCESS'
      });

      return {
        success: true,
        message: '无偿通过处理完成',
        txnId,
        updatedTransaction: {
          txnType: updatedTransaction.txnType,
          txnTime: updatedTransaction.txnTime,
          withdrawalStatus: updatedTransaction.withdrawalStatus
        }
      };

    } catch (error) {
      logger.error('❌ 无偿通过处理失败', { error });
      throw error;
    }
  }
}

export const transactionService = new TransactionService();
