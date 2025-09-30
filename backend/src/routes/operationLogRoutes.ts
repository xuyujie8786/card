import { Router, Request, Response } from 'express';
import { body, query } from 'express-validator';
import { authenticateToken, AuthRequest } from '../middleware/auth';
import { handleValidationErrors } from '../middleware/validation';
import OperationLogService from '../services/operationLogService';
import { OperationType } from '../types/operationLog';
import logger from '../config/logger';

const router = Router();

/**
 * 获取操作记录列表
 * GET /api/operation-logs
 */
router.get(
  '/',
  authenticateToken,
  [
    query('current').optional().isInt({ min: 1 }).withMessage('当前页必须是正整数'),
    query('pageSize').optional().isInt({ min: 1, max: 100 }).withMessage('每页大小必须在1-100之间'),
    query('cardId').optional().isString().withMessage('卡ID必须是字符串'),
    query('cardNo').optional().isString().withMessage('卡号必须是字符串'),
    query('operationType').optional().isIn(Object.values(OperationType)).withMessage('操作类型无效'),
    query('startDate').optional().isISO8601().withMessage('开始日期格式无效'),
    query('endDate').optional().isISO8601().withMessage('结束日期格式无效'),
    query('operatorName').optional().isString().withMessage('操作员名称必须是字符串'),
  ],
  handleValidationErrors,
  async (req: AuthRequest, res: Response): Promise<any> => {
    try {
      const {
        current = 1,
        pageSize = 20,
        cardId,
        cardNo,
        operationType,
        startDate,
        endDate,
        operatorName,
      } = req.query;

      // 数据权限控制：用户只能看到自己的操作记录
      const currentUser = req.user!;
      let allowedOperatorName = operatorName as string;
      
      if (currentUser.role !== 'SUPER_ADMIN') {
        // 非超级管理员只能查看自己的操作记录
        allowedOperatorName = currentUser.username;
      }

      const result = await OperationLogService.getOperationLogs({
        current: Number(current),
        pageSize: Number(pageSize),
        cardId: cardId as string,
        cardNo: cardNo as string,
        operationType: operationType as OperationType,
        startDate: startDate as string,
        endDate: endDate as string,
        operatorName: allowedOperatorName,
      });

      res.json({
        success: true,
        data: result.data,
        total: result.total,
        current: result.current,
        pageSize: result.pageSize,
      });
    } catch (error) {
      logger.error('获取操作记录列表失败', { error });
      res.status(500).json({
        success: false,
        message: '获取操作记录列表失败',
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }
);

/**
 * 创建操作记录
 * POST /api/operation-logs
 */
router.post(
  '/',
  authenticateToken,
  [
    body('cardId').notEmpty().isString().withMessage('卡ID不能为空'),
    body('cardNo').notEmpty().isString().withMessage('卡号不能为空'),
    body('operationType').isIn(Object.values(OperationType)).withMessage('操作类型无效'),
    body('amount').isFloat().withMessage('金额必须是数字'),
    body('currency').optional().isString().withMessage('货币类型必须是字符串'),
    body('description').optional().isString().withMessage('描述必须是字符串'),
  ],
  handleValidationErrors,
  async (req: AuthRequest, res: Response): Promise<any> => {
    try {
      // 权限检查：只有超级管理员和管理员可以手动创建操作记录
      const userRole = req.user?.role;
      if (userRole !== 'SUPER_ADMIN' && userRole !== 'ADMIN') {
        return res.status(403).json({
          success: false,
          message: '权限不足',
        });
      }

      const { cardId, cardNo, operationType, amount, currency, description } = req.body;
      const user = req.user!;

      const result = await OperationLogService.createOperationLog(
        {
          cardId,
          cardNo,
          operationType,
          amount: parseFloat(amount),
          currency,
          description,
        },
        user.id,
        user.name || user.username
      );

      res.json({
        success: true,
        message: '操作记录创建成功',
        data: result,
      });
    } catch (error) {
      logger.error('创建操作记录失败', { error });
      res.status(500).json({
        success: false,
        message: '创建操作记录失败',
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }
);

/**
 * 获取操作记录统计
 * GET /api/operation-logs/stats
 */
router.get(
  '/stats',
  authenticateToken,
  [
    query('startDate').optional().isISO8601().withMessage('开始日期格式无效'),
    query('endDate').optional().isISO8601().withMessage('结束日期格式无效'),
  ],
  handleValidationErrors,
  async (req: AuthRequest, res: Response): Promise<any> => {
    try {
      const { startDate, endDate } = req.query;

      const stats = await OperationLogService.getOperationStats(
        startDate as string,
        endDate as string
      );

      res.json({
        success: true,
        data: stats,
      });
    } catch (error) {
      logger.error('获取操作记录统计失败', { error });
      res.status(500).json({
        success: false,
        message: '获取操作记录统计失败',
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }
);

export default router;
