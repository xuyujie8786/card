import logger from '../config/logger';
import { CardProviderService } from './cardProviderService';
import { transactionService } from './transactionService';
import { AuthListItem, SettleListItem } from '../types/cardProvider';
import { TransactionStatus, TransactionType } from '../types/transaction';
import { Decimal } from '@prisma/client/runtime/library';
import prisma from '../config/database';

/**
 * 账单同步服务
 * 处理授权和结算账单的同步逻辑
 */
export class SyncService {
  private cardProviderService: CardProviderService;

  constructor(cardProviderService?: CardProviderService) {
    this.cardProviderService = cardProviderService || new CardProviderService();
  }

  /**
   * 同步授权账单
   * @param dateStart 开始日期 YYYY-MM-DD
   * @param dateEnd 结束日期 YYYY-MM-DD
   * @param cardId 可选的卡片ID，如果指定则只同步该卡片
   * @returns 同步结果统计
   */
  async syncAuthTransactions(
    dateStart: string,
    dateEnd: string,
    cardId?: string
  ): Promise<{
    total: number;
    inserted: number;
    skipped: number;
    errors: number;
  }> {
    logger.info('Starting auth transactions sync', { dateStart, dateEnd, cardId });

    const stats = {
      total: 0,
      inserted: 0,
      skipped: 0,
      errors: 0
    };

    try {
      // 分页获取所有授权数据
      let page = 1;
      let hasMoreData = true;

      while (hasMoreData) {
        logger.info('Fetching auth transactions page', { page, dateStart, dateEnd, cardId });

        const response = await this.cardProviderService.getAuthList(
          dateStart,
          dateEnd,
          page,
          cardId
        );

        // 如果返回的列表为空，说明没有更多数据了
        if (!response.auth_list || response.auth_list.length === 0) {
          hasMoreData = false;
          break;
        }

        logger.info('Processing auth transactions batch', {
          page,
          batchSize: response.auth_list.length,
          totalCount: response.total_count
        });

        // 处理当前页的数据
        for (const authItem of response.auth_list) {
          stats.total++;
          try {
            const result = await this.processAuthTransaction(authItem, response.key_list);
            if (result.inserted) {
              stats.inserted++;
            } else {
              stats.skipped++;
            }
          } catch (error) {
            stats.errors++;
            logger.error('Error processing auth transaction', {
              authItem,
              error: error instanceof Error ? error.message : 'Unknown error'
            });
          }
        }

        page++;
      }

      logger.info('Auth transactions sync completed', stats);
      return stats;

    } catch (error) {
      logger.error('Auth transactions sync failed', {
        error: error instanceof Error ? error.message : 'Unknown error',
        dateStart,
        dateEnd,
        cardId,
        stats
      });
      throw error;
    }
  }

  /**
   * 同步结算账单
   * @param dateStart 开始日期 YYYY-MM-DD
   * @param dateEnd 结束日期 YYYY-MM-DD
   * @returns 同步结果统计
   */
  async syncSettleTransactions(
    dateStart: string,
    dateEnd: string
  ): Promise<{
    total: number;
    inserted: number;
    merged: number;
    skipped: number;
    errors: number;
  }> {
    logger.info('Starting settle transactions sync', { dateStart, dateEnd });

    const stats = {
      total: 0,
      inserted: 0,
      merged: 0,
      skipped: 0,
      errors: 0
    };

    try {
      // 分页获取所有结算数据
      let page = 1;
      let hasMoreData = true;

      while (hasMoreData) {
        logger.info('Fetching settle transactions page', { page, dateStart, dateEnd });

        const response = await this.cardProviderService.getSettleList(
          dateStart,
          dateEnd,
          page
        );

        // 如果返回的列表为空，说明没有更多数据了
        if (!response.settle_list || response.settle_list.length === 0) {
          hasMoreData = false;
          break;
        }

        logger.info('Processing settle transactions batch', {
          page,
          batchSize: response.settle_list.length,
          totalCount: response.total_count
        });

        // 处理当前页的数据
        for (const settleItem of response.settle_list) {
          stats.total++;
          try {
            const result = await this.processSettleTransaction(settleItem, response.key_list);
            if (result.merged) {
              stats.merged++;
            } else if (result.inserted) {
              stats.inserted++;
            } else {
              stats.skipped++;
            }
          } catch (error) {
            stats.errors++;
            logger.error('Error processing settle transaction', {
              settleItem,
              error: error instanceof Error ? error.message : 'Unknown error'
            });
          }
        }

        page++;
      }

      logger.info('Settle transactions sync completed', stats);
      return stats;

    } catch (error) {
      logger.error('Settle transactions sync failed', {
        error: error instanceof Error ? error.message : 'Unknown error',
        dateStart,
        dateEnd,
        stats
      });
      throw error;
    }
  }

