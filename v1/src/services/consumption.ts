import { request } from '@umijs/max';
import { API_CONFIG } from '@/config/api';

// 消费记录数据结构
export interface ConsumptionRecord {
  id: string;
  cardNo: string;
  txnId: string;
  amount: number;
  currency: string;
  merchantName?: string;
  merchantCategory?: string;
  status: 'approved' | 'declined' | 'pending';
  transactionType: 'purchase' | 'refund' | 'preauth' | 'auth' | 'auth_cancel' | 'cancel';
  createdAt: string;
  settledAt?: string;
  description?: string;
}

// 消费类型配置
export const consumptionTypeConfig = {
  purchase: '消费',
  refund: '退款',
  preauth: '预授权',
  auth: '授权',
  auth_cancel: '授权撤销',
  cancel: '撤销',
};

// 状态配置
export const consumptionStatusConfig = {
  approved: { text: '成功', color: 'success' },
  declined: { text: '失败', color: 'error' },
  pending: { text: '处理中', color: 'processing' },
};

function getApiUrl(path: string): string {
  // 如果配置为使用真实API
  if (!API_CONFIG.useMock) {
    // 直接返回路径，让UmiJS的request拦截器处理baseURL和认证
    return path;
  }
  return path;
}

/**
 * 获取卡片消费记录（使用交易记录API）
 * @param cardId 卡片ID
 * @returns 消费记录列表
 */
export async function getCardConsumptionRecords(cardId: string): Promise<{
  success: boolean;
  data: ConsumptionRecord[];
  message?: string;
}> {
  try {
    console.log('🌐 调用交易API', { 
      url: getApiUrl('/transactions'),
      cardId: cardId,
      params: {
        cardId: cardId,
        current: 1,
        pageSize: 50,
      }
    });
    
    // 调用交易记录API，获取授权记录作为消费记录
    const response = await request<{
      success: boolean;
      data: {
        data: any[];
        pagination: {
          page: number;
          limit: number;
          total: number;
          totalPages: number;
        };
      };
      message?: string;
    }>(getApiUrl('/transactions'), {
      method: 'GET',
      params: {
        cardId: cardId,
        current: 1,
        pageSize: 50,
      },
    });

    if (response.success && response.data && response.data.data) {
      // 过滤掉AUTH_CANCEL交易，不在消费记录中显示
      const filteredData = response.data.data.filter((item: any) => {
        return item.txnType !== 'D' && item.txnType !== 'AUTH_CANCEL';
      });
      
      // 转换交易记录数据格式为消费记录格式
      const consumptionRecords: ConsumptionRecord[] = filteredData.map((item: any) => ({
        id: item.txnId || item.id,
        cardNo: item.cardNo || '',
        txnId: item.txnId,
        amount: item.finalAmt || item.amount || 0,
        currency: item.currency || 'USD',
        merchantName: item.merchantName || item.merchant,
        merchantCategory: item.merchantCategory,
        status: mapTransactionStatus(item.txnStatus),
        transactionType: mapTransactionType(item.txnType),
        createdAt: item.txnTime || item.createdAt,
        settledAt: item.settledAt,
        description: item.description || item.remark,
      }));

      return {
        success: true,
        data: consumptionRecords,
      };
    }

    return {
      success: false,
      data: [],
      message: response.message || '获取消费记录失败',
    };
  } catch (error) {
    console.error('获取消费记录失败:', error);
    return {
      success: false,
      data: [],
      message: '获取消费记录失败',
    };
  }
}

/**
 * 映射交易状态
 */
function mapTransactionStatus(status: string | number): 'approved' | 'declined' | 'pending' {
  // 处理数字状态码
  if (typeof status === 'number' || !isNaN(Number(status))) {
    const statusCode = Number(status);
    switch (statusCode) {
      case 1:
        return 'approved';
      case 0:
        return 'declined';
      case 2:
        return 'pending';
      default:
        return 'pending';
    }
  }
  
  // 处理字符串状态
  switch (status?.toLowerCase()) {
    case 'approved':
    case 'success':
    case '成功':
      return 'approved';
    case 'declined':
    case 'failed':
    case 'fail':
    case '失败':
      return 'declined';
    case 'pending':
    case 'processing':
    case '处理中':
      return 'pending';
    default:
      return 'pending';
  }
}

/**
 * 映射交易类型
 */
function mapTransactionType(type: string): 'purchase' | 'refund' | 'preauth' | 'auth' | 'auth_cancel' | 'cancel' {
  switch (type?.toLowerCase()) {
    case 'purchase':
    case 'payment':
    case 'debit':
    case 'settlement':
    case 'c':
    case '消费':
      return 'purchase';
    case 'refund':
    case 'credit':
    case 'r':
    case '退款':
      return 'refund';
    case 'auth_cancel':
    case 'd': // 授权撤销
      return 'auth_cancel';
    case 'cancel':
    case 'f': // 撤销交易（和对账单保持一致）
      return 'cancel';
    case 'auth':
    case 'a': // 授权交易
      return 'auth';
    case 'preauth':
    case 'authorization':
    case '预授权':
      return 'preauth';
    default:
      return 'purchase';
  }
}
