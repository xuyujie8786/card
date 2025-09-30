import { Router } from 'express';
import { DashboardController } from '../controllers/dashboardController';
import { authenticateToken } from '../middleware/auth';

const router = Router();

/**
 * 仪表盘路由
 * 所有路由都需要认证
 */

// 获取用户仪表盘数据
router.get('/data', authenticateToken, DashboardController.getDashboardData);

// 获取用户财务详情
router.get('/financial-details', authenticateToken, DashboardController.getFinancialDetails);

// 获取系统总览数据（管理员专用）
router.get('/system-overview', authenticateToken, DashboardController.getSystemOverview);

// 获取消费趋势数据
router.get('/consumption-trend', authenticateToken, DashboardController.getConsumptionTrend);

export default router;

