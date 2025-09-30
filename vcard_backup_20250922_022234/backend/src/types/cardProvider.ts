/**
 * 卡商API相关类型定义
 */

// 支持的币种
export type Currency = 'USD' | 'HKD' | 'AUD' | 'JPY' | 'CAD' | 'EUR' | 'GBP' | 'SGD' | 'THB' | 'NZD' | 'MYR' | 'IDR' | 'CNH' | 'PHP';

// 产品代码
export type ProductCode = 'E0000001' | 'G0000001'; // 香港卡 | 英国卡

// 卡片状态
export type CardStatus = '0' | '1' | '2' | '3' | '4' | '9'; // 已注销 | 已激活 | 已冻结 | 已过期 | 已锁定 | 待激活

// 交易类型 - 授权
export type AuthTxnType = 'A' | 'D' | 'F'; // 授权 | 授权撤销 | 失败

// 交易类型 - 结算
export type SettleTxnType = 'C' | 'R'; // 消费 | 退款

// 交易状态
export type TxnStatus = '0' | '1'; // 失败 | 成功

// 业务类型
export type BizType = '01' | '30' | '99'; // 提现 | 查询余额 | 消费

/**
 * 创建虚拟卡请求
 */
export interface CreateCardRequest {
  amt: string; // 开卡金额，最多支持2位小数
  currency: Currency; // 货币类型
  expdate: string; // 过期时间，格式：YYYY-MM-DD，要求大于30天，小于4年
  remark?: string; // 卡备注，最长32位
  productCode: ProductCode; // 产品代码
  cardBin?: string; // card bin，特定产品可选
  sub_id?: string; // 子账户id
  request_id?: string; // 请求ID，每个用户每次请求不能重复
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
  amt: string; // 充值金额，最多支持2位小数
  request_id?: string; // 请求ID
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
  amt: string; // 提现金额，最多支持2位小数
  request_id?: string; // 请求ID
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
 * 卡片释放请求
 */
export interface ReleaseCardRequest {
  cardId: string; // 卡片ID
  request_id?: string; // 请求ID
}

/**
 * 卡片释放响应
 */
export interface ReleaseCardResponse {
  releaseBal: string; // 卡片剩余金额，会返回到用户余额
}

/**
 * 卡片详情请求
 */
export interface GetCardInfoRequest {
  cardId?: string; // 卡片ID
  request_id?: string; // 请求ID，与cardId二选一
}

/**
 * 卡片详情响应
 */
export interface GetCardInfoResponse {
  cardId: string; // 卡片ID
  cardNo: string; // 卡号
  expDate: string; // 卡片过期时间，格式：MM/YY
  cvv: string; // 卡片CVV
  cardBal: string; // 卡片余额
  curId: Currency; // 卡片币种
  remark?: string; // 卡片备注
  status: CardStatus; // 卡片状态
  usedAmt: string; // 已使用金额
  totalAmt: string; // 总金额
  sub_id?: string; // 子账户ID
  card_email?: string; // 卡片绑定的email
}

/**
 * 更新卡片邮箱请求
 */
export interface UpdateCardEmailRequest {
  cardId: string; // 卡片ID
  card_email: string; // 需要绑定的email地址
}

/**
 * 更新卡片邮箱响应
 */
export interface UpdateCardEmailResponse {
  cardId: string; // 卡片ID
  card_email: string; // 绑定的email地址
}

/**
 * 卡片冻结/激活请求
 */
export interface CardStatusRequest {
  cardId: string; // 卡片ID
}

/**
 * 卡片冻结/激活响应
 */
export interface CardStatusResponse {
  cardId: string; // 卡片ID
  status: CardStatus; // 卡片状态
}

/**
 * 获取用户余额响应
 */
export interface GetUserBalanceResponse {
  hk_bal: {
    bal_list: Array<{
      ccy: Currency; // 余额币种
      pendingAmt: string; // 冻结金额
      acctBal: string; // 账户余额
      actBal: string; // 可用余额
    }>;
  };
}

/**
 * 获取授权记录请求
 */
export interface GetAuthRecordsRequest {
  cardId: string; // 卡片ID
  start: string; // 第几页数据
}

/**
 * 授权记录
 */
export interface AuthRecord {
  txnId: string; // 交易ID
  originTxnId: string; // 原始交易ID，授权撤销时对应的原交易ID
  cardId: string; // 卡片流水号，注意这个不是卡片ID
  txnType: AuthTxnType; // 交易类型
  txnStatus: TxnStatus; // 交易状态
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
  sub_id?: string; // 子账户ID
  forcePost: boolean;
  pre_auth: boolean;
  biz_type: BizType; // 业务类型
  real_card_id: string; // 真实卡片ID
}

/**
 * 获取授权记录响应
 */
export interface GetAuthRecordsResponse {
  pageInfo: {
    total: number; // 总数据条数
    current: number; // 当前页数
    size: number; // 每页条数
  };
  list: AuthRecord[];
}

/**
 * 获取结算记录请求
 */
export interface GetSettleRecordsRequest {
  cardId: string; // 卡片ID
  start: string; // 第几页数据
}

/**
 * 结算记录
 */
export interface SettleRecord {
  txnId: string; // 结算交易ID
  authTxnId: string; // 关联授权ID
  cardId: string; // 卡片流水号，注意这个不是卡片ID
  txnType: SettleTxnType; // 交易类型
  txnCcy: Currency; // 交易币种
  txnAmt: number; // 交易金额
  billCcy: Currency; // 账单币种
  billAmt: number; // 账单金额
  merchName: string; // 商户名称
  merchCtry: string; // 商户国家
  mcc: string; // 商家业务类型
  clearingDate: string; // 清算日期
  trade_note?: string; // 旅游订单备注
  biz_type: BizType; // 业务类型
  real_card_id: string; // 真实卡片ID
}

/**
 * 获取结算记录响应
 */
export interface GetSettleRecordsResponse {
  pageInfo: {
    total: number; // 总数据条数
    current: number; // 当前页数
    size: number; // 每页条数
  };
  list: SettleRecord[];
}

// API 14 - 按日期范围获取授权信息
/**
 * 按日期范围获取授权信息请求
 */
export interface GetAuthListRequest {
  date_start: string; // 起始日期，格式：YYYY-MM-DD
  date_end: string; // 结束日期，格式：YYYY-MM-DD，日期间隔不大于30天
  page: number; // 第几页数据，每页最多100条数据
  card_id?: string; // 可选，如果传card_id，则只返回对应卡片的数据
}

/**
 * 授权列表数据项（API 14返回的数组格式）
 */
export type AuthListItem = [
  string, // card_id - 卡片ID
  string, // txn_id - 交易ID
  string, // txn_type - 交易类型（A：授权，D：授权撤销）
  string, // txn_status - 交易状态（0：失败，1：成功）
  string, // txn_time - 交易时间
  string, // txn_amt - 交易金额
  string, // txn_ccy - 交易币种
  string, // bill_amt - 账单金额
  string, // bill_ccy - 账单币种
  string, // mcc - 商家业务类型
  string, // merch_name - 商户名称
  string, // merch_ctry - 商户国家
  string, // origin_txn_id - 原始交易ID
  string  // decline_reason - 拒绝原因
];

/**
 * 按日期范围获取授权信息响应
 */
export interface GetAuthListResponse {
  page: number; // 当前页数
  page_size: number; // 每页最大条数
  total_count: number; // 总数
  key_list: string[]; // 字段列表
  auth_list: AuthListItem[]; // 授权数据列表
}

// API 15 - 按日期范围获取结算信息
/**
 * 按日期范围获取结算信息请求
 */
export interface GetSettleListRequest {
  date_start: string; // 起始日期，格式：YYYY-MM-DD
  date_end: string; // 结束日期，格式：YYYY-MM-DD，日期间隔不大于30天
  page: number; // 第几页数据，每页最多100条数据
}

/**
 * 结算列表数据项（API 15返回的数组格式）
 */
export type SettleListItem = [
  string, // card_id - 卡片ID
  string, // txn_id - 交易ID
  string, // txn_type - 交易类型（C：消费，R：退款）
  string, // txn_amt - 交易金额
  string, // txn_ccy - 交易币种
  string, // bill_amt - 账单金额
  string, // bill_ccy - 账单币种
  string, // auth_txn_id - 授权ID
  string, // clearing_date - 结算日期
  string, // mcc - 商家业务类型
  string, // merch_name - 商户名称
  string, // merch_ctry - 商户国家
  string, // auth_code - 授权码
  string | null, // sub_id - 子账户ID
  string | null  // trade_note - 旅游订单备注
];

/**
 * 按日期范围获取结算信息响应
 */
export interface GetSettleListResponse {
  page: number; // 当前页数
  page_size: number; // 每页最大条数
  total_count: number; // 总数
  key_list: string[]; // 字段列表
  settle_list: SettleListItem[]; // 结算数据列表
}
