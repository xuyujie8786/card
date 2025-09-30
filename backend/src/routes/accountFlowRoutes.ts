/**
 * 账户流水路由
 */

import { Router } from 'express';
import { authenticateToken } from '../middleware/auth';
import { AccountFlowController } from '../controllers/accountFlowController';

const router = Router();

// 所有路由都需要认证
router.use(authenticateToken);

// 获取账户流水列表（管理员可查看所有，用户只能查看自己的）
router.get('/', AccountFlowController.getFlows);

// 获取我的流水记录
router.get('/my', AccountFlowController.getMyFlows);

// 获取用户流水统计
router.get('/summary', AccountFlowController.getUserFlowSummary);

export default router;
