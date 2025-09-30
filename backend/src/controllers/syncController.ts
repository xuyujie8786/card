import { Request, Response } from 'express';
import { syncScheduler } from '../services/syncScheduler';
import syncService from '../services/syncService';
import logger from '../config/logger';
import { successResponse, errorResponse } from '../utils/response';

/**
 * 同步控制器
 * 提供定时同步状态查询和手动触发功能
 */
export class SyncController {

  /**
   * 获取定时同步调度器状态
   */
  public static async getSchedulerStatus(req: Request, res: Response): Promise<void> {
    try {
      const status = syncScheduler.getStatus();
      
      successResponse(res, status, '获取调度器状态成功');
    } catch (error) {
      logger.error('获取调度器状态失败', { 
        error: error instanceof Error ? error.message : String(error),
        service: 'sync-controller'
      });
      errorResponse(res, '获取调度器状态失败');
    }
  }

  /**
   * 手动触发同步任务
   */
  public static async triggerManualSync(req: Request, res: Response): Promise<void> {
    try {
      const { syncType } = req.body;
      
      if (!syncType) {
        errorResponse(res, '请指定同步类型', 400);
        return;
      }

      const validSyncTypes = ['auth-previous', 'auth-current', 'settle-previous', 'settle-current'];
      if (!validSyncTypes.includes(syncType)) {
        errorResponse(res, `无效的同步类型，支持的类型: ${validSyncTypes.join(', ')}`, 400);
        return;
      }

      logger.info('手动触发同步任务', {
        service: 'sync-controller',
        syncType,
        userId: req.user?.id
      });

      const result = await syncScheduler.triggerManualSync(syncType);
      
      successResponse(res, result, `手动同步任务 ${syncType} 执行成功`);
    } catch (error) {
      logger.error('手动触发同步失败', { 
        error: error instanceof Error ? error.message : String(error),
        service: 'sync-controller',
        syncType: req.body.syncType,
        userId: req.user?.id
      });
      errorResponse(res, '手动触发同步失败: ' + (error instanceof Error ? error.message : String(error)));
    }
  }

  /**
   * 手动触发原始同步接口（保留现有功能）
   */
  public static async manualSyncTransactions(req: Request, res: Response): Promise<void> {
    try {
      const { syncType, dateStart, dateEnd, cardId } = req.body;
      
      if (!syncType || !dateStart || !dateEnd) {
        errorResponse(res, '请提供同步类型、开始日期和结束日期', 400);
        return;
      }

      logger.info('手动触发原始同步接口', {
        service: 'sync-controller',
        syncType,
        dateStart,
        dateEnd,
        cardId,
        userId: req.user?.id
      });

      let result;
      if (syncType === 'auth') {
        result = await syncService.syncAuthTransactions(dateStart, dateEnd, cardId);
      } else if (syncType === 'settle') {
        result = await syncService.syncSettleTransactions(dateStart, dateEnd);
      } else {
        errorResponse(res, '无效的同步类型，支持: auth, settle', 400);
        return;
      }
      
      successResponse(res, result, `手动同步 ${syncType} 交易记录成功`);
    } catch (error) {
      logger.error('手动同步交易记录失败', { 
        error: error instanceof Error ? error.message : String(error),
        service: 'sync-controller',
        ...req.body,
        userId: req.user?.id
      });
      errorResponse(res, '手动同步失败: ' + (error instanceof Error ? error.message : String(error)));
    }
  }
}