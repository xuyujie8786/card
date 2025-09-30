/**
 * 交易相关类型定义
 */

import { CardTxnType } from '@prisma/client';

// 交易状态类型
export type TransactionStatus = '0' | '1'; // 0: 失败, 1: 成功

// 交易类型枚举
export enum TransactionType {
  AUTH = 'AUTH',
  SETTLEMENT = 'SETTLEMENT'
}

// 授权账单回调请求数据 - 按照卡商API文档字段顺序
export interface AuthCallbackRequest {
  // 用户和卡片信息
  uid: string;              // 用户ID
  cardId: string;           // 卡片ID
  orgCardId?: string;       // 卡片流水号（原始卡片ID）
  
  // 交易标识
  txnId: string;            // 交易ID
  originTxnId?: string;     // 原始交易ID（授权撤销时对应的原交易ID）
  
  // 交易类型和状态
  txnType: string;          // 交易类型：A=授权，D=授权撤销
  txnStatus: string;        // 交易状态：0=失败，1=成功
  
  // 交易金额信息
  txnCcy?: string;          // 交易币种
  txnAmt?: string;          // 交易金额（字符串格式）
  billCcy?: string;         // 账单币种
  billAmt?: string;         // 账单金额（字符串格式）
  
  // 授权信息
  authCode?: string;        // 授权码
  
  // 商户信息
  merchName?: string;       // 商户名称
  merchCtry?: string;       // 商户国家
  mcc?: string;             // 商家业务类型
  
  // 时间信息
  txnTime?: string;         // 交易时间
  
  // 失败信息
  declineReason?: string;   // 失败原因
  
  // 交易标志
  forcePost?: boolean;      // Force post
  preAuth?: boolean;        // Pre auth
  
  // 业务类型
  bizType?: string;         // 业务类型：01=提现，30=查询余额，99=消费
  
  // 内部处理字段
  finalCcy?: string;        // 最终币种（内部计算）
  finalAmt?: number;        // 最终金额（内部计算）
  
  // 原始回调数据
  rawData?: any;
}

// 结算账单回调请求数据 (基于授权交易的结算更新)
export interface SettleCallbackRequest {
  // 关联授权交易
  authTxnId: string;
  settleTxnId: string;
  
  // 结算金额信息
  settleBillCcy?: string;   // 结算账单币种
  settleBillAmt?: number;   // 结算账单金额
  
  // 最终显示金额（可能与授权不同）
  finalCcy: string;         // 最终币种
  finalAmt: number;         // 最终金额
  
  // 原始回调数据
  rawData?: any;
}

// 结算交易回调请求数据 (独立的消费C/退款R交易)
export interface SettlementCallbackRequest {
  // 卡片信息
  cardId: string;
  uid?: string;  // 用户ID（可选，因为可以通过cardId查找用户）
  
  // 交易标识
  txnId: string;
  authTxnId?: string;  // 关联的授权交易ID（如果有）
  
  // 交易类型和状态
  txnType: string;  // 'C'(消费) | 'R'(退款)
  txnStatus: string;
  bizType?: string;
  
  // 交易金额信息
  txnCcy?: string;      // 交易币种
  txnAmt?: number;      // 交易金额
  billCcy?: string;     // 账单币种
  billAmt?: number;     // 账单金额
  
  // 最终显示金额
  finalCcy: string;         // 最终币种
  finalAmt: number;         // 最终金额
  
  // 商户信息
  merchantName?: string;
  merchantCountry?: string;
  mcc?: string;
  authCode?: string;
  declineReason?: string;   // 拒绝原因
  clearingDate?: string;    // 清算日期
  txnTime?: string;         // 交易时间
  
  // 原始回调数据
  rawData?: any;
}

// 交易查询参数
export interface TransactionQueryParams {
  cardId?: string;
  username?: string;
  txnType?: CardTxnType | string; // 支持单个类型或逗号分隔的多个类型
  txnStatus?: string;
  startDate?: string;
  endDate?: string;
  page?: number;
  limit?: number;
  sortBy?: 'txnTime' | 'finalAmt';
  sortOrder?: 'asc' | 'desc';
}

// 交易响应数据
export interface TransactionResponse {
  id: number;
  cardId: string;
  username: string;
  txnId: string;
  authTxnId?: string;
  originTxnId: string;
  txnType: CardTxnType;
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

// 分页响应
export interface PaginatedTransactionResponse {
  data: TransactionResponse[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

// 交易统计信息
export interface TransactionStats {
  totalCount: number;
  totalAmount: number;
  currency: string;
  authCount: number;
  settleCount: number;
  refundCount: number;
  cancelCount: number;
}

// API响应格式
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
  error?: {
    code: string;
    message: string;
    details?: any;
  };
}

// 错误代码枚举
export enum ErrorCodes {
  INVALID_REQUEST = 'INVALID_REQUEST',
  CARD_NOT_FOUND = 'CARD_NOT_FOUND',
  USER_NOT_FOUND = 'USER_NOT_FOUND',
  TRANSACTION_NOT_FOUND = 'TRANSACTION_NOT_FOUND',
  DUPLICATE_TRANSACTION = 'DUPLICATE_TRANSACTION',
  INSUFFICIENT_BALANCE = 'INSUFFICIENT_BALANCE',
  CARD_INACTIVE = 'CARD_INACTIVE',
  USER_INACTIVE = 'USER_INACTIVE',
  UNAUTHORIZED = 'UNAUTHORIZED',
  DATABASE_ERROR = 'DATABASE_ERROR',
  BUSINESS_ERROR = 'BUSINESS_ERROR',
  INTERNAL_ERROR = 'INTERNAL_ERROR'
}
