import { Response } from 'express';
import { DashboardService } from '../services/dashboardService';
import { AuthRequest } from '../middleware/auth';
import logger from '../config/logger';

export class DashboardController {
  /**
   * 获取用户仪表盘数据
   */
  static async getDashboardData(req: AuthRequest, res: Response): Promise<Response | void> {
    try {
      const userId = req.user?.id;
      const userRole = req.user?.role;
      
      if (!userId) {
        return res.status(401).json({
          success: false,
          message: '用户未认证'
        });
      }

      // 权限检查：所有用户都能查看自己的财务数据
      // 每个人都有自己的账户余额、充值记录等财务信息

      logger.info('📊 获取用户仪表盘数据请求', { userId, userRole });

      // 所有用户都能看到自己的财务数据
      const dashboardData = await DashboardService.getDashboardData(userId);

      res.json({
        success: true,
        data: dashboardData,
        message: '获取仪表盘数据成功'
      });

    } catch (error) {
      logger.error('❌ 获取仪表盘数据失败', { 
        userId: req.user?.id,
        error: error instanceof Error ? error.message : error 
      });
      
      res.status(500).json({
        success: false,
        message: '获取仪表盘数据失败',
        error: process.env.NODE_ENV === 'development' ? error : undefined
      });
    }
  }

  /**
   * 获取系统总览数据（管理员专用）
   */
  static async getSystemOverview(req: AuthRequest, res: Response): Promise<Response | void> {
    try {
      const userId = req.user?.id;
      const userRole = req.user?.role;
      
      if (!userId) {
        return res.status(401).json({
          success: false,
          message: '用户未认证'
        });
      }

      // 检查管理员权限
      if (userRole !== 'super_admin' && userRole !== 'admin') {
        return res.status(403).json({
          success: false,
          message: '权限不足，仅管理员可访问'
        });
      }

      logger.info('📊 获取系统总览数据请求', { userId, userRole });

      const systemOverview = await DashboardService.getSystemOverview();

      res.json({
        success: true,
        data: systemOverview,
        message: '获取系统总览数据成功'
      });

    } catch (error) {
      logger.error('❌ 获取系统总览数据失败', { 
        userId: req.user?.id,
        error: error instanceof Error ? error.message : error 
      });
      
      res.status(500).json({
        success: false,
        message: '获取系统总览数据失败',
        error: process.env.NODE_ENV === 'development' ? error : undefined
      });
    }
  }

  /**
   * 获取消费趋势数据
   */
  static async getConsumptionTrend(req: AuthRequest, res: Response): Promise<Response | void> {
    try {
      const userId = req.user?.id;
      
      if (!userId) {
        return res.status(401).json({
          success: false,
          message: '用户未认证'
        });
      }

      const days = parseInt(req.query.days as string) || 7;
      
      // 验证天数范围
      if (days < 1 || days > 30) {
        return res.status(400).json({
          success: false,
          message: '天数范围应在1-30之间'
        });
      }

      logger.info('📊 获取消费趋势数据请求', { userId, days });

      const trendData = await DashboardService.getConsumptionTrend(userId, days);
      
      res.json({
        success: true,
        data: trendData,
        message: '获取消费趋势成功'
      });

    } catch (error) {
      logger.error('❌ 获取消费趋势失败', { 
        userId: req.user?.id,
        days: req.query.days,
        error: error instanceof Error ? error.message : error 
      });
      
      res.status(500).json({
        success: false,
        message: '获取消费趋势失败',
        error: process.env.NODE_ENV === 'development' ? error : undefined
      });
    }
  }

  /**
   * 获取用户财务详情（详细分解）
   */
  static async getFinancialDetails(req: AuthRequest, res: Response): Promise<Response | void> {
    try {
      const userId = req.user?.id;
      
      if (!userId) {
        return res.status(401).json({
          success: false,
          message: '用户未认证'
        });
      }

      logger.info('💰 获取用户财务详情请求', { userId });

      // 这里可以扩展更详细的财务信息
      const dashboardData = await DashboardService.getDashboardData(userId);
      
      // 可以添加更多详细信息，比如：
      // - 最近交易记录
      // - 卡片使用情况
      // - 月度统计等

      res.json({
        success: true,
        data: {
          ...dashboardData,
          // 可以在这里添加更多详细信息
          lastUpdated: new Date().toISOString()
        },
        message: '获取财务详情成功'
      });

    } catch (error) {
      logger.error('❌ 获取财务详情失败', { 
        userId: req.user?.id,
        error: error instanceof Error ? error.message : error 
      });
      
      res.status(500).json({
        success: false,
        message: '获取财务详情失败',
        error: process.env.NODE_ENV === 'development' ? error : undefined
      });
    }
  }
}
