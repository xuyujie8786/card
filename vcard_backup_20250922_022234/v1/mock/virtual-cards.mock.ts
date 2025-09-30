/**
 * 虚拟卡管理 Mock 数据
 */
import type { Request, Response } from 'express';
import type { VirtualCard, CardDetail } from '@/types/virtual-card';

// 模拟虚拟卡数据
const mockCards: VirtualCard[] = [
  {
    id: 1,
    cardId: 'CARD_123456789',
    cardNo: '4532123456789012',
    cvv: '123',
    expDate: '12/26',
    balance: 1500.50,
    currency: 'USD',
    status: '1',
    statusText: '已激活',
    remark: '测试卡片1',
    cardholderName: '张三',
    cardholderUsername: 'zhangsan001',
    cardholderEmail: 'zhangsan@example.com',
    createdBy: {
      id: 1,
      username: 'admin',
      name: '管理员',
    },
    createdAt: '2024-01-15T10:30:00Z',
    updatedAt: '2024-01-15T10:30:00Z',
  },
  {
    id: 2,
    cardId: 'CARD_987654321',
    cardNo: '4532987654321098',
    cvv: '456',
    expDate: '06/27',
    balance: 0.00,
    currency: 'USD',
    status: '2',
    statusText: '已冻结',
    remark: '测试卡片2',
    cardholderName: '李四',
    cardholderUsername: 'lisi002',
    cardholderEmail: 'lisi@example.com',
    createdBy: {
      id: 1,
      username: 'admin',
      name: '管理员',
    },
    createdAt: '2024-01-16T14:20:00Z',
    updatedAt: '2024-01-16T14:20:00Z',
  },
  {
    id: 3,
    cardId: 'CARD_456789123',
    cardNo: '4532456789123456',
    cvv: '789',
    expDate: '03/28',
    balance: 250.75,
    currency: 'USD',
    status: '1',
    statusText: '已激活',
    remark: '业务订单ABC123',
    cardholderName: '王五',
    cardholderUsername: 'wangwu003',
    cardholderEmail: 'wangwu@example.com',
    createdBy: {
      id: 2,
      username: 'manager001',
      name: '经理A',
    },
    createdAt: '2024-01-17T09:15:00Z',
    updatedAt: '2024-01-17T09:15:00Z',
  },
];

// 获取虚拟卡列表
export default {
  'GET /api/virtual-cards': (req: Request, res: Response) => {
    const { current = 1, pageSize = 20, cardNo, remark, status } = req.query;
    
    let filteredCards = [...mockCards];
    
    // 过滤条件
    if (cardNo) {
      filteredCards = filteredCards.filter(card => 
        card.cardNo.includes(cardNo as string)
      );
    }
    
    if (remark) {
      filteredCards = filteredCards.filter(card => 
        card.remark?.includes(remark as string)
      );
    }
    
    if (status) {
      filteredCards = filteredCards.filter(card => card.status === status);
    }
    
    // 分页
    const start = (Number(current) - 1) * Number(pageSize);
    const end = start + Number(pageSize);
    const paginatedCards = filteredCards.slice(start, end);
    
    res.json({
      code: 200,
      message: 'success',
      data: {
        list: paginatedCards,
        pagination: {
          current: Number(current),
          pageSize: Number(pageSize),
          total: filteredCards.length,
        },
      },
    });
  },

  // 创建虚拟卡
  'POST /api/virtual-cards': (req: Request, res: Response) => {
    const { productCode, amt, expdate, remark } = req.body;
    
    // 模拟创建成功响应
    const newCard = {
      userId: '12345',
      cardId: `CARD_${Date.now()}`,
      cardNo: `4532${Math.floor(Math.random() * 1000000000000)}`,
      expDate: '12/27',
      cvv: String(Math.floor(Math.random() * 900) + 100),
      cardBal: amt,
      curId: 'USD',
      tradeNo: String(Date.now()),
      sub_id: null,
      request_id: '',
    };
    
    res.json({
      code: 200,
      message: '虚拟卡创建成功',
      data: newCard,
    });
  },

  // 获取虚拟卡详情
  'GET /api/virtual-cards/:cardId': (req: Request, res: Response) => {
    const { cardId } = req.params;
    const card = mockCards.find(c => c.cardId === cardId);
    
    if (!card) {
      res.json({
        code: 404,
        message: '卡片不存在',
        data: null,
      });
      return;
    }
    
    const cardDetail: CardDetail = {
      ...card,
      usedAmt: '100.25',
      totalAmt: '1600.75',
      card_email: card.cardholderEmail,
    };
    
    res.json({
      code: 200,
      message: 'success',
      data: cardDetail,
    });
  },

  // 卡片充值
  'POST /api/virtual-cards/recharge': (req: Request, res: Response) => {
    const { cardId, amt } = req.body;
    
    res.json({
      code: 200,
      message: '充值成功',
      data: {
        userId: '12345',
        amount: amt,
        cardBal: String(Number(amt) + 1000),
        curId: 'USD',
      },
    });
  },

  // 卡片提现
  'POST /api/virtual-cards/withdraw': (req: Request, res: Response) => {
    const { cardId, amt } = req.body;
    
    res.json({
      code: 200,
      message: '提现成功',
      data: {
        userId: '12345',
        amount: amt,
        cardBal: String(1000 - Number(amt)),
        curId: 'USD',
      },
    });
  },

  // 获取授权记录
  'GET /api/virtual-cards/:cardId/auth-records': (req: Request, res: Response) => {
    const mockAuthRecords = [
      {
        txnId: 'A1571774975501815810',
        originTxnId: '0',
        cardId: '1571773237683429378',
        txnType: 'A',
        txnStatus: '1',
        txnCcy: 'CNY',
        txnAmt: 527.99,
        billCcy: 'USD',
        billAmt: 75.52,
        authCode: '123456',
        merchName: 'EXPEDIA 72392451661043 EXPEDIA.CN ESP',
        merchCtry: 'ESP',
        mcc: '4722 Travel Agencies, Tour Operators',
        declineReason: '',
        txnTime: '2022-09-19T16:15:30.983',
        clearingDate: '2022-09-19',
      },
    ];
    
    res.json({
      code: 200,
      message: 'success',
      data: {
        pageInfo: {
          total: mockAuthRecords.length,
          current: 1,
          size: 100,
        },
        list: mockAuthRecords,
      },
    });
  },

  // 获取结算记录
  'GET /api/virtual-cards/:cardId/settle-records': (req: Request, res: Response) => {
    const mockSettleRecords = [
      {
        txnId: 'F1571864633350946817',
        authTxnId: 'A1571774975501815810',
        cardId: '1571773237683429378',
        txnType: 'C',
        txnCcy: 'CNY',
        txnAmt: 527.99,
        billCcy: 'USD',
        billAmt: 75.52,
        merchName: 'EXPEDIA 72392451661043 EXPEDIA.CN ESP',
        merchCtry: 'ESP',
        mcc: '4722 Travel Agencies, Tour Operators',
        clearingDate: '2022-09-19',
        trade_note: '',
      },
    ];
    
    res.json({
      code: 200,
      message: 'success',
      data: {
        pageInfo: {
          total: mockSettleRecords.length,
          current: 1,
          size: 100,
        },
        list: mockSettleRecords,
      },
    });
  },
};
