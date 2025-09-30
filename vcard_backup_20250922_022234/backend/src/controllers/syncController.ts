import { Request, Response } from 'express';
import { SyncService } from '../services/syncService';
import logger from '../config/logger';

/**
 * 同步控制器
 * 处理授权和结算账单的同步请求
 */
export class SyncController {
  private syncService: SyncService;

  constructor(syncService?: SyncService) {
    this.syncService = syncService || new SyncService();
  }

  /**
   * 同步授权账单
   */
  async syncAuthTransactions(req: Request, res: Response) {
    try {
      const { dateStart, dateEnd, cardId } = req.body;

      // 验证参数
      if (!dateStart || !dateEnd) {
        return res.status(400).json({
          success: false,
          message: '开始日期和结束日期是必需的'
        });
      }

      // 验证日期格式
      const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
      if (!dateRegex.test(dateStart) || !dateRegex.test(dateEnd)) {
        return res.status(400).json({
          success: false,
          message: '日期格式必须为 YYYY-MM-DD'
        });
      }

      // 验证日期范围（不能超过30天）
      const startDate = new Date(dateStart);
      const endDate = new Date(dateEnd);
      const diffInDays = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
      
      if (diffInDays > 30) {
        return res.status(400).json({
          success: false,
          message: '日期范围不能超过30天'
        });
      }

      if (startDate > endDate) {
        return res.status(400).json({
          success: false,
          message: '开始日期不能晚于结束日期'
        });
      }

      logger.info('开始同步授权账单', { dateStart, dateEnd, cardId });

      const result = await this.syncService.syncAuthTransactions(dateStart, dateEnd, cardId);

      logger.info('授权账单同步完成', result);

      return res.json({
        success: true,
        message: '授权账单同步完成',
        data: result
      });

    } catch (error) {
      logger.error('同步授权账单失败', {
        error: error instanceof Error ? error.message : 'Unknown error',
        body: req.body
      });

      return res.status(500).json({
        success: false,
        message: '同步授权账单失败',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * 同步结算账单
   */
  async syncSettleTransactions(req: Request, res: Response) {
    try {
      const { dateStart, dateEnd } = req.body;

      // 验证参数
      if (!dateStart || !dateEnd) {
        return res.status(400).json({
          success: false,
          message: '开始日期和结束日期是必需的'
        });
      }

      // 验证日期格式
      const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
      if (!dateRegex.test(dateStart) || !dateRegex.test(dateEnd)) {
        return res.status(400).json({
          success: false,
          message: '日期格式必须为 YYYY-MM-DD'
        });
      }

      // 验证日期范围（不能超过30天）
      const startDate = new Date(dateStart);
      const endDate = new Date(dateEnd);
      const diffInDays = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
      
      if (diffInDays > 30) {
        return res.status(400).json({
          success: false,
          message: '日期范围不能超过30天'
        });
      }

      if (startDate > endDate) {
        return res.status(400).json({
          success: false,
          message: '开始日期不能晚于结束日期'
        });
      }

      logger.info('开始同步结算账单', { dateStart, dateEnd });

      const result = await this.syncService.syncSettleTransactions(dateStart, dateEnd);

      logger.info('结算账单同步完成', result);

      return res.json({
        success: true,
        message: '结算账单同步完成',
        data: result
      });

    } catch (error) {
      logger.error('同步结算账单失败', {
        error: error instanceof Error ? error.message : 'Unknown error',
        body: req.body
      });

      return res.status(500).json({
        success: false,
        message: '同步结算账单失败',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }
}

export const syncController = new SyncController();
