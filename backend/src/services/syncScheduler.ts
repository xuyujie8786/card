import * as cron from 'node-cron';
import syncService from './syncService';
import logger from '../config/logger';

/**
 * 定时同步调度器
 * 使用简单的 cron 任务，直接调用现有的同步服务
 * 无需数据库存储，使用日志系统记录运行状态
 */
class SyncScheduler {
  private tasks: Map<string, cron.ScheduledTask> = new Map();
  private isEnabled = process.env.SYNC_ENABLED !== 'false' && process.env.SYNC_SCHEDULER_ENABLED !== 'false';

  /**
   * 初始化所有定时任务
   */
  public initialize(): void {
    if (!this.isEnabled) {
      logger.info('🔄 定时同步调度器已禁用', { service: 'sync-scheduler' });
      return;
    }

    logger.info('🚀 初始化定时同步调度器', { service: 'sync-scheduler' });

    // 从环境变量读取cron表达式，支持Docker容器化配置
    const authPreviousCron = process.env.SYNC_AUTH_PREVIOUS_CRON || '0 1 * * *';
    const settlePreviousCron = process.env.SYNC_SETTLE_PREVIOUS_CRON || '30 1 * * *';
    const authCurrentCron = process.env.SYNC_AUTH_CURRENT_CRON || '0 13 * * *';
    const settleCurrentCron = process.env.SYNC_SETTLE_CURRENT_CRON || '30 13 * * *';

    // 每日 01:00 - 同步前一天的授权账单
    this.scheduleTask(
      'daily-auth-sync-previous',
      authPreviousCron,
      () => this.syncAuthTransactionsPrevious()
    );

    // 每日 01:30 - 同步前一天的结算账单
    this.scheduleTask(
      'daily-settle-sync-previous', 
      settlePreviousCron,
      () => this.syncSettleTransactionsPrevious()
    );

    // 每日 13:00 - 同步当天的授权账单
    this.scheduleTask(
      'daily-auth-sync-current',
      authCurrentCron,
      () => this.syncAuthTransactionsCurrent()
    );

    // 每日 13:30 - 同步当天的结算账单
    this.scheduleTask(
      'daily-settle-sync-current',
      settleCurrentCron, 
      () => this.syncSettleTransactionsCurrent()
    );

    logger.info('✅ 定时同步调度器初始化完成', { 
      service: 'sync-scheduler',
      taskCount: this.tasks.size
    });
  }

  /**
   * 注册定时任务
   */
  private scheduleTask(name: string, cronExpression: string, task: () => Promise<void>): void {
    // 使用时区配置，支持显式指定时区
    const timezone = process.env.TZ || 'Asia/Shanghai';
    const scheduledTask = cron.schedule(cronExpression, async () => {
      const startTime = new Date();
      logger.info(`🔄 开始执行定时同步任务: ${name}`, {
        service: 'sync-scheduler',
        taskName: name,
        timezone,
        startTime: startTime.toISOString(),
        localTime: startTime.toLocaleString('zh-CN', { timeZone: timezone })
      });

      try {
        await task();
        const endTime = new Date();
        const duration = endTime.getTime() - startTime.getTime();
        
        logger.info(`✅ 定时同步任务完成: ${name}`, {
          service: 'sync-scheduler',
          taskName: name,
          timezone,
          startTime: startTime.toISOString(),
          endTime: endTime.toISOString(),
          duration: `${duration}ms`,
          localEndTime: endTime.toLocaleString('zh-CN', { timeZone: timezone })
        });
      } catch (error) {
        const endTime = new Date();
        const duration = endTime.getTime() - startTime.getTime();
        
        logger.error(`❌ 定时同步任务失败: ${name}`, {
          service: 'sync-scheduler',
          taskName: name,
          timezone,
          startTime: startTime.toISOString(),
          endTime: endTime.toISOString(),
          duration: `${duration}ms`,
          localEndTime: endTime.toLocaleString('zh-CN', { timeZone: timezone }),
          error: error instanceof Error ? error.message : String(error),
          stack: error instanceof Error ? error.stack : undefined
        });
      }
    }, {
      timezone: timezone // 指定时区
    });

    this.tasks.set(name, scheduledTask);
    logger.info(`📅 注册定时任务: ${name}`, {
      service: 'sync-scheduler',
      taskName: name,
      cronExpression,
      timezone
    });
  }

  /**
   * 同步前一天的授权账单
   */
  private async syncAuthTransactionsPrevious(): Promise<void> {
    const targetDate = this.getPreviousDate();
    logger.info('🔄 开始同步前一天授权账单', {
      service: 'sync-scheduler',
      targetDate,
      syncType: 'auth-previous'
    });

    const result = await syncService.syncAuthTransactions(targetDate, targetDate);
    
    logger.info('✅ 前一天授权账单同步完成', {
      service: 'sync-scheduler',
      targetDate,
      syncType: 'auth-previous',
      ...result
    });
  }