  /**
   * 处理单个授权交易
   * @param authItem 授权数据项
   * @param keyList 字段列表
   * @returns 处理结果
   */
  private async processAuthTransaction(
    authItem: AuthListItem,
    keyList: string[]
  ): Promise<{ inserted: boolean }> {
    // 根据API文档，key_list顺序为：
    // ["card_id", "txn_id", "txn_type", "txn_status", "txn_time", "txn_amt", "txn_ccy", "bill_amt", "bill_ccy", "mcc", "merch_name", "merch_ctry", "origin_txn_id", "decline_reason"]
    
    const [
      cardId,
      txnId,
      txnType,
      txnStatus,
      txnTime,
      txnAmt,
      txnCcy,
      billAmt,
      billCcy,
      mcc,
      merchName,
      merchCtry,
      originTxnId,
      declineReason
    ] = authItem;

    // 检查是否已存在该交易
    const existingTransaction = await transactionService.findByTxnId(txnId);
    if (existingTransaction) {
      logger.debug('Auth transaction already exists, skipping', { txnId });
      return { inserted: false };
    }

    // 查找对应的卡片
    const card = await transactionService.findCardByCardId(cardId);
    if (!card) {
      logger.warn('Card not found for auth transaction', { cardId, txnId });
      throw new Error(`Card not found: ${cardId}`);
    }

    // 转换数据格式并创建交易
    const transactionData = {
      cardId: card.id,
      txnId,
      txnType: txnType as 'A' | 'D',
      txnStatus: txnStatus as TransactionStatus,
      txnTime,
      txnCcy,
      txnAmt: parseFloat(txnAmt),
      billCcy,
      billAmt: parseFloat(billAmt),
      finalCcy: billCcy,
      finalAmt: parseFloat(billAmt),
      merchantName: merchName,
      merchantCountry: merchCtry,
      mcc,
      declineReason: declineReason || undefined,
      type: TransactionType.AUTH,
      authTxnId: originTxnId !== '0' ? originTxnId : undefined
    };

    await transactionService.createTransaction(transactionData);
    logger.info('Auth transaction inserted', { txnId, cardId });
    
    return { inserted: true };
  }

