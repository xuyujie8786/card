import { Router } from 'express';
import { body, param, query } from 'express-validator';
import cardController from '../controllers/cardController';
import { authenticateToken, authorizeRoles } from '../middleware/auth';

const router = Router();

// 所有路由都需要认证
router.use(authenticateToken as any);

/**
 * 创建虚拟卡（简化版本）
 * POST /api/virtual-cards
 */
router.post('/',
  [
    body('productCode')
      .optional()
      .isIn(['E0000001', 'G0000001'])
      .withMessage('Invalid product code'),
    body('amt')
      .optional()
      .isDecimal({ decimal_digits: '0,2' })
      .withMessage('Amount must be a decimal with up to 2 decimal places'),
    body('expdate')
      .isISO8601()
      .withMessage('Invalid expiration date format')
      .custom((value) => {
        const expDate = new Date(value);
        const now = new Date();
        const thirtyDaysLater = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
        const fourYearsLater = new Date(now.getTime() + 4 * 365 * 24 * 60 * 60 * 1000);
        
        if (expDate < thirtyDaysLater) {
          throw new Error('Expiration date must be at least 30 days from now');
        }
        if (expDate > fourYearsLater) {
          throw new Error('Expiration date must be within 4 years from now');
        }
        return true;
      }),
    body('currency')
      .optional()
      .isIn(['USD', 'HKD', 'AUD', 'JPY', 'CAD', 'EUR', 'GBP', 'SGD', 'THB', 'NZD', 'MYR', 'IDR', 'CNH', 'PHP'])
      .withMessage('Invalid currency'),
    body('remark')
      .optional()
      .isLength({ max: 32 })
      .withMessage('Remark must not exceed 32 characters')
  ],
  authorizeRoles(['ADMIN', 'SUPER_ADMIN']) as any, // 只有管理员可以创建卡片
  cardController.createCardSimple
);

/**
 * 获取卡片列表
 * GET /api/virtual-cards
 */
router.get('/',
  [
    query('current')
      .optional()
      .isInt({ min: 1 })
      .withMessage('Current page must be a positive integer'),
    query('pageSize')
      .optional()
      .isInt({ min: 1, max: 100 })
      .withMessage('Page size must be between 1 and 100'),
    query('cardholderUsername')
      .optional()
      .isLength({ min: 1, max: 50 })
      .withMessage('Username filter must be between 1 and 50 characters'),
    query('cardNo')
      .optional()
      .isLength({ min: 4, max: 20 })
      .withMessage('Card number filter must be between 4 and 20 characters'),
    query('remark')
      .optional()
      .isLength({ min: 1, max: 50 })
      .withMessage('Remark filter must be between 1 and 50 characters'),
    query('status')
      .optional()
      .isIn(['0', '1', '2', '3', '4', '9'])
      .withMessage('Invalid status filter')
  ],
  cardController.getCards
);

/**
 * 获取卡片详情
 * GET /api/virtual-cards/:cardId
 */
router.get('/:cardId',
  [
    param('cardId')
      .isString()
      .isLength({ min: 1, max: 50 })
      .withMessage('Card ID must be a valid string')
  ],
  cardController.getCardDetail
);

/**
 * 卡片充值
 * POST /api/virtual-cards/:cardId/recharge
 */
router.post('/:cardId/recharge',
  [
    param('cardId')
      .isString()
      .isLength({ min: 1, max: 50 })
      .withMessage('Card ID must be a valid string'),
    body('amount')
      .isFloat({ min: 0.01, max: 10000 })
      .withMessage('Amount must be between 0.01 and 10000')
  ],
  authorizeRoles(['ADMIN', 'SUPER_ADMIN']) as any, // 只有管理员可以充值
  cardController.rechargeCard
);

/**
 * 卡片提现
 * POST /api/virtual-cards/:cardId/withdraw
 */
