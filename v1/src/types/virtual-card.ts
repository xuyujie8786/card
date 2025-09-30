/**
 * 虚拟卡相关类型定义
 */

// 支持的币种
export type Currency = 'USD' | 'HKD' | 'AUD' | 'JPY' | 'CAD' | 'EUR' | 'GBP' | 'SGD' | 'THB' | 'NZD' | 'MYR' | 'IDR' | 'CNH' | 'PHP';

// 产品代码
export type ProductCode = 'E0000001' | 'G0000001'; // 香港卡 | 英国卡

// 卡片状态
export type CardStatus = '0' | '1' | '2' | '3' | '4' | '9'; // 已注销 | 已激活 | 已冻结 | 已过期 | 已锁定 | 待激活

// 卡片状态文本映射
export const CardStatusText: Record<CardStatus, string> = {
  '0': '已注销',
  '1': '已激活',
  '2': '已冻结',
  '3': '已过期',
  '4': '已锁定',
  '9': '待激活',
};

// 产品代码文本映射
export const ProductCodeText: Record<ProductCode, string> = {
  'E0000001': '香港卡',
  'G0000001': '英国卡',
};

/**
 * 虚拟卡接口
 */
export interface VirtualCard {
  id: number;
  cardId: string; // 卡商返回的卡片ID
  cardNo: string; // 卡号
  cvv: string; // CVV码
  expDate: string; // 过期时间 MM/YY格式
  balance: number; // 余额
  currency: Currency; // 币种
  status: CardStatus; // 卡片状态
  statusText: string; // 状态文本
  remark?: string; // 备注
  
  // 开卡人信息
  cardholderName: string; // 开卡人姓名
  cardholderUsername: string; // 开卡人用户名
  cardholderEmail?: string; // 开卡人邮箱
  
  // 创建者信息
  createdBy: {
    id: number;
    username: string;
    name: string;
  };
  
  // 时间信息
  createdAt: string;
  updatedAt: string;
}

/**
 * 创建虚拟卡请求
 */
export interface CreateCardRequest {
  productCode?: ProductCode; // 产品代码，默认香港卡
  amt?: string; // 开卡金额，格式：123.45，默认0.01
  expdate: string; // 过期时间，格式：YYYY-MM-DD
  currency?: Currency; // 货币类型，默认USD
  remark?: string; // 卡备注
  // 注意：持卡人信息会自动使用当前登录用户的信息
}

/**
 * 创建虚拟卡响应
 */
export interface CreateCardResponse {
  userId: string; // 用户ID
  cardId: string; // 卡片ID
  cardNo: string; // 卡号
  expDate: string; // 卡片过期时间，格式：MM/YY
  cvv: string; // 卡片CVV
  cardBal: string; // 卡片余额
  curId: Currency; // 卡片币种
  tradeNo: string; // 卡片流水号
  sub_id?: string; // 子账户ID
  request_id?: string; // 请求ID
}

/**
 * 卡片充值请求
 */
export interface RechargeCardRequest {
  cardId: string; // 卡片ID
  amt: string; // 充值金额
}

/**
 * 卡片充值响应
 */
export interface RechargeCardResponse {
  userId: string; // 用户ID
  amount: string; // 用户充值金额
  cardBal: string; // 卡片余额
  curId: Currency; // 卡片币种
}

/**
 * 卡片提现请求
 */
export interface WithdrawCardRequest {
  cardId: string; // 卡片ID
  amt: string; // 提现金额
}

/**
 * 卡片提现响应
 */
export interface WithdrawCardResponse {
  userId: string; // 用户ID
  amount: string; // 用户提现金额
  cardBal: string; // 卡片余额
  curId: Currency; // 卡片币种
}

/**
 * 卡片列表查询参数
 */
export interface CardListParams {
  current?: number;
  pageSize?: number;
  cardNo?: string; // 卡号（模糊查找）
  remark?: string; // 备注（模糊查找）
  status?: CardStatus; // 状态
}

/**
 * 卡片详情
 */
export interface CardDetail extends VirtualCard {
  usedAmt: string; // 已使用金额
  totalAmt: string; // 总金额
  card_email?: string; // 卡片绑定的email
  totalRecharge: number; // 总充值
  totalConsumption: number; // 总消费
}

/**
 * 授权记录
 */
export interface AuthRecord {
  txnId: string; // 交易ID
  originTxnId: string; // 原始交易ID
  cardId: string; // 卡片流水号
  txnType: 'A' | 'D'; // 交易类型 A：授权 D：授权撤销
  txnStatus: '0' | '1'; // 交易状态 0：失败 1：成功
  txnCcy: Currency; // 交易币种
  txnAmt: number; // 交易金额
  billCcy: Currency; // 账单币种
  billAmt: number; // 账单金额
  authCode: string; // 授权码
  merchName: string; // 商户名称
  merchCtry: string; // 商户国家
  mcc: string; // 商家业务类型
  declineReason?: string; // 拒绝原因
  txnTime: string; // 交易时间
  clearingDate: string; // 清算日期
}

/**
 * 结算记录
 */
export interface SettleRecord {
  txnId: string; // 结算交易ID
  authTxnId: string; // 关联授权ID
  cardId: string; // 卡片流水号
  txnType: 'C' | 'R'; // 交易类型 C：消费 R：退款
  txnCcy: Currency; // 交易币种
  txnAmt: number; // 交易金额
  billCcy: Currency; // 账单币种
  billAmt: number; // 账单金额
  merchName: string; // 商户名称
  merchCtry: string; // 商户国家
  mcc: string; // 商家业务类型
  clearingDate: string; // 清算日期
  trade_note?: string; // 旅游订单备注
}