  /**
   * 处理单个结算交易
   * @param settleItem 结算数据项
   * @param keyList 字段列表
   * @returns 处理结果
   */
  private async processSettleTransaction(
    settleItem: SettleListItem,
    keyList: string[]
  ): Promise<{ inserted: boolean; merged: boolean }> {
    // 根据API文档，key_list顺序为：
    // ["card_id", "txn_id", "txn_type", "txn_amt", "txn_ccy", "bill_amt", "bill_ccy", "auth_txn_id", "clearing_date", "mcc", "merch_name", "merch_ctry", "auth_code", "sub_id", "trade_note"]
    
    const [
      cardId,
      txnId,
      txnType,
      txnAmt,
      txnCcy,
      billAmt,
      billCcy,
      authTxnId,
      clearingDate,
      mcc,
      merchName,
      merchCtry,
      authCode,
      subId,
      tradeNote
    ] = settleItem;

    // 检查是否已存在该结算交易
    const existingTransaction = await transactionService.findByTxnId(txnId);
    if (existingTransaction) {
      logger.debug('Settle transaction already exists, skipping', { txnId });
      return { inserted: false, merged: false };
    }

    // 查找对应的卡片
    const card = await transactionService.findCardByCardId(cardId);
    if (!card) {
      logger.warn('Card not found for settle transaction', { cardId, txnId });
      throw new Error(`Card not found: ${cardId}`);
    }

    // 尝试查找对应的授权交易进行合并
    if (authTxnId) {
      const existingAuthTransaction = await transactionService.findByTxnId(authTxnId);
      if (existingAuthTransaction) {
        // 合并到现有授权交易
        const mergeData = {
          settleTxnId: txnId,
          settleTxnType: txnType as 'C' | 'R',
          billAmt: parseFloat(billAmt),
          billCcy,
          finalAmt: parseFloat(billAmt),
          finalCcy: billCcy,
          txnAmt: parseFloat(txnAmt),
          txnCcy,
          clearingDate,
          authCode: authCode || undefined
        };

        await transactionService.mergeSettlement(existingAuthTransaction.id, mergeData);
        
        // 更新卡片余额 (消费结算扣除，退款结算增加)
        await this.updateCardBalanceForSettlement(
          card, 
          txnType as 'C' | 'R', 
          parseFloat(billAmt),
          billCcy,
          txnId
        );
        
        logger.info('Settle transaction merged with auth', { 
          settleTxnId: txnId, 
          authTxnId, 
          cardId 
        });
        
        return { inserted: false, merged: true };
      }
    }

    // 创建独立的结算交易
    const transactionData = {
      cardId: card.id,
      txnId,
      txnType: txnType as 'C' | 'R',
      txnStatus: '1' as TransactionStatus, // 结算交易默认成功
      txnTime: clearingDate,
      txnCcy,
      txnAmt: parseFloat(txnAmt),
      billCcy,
      billAmt: parseFloat(billAmt),
      finalCcy: billCcy,
      finalAmt: parseFloat(billAmt),
      merchantName: merchName,
      merchantCountry: merchCtry,
      mcc,
      authCode: authCode || undefined,
      type: TransactionType.SETTLEMENT,
      authTxnId
    };

    await transactionService.createTransaction(transactionData);
    
    // 更新卡片余额 (消费结算扣除，退款结算增加)
    await this.updateCardBalanceForSettlement(
      card, 
      txnType as 'C' | 'R', 
      parseFloat(billAmt),
      billCcy,
      txnId
    );
    
    logger.info('Standalone settle transaction inserted', { txnId, cardId });
    
    return { inserted: true, merged: false };
  }

  /**
   * 更新卡片余额（用于结算交易）
   */
  private async updateCardBalanceForSettlement(
    card: any,
    txnType: 'C' | 'R',
    billAmount: number,
    billCcy: string,
    txnId: string
  ) {
    try {
      // 检查币种是否匹配卡片币种
      if (billCcy !== card.currency) {
        logger.warn('Currency mismatch in settlement', {
          cardId: card.cardId,
          cardCurrency: card.currency,
          settlementCurrency: billCcy,
          txnId
        });
        return;
      }

      const currentBalance = new Decimal(card.balance);
      let newBalance: Decimal;

      if (txnType === 'C') {
        // 消费结算 - 扣除余额
        newBalance = currentBalance.sub(new Decimal(billAmount));
        logger.info('Settlement deduction', {
          cardId: card.cardId,
          beforeBalance: currentBalance.toString(),
          deductAmount: billAmount,
          afterBalance: newBalance.toString(),
          txnId
        });
      } else if (txnType === 'R') {
        // 退款结算 - 增加余额
        newBalance = currentBalance.add(new Decimal(billAmount));
        logger.info('Settlement refund', {
          cardId: card.cardId,
          beforeBalance: currentBalance.toString(),
          refundAmount: billAmount,
          afterBalance: newBalance.toString(),
          txnId
        });
      } else {
        logger.warn('Unknown settlement transaction type', { txnType, txnId });
        return;
      }

      // 更新数据库中的卡片余额
      await prisma.virtualCard.update({
        where: { id: card.id },
        data: { balance: newBalance }
      });

      logger.info('Card balance updated for settlement', {
        cardId: card.cardId,
        newBalance: newBalance.toString(),
        txnType,
        txnId
      });

    } catch (error) {
      logger.error('Failed to update card balance for settlement', {
        cardId: card.cardId,
        txnType,
        billAmount,
        billCcy,
        txnId,
        error
      });
      throw error;
    }
  }
}

// 默认导出一个服务实例
export default new SyncService();