router.post('/:cardId/withdraw',
  [
    param('cardId')
      .isString()
      .isLength({ min: 1, max: 50 })
      .withMessage('Card ID must be a valid string'),
    body('amount')
      .isFloat({ min: 0.01, max: 10000 })
      .withMessage('Amount must be between 0.01 and 10000')
  ],
  authorizeRoles(['ADMIN', 'SUPER_ADMIN']) as any, // 只有管理员可以提现
  cardController.withdrawCard
);

/**
 * 冻结/激活卡片切换
 * POST /api/virtual-cards/:cardId/toggle-status
 */
router.post('/:cardId/toggle-status',
  [
    param('cardId')
      .isString()
      .isLength({ min: 1, max: 50 })
      .withMessage('Card ID must be a valid string')
  ],
  authorizeRoles(['ADMIN', 'SUPER_ADMIN']) as any,
  cardController.toggleCardStatus
);

/**
 * 更新卡片备注
 * PUT /api/virtual-cards/:cardId/remark
 */
router.put('/:cardId/remark',
  [
    param('cardId')
      .isString()
      .isLength({ min: 1, max: 50 })
      .withMessage('Card ID must be a valid string'),
    body('remark')
      .optional()
      .isLength({ max: 32 })
      .withMessage('Remark must not exceed 32 characters')
  ],
  authorizeRoles(['ADMIN', 'SUPER_ADMIN']) as any,
  cardController.updateCardRemark
);

/**
 * 删除卡片（释放卡片）
 * DELETE /api/virtual-cards/:cardId
 */
router.delete('/:cardId',
  [
    param('cardId')
      .isString()
      .isLength({ min: 1, max: 50 })
      .withMessage('Card ID must be a valid string')
  ],
  authorizeRoles(['ADMIN', 'SUPER_ADMIN']) as any,
  cardController.deleteCard
);

/**
 * 获取交易记录
 * GET /api/cards/:id/transactions
 */
router.get('/:id/transactions',
  [
    param('id')
      .isInt({ min: 1 })
      .withMessage('Card ID must be a positive integer'),
    query('type')
      .optional()
      .isIn(['auth', 'settle'])
      .withMessage('Transaction type must be auth or settle'),
    query('page')
      .optional()
      .isInt({ min: 1 })
      .withMessage('Page must be a positive integer')
  ],
  cardController.getTransactions
);

/**
 * 更新卡片邮箱
 * PUT /api/cards/:id/email
 */
router.put('/:id/email',
  [
    param('id')
      .isInt({ min: 1 })
      .withMessage('Card ID must be a positive integer'),
    body('email')
      .isEmail()
      .withMessage('Invalid email format')
  ],
  authorizeRoles(['ADMIN', 'SUPER_ADMIN']) as any,
  async (req: any, res: any) => {
    // 这里可以添加更新邮箱逻辑
    res.status(501).json({ message: 'Update email functionality not implemented yet' });
  }
);

/**
 * 测试卡商API连接
 * GET /api/virtual-cards/test/connection
 */
router.get('/test/connection',
  authorizeRoles(['SUPER_ADMIN']) as any, // 只有超级管理员可以测试
  async (req: any, res: any) => {
    try {
      const { CardProviderService } = await import('../services/cardProviderService');
      const service = new CardProviderService();
      const isConnected = await service.testConnection();
      
      res.json({
        code: 200,
        message: isConnected ? 'Connection successful' : 'Connection failed',
        data: { connected: isConnected }
      });
    } catch (error) {
      res.status(500).json({
        code: 500,
        message: 'Connection test failed',
        data: { connected: false, error: error instanceof Error ? error.message : 'Unknown error' }
      });
    }
  }
);

/**
 * 测试卡商API创建卡片
 * POST /api/virtual-cards/test/create
 */
router.post('/test/create',
  authorizeRoles(['ADMIN', 'SUPER_ADMIN']) as any,
  cardController.testCardProvider
);

export default router;
