import { CardProviderClient } from '../utils/httpClient';
import logger from '../config/logger';
import {
  CreateCardRequest,
  CreateCardResponse,
  RechargeCardRequest,
  RechargeCardResponse,
  WithdrawCardRequest,
  WithdrawCardResponse,
  ReleaseCardRequest,
  ReleaseCardResponse,
  GetCardInfoRequest,
  GetCardInfoResponse,
  UpdateCardEmailRequest,
  UpdateCardEmailResponse,
  CardStatusRequest,
  CardStatusResponse,
  GetUserBalanceResponse,
  GetAuthRecordsRequest,
  GetAuthRecordsResponse,
  GetSettleRecordsRequest,
  GetSettleRecordsResponse,
  GetAuthListRequest,
  GetAuthListResponse,
  GetSettleListRequest,
  GetSettleListResponse,
  Currency,
  ProductCode
} from '../types/cardProvider';

/**
 * 卡商API服务类
 * 封装所有与卡商API的交互逻辑
 */
export class CardProviderService {
  private client: CardProviderClient;

  constructor(client?: CardProviderClient) {
    this.client = client || new CardProviderClient();
  }

  /**
   * 创建虚拟卡
   * @param params 创建参数
   * @returns 卡片信息
   */
  async createCard(params: {
    amount: number;
    currency: Currency;
    expDate: Date;
    remark?: string;
    productCode?: ProductCode;
    cardBin?: string;
    subId?: string;
    requestId?: string;
  }): Promise<CreateCardResponse> {
    try {
      logger.info('Creating virtual card', {
        amount: params.amount,
        currency: params.currency,
        expDate: params.expDate.toISOString().split('T')[0],
        remark: params.remark
      });

      const request: CreateCardRequest = {
        amt: params.amount.toFixed(2),
        currency: params.currency,
        expdate: params.expDate.toISOString().split('T')[0], // YYYY-MM-DD格式
        remark: params.remark,
        productCode: params.productCode || 'E0000001', // 默认香港卡
        cardBin: params.cardBin,
        sub_id: params.subId,
        request_id: params.requestId
      };

      const response = await this.client.post<CreateCardRequest, CreateCardResponse>(
        '/openapi/card/hk/multi_issue',
        request
      );

      logger.info('Virtual card created successfully', {
        cardId: response.cardId,
        cardNo: response.cardNo.replace(/(\d{4})(\d{4})(\d{4})(\d{4})/, '$1****$3$4'), // 脱敏
        balance: response.cardBal,
        currency: response.curId
      });

      return response;
    } catch (error) {
      logger.error('Failed to create virtual card', {
        error: error instanceof Error ? error.message : 'Unknown error',
        params
      });
      throw error;
    }
  }

  /**
   * 卡片充值
   * @param cardId 卡片ID
   * @param amount 充值金额
   * @param requestId 请求ID
   * @returns 充值结果
   */
  async rechargeCard(cardId: string, amount: number, requestId?: string): Promise<RechargeCardResponse> {
    try {
      logger.info('Recharging card', { cardId, amount, requestId });

      const request: RechargeCardRequest = {
        cardId,
        amt: amount.toFixed(2),
        request_id: requestId
      };

      const response = await this.client.post<RechargeCardRequest, RechargeCardResponse>(
        '/openapi/card/hk/recharge',
        request
      );

      logger.info('Card recharged successfully', {
        cardId,
        amount: response.amount,
        newBalance: response.cardBal,
        currency: response.curId
      });

      return response;
    } catch (error) {
      logger.error('Failed to recharge card', {
        error: error instanceof Error ? error.message : 'Unknown error',
        cardId,
        amount
      });
      throw error;
    }
  }

  /**
   * 卡片提现
   * @param cardId 卡片ID
   * @param amount 提现金额
   * @param requestId 请求ID
   * @returns 提现结果
   */
  async withdrawCard(cardId: string, amount: number, requestId?: string): Promise<WithdrawCardResponse> {
    try {
      logger.info('Withdrawing from card', { cardId, amount, requestId });

      const request: WithdrawCardRequest = {
        cardId,
        amt: amount.toFixed(2),
        request_id: requestId
      };

      const response = await this.client.post<WithdrawCardRequest, WithdrawCardResponse>(
        '/openapi/card/withdraw',
        request
      );

      logger.info('Card withdrawal successful', {
        cardId,
        amount: response.amount,
        newBalance: response.cardBal,
        currency: response.curId
      });

      return response;
    } catch (error) {
      logger.error('Failed to withdraw from card', {
        error: error instanceof Error ? error.message : 'Unknown error',
        cardId,
        amount
      });
      throw error;
    }
  }

