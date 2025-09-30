/**
 * 交易相关Mock数据
 */
import type { Request, Response } from 'express';

// Mock 授权记录数据
const mockAuthRecords = [
  {
    txnId: 'A1697503188240027650',
    originTxnId: '0',
    cardId: '63a27d3e59cfe6fe5b1bc298',
    realCardId: '63a27d3e59cfe6fe5b1bc298',
    txnType: 'A',
    txnStatus: '1',
    txnCcy: 'USD',
    txnAmt: 12.0,
    billCcy: 'USD',
    billAmt: 12.0,
    authCode: '126816',
    merchName: 'DIGITALOCEAN.COM',
    merchCtry: 'NLD',
    mcc: '5734 Computer Software Stores',
    txnTime: '2023-09-01T14:54:33.013Z',
    clearingDate: '2023-09-01',
    bizType: '99',
  },
  {
    txnId: 'A1698016873458106370',
    originTxnId: '0',
    cardId: '6483ed807e4119208ddbb8d3',
    realCardId: '6483ed807e4119208ddbb8d3',
    txnType: 'A',
    txnStatus: '1',
    txnCcy: 'USD',
    txnAmt: 150.59,
    billCcy: 'USD',
    billAmt: 150.59,
    authCode: '126817',
    merchName: 'Amazon web services',
    merchCtry: 'USA',
    mcc: '7399 Miscellaneous Business Services',
    txnTime: '2023-09-03T00:55:45.087Z',
    clearingDate: '2023-09-03',
    bizType: '99',
  },
  {
    txnId: 'A1698016873458106371',
    originTxnId: '0',
    cardId: '6483ed807e4119208ddbb8d3',
    realCardId: '6483ed807e4119208ddbb8d3',
    txnType: 'D',
    txnStatus: '1',
    txnCcy: 'USD',
    txnAmt: -150.59,
    billCcy: 'USD',
    billAmt: -150.59,
    authCode: '',
    merchName: 'Amazon web services',
    merchCtry: 'USA',
    mcc: '7399 Miscellaneous Business Services',
    declineReason: 'Customer cancelled',
    txnTime: '2023-09-03T01:25:45.087Z',
    clearingDate: '2023-09-03',
    bizType: '99',
  },
];

// Mock 结算记录数据
const mockSettleRecords = [
  {
    txnId: 'F1589442809',
    authTxnId: 'A1697503188240027650',
    cardId: '63a27d3e59cfe6fe5b1bc298',
    realCardId: '63a27d3e59cfe6fe5b1bc298',
    txnType: 'C',
    txnCcy: 'USD',
    txnAmt: 12.0,
    billCcy: 'USD',
    billAmt: 12.0,
    merchName: 'DIGITALOCEAN.COM',
    merchCtry: 'NLD',
    mcc: '5734 Computer Software Stores',
    clearingDate: '2023-09-02',
    bizType: '99',
  },
  {
    txnId: 'F1589442810',
    authTxnId: 'A1698016873458106370',
    cardId: '6483ed807e4119208ddbb8d3',
    realCardId: '6483ed807e4119208ddbb8d3',
    txnType: 'R',
    txnCcy: 'USD',
    txnAmt: -150.59,
    billCcy: 'USD',
    billAmt: -150.59,
    merchName: 'Amazon web services',
    merchCtry: 'USA',
    mcc: '7399 Miscellaneous Business Services',
    clearingDate: '2023-09-04',
    tradeNote: 'Customer refund',
    bizType: '99',
  },
];

// Mock 汇总数据
const mockSummary = {
  authSummary: {
    totalTransactions: mockAuthRecords.length,
    totalAmount: mockAuthRecords.reduce((sum, record) => sum + record.txnAmt, 0),
    successCount: mockAuthRecords.filter(record => record.txnStatus === '1').length,
    failedCount: mockAuthRecords.filter(record => record.txnStatus === '0').length,
    currency: 'USD',
    period: '7 days',
  },
  settleSummary: {
    totalTransactions: mockSettleRecords.length,
    totalAmount: mockSettleRecords.reduce((sum, record) => sum + record.txnAmt, 0),
    successCount: mockSettleRecords.length,
    failedCount: 0,
    currency: 'USD',
    period: '7 days',
  },
  cardCount: 2,
  dateRange: {
    startDate: '2023-09-01',
    endDate: '2023-09-07',
  },
};

