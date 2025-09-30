/**
 * 交易相关类型定义
 */

// 授权记录
export interface AuthRecord {
  txnId: string;
  originTxnId: string;
  cardId: string;
  realCardId: string;
  txnType: 'A' | 'D' | 'F'; // A: 授权, D: 授权撤销, F: 失败
  txnStatus: '0' | '1'; // 0: 失败, 1: 成功
  txnCcy: string;
  txnAmt: number;
  billCcy: string;
  billAmt: number;
  authCode: string;
  merchName: string;
  merchCtry: string;
  mcc: string;
  declineReason?: string;
  txnTime: string;
  clearingDate?: string;
  subId?: string;
  forcePost?: boolean;
  preAuth?: boolean;
  bizType?: string; // 01: 提现, 30: 查询余额, 99: 消费
}

// 结算记录
export interface SettleRecord {
  txnId: string;
  authTxnId: string;
  cardId: string;
  realCardId: string;
  txnType: 'C' | 'R'; // C: 消费, R: 退款
  txnCcy: string;
  txnAmt: number;
  billCcy: string;
  billAmt: number;
  merchName: string;
  merchCtry: string;
  mcc: string;
  clearingDate: string;
  tradeNote?: string;
  bizType?: string; // 01: 提现, 99: 消费
  subId?: string;
}

// 交易记录查询参数
export interface TransactionQueryParams {
  cardId?: string;
  username?: string;
  startDate?: string;
  endDate?: string;
  txnType?: string;
  current?: number;
  pageSize?: number;
}

// 分页信息
export interface PageInfo {
  total: number;
  current: number;
  size: number;
}

// 授权记录响应
export interface AuthRecordsResponse {
  pageInfo: PageInfo;
  list: AuthRecord[];
}

// 结算记录响应
export interface SettleRecordsResponse {
  pageInfo: PageInfo;
  list: SettleRecord[];
}

// 交易统计
export interface TransactionSummary {
  totalTransactions: number;
  totalAmount: number;
  successCount: number;
  failedCount: number;
  currency: string;
  period: string;
}

// 对账单汇总
export interface StatementSummary {
  authSummary: TransactionSummary;
  settleSummary: TransactionSummary;
  cardCount: number;
  dateRange: {
    startDate: string;
    endDate: string;
  };
}

// 交易状态枚举
export const TransactionStatus = {
  FAILED: '0',
  SUCCESS: '1'
} as const;

// 交易类型枚举
export const TransactionType = {
  AUTH: 'A',
  AUTH_CANCEL: 'D',
  CONSUMPTION: 'C',
  REFUND: 'R',
  CANCEL: 'F'  // F类型表示撤销，不是失败
} as const;

// 业务类型枚举
export const BusinessType = {
  WITHDRAW: '01',
  BALANCE_QUERY: '30',
  CONSUMPTION: '99'
} as const;

// 交易状态文本映射
export const TransactionStatusText = {
  [TransactionStatus.FAILED]: '失败',
  [TransactionStatus.SUCCESS]: '成功'
} as const;

// 交易类型文本映射
export const TransactionTypeText = {
  [TransactionType.AUTH]: '授权',
  [TransactionType.AUTH_CANCEL]: '授权撤销',
  [TransactionType.CONSUMPTION]: '消费',
  [TransactionType.REFUND]: '退款',
  [TransactionType.CANCEL]: '撤销'  // F类型表示撤销
} as const;

// 业务类型文本映射
export const BusinessTypeText = {
  [BusinessType.WITHDRAW]: '提现',
  [BusinessType.BALANCE_QUERY]: '查询余额',
  [BusinessType.CONSUMPTION]: '消费'
} as const;

// 后端交易响应接口（匹配后端TransactionResponse）
export interface TransactionRecord {
  id: number;
  cardId: string;
  cardNo?: string; // 真实卡号
  username: string;
  txnId: string;
  authTxnId?: string;
  originTxnId: string;
  txnType: string;
  txnStatus: string;
  bizType?: string;
  
  // 授权金额信息
  authTxnCcy?: string;
  authTxnAmt?: number;
  authBillCcy?: string;
  authBillAmt?: number;
  
  // 结算金额信息
  settleBillCcy?: string;
  settleBillAmt?: number;
  
  // 最终金额
  finalCcy: string;
  finalAmt: number;
  
  // 商户信息
  merchantName?: string;
  merchantCountry?: string;
  mcc?: string;
  authCode?: string;
  declineReason?: string;
  
  // 时间信息
  txnTime: string;
  clearingDate?: string;
  
  // 结算状态
  isSettled: boolean;
  settleTxnId?: string;
  
  // 提现状态
  relatedTxnId?: string;
  withdrawalStatus?: string;
  
  // 系统时间
  createdAt: string;
  updatedAt: string;
}
