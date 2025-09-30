import { Router } from 'express';
import { syncController } from '../controllers/syncController';
import { authenticateToken } from '../middleware/auth';

const router = Router();

// Sync routes loaded

/**
 * 测试路由
 */
router.get('/test', (req, res) => {
  res.json({ success: true, message: 'Sync API is working' });
});

/**
 * 同步授权账单
 * POST /api/sync/auth-transactions
 * Body: { dateStart: string, dateEnd: string, cardId?: string }
 */
router.post('/auth-transactions', async (req, res) => {
  await syncController.syncAuthTransactions(req, res);
});

/**
 * 同步结算账单
 * POST /api/sync/settle-transactions
 * Body: { dateStart: string, dateEnd: string }
 */
router.post('/settle-transactions', async (req, res) => {
  await syncController.syncSettleTransactions(req, res);
});

export default router;
