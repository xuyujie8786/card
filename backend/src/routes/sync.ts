import express, { Request, Response } from 'express';
import { SyncController } from '../controllers/syncController';
import { authenticateToken, requireSuperAdmin } from '../middleware/auth';

const router = express.Router();

/**
 * 同步相关路由
 * 需要管理员权限
 */

// 获取定时同步调度器状态
router.get('/scheduler/status', authenticateToken, requireSuperAdmin, SyncController.getSchedulerStatus);

// 手动触发定时同步任务
router.post('/scheduler/trigger', authenticateToken, requireSuperAdmin, SyncController.triggerManualSync);

// 手动触发原始同步接口（保留现有功能）
router.post('/manual', authenticateToken, requireSuperAdmin, SyncController.manualSyncTransactions);

// 前端期望的API路径 - 授权账单同步
router.post('/auth-transactions', authenticateToken, requireSuperAdmin, async (req: Request, res: Response) => {
  // 转换前端参数格式到后端格式
  const { dateStart, dateEnd, cardId } = req.body;
  const transformedBody = {
    syncType: 'auth',
    dateStart,
    dateEnd,
    cardId
  };
  req.body = transformedBody;
  return SyncController.manualSyncTransactions(req, res);
});

// 前端期望的API路径 - 结算账单同步
router.post('/settle-transactions', authenticateToken, requireSuperAdmin, async (req: Request, res: Response) => {
  // 转换前端参数格式到后端格式
  const { dateStart, dateEnd, cardId } = req.body;
  const transformedBody = {
    syncType: 'settle',
    dateStart,
    dateEnd,
    cardId
  };
  req.body = transformedBody;
  return SyncController.manualSyncTransactions(req, res);
});

export default router;