  /**
   * 释放卡片
   * @param cardId 卡片ID
   * @param requestId 请求ID
   * @returns 释放结果
   */
  async releaseCard(cardId: string, requestId?: string): Promise<ReleaseCardResponse> {
    try {
      logger.info('Releasing card', { cardId, requestId });

      const request: ReleaseCardRequest = {
        cardId,
        request_id: requestId
      };

      const response = await this.client.post<ReleaseCardRequest, ReleaseCardResponse>(
        '/openapi/card/hk/release',
        request
      );

      logger.info('Card released successfully', {
        cardId,
        releasedBalance: response.releaseBal
      });

      return response;
    } catch (error) {
      logger.error('Failed to release card', {
        error: error instanceof Error ? error.message : 'Unknown error',
        cardId
      });
      throw error;
    }
  }

  /**
   * 获取卡片详情
   * @param cardId 卡片ID
   * @param requestId 请求ID（与cardId二选一）
   * @returns 卡片详情
   */
  async getCardInfo(cardId?: string, requestId?: string): Promise<GetCardInfoResponse> {
    if (!cardId && !requestId) {
      throw new Error('Either cardId or requestId must be provided');
    }

    try {
      logger.info('Getting card info', { cardId, requestId });

      const request: GetCardInfoRequest = {
        cardId,
        request_id: requestId
      };

      const response = await this.client.post<GetCardInfoRequest, GetCardInfoResponse>(
        '/openapi/card/hk/info',
        request
      );

      logger.info('Card info retrieved successfully', {
        cardId: response.cardId,
        status: response.status,
        balance: response.cardBal,
        currency: response.curId
      });

      return response;
    } catch (error) {
      logger.error('Failed to get card info', {
        error: error instanceof Error ? error.message : 'Unknown error',
        cardId,
        requestId
      });
      throw error;
    }
  }

  /**
   * 更新卡片邮箱
   * @param cardId 卡片ID
   * @param email 邮箱地址
   * @returns 更新结果
   */
  async updateCardEmail(cardId: string, email: string): Promise<UpdateCardEmailResponse> {
    try {
      logger.info('Updating card email', { cardId, email });

      const request: UpdateCardEmailRequest = {
        cardId,
        card_email: email
      };

      const response = await this.client.post<UpdateCardEmailRequest, UpdateCardEmailResponse>(
        '/openapi/card/update_email',
        request
      );

      logger.info('Card email updated successfully', {
        cardId: response.cardId,
        email: response.card_email
      });

      return response;
    } catch (error) {
      logger.error('Failed to update card email', {
        error: error instanceof Error ? error.message : 'Unknown error',
        cardId,
        email
      });
      throw error;
    }
  }

  /**
   * 冻结卡片
   * @param cardId 卡片ID
   * @returns 冻结结果
   */
  async freezeCard(cardId: string): Promise<CardStatusResponse> {
    try {
      logger.info('Freezing card', { cardId });

      const request: CardStatusRequest = { cardId };

      const response = await this.client.post<CardStatusRequest, CardStatusResponse>(
        '/openapi/card/freeze',
        request
      );

      logger.info('Card frozen successfully', {
        cardId: response.cardId,
        status: response.status
      });

      return response;
    } catch (error) {
      logger.error('Failed to freeze card', {
        error: error instanceof Error ? error.message : 'Unknown error',
        cardId
      });
      throw error;
    }
  }

  /**
   * 激活卡片
   * @param cardId 卡片ID
   * @returns 激活结果
   */
  async activateCard(cardId: string): Promise<CardStatusResponse> {
    try {
      logger.info('Activating card', { cardId });

      const request: CardStatusRequest = { cardId };

      const response = await this.client.post<CardStatusRequest, CardStatusResponse>(
        '/openapi/card/activate',
        request
      );

      logger.info('Card activated successfully', {
        cardId: response.cardId,
        status: response.status
      });

      return response;
    } catch (error) {
      logger.error('Failed to activate card', {
        error: error instanceof Error ? error.message : 'Unknown error',
        cardId
      });
      throw error;
    }
  }

