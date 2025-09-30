/**
 * 交易服务API
 */
import { request } from '@umijs/max';
import { API_CONFIG } from '@/config/api';
import type {
  AuthRecord,
  SettleRecord,
  AuthRecordsResponse,
  SettleRecordsResponse,
  TransactionQueryParams,
  StatementSummary,
  TransactionRecord,
} from '@/types/transaction';

/**
 * API响应格式
 */
interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: any;
  };
}

/**
 * 获取API URL
 * @param path API路径
 * @returns 完整的API URL
 */
function getApiUrl(path: string): string {
  // 如果配置为使用真实API或交易模块强制使用真实API
  if (!API_CONFIG.useMock || API_CONFIG.modules.transaction) {
    return `${path}`;
  }
  // 使用相对路径，让UmiJS的mock系统处理
  return `/api${path}`;
}

/**
 * 获取用户交易记录
 */
export async function getTransactions(params: TransactionQueryParams): Promise<ApiResponse<{
  data: TransactionRecord[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}>> {
  console.log('🔍 获取交易记录', { 
    useMock: API_CONFIG.useMock, 
    forceRealAPI: API_CONFIG.modules.transaction,
    url: getApiUrl('/transactions'),
    params
  });
  
  return request(getApiUrl('/transactions'), {
    method: 'GET',
    params,
    timeout: API_CONFIG.timeout,
  });
}

/**
 * 获取卡片授权记录
 */
export async function getAuthRecords(
  cardId: string,
  page: number = 1,
  pageSize: number = 20
): Promise<ApiResponse<AuthRecordsResponse>> {
  console.log('🔍 获取授权记录', { 
    cardId, 
    page,
    url: getApiUrl(`/virtual-cards/${cardId}/auth-records`)
  });
  
  return request(getApiUrl(`/virtual-cards/${cardId}/auth-records`), {
    method: 'GET',
    params: { page, pageSize },
    timeout: API_CONFIG.timeout,
  });
}

/**
 * 获取卡片结算记录
 */
export async function getSettleRecords(
  cardId: string,
  page: number = 1,
  pageSize: number = 20
): Promise<ApiResponse<SettleRecordsResponse>> {
  console.log('🔍 获取结算记录', { 
    cardId, 
    page,
    url: getApiUrl(`/virtual-cards/${cardId}/settle-records`)
  });
  
  return request(getApiUrl(`/virtual-cards/${cardId}/settle-records`), {
    method: 'GET',
    params: { page, pageSize },
    timeout: API_CONFIG.timeout,
  });
}

/**
 * 按日期范围获取卡片授权记录
 */
export async function getAuthRecordsByDateRange(params: {
  startDate: string;
  endDate: string;
  cardId?: string;
  page?: number;
}): Promise<ApiResponse<{
  page: number;
  pageSize: number;
  totalCount: number;
  keyList: string[];
  authList: any[][];
}>> {
  console.log('🔍 按日期获取授权记录', { 
    params,
    url: getApiUrl('/transactions/auth-list')
  });
  
  return request(getApiUrl('/transactions/auth-list'), {
    method: 'GET',
    params: {
      date_start: params.startDate,
      date_end: params.endDate,
      card_id: params.cardId,
      page: params.page || 1,
    },
    timeout: API_CONFIG.timeout,
  });
}

/**
 * 按日期范围获取卡片结算记录
 */
export async function getSettleRecordsByDateRange(params: {
  startDate: string;
  endDate: string;
  cardId?: string;
  page?: number;
}): Promise<ApiResponse<{
  page: number;
  pageSize: number;
  totalCount: number;
  keyList: string[];
  settleList: any[][];
}>> {
  console.log('🔍 按日期获取结算记录', { 
    params,
    url: getApiUrl('/transactions/settle-list')
  });
  
  return request(getApiUrl('/transactions/settle-list'), {
    method: 'GET',
    params: {
      date_start: params.startDate,
      date_end: params.endDate,
      card_id: params.cardId,
      page: params.page || 1,
    },
    timeout: API_CONFIG.timeout,
  });
}

/**
 * 获取对账单汇总
 */
export async function getStatementSummary(params: {
  startDate: string;
  endDate: string;
  username?: string;
}): Promise<ApiResponse<StatementSummary>> {
  console.log('📊 获取对账单汇总', { 
    params,
    url: getApiUrl('/transactions/summary')
  });
  
  return request(getApiUrl('/transactions/summary'), {
    method: 'GET',
    params,
    timeout: API_CONFIG.timeout,
  });
}

/**
 * 导出对账单（Excel格式）
 */
export async function exportStatement(params: {
  startDate: string;
  endDate: string;
  username?: string;
  excludeAuthCancel?: boolean;
}): Promise<Blob> {
  console.log('📥 导出对账单', { 
    params,
    url: getApiUrl('/transactions/export')
  });
  
  return request(getApiUrl('/transactions/export'), {
    method: 'GET',
    params: {
      ...params,
      excludeAuthCancel: params.excludeAuthCancel !== false, // 默认排除AUTH_CANCEL，除非明确设置为false
    },
    responseType: 'blob',
    timeout: 30000, // 导出可能需要更长时间
  });
}

/**
 * 同步响应类型
 */
export interface SyncResponse {
  success: boolean;
  message: string;
  data: {
    total: number;
    inserted?: number;
    merged?: number;
    skipped?: number;
    errors?: number;
  };
}

/**
 * 同步授权账单
 */
export async function syncAuthTransactions(params: {
  dateStart: string;
  dateEnd: string;
  cardId?: string;
}): Promise<SyncResponse> {
  console.log('🔄 同步授权账单', { 
    params,
    url: getApiUrl('/sync/auth-transactions')
  });
  
  return request(getApiUrl('/sync/auth-transactions'), {
    method: 'POST',
    data: params,
    timeout: 60000, // 同步可能需要更长时间
  });
}

/**
 * 同步结算账单
 */
export async function syncSettleTransactions(params: {
  dateStart: string;
  dateEnd: string;
  cardId?: string;
}): Promise<SyncResponse> {
  console.log('🔄 同步结算账单', { 
    params,
    url: getApiUrl('/sync/settle-transactions')
  });
  
  return request(getApiUrl('/sync/settle-transactions'), {
    method: 'POST',
    data: params,
    timeout: 60000, // 同步可能需要更长时间
  });
}

/**
 * 测试同步API连接
 */
export async function testSyncConnection(): Promise<{ success: boolean; message: string }> {
  console.log('🧪 测试同步API连接', { 
    url: getApiUrl('/sync/test')
  });
  
  return request(getApiUrl('/sync/test'), {
    method: 'GET',
    timeout: 10000,
  });
}

/**
 * 补偿充值
 */
export async function compensationRecharge(txnId: string): Promise<ApiResponse<{
  txnId: string;
  success: boolean;
  message: string;
  withdrawalResult: any;
  updatedTransaction: any;
}>> {
  console.log('💰 执行补偿充值', { 
    txnId,
    url: getApiUrl(`/transactions/${txnId}/compensation-recharge`)
  });
  
  return request(getApiUrl(`/transactions/${txnId}/compensation-recharge`), {
    method: 'POST',
    timeout: 30000, // 补偿充值可能需要更长时间
  });
}

/**
 * 无偿通过
 */
export async function freePass(txnId: string): Promise<ApiResponse<{
  txnId: string;
  success: boolean;
  message: string;
  updatedTransaction: any;
}>> {
  console.log('✅ 执行无偿通过', { 
    txnId,
    url: getApiUrl(`/transactions/${txnId}/free-pass`)
  });
  
  return request(getApiUrl(`/transactions/${txnId}/free-pass`), {
    method: 'POST',
    timeout: 10000,
  });
}

/**
 * 重试提现
 */
export async function retryWithdrawal(txnId: string): Promise<ApiResponse<{
  txnId: string;
  success: boolean;
  message: string;
  withdrawalResult?: any;
  withdrawalStatus: string;
  alreadyWithdrawn?: boolean;
}>> {
  console.log('🔄 重试提现', { 
    txnId,
    url: getApiUrl(`/transactions/${txnId}/retry-withdrawal`)
  });
  
  return request(getApiUrl(`/transactions/${txnId}/retry-withdrawal`), {
    method: 'POST',
    timeout: 30000, // 重试提现可能需要更长时间
  });
}
