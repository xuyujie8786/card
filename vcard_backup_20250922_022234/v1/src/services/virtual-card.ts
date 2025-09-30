/**
 * 虚拟卡服务API
 */
import { request } from '@umijs/max';
import { API_CONFIG } from '@/config/api';
import type {
  VirtualCard,
  CardListParams,
  CreateCardRequest,
  CreateCardResponse,
  RechargeCardRequest,
  RechargeCardResponse,
  WithdrawCardRequest,
  WithdrawCardResponse,
  CardDetail,
  AuthRecord,
  SettleRecord,
} from '@/types/virtual-card';

/**
 * API响应格式
 */
interface ApiResponse<T> {
  code: number;
  message: string;
  data: T;
}

/**
 * 分页响应格式
 */
interface PagedResponse<T> {
  list: T[];
  pagination: {
    current: number;
    pageSize: number;
    total: number;
  };
}

/**
 * 获取API URL
 * @param path API路径
 * @returns 完整的API URL
 */
function getApiUrl(path: string): string {
  // 如果配置为使用真实API或虚拟卡模块强制使用真实API
  if (!API_CONFIG.useMock || API_CONFIG.modules.card) {
    return `${API_CONFIG.baseURL}${path}`;
  }
  // 使用相对路径，让UmiJS的mock系统处理
  return `/api${path}`;
}

/**
 * 获取虚拟卡列表
 */
export async function getVirtualCardList(params: CardListParams): Promise<ApiResponse<PagedResponse<VirtualCard>>> {
  console.log('🔍 获取虚拟卡列表', { 
    useMock: API_CONFIG.useMock, 
    forceRealAPI: API_CONFIG.modules.card,
    url: getApiUrl('/virtual-cards')
  });
  
  return request(getApiUrl('/virtual-cards'), {
    method: 'GET',
    params,
    timeout: API_CONFIG.timeout,
  });
}

/**
 * 创建虚拟卡
 */
export async function createVirtualCard(data: CreateCardRequest): Promise<ApiResponse<CreateCardResponse>> {
  console.log('✨ 创建虚拟卡', { 
    useMock: API_CONFIG.useMock, 
    forceRealAPI: API_CONFIG.modules.card,
    url: getApiUrl('/virtual-cards'),
    data
  });
  
  return request(getApiUrl('/virtual-cards'), {
    method: 'POST',
    data,
    timeout: API_CONFIG.timeout,
  });
}

/**
 * 获取虚拟卡详情
 */
export async function getVirtualCardDetail(cardId: string): Promise<ApiResponse<CardDetail>> {
  return request(getApiUrl(`/virtual-cards/${cardId}`), {
    method: 'GET',
  });
}

/**
 * 卡片充值
 */
export async function rechargeCard(data: RechargeCardRequest): Promise<ApiResponse<RechargeCardResponse>> {
  return request(getApiUrl(`/virtual-cards/${data.cardId}/recharge`), {
    method: 'POST',
    data: {
      amount: parseFloat(data.amt)
    },
    timeout: API_CONFIG.timeout,
  });
}

/**
 * 卡片提现
 */
export async function withdrawCard(data: WithdrawCardRequest): Promise<ApiResponse<WithdrawCardResponse>> {
  return request(getApiUrl(`/virtual-cards/${data.cardId}/withdraw`), {
    method: 'POST',
    data: {
      amount: parseFloat(data.amt)
    },
    timeout: API_CONFIG.timeout,
  });
}

/**
 * 冻结卡片
 */
export async function freezeCard(cardId: string): Promise<ApiResponse<{ cardId: string; status: string }>> {
  return request(getApiUrl(`/virtual-cards/${cardId}/freeze`), {
    method: 'POST',
    timeout: API_CONFIG.timeout,
  });
}

/**
 * 激活卡片
 */
export async function activateCard(cardId: string): Promise<ApiResponse<{ cardId: string; status: string }>> {
  return request(getApiUrl(`/virtual-cards/${cardId}/activate`), {
    method: 'POST',
    timeout: API_CONFIG.timeout,
  });
}

/**
 * 释放卡片
 */
export async function releaseCard(cardId: string): Promise<ApiResponse<{ releaseBal: string }>> {
  return request(getApiUrl(`/virtual-cards/${cardId}/release`), {
    method: 'POST',
    timeout: API_CONFIG.timeout,
  });
}

/**
 * 获取卡片授权记录
 */
export async function getAuthRecords(
  cardId: string,
  page: number = 1
): Promise<ApiResponse<{
  pageInfo: { total: number; current: number; size: number };
  list: AuthRecord[];
}>> {
  return request(getApiUrl(`/virtual-cards/${cardId}/auth-records`), {
    method: 'GET',
    params: { page },
    timeout: API_CONFIG.timeout,
  });
}

/**
 * 获取卡片结算记录
 */
export async function getSettleRecords(
  cardId: string,
  page: number = 1
): Promise<ApiResponse<{
  pageInfo: { total: number; current: number; size: number };
  list: SettleRecord[];
}>> {
  return request(getApiUrl(`/virtual-cards/${cardId}/settle-records`), {
    method: 'GET',
    params: { page },
    timeout: API_CONFIG.timeout,
  });
}

/**
 * 更新卡片邮箱
 */
export async function updateCardEmail(
  cardId: string,
  email: string
): Promise<ApiResponse<{ cardId: string; card_email: string }>> {
  return request(getApiUrl(`/virtual-cards/${cardId}/email`), {
    method: 'PUT',
    data: { card_email: email },
    timeout: API_CONFIG.timeout,
  });
}

/**
 * 获取用户余额
 */
export async function getUserBalance(): Promise<ApiResponse<{
  hk_bal: {
    bal_list: Array<{
      ccy: string;
      pendingAmt: string;
      acctBal: string;
      actBal: string;
    }>;
  };
}>> {
  return request(getApiUrl('/virtual-cards/user-balance'), {
    method: 'GET',
    timeout: API_CONFIG.timeout,
  });
}

/**
 * 冻结/激活卡片
 */
export async function toggleCardStatus(cardId: string): Promise<ApiResponse<{
  cardId: string;
  status: string;
  message: string;
}>> {
  return request(getApiUrl(`/virtual-cards/${cardId}/toggle-status`), {
    method: 'POST',
  });
}

/**
 * 删除卡片
 */
export async function deleteCard(cardId: string): Promise<ApiResponse<{
  cardId: string;
  releasedBalance: string;
  message: string;
}>> {
  return request(getApiUrl(`/virtual-cards/${cardId}`), {
    method: 'DELETE',
  });
}

/**
 * 更新卡片备注
 */
export async function updateCardRemark(cardId: string, data: {
  remark?: string | null;
}): Promise<ApiResponse<{
  cardId: string;
  remark: string | null;
}>> {
  return request(getApiUrl(`/virtual-cards/${cardId}/remark`), {
    method: 'PUT',
    data,
  });
}