const getTransactions = (req: Request, res: Response) => {
  const { page = 1, limit = 20 } = req.query;
  const pageNum = parseInt(page as string);
  const limitNum = parseInt(limit as string);
  
  // 合并授权和结算记录
  const allRecords = [
    ...mockAuthRecords.map(record => ({ ...record, recordType: 'AUTH' })),
    ...mockSettleRecords.map(record => ({ ...record, recordType: 'SETTLE' }))
  ];
  
  // 按时间排序（最新的在前）
  allRecords.sort((a, b) => new Date(b.txnTime || b.clearingDate).getTime() - new Date(a.txnTime || a.clearingDate).getTime());
  
  // 分页
  const startIndex = (pageNum - 1) * limitNum;
  const endIndex = startIndex + limitNum;
  const paginatedRecords = allRecords.slice(startIndex, endIndex);
  
  setTimeout(() => {
    res.json({
      success: true,
      data: {
        data: paginatedRecords,
        pagination: {
          page: pageNum,
          limit: limitNum,
          total: allRecords.length,
          totalPages: Math.ceil(allRecords.length / limitNum),
        }
      },
    });
  }, 300);
};

const getStatementSummary = (req: Request, res: Response) => {
  setTimeout(() => {
    res.json({
      success: true,
      data: mockSummary,
    });
  }, 200);
};

const getAuthRecordsByDateRange = (req: Request, res: Response) => {
  const { page = 1 } = req.query;
  
  setTimeout(() => {
    res.json({
      code: 200,
      message: 'success',
      data: {
        page: parseInt(page as string),
        pageSize: 100,
        totalCount: mockAuthRecords.length,
        keyList: ['card_id', 'txn_id', 'txn_type', 'txn_status', 'txn_time', 'txn_amt', 'txn_ccy', 'bill_amt', 'bill_ccy', 'mcc', 'merch_name', 'merch_ctry'],
        authList: mockAuthRecords.map(record => [
          record.cardId,
          record.txnId,
          record.txnType,
          record.txnStatus,
          record.txnTime,
          record.txnAmt.toString(),
          record.txnCcy,
          record.billAmt.toString(),
          record.billCcy,
          record.mcc,
          record.merchName,
          record.merchCtry,
        ]),
      },
    });
  }, 300);
};

const getSettleRecordsByDateRange = (req: Request, res: Response) => {
  const { page = 1 } = req.query;
  
  setTimeout(() => {
    res.json({
      code: 200,
      message: 'success',
      data: {
        page: parseInt(page as string),
        pageSize: 100,
        totalCount: mockSettleRecords.length,
        keyList: ['card_id', 'txn_id', 'txn_type', 'txn_amt', 'txn_ccy', 'bill_amt', 'bill_ccy', 'auth_txn_id', 'clearing_date', 'mcc', 'merch_name', 'merch_ctry'],
        settleList: mockSettleRecords.map(record => [
          record.cardId,
          record.txnId,
          record.txnType,
          record.txnAmt.toString(),
          record.txnCcy,
          record.billAmt.toString(),
          record.billCcy,
          record.authTxnId,
          record.clearingDate,
          record.mcc,
          record.merchName,
          record.merchCtry,
        ]),
      },
    });
  }, 300);
};

const exportStatement = (req: Request, res: Response) => {
  // 模拟文件导出
  const { format = 'excel' } = req.query;
  const filename = `statement.${format === 'excel' ? 'xlsx' : 'csv'}`;
  
  setTimeout(() => {
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Content-Type', format === 'excel' ? 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' : 'text/csv');
    
    // 返回简单的CSV内容作为示例
    const csvContent = [
      'Transaction ID,Card ID,Type,Status,Amount,Currency,Merchant,Country,Date',
      ...mockAuthRecords.map(record => 
        `${record.txnId},${record.cardId},${record.txnType},${record.txnStatus},${record.txnAmt},${record.txnCcy},${record.merchName},${record.merchCtry},${record.txnTime}`
      ),
      ...mockSettleRecords.map(record => 
        `${record.txnId},${record.cardId},${record.txnType},Success,${record.txnAmt},${record.txnCcy},${record.merchName},${record.merchCtry},${record.clearingDate}`
      ),
    ].join('\n');
    
    res.send(csvContent);
  }, 1000);
};

export default {
  'GET /api/transactions': getTransactions,
  'GET /api/transactions/summary': getStatementSummary,
  'GET /api/transactions/auth-list': getAuthRecordsByDateRange,
  'GET /api/transactions/settle-list': getSettleRecordsByDateRange,
  'GET /api/transactions/export': exportStatement,
};
