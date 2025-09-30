import { request } from '@umijs/max';
import { API_CONFIG } from '@/config/api';

export interface OperationLogItem {
  id: number;
  cardId: string;
  operationType: string;
  amount?: number;
  operatorId: number;
  operatorName: string;
  description?: string;
  createdAt: string;
}

export const operationTypeConfig = {
  create_card: { text: '开卡', color: 'success' },
  CREATE_CARD: { text: '开卡', color: 'success' },
  recharge: { text: '充值', color: 'processing' },
  RECHARGE: { text: '充值', color: 'processing' },
  withdraw: { text: '提现', color: 'warning' },
  WITHDRAW: { text: '提现', color: 'warning' },
  freeze: { text: '冻结', color: 'default' },
  FREEZE: { text: '冻结', color: 'default' },
  unfreeze: { text: '解冻', color: 'cyan' },
  UNFREEZE: { text: '解冻', color: 'cyan' },
  delete: { text: '删卡', color: 'error' },
  DELETE: { text: '删卡', color: 'error' },
  DELETE_CARD: { text: '删卡', color: 'error' },
  update_remark: { text: '修改备注', color: 'default' },
  UPDATE_REMARK: { text: '修改备注', color: 'default' },
};

/**
 * 获取API URL
 * @param path API路径
 * @returns 完整的API URL
 */
function getApiUrl(path: string): string {
  // 如果配置为使用真实API
  if (!API_CONFIG.useMock) {
    // 直接返回路径，让UmiJS的request拦截器处理baseURL和认证
    return path;
  }
  return path;
}

export async function getCardOperationLogs(cardNo: string, params?: any) {
  return request(getApiUrl('/operation-logs'), {
    method: 'GET',
    params: {
      cardNo,
      current: 1,
      pageSize: 50,
      ...params,
    },
    timeout: API_CONFIG.timeout,
  });
}