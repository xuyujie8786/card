import { request } from '@umijs/max';
import { API_CONFIG } from '@/config/api';

/**
 * 获取API URL
 */
function getApiUrl(path: string): string {
  // 如果配置为使用真实API或账户流水模块强制使用真实API
  if (!API_CONFIG.useMock || API_CONFIG.modules.accountFlow) {
    return `${path}`;
  }
  // 使用相对路径，让UmiJS的mock系统处理
  return `/api${path}`;
}

// 账户操作类型枚举（与后端Prisma schema保持一致）
export enum AccountOperationType {
  RECHARGE = 'RECHARGE',
  WITHDRAW = 'WITHDRAW',
  CARD_RECHARGE = 'CARD_RECHARGE',
  CARD_WITHDRAW = 'CARD_WITHDRAW',
  CARD_CREATE = 'CARD_CREATE',
  SYSTEM_ADJUST = 'SYSTEM_ADJUST',
}

export interface AccountFlow {
  id: number;
  operatorId: number;
  operatorName: string;
  targetUserId: number;
  targetName: string;
  operationType: AccountOperationType;
  amount: number;
  currency: string;
  description?: string;
  businessType?: string;
  businessId?: string;
  createdAt: string;
  operator?: {
    id: number;
    username: string;
    name?: string;
  };
  targetUser?: {
    id: number;
    username: string;
    name?: string;
  };
}

export interface FlowSummary {
  [key: string]: {
    totalAmount: number;
    count: number;
  };
}

export interface AccountFlowListParams {
  current?: number;
  pageSize?: number;
  operationType?: string;
  startDate?: string;
  endDate?: string;
}

export interface FlowSummaryParams {
  startDate?: string;
  endDate?: string;
}

/**
 * 获取账户流水列表
 */
export async function getAccountFlows(params: AccountFlowListParams) {
  console.log('🔍 获取账户流水', { 
    useMock: API_CONFIG.useMock, 
    forceRealAPI: API_CONFIG.modules.accountFlow,
    url: getApiUrl('/account-flows'),
    params
  });
  
  return request(getApiUrl('/account-flows'), {
    method: 'GET',
    params,
    timeout: API_CONFIG.timeout,
  });
}

/**
 * 获取账户流水统计
 */
export async function getAccountFlowSummary(params: FlowSummaryParams) {
  console.log('🔍 获取流水统计', { 
    useMock: API_CONFIG.useMock, 
    forceRealAPI: API_CONFIG.modules.accountFlow,
    url: getApiUrl('/account-flows/summary'),
    params
  });
  
  return request(getApiUrl('/account-flows/summary'), {
    method: 'GET',
    params,
    timeout: API_CONFIG.timeout,
  });
}
