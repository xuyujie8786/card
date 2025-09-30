/**
 * 账户流水相关类型定义
 */

import { AccountOperationType } from '@prisma/client';

export interface AccountFlowData {
  id: number;
  userId: number; // 流水记录归属用户（余额发生变化的用户）
  operationType: AccountOperationType;
  amount: number;
  currency: string;
  balanceBefore: number;
  balanceAfter: number;
  targetUserId?: number; // 流水涉及的另一方用户ID（充值/提现的对方）
  operatorId: number; // 操作员ID（执行操作的用户）
  operatorName: string;
  description?: string;
  relatedFlowId?: number; // 关联的另一条流水记录ID（双向流水）
  businessType?: string;
  businessId?: string;
  createdAt: Date;
  // 关联数据
  user?: {
    id: number;
    username: string;
    name?: string;
  };
  targetUser?: {
    id: number;
    username: string;
    name?: string;
  };
  operator?: {
    id: number;
    username: string;
    name?: string;
  };
}

export interface CreateAccountFlowRequest {
  userId: number;
  operationType: AccountOperationType;
  amount: number;
  currency?: string;
  balanceBefore: number;
  balanceAfter: number;
  targetUserId?: number;
  operatorId: number;
  operatorName: string;
  description?: string;
  businessType?: string;
  businessId?: string;
}

export interface AccountFlowQueryParams {
  current?: number;
  pageSize?: number;
  userId?: number;
  operationType?: AccountOperationType;
  businessType?: string;
  startDate?: string;
  endDate?: string;
  operatorId?: number;
  targetUserId?: number;
}

export interface AccountFlowResponse {
  data: AccountFlowData[];
  total: number;
  current: number;
  pageSize: number;
}

// 双向流水记录参数
export interface DualFlowParams {
  operatorUserId: number;
  targetUserId: number;
  amount: number;
  currency?: string;
  operatorId: number;
  operatorName: string;
  description?: string;
  businessType?: string;
  businessId?: string;
  isRecharge: boolean; // true为充值，false为提现
}
