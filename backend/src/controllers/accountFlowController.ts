/**
 * 账户流水控制器
 */

import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import { AccountFlowService } from '../services/accountFlowService';
import { AccountOperationType } from '@prisma/client';
import { AccountFlowQueryParams } from '../types/accountFlow';
import { successResponse, errorResponse } from '../utils/response';
import logger from '../config/logger';

export class AccountFlowController {
  
  /**
   * 获取账户流水列表
   */
  static async getFlows(req: AuthRequest, res: Response) {
    try {
      const currentUser = req.user!;
      const rawQuery = req.query;

      // 转换query参数类型
      const query: AccountFlowQueryParams = {
        current: rawQuery.current ? parseInt(rawQuery.current as string) : 1,
        pageSize: rawQuery.pageSize ? parseInt(rawQuery.pageSize as string) : 20,
        userId: rawQuery.userId ? parseInt(rawQuery.userId as string) : undefined,
        operationType: rawQuery.operationType as AccountOperationType,
        businessType: rawQuery.businessType as string,
        startDate: rawQuery.startDate as string,
        endDate: rawQuery.endDate as string,
        operatorId: rawQuery.operatorId ? parseInt(rawQuery.operatorId as string) : undefined,
        targetUserId: rawQuery.targetUserId ? parseInt(rawQuery.targetUserId as string) : undefined,
      };

      // 权限检查：管理员可以查看自己的操作记录，但不能查看其他人的流水
      if (currentUser.role === 'ADMIN') {
        // 管理员只能查看自己的操作记录
        if (query.userId && query.userId !== currentUser.id) {
          return errorResponse(res, '管理员无权限查看其他用户的流水', 403);
        }
        // 强制设置为当前管理员ID
        query.userId = currentUser.id;
      } else if (currentUser.role === 'USER') {
        // 普通用户只能查看自己的流水
        if (query.userId && query.userId !== currentUser.id) {
          return errorResponse(res, '无权限查看其他用户的流水', 403);
        }
        // 强制设置为当前用户ID
        query.userId = currentUser.id;
      }

      logger.info('查询账户流水', { query, userId: currentUser.id });

      // 根据权限获取流水数据
      let result;
      if (currentUser.role === 'SUPER_ADMIN' && !query.userId) {
        // 超级管理员可以查看所有流水
        result = await AccountFlowService.getAllFlows(query.current || 1, query.pageSize || 20);
      } else {
        // 其他用户或指定了用户ID的查询
        result = await AccountFlowService.getUserFlows(query.userId!, query.current || 1, query.pageSize || 20);
      }

      return successResponse(res, result, '获取流水记录成功');
    } catch (error) {
      logger.error('Failed to get account flows', { error: (error as Error).message, stack: (error as Error).stack });
      return errorResponse(res, '获取流水记录失败', 500);
    }
  }

  /**
   * 获取用户流水统计
   */
  static async getUserFlowSummary(req: AuthRequest, res: Response) {
    try {
      const currentUser = req.user!;
      const { userId, startDate, endDate } = req.query;
      const targetUserId = userId ? parseInt(userId as string) : currentUser.id;

      // 权限检查：管理员可以查看自己的操作统计，普通用户只能查看自己的统计
      if (currentUser.role === 'ADMIN') {
        // 管理员只能查看自己的操作统计
        if (targetUserId !== currentUser.id) {
          return errorResponse(res, '管理员无权限查看其他用户的统计', 403);
        }
      } else if (currentUser.role === 'USER' && targetUserId !== currentUser.id) {
        return errorResponse(res, '无权限查看其他用户的统计', 403);
      }

      const summary = await AccountFlowService.getFlowSummary();

      return successResponse(res, summary, '获取流水统计成功');
    } catch (error) {
      logger.error('Failed to get user flow summary', error);
      return errorResponse(res, '获取流水统计失败', 500);
    }
  }

  /**
   * 获取我的流水记录（当前用户）
   */
  static async getMyFlows(req: AuthRequest, res: Response) {
    try {
      const currentUser = req.user!;
      
      // 权限检查：管理员可以查看自己的操作记录
      // 管理员查看的是操作记录，普通用户查看的是资金流水
      
      const query: AccountFlowQueryParams = {
        ...req.query,
        userId: currentUser.id // 强制设置为当前用户
      };

      const result = await AccountFlowService.getUserFlows(currentUser.id, query.current || 1, query.pageSize || 20);

      return successResponse(res, result, '获取我的流水记录成功');
    } catch (error) {
      logger.error('Failed to get my account flows', error);
      return errorResponse(res, '获取我的流水记录失败', 500);
    }
  }
}
