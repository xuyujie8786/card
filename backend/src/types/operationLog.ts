export enum OperationType {
  CREATE_CARD = 'create_card',    // 开卡：正数，卡金额
  DELETE_CARD = 'delete_card',    // 删卡：负数，卡剩余额度
  RECHARGE = 'recharge',          // 充值：正数，充值金额
  WITHDRAW = 'withdraw',          // 提现：负数，提现金额
  FREEZE = 'freeze',              // 冻结：0
  UNFREEZE = 'unfreeze',          // 解冻：0
}

export enum CardStatus {
  ACTIVE = 'active',
  FROZEN = 'frozen',
  RELEASED = 'released',
}

export interface CreateOperationLogRequest {
  cardId: string;
  cardNo: string;
  operationType: OperationType;
  amount: number;
  currency?: string;
  description?: string;
}

export interface OperationLogResponse {
  id: number;
  cardId: string;
  cardNo: string;
  operationType: OperationType;
  amount: string;
  currency: string;
  operatorId: number;
  operatorName: string;
  description?: string;
  cardStatus: CardStatus;
  createdAt: string;
}

export interface OperationLogListRequest {
  current?: number;
  pageSize?: number;
  cardId?: string;
  cardNo?: string;
  operationType?: OperationType;
  startDate?: string;
  endDate?: string;
  operatorName?: string;
  cardStatus?: CardStatus;
}

export interface OperationLogListResponse {
  data: OperationLogResponse[];
  total: number;
  current: number;
  pageSize: number;
}