  /**
   * 获取用户余额
   * @returns 用户余额信息
   */
  async getUserBalance(): Promise<GetUserBalanceResponse> {
    try {
      logger.info('Getting user balance');

      const response = await this.client.post<{}, GetUserBalanceResponse>(
        '/openapi/user/hk/get_bal',
        {}
      );

      logger.info('User balance retrieved successfully', {
        currencies: response.hk_bal.bal_list.map(bal => ({
          currency: bal.ccy,
          available: bal.actBal,
          total: bal.acctBal
        }))
      });

      return response;
    } catch (error) {
      logger.error('Failed to get user balance', {
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      throw error;
    }
  }

  /**
   * 获取授权记录
   * @param cardId 卡片ID
   * @param page 页码
   * @returns 授权记录
   */
  async getAuthRecords(cardId: string, page: number = 1): Promise<GetAuthRecordsResponse> {
    try {
      logger.info('Getting auth records', { cardId, page });

      const request: GetAuthRecordsRequest = {
        cardId,
        start: page.toString()
      };

      const response = await this.client.post<GetAuthRecordsRequest, GetAuthRecordsResponse>(
        '/openapi/card/hk/get_auth',
        request
      );

      logger.info('Auth records retrieved successfully', {
        cardId,
        page,
        total: response.pageInfo.total,
        count: response.list.length
      });

      return response;
    } catch (error) {
      logger.error('Failed to get auth records', {
        error: error instanceof Error ? error.message : 'Unknown error',
        cardId,
        page
      });
      throw error;
    }
  }

  /**
   * 获取结算记录
   * @param cardId 卡片ID
   * @param page 页码
   * @returns 结算记录
   */
  async getSettleRecords(cardId: string, page: number = 1): Promise<GetSettleRecordsResponse> {
    try {
      logger.info('Getting settle records', { cardId, page });

      const request: GetSettleRecordsRequest = {
        cardId,
        start: page.toString()
      };

      const response = await this.client.post<GetSettleRecordsRequest, GetSettleRecordsResponse>(
        '/openapi/card/hk/get_settle',
        request
      );

      logger.info('Settle records retrieved successfully', {
        cardId,
        page,
        total: response.pageInfo.total,
        count: response.list.length
      });

      return response;
    } catch (error) {
      logger.error('Failed to get settle records', {
        error: error instanceof Error ? error.message : 'Unknown error',
        cardId,
        page
      });
      throw error;
    }
  }

  /**
   * 按日期范围获取授权信息 (API 14)
   * @param dateStart 起始日期，格式：YYYY-MM-DD
   * @param dateEnd 结束日期，格式：YYYY-MM-DD
   * @param page 页码
   * @param cardId 可选，指定卡片ID
   * @returns 授权信息列表
   */
  async getAuthList(
    dateStart: string, 
    dateEnd: string, 
    page: number = 1, 
    cardId?: string
  ): Promise<GetAuthListResponse> {
    try {
      logger.info('Getting auth list by date range', { 
        dateStart, 
        dateEnd, 
        page, 
        cardId 
      });

      const request: GetAuthListRequest = {
        date_start: dateStart,
        date_end: dateEnd,
        page,
        ...(cardId && { card_id: cardId })
      };

      const response = await this.client.post<GetAuthListRequest, GetAuthListResponse>(
        '/openapi/v1/card/auth_list',
        request
      );

      logger.info('Auth list retrieved successfully', {
        dateStart,
        dateEnd,
        page,
        cardId,
        totalCount: response.total_count,
        listCount: response.auth_list.length
      });

      return response;
    } catch (error) {
      logger.error('Failed to get auth list', {
        error: error instanceof Error ? error.message : 'Unknown error',
        dateStart,
        dateEnd,
        page,
        cardId
      });
      throw error;
    }
  }

  /**
   * 按日期范围获取结算信息 (API 15)
   * @param dateStart 起始日期，格式：YYYY-MM-DD
   * @param dateEnd 结束日期，格式：YYYY-MM-DD
   * @param page 页码
   * @returns 结算信息列表
   */
  async getSettleList(
    dateStart: string, 
    dateEnd: string, 
    page: number = 1
  ): Promise<GetSettleListResponse> {
    try {
      logger.info('Getting settle list by date range', { 
        dateStart, 
        dateEnd, 
        page 
      });

      const request: GetSettleListRequest = {
        date_start: dateStart,
        date_end: dateEnd,
        page
      };

      const response = await this.client.post<GetSettleListRequest, GetSettleListResponse>(
        '/openapi/v1/card/settle_list',
        request
      );

      logger.info('Settle list retrieved successfully', {
        dateStart,
        dateEnd,
        page,
        totalCount: response.total_count,
        listCount: response.settle_list.length
      });

      return response;
    } catch (error) {
      logger.error('Failed to get settle list', {
        error: error instanceof Error ? error.message : 'Unknown error',
        dateStart,
        dateEnd,
        page
      });
      throw error;
    }
  }

  /**
   * 测试连接
   * @returns 是否连接成功
   */
  async testConnection(): Promise<boolean> {
    try {
      await this.client.testConnection();
      return true;
    } catch (error) {
      logger.error('Card provider connection test failed', {
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      return false;
    }
  }
}

// 默认导出一个服务实例
export default new CardProviderService();