  /**
   * 同步前一天的结算账单
   */
  private async syncSettleTransactionsPrevious(): Promise<void> {
    const targetDate = this.getPreviousDate();
    logger.info('🔄 开始同步前一天结算账单', {
      service: 'sync-scheduler', 
      targetDate,
      syncType: 'settle-previous'
    });

    const result = await syncService.syncSettleTransactions(targetDate, targetDate);
    
    logger.info('✅ 前一天结算账单同步完成', {
      service: 'sync-scheduler',
      targetDate,
      syncType: 'settle-previous',
      ...result
    });
  }

  /**
   * 同步当天的授权账单
   */
  private async syncAuthTransactionsCurrent(): Promise<void> {
    const targetDate = this.getCurrentDate();
    logger.info('🔄 开始同步当天授权账单', {
      service: 'sync-scheduler',
      targetDate,
      syncType: 'auth-current'
    });

    const result = await syncService.syncAuthTransactions(targetDate, targetDate);
    
    logger.info('✅ 当天授权账单同步完成', {
      service: 'sync-scheduler',
      targetDate,
      syncType: 'auth-current',
      ...result
    });
  }

  /**
   * 同步当天的结算账单
   */
  private async syncSettleTransactionsCurrent(): Promise<void> {
    const targetDate = this.getCurrentDate();
    logger.info('🔄 开始同步当天结算账单', {
      service: 'sync-scheduler',
      targetDate,
      syncType: 'settle-current'
    });

    const result = await syncService.syncSettleTransactions(targetDate, targetDate);
    
    logger.info('✅ 当天结算账单同步完成', {
      service: 'sync-scheduler',
      targetDate,
      syncType: 'settle-current',
      ...result
    });
  }

  /**
   * 获取前一天日期 (YYYY-MM-DD 格式) - 强制使用北京时间
   */
  private getPreviousDate(): string {
    // 获取北京时间的当前时间
    const beijingTime = new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Shanghai' }));
    beijingTime.setDate(beijingTime.getDate() - 1);
    
    const year = beijingTime.getFullYear();
    const month = String(beijingTime.getMonth() + 1).padStart(2, '0');
    const day = String(beijingTime.getDate()).padStart(2, '0');
    
    return `${year}-${month}-${day}`;
  }

  /**
   * 获取当前日期 (YYYY-MM-DD 格式) - 强制使用北京时间
   */
  private getCurrentDate(): string {
    // 获取北京时间的当前时间
    const beijingTime = new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Shanghai' }));
    
    const year = beijingTime.getFullYear();
    const month = String(beijingTime.getMonth() + 1).padStart(2, '0');
    const day = String(beijingTime.getDate()).padStart(2, '0');
    
    return `${year}-${month}-${day}`;
  }

  /**
   * 启动所有定时任务
   */
  public start(): void {
    if (!this.isEnabled) {
      logger.info('⚠️  定时同步调度器已禁用，跳过启动', { service: 'sync-scheduler' });
      return;
    }

    logger.info('🚀 启动定时同步调度器', { 
      service: 'sync-scheduler',
      taskCount: this.tasks.size
    });

    for (const [name, task] of this.tasks) {
      task.start();
      logger.info(`▶️  启动定时任务: ${name}`, { 
        service: 'sync-scheduler',
        taskName: name
      });
    }

    logger.info('✅ 所有定时同步任务已启动', { service: 'sync-scheduler' });
  }

  /**
   * 停止所有定时任务
   */
  public stop(): void {
    logger.info('🛑 停止定时同步调度器', { 
      service: 'sync-scheduler',
      taskCount: this.tasks.size
    });

    for (const [name, task] of this.tasks) {
      task.stop();
      logger.info(`⏹️  停止定时任务: ${name}`, { 
        service: 'sync-scheduler',
        taskName: name
      });
    }

    logger.info('✅ 所有定时同步任务已停止', { service: 'sync-scheduler' });
  }

  /**
   * 手动触发指定的同步任务（用于测试）
   */
  public async triggerManualSync(syncType: 'auth-previous' | 'auth-current' | 'settle-previous' | 'settle-current'): Promise<any> {
    logger.info(`🔧 手动触发同步任务: ${syncType}`, {
      service: 'sync-scheduler',
      syncType
    });

    switch (syncType) {
      case 'auth-previous':
        return await this.syncAuthTransactionsPrevious();
      case 'auth-current':
        return await this.syncAuthTransactionsCurrent();
      case 'settle-previous':
        return await this.syncSettleTransactionsPrevious();
      case 'settle-current':
        return await this.syncSettleTransactionsCurrent();
      default:
        throw new Error(`未知的同步类型: ${syncType}`);
    }
  }

  /**
   * 获取调度器状态
   */
  public getStatus(): { enabled: boolean; taskCount: number; tasks: string[] } {
    return {
      enabled: this.isEnabled,
      taskCount: this.tasks.size,
      tasks: Array.from(this.tasks.keys())
    };
  }
}

// 导出单例实例
export const syncScheduler = new SyncScheduler();
