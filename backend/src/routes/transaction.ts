/**
 * 交易相关路由
 */

import express, { Request, Response } from 'express';
import { body, query, param, validationResult } from 'express-validator';
import { transactionService } from '../services/transactionService';
import webhookService from '../services/webhookService';
import { AuthCallbackRequest, SettleCallbackRequest, SettlementCallbackRequest, ApiResponse, ErrorCodes } from '../types/transaction';
import { CardTxnType } from '@prisma/client';
import { authenticateToken, AuthRequest } from '../middleware/auth';
import logger from '../config/logger';

const router = express.Router();

/**
 * 授权账单回调接口
 * POST /api/auth-callback
 */
router.post('/auth-callback', [
  body('cardId').notEmpty().withMessage('卡片ID不能为空'),
  body('txnId').notEmpty().withMessage('交易ID不能为空'),
  body('txnType').isIn(['A', 'D']).withMessage('授权回调只支持A(授权)和D(授权撤销)类型'),
  body('txnStatus').notEmpty().withMessage('交易状态不能为空'),
  // 支持卡商原始字段格式
  body('billCcy').optional(),
  body('billAmt').optional(),
  body('txnCcy').optional(),
  body('txnAmt').optional(),
], async (req: Request, res: Response): Promise<void> => {
  try {
    // 验证请求参数
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      const response: ApiResponse = {
        success: false,
        error: {
          code: ErrorCodes.INVALID_REQUEST,
          message: '请求参数验证失败',
          details: errors.array()
        }
      };
      res.status(400).json(response);
      return;
    }

    // 按照卡商API文档格式映射字段
    const finalCcy = req.body.billCcy || req.body.txnCcy || 'USD';
    const finalAmt = parseFloat(req.body.billAmt || req.body.txnAmt || '0');

    const callbackData: AuthCallbackRequest = {
      // 用户和卡片信息
      uid: req.body.uid,                    // 用户ID
      cardId: req.body.cardId,              // 卡片ID
      orgCardId: req.body.orgCardId,        // 卡片流水号（原始卡片ID）
      
      // 交易标识
      txnId: req.body.txnId,                // 交易ID
      originTxnId: req.body.originTxnId,    // 原始交易ID（授权撤销时对应的原交易ID）
      
      // 交易类型和状态
      txnType: req.body.txnType,            // 交易类型：A=授权，D=授权撤销
      txnStatus: req.body.txnStatus,        // 交易状态：0=失败，1=成功
      
      // 交易金额信息
      txnCcy: req.body.txnCcy,              // 交易币种
      txnAmt: req.body.txnAmt,              // 交易金额（保持字符串格式）
      billCcy: req.body.billCcy,            // 账单币种
      billAmt: req.body.billAmt,            // 账单金额（保持字符串格式）
      
      // 授权信息
      authCode: req.body.authCode,          // 授权码
      
      // 商户信息
      merchName: req.body.merchName,        // 商户名称
      merchCtry: req.body.merchCtry,        // 商户国家
      mcc: req.body.mcc,                    // 商家业务类型
      
      // 时间信息
      txnTime: req.body.txnTime,            // 交易时间
      
      // 失败信息
      declineReason: req.body.declineReason, // 失败原因
      
      // 交易标志
      forcePost: req.body.forcePost,        // Force post
      preAuth: req.body.preAuth,            // Pre auth
      
      // 业务类型
      bizType: req.body.bizType,            // 业务类型：01=提现，30=查询余额，99=消费
      
      // 内部处理字段
      finalCcy: finalCcy,                   // 最终币种（内部计算）
      finalAmt: finalAmt,                   // 最终金额（内部计算）
      
      // 原始回调数据
      rawData: req.body
    };

    // 处理授权回调
    const result = await transactionService.processAuthCallback(callbackData);

    if (result.success) {
      const response: ApiResponse = {
        success: true,
        data: {
          transactionId: result.transactionId,
          message: '授权回调处理成功'
        }
      };
      res.status(200).json(response);
    } else {
      const response: ApiResponse = {
        success: false,
        error: {
          code: result.error || ErrorCodes.INTERNAL_ERROR,
          message: getErrorMessage(result.error || ErrorCodes.INTERNAL_ERROR)
        }
      };
      res.status(400).json(response);
    }

  } catch (error) {
    console.error('授权回调处理异常:', error);
    const response: ApiResponse = {
      success: false,
      error: {
        code: ErrorCodes.INTERNAL_ERROR,
        message: '服务器内部错误'
      }
    };
    res.status(500).json(response);
  }
});

/**
 * 结算账单回调接口
 * POST /api/settle-callback
 */
router.post('/settle-callback', [
  body('authTxnId').notEmpty().withMessage('授权交易ID不能为空'),
  body('settleTxnId').notEmpty().withMessage('结算交易ID不能为空'),
  body('finalCcy').notEmpty().withMessage('最终币种不能为空'),
  body('finalAmt').isNumeric().withMessage('最终金额必须是数字'),
], async (req: Request, res: Response): Promise<void> => {
  try {
    // 验证请求参数
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      const response: ApiResponse = {
        success: false,
        error: {
          code: ErrorCodes.INVALID_REQUEST,
          message: '请求参数验证失败',
          details: errors.array()
        }
      };
      res.status(400).json(response);
      return;
    }

    const callbackData: SettleCallbackRequest = {
      authTxnId: req.body.authTxnId,
      settleTxnId: req.body.settleTxnId,
      settleBillCcy: req.body.settleBillCcy,
      settleBillAmt: req.body.settleBillAmt ? parseFloat(req.body.settleBillAmt) : undefined,
      finalCcy: req.body.finalCcy,
      finalAmt: parseFloat(req.body.finalAmt),
      rawData: req.body
    };

    // 处理结算回调
    const result = await transactionService.processSettleCallback(callbackData);

    if (result.success) {
      const response: ApiResponse = {
        success: true,
        data: {
          message: '结算回调处理成功'
        }
      };
      res.status(200).json(response);
    } else {
      const response: ApiResponse = {
        success: false,
        error: {
          code: result.error || ErrorCodes.INTERNAL_ERROR,
          message: getErrorMessage(result.error || ErrorCodes.INTERNAL_ERROR)
        }
      };
      res.status(400).json(response);
    }

  } catch (error) {
    console.error('结算回调处理异常:', error);
    const response: ApiResponse = {
      success: false,
      error: {
        code: ErrorCodes.INTERNAL_ERROR,
        message: '服务器内部错误'
      }
    };
    res.status(500).json(response);
  }
});

/**
 * 结算交易回调接口 (消费C/退款R)
 * POST /api/settlement-callback
 */
router.post('/settlement-callback', [
  body('cardId').notEmpty().withMessage('卡片ID不能为空'),
  body('txnId').notEmpty().withMessage('交易ID不能为空'),
  body('txnType').isIn(['C', 'R']).withMessage('结算回调只支持C(消费)和R(退款)类型'),
  // 当有 authTxnId 时，允许这些字段为空（合并场景）
  body('txnCcy').custom((value, { req }) => {
    if (!req.body.authTxnId && !value) {
      throw new Error('交易币种不能为空');
    }
    return true;
  }),
  body('txnAmt').custom((value, { req }) => {
    if (!req.body.authTxnId && !value) {
      throw new Error('交易金额不能为空');
    }
    return true;
  }),
  body('billCcy').custom((value, { req }) => {
    if (!req.body.authTxnId && !value) {
      throw new Error('账单币种不能为空');
    }
    return true;
  }),
  body('billAmt').custom((value, { req }) => {
    if (!req.body.authTxnId && !value) {
      throw new Error('账单金额不能为空');
    }
    return true;
  }),
], async (req: Request, res: Response): Promise<void> => {
  try {
    logger.info('📥 收到结算回调请求体:', { body: req.body });
    
    // Webhook 签名验证（如果配置了）
    const signature = req.headers['x-webhook-signature'] as string;
    const timestamp = req.headers['x-webhook-timestamp'] as string;
    
    if (process.env.ENABLE_WEBHOOK_VERIFICATION === 'true' && signature) {
      const payload = JSON.stringify(req.body);
      const isValidSignature = webhookService.verifySignature(payload, signature, timestamp);
      
      if (!isValidSignature) {
        logger.error('❌ Webhook signature verification failed');
        const response: ApiResponse = {
          success: false,
          error: {
            code: ErrorCodes.UNAUTHORIZED,
            message: 'Webhook signature verification failed'
          }
        };
        res.status(401).json(response);
        return;
      }
      
      logger.info('✅ Webhook signature verified');
    }
    
    // 验证请求参数
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      logger.error('❌ 结算回调验证失败:', { errors: errors.array() });
      const response: ApiResponse = {
        success: false,
        error: {
          code: ErrorCodes.INVALID_REQUEST,
          message: '请求参数验证失败',
          details: errors.array()
        }
      };
      res.status(400).json(response);
      return;
    }

    const callbackData: SettlementCallbackRequest = {
      cardId: req.body.cardId,
      txnId: req.body.txnId,
      authTxnId: req.body.authTxnId, // 添加关联的授权交易ID
      txnType: req.body.txnType,
      txnStatus: req.body.txnStatus || '1', // 结算回调默认为成功状态 (卡商API: "1"=成功, "0"=失败)
      txnCcy: req.body.txnCcy,
      txnAmt: req.body.txnAmt ? parseFloat(req.body.txnAmt) : undefined,
      billCcy: req.body.billCcy,
      billAmt: req.body.billAmt ? parseFloat(req.body.billAmt) : undefined,
      finalCcy: req.body.billCcy, // 使用账单币种作为最终币种
      finalAmt: req.body.billAmt ? parseFloat(req.body.billAmt) : 0, // 使用账单金额作为最终金额
      merchantName: req.body.merchantName || req.body.merchName,
      merchantCountry: req.body.merchantCountry || req.body.merchCtry,
      mcc: req.body.mcc,
      authCode: req.body.authCode,
      declineReason: req.body.declineReason,
      txnTime: req.body.txnTime,
      rawData: req.body
    };

    logger.info('📥 收到结算交易回调:', { callbackData });

    // 调用结算交易回调处理方法
    const result = await transactionService.processSettlementCallback(callbackData);

    if (result.success) {
      const response: ApiResponse<{ transactionId: number }> = {
        success: true,
        data: { transactionId: result.transactionId! },
        message: '结算交易回调处理成功'
      };
      res.status(200).json(response);
    } else {
      const response: ApiResponse = {
        success: false,
        error: {
          code: result.error || ErrorCodes.INTERNAL_ERROR,
          message: '结算交易回调处理失败'
        }
      };
      res.status(400).json(response);
    }
  } catch (error) {
    console.error('结算交易回调处理异常:', error);
    const response: ApiResponse = {
      success: false,
      error: {
        code: ErrorCodes.INTERNAL_ERROR,
        message: '服务器内部错误'
      }
    };
    res.status(500).json(response);
  }
});

/**
 * 查询交易记录接口
 * GET /api/transactions
 */
router.get('/', 
  authenticateToken,
  [
    query('page').optional().isInt({ min: 1 }).withMessage('页码必须是正整数'),
    query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('限制数量必须在1-100之间'),
    query('sortBy').optional().isIn(['txnTime', 'finalAmt']).withMessage('排序字段无效'),
    query('sortOrder').optional().isIn(['asc', 'desc']).withMessage('排序方向无效'),
  ], async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    // 验证请求参数
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      const response: ApiResponse = {
        success: false,
        error: {
          code: ErrorCodes.INVALID_REQUEST,
          message: '请求参数验证失败',
          details: errors.array()
        }
      };
      res.status(400).json(response);
      return;
    }

    // 数据权限控制
    const currentUser = req.user;
    let allowedUsername = req.query.username as string;
    
    if (currentUser) {
      if (currentUser.role === 'SUPER_ADMIN') {
        // 超级管理员可以查看所有用户数据
        // allowedUsername 保持原值
      } else {
        // 管理员和普通用户只能查看自己的数据
        allowedUsername = currentUser.username;
      }
    }

    const queryParams = {
      cardId: req.query.cardId as string,
      username: allowedUsername,
      txnType: req.query.txnType as string, // 支持逗号分隔的多个类型
      txnStatus: req.query.txnStatus as string,
      startDate: req.query.startDate as string,
      endDate: req.query.endDate as string,
      page: req.query.page ? parseInt(req.query.page as string) : 
            req.query.current ? parseInt(req.query.current as string) : 1,
      limit: req.query.limit ? parseInt(req.query.limit as string) : 
             req.query.pageSize ? parseInt(req.query.pageSize as string) : 20,
      sortBy: (req.query.sortBy as 'txnTime' | 'finalAmt') || 'txnTime',
      sortOrder: (req.query.sortOrder as 'asc' | 'desc') || 'desc'
    };

    const result = await transactionService.getTransactions(queryParams);

    const response: ApiResponse = {
      success: true,
      data: result
    };

    res.status(200).json(response);

  } catch (error) {
    console.error('查询交易记录异常:', error);
    const response: ApiResponse = {
      success: false,
      error: {
        code: ErrorCodes.INTERNAL_ERROR,
        message: '服务器内部错误'
      }
    };
    res.status(500).json(response);
  }
});

/**
 * 导出交易记录为Excel文件
 * GET /api/transactions/export
 */
router.get('/export',
  authenticateToken,
  [
    query('startDate').notEmpty().withMessage('开始日期不能为空'),
    query('endDate').notEmpty().withMessage('结束日期不能为空'),
    query('txnType').optional().isString().withMessage('交易类型必须是字符串'),
    query('excludeAuthCancel').optional().isBoolean().withMessage('排除授权撤销必须是布尔值'),
    query('username').optional().isString().withMessage('用户名必须是字符串'),
  ], async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    // 验证请求参数
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      const response: ApiResponse = {
        success: false,
        error: {
          code: ErrorCodes.INVALID_REQUEST,
          message: '请求参数验证失败',
          details: errors.array()
        }
      };
      res.status(400).json(response);
      return;
    }

    // 数据权限控制
    const currentUser = req.user;
    let allowedUsername = req.query.username as string;
    
    if (currentUser) {
      if (currentUser.role === 'SUPER_ADMIN') {
        // 超级管理员可以查看所有用户数据
        // allowedUsername 保持原值
      } else {
        // 管理员和普通用户只能查看自己的数据
        allowedUsername = currentUser.username;
      }
    }

    // 处理交易类型过滤 - 永远排除AUTH_CANCEL
    let txnTypes = req.query.txnType as string;
    
    // 无论如何都要排除AUTH_CANCEL(D类型)，但保留CANCEL(F类型)
    if (!txnTypes) {
      // 如果没有指定类型，默认包含除AUTH_CANCEL外的所有类型
      txnTypes = 'AUTH,SETTLEMENT,REFUND,CANCEL,WITHDRAWAL';
    } else {
      // 如果指定了类型，确保不包含AUTH_CANCEL
      const types = txnTypes.split(',').map(t => t.trim());
      const filteredTypes = types.filter(type => type !== 'AUTH_CANCEL' && type !== 'D');
      txnTypes = filteredTypes.join(',');
    }

    const queryParams = {
      startDate: req.query.startDate as string,
      endDate: req.query.endDate as string,
      username: allowedUsername,
      txnType: txnTypes,
      // 导出时不分页，获取所有数据
      page: 1,
      limit: 999999,
      sortBy: 'txnTime' as const,
      sortOrder: 'desc' as const
    };

    // 获取交易数据
    const result = await transactionService.getTransactions(queryParams);
    
    if (!result.data || result.data.length === 0) {
      const response: ApiResponse = {
        success: false,
        error: {
          code: ErrorCodes.INVALID_REQUEST,
          message: '没有找到符合条件的交易记录'
        }
      };
      res.status(400).json(response);
      return;
    }

    // 导出Excel
    const excelBuffer = await transactionService.exportTransactionsToExcel(result.data);
    
    // 设置响应头
    const filename = `交易对账单_${queryParams.startDate}_${queryParams.endDate}.xlsx`;
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(filename)}"`);
    res.setHeader('Content-Length', excelBuffer.length);
    
    // 发送Excel文件
    res.send(excelBuffer);

  } catch (error) {
    console.error('导出交易记录异常:', error);
    const response: ApiResponse = {
      success: false,
      error: {
        code: ErrorCodes.INTERNAL_ERROR,
        message: '导出失败'
      }
    };
    res.status(500).json(response);
  }
});

/**
 * 获取交易汇总信息
 * GET /api/transactions/summary
 */
router.get('/summary', 
  authenticateToken,
  [
    query('startDate').notEmpty().withMessage('开始日期不能为空'),
    query('endDate').notEmpty().withMessage('结束日期不能为空'),
    query('username').optional().isString().withMessage('用户名必须是字符串'),
  ], async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    // 验证请求参数
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      const response: ApiResponse = {
        success: false,
        error: {
          code: ErrorCodes.INVALID_REQUEST,
          message: '请求参数验证失败',
          details: errors.array()
        }
      };
      res.status(400).json(response);
      return;
    }

    const { startDate, endDate, username } = req.query;
    
    // 数据权限控制
    const currentUser = req.user;
    let allowedUsername = username as string;
    
    if (currentUser) {
      if (currentUser.role === 'SUPER_ADMIN') {
        // 超级管理员可以查看所有用户数据
        // allowedUsername 保持原值
      } else {
        // 管理员和普通用户只能查看自己的数据
        allowedUsername = currentUser.username;
      }
    }
    
    // 获取授权记录统计
    const authSummary = await transactionService.getTransactionSummary(
      'AUTH',
      startDate as string,
      endDate as string,
      allowedUsername
    );

    // 获取结算记录统计
    const settleSummary = await transactionService.getTransactionSummary(
      'SETTLE', 
      startDate as string,
      endDate as string,
      allowedUsername
    );

    const response: ApiResponse = {
      success: true,
      data: {
        authSummary: {
          totalTransactions: authSummary.totalCount,
          totalAmount: authSummary.totalAmount,
          successCount: authSummary.successCount,
          failedCount: authSummary.failedCount,
        },
        settleSummary: {
          totalTransactions: settleSummary.totalCount,
          totalAmount: settleSummary.totalAmount,
          successCount: settleSummary.successCount,
          failedCount: settleSummary.failedCount,
        },
        dateRange: {
          startDate: startDate as string,
          endDate: endDate as string,
        }
      }
    };

    res.json(response);
  } catch (error) {
    console.error('获取交易汇总失败:', error);
    const response: ApiResponse = {
      success: false,
      error: {
        code: ErrorCodes.INTERNAL_ERROR,
        message: '获取交易汇总失败',
        details: error instanceof Error ? error.message : '未知错误'
      }
    };
    res.status(500).json(response);
  }
});

/**
 * 查询交易详情接口
 * GET /api/transactions/:id
 */
router.get('/:id', [
  param('id').isInt({ min: 1 }).withMessage('交易ID必须是正整数'),
], async (req: Request, res: Response): Promise<void> => {
  try {
    // 验证请求参数
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      const response: ApiResponse = {
        success: false,
        error: {
          code: ErrorCodes.INVALID_REQUEST,
          message: '请求参数验证失败',
          details: errors.array()
        }
      };
      res.status(400).json(response);
      return;
    }

    const transactionId = parseInt(req.params.id);
    const transaction = await transactionService.getTransactionById(transactionId);

    if (!transaction) {
      const response: ApiResponse = {
        success: false,
        error: {
          code: ErrorCodes.TRANSACTION_NOT_FOUND,
          message: '交易记录不存在'
        }
      };
      res.status(404).json(response);
      return;
    }

    const response: ApiResponse = {
      success: true,
      data: transaction
    };

    res.status(200).json(response);

  } catch (error) {
    console.error('查询交易详情异常:', error);
    const response: ApiResponse = {
      success: false,
      error: {
        code: ErrorCodes.INTERNAL_ERROR,
        message: '服务器内部错误'
      }
    };
    res.status(500).json(response);
  }
});

/**
 * 获取交易提现状态接口
 * GET /api/transactions/:txnId/withdrawal-status
 */
router.get('/:txnId/withdrawal-status', [
  param('txnId').notEmpty().withMessage('交易ID不能为空'),
], async (req: Request, res: Response): Promise<void> => {
  try {
    // 验证请求参数
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      const response: ApiResponse = {
        success: false,
        error: {
          code: ErrorCodes.INVALID_REQUEST,
          message: '请求参数验证失败',
          details: errors.array()
        }
      };
      res.status(400).json(response);
      return;
    }

    const txnId = req.params.txnId;
    const withdrawalStatus = await transactionService.getWithdrawalStatus(txnId);

    const response: ApiResponse = {
      success: true,
      data: withdrawalStatus
    };

    res.status(200).json(response);

  } catch (error) {
    console.error('查询提现状态异常:', error);
    const response: ApiResponse = {
      success: false,
      error: {
        code: ErrorCodes.INTERNAL_ERROR,
        message: '服务器内部错误'
      }
    };
    res.status(500).json(response);
  }
});

/**
 * 获取错误信息
 */
function getErrorMessage(errorCode: string): string {
  const errorMessages: Record<string, string> = {
    [ErrorCodes.INVALID_REQUEST]: '请求参数无效',
    [ErrorCodes.CARD_NOT_FOUND]: '卡片不存在',
    [ErrorCodes.USER_NOT_FOUND]: '用户不存在',
    [ErrorCodes.TRANSACTION_NOT_FOUND]: '交易记录不存在',
    [ErrorCodes.DUPLICATE_TRANSACTION]: '重复的交易',
    [ErrorCodes.INSUFFICIENT_BALANCE]: '余额不足',
    [ErrorCodes.CARD_INACTIVE]: '卡片状态异常',
    [ErrorCodes.USER_INACTIVE]: '用户状态异常',
    [ErrorCodes.DATABASE_ERROR]: '数据库错误',
    [ErrorCodes.BUSINESS_ERROR]: '业务处理失败',
    [ErrorCodes.INTERNAL_ERROR]: '服务器内部错误',
    'ALREADY_SETTLED': '交易已结算'
  };

  return errorMessages[errorCode] || '未知错误';
}

/**
 * 补偿充值接口
 * POST /api/transactions/:txnId/compensation-recharge
 */
router.post('/:txnId/compensation-recharge', [
  param('txnId').notEmpty().withMessage('交易ID不能为空'),
], async (req: Request, res: Response): Promise<void> => {
  try {
    // 验证请求参数
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      const response: ApiResponse = {
        success: false,
        error: {
          code: ErrorCodes.INVALID_REQUEST,
          message: '请求参数验证失败',
          details: errors.array()
        }
      };
      res.status(400).json(response);
      return;
    }

    const { txnId } = req.params;
    
    logger.info('📝 开始执行补偿充值', { txnId });

    const result = await transactionService.processCompensationRecharge(txnId);
    
    const response: ApiResponse = {
      success: true,
      data: result
    };
    
    logger.info('✅ 补偿充值执行成功', { txnId, result });
    res.json(response);
  } catch (error) {
    logger.error('❌ 补偿充值执行失败', { txnId: req.params.txnId, error });
    
    const errorMessage = error instanceof Error ? error.message : '未知错误';
    
    // 判断是否是业务错误（卡片相关错误）
    const isBusinessError = errorMessage.includes('卡片') || 
                           errorMessage.includes('余额') || 
                           errorMessage.includes('限额') || 
                           errorMessage.includes('状态异常');
    
    const response: ApiResponse = {
      success: false,
      error: {
        code: isBusinessError ? ErrorCodes.BUSINESS_ERROR : ErrorCodes.INTERNAL_ERROR,
        message: isBusinessError ? errorMessage : getErrorMessage(ErrorCodes.INTERNAL_ERROR),
        details: errorMessage
      }
    };
    
    // 业务错误返回400，系统错误返回500
    res.status(isBusinessError ? 400 : 500).json(response);
  }
});

/**
 * 重试提现接口
 * POST /api/transactions/:txnId/retry-withdrawal
 */
router.post('/:txnId/retry-withdrawal', [
  param('txnId').notEmpty().withMessage('交易ID不能为空'),
], async (req: Request, res: Response): Promise<void> => {
  try {
    // 验证请求参数
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      const response: ApiResponse = {
        success: false,
        error: {
          code: ErrorCodes.INVALID_REQUEST,
          message: '请求参数验证失败',
          details: errors.array()
        }
      };
      res.status(400).json(response);
      return;
    }

    const { txnId } = req.params;
    
    logger.info('🔄 开始重试提现', { txnId });

    const result = await transactionService.retryWithdrawal(txnId);
    
    const response: ApiResponse = {
      success: true,
      data: result
    };
    
    logger.info('✅ 重试提现执行成功', { txnId, result });
    res.json(response);
  } catch (error) {
    logger.error('❌ 重试提现执行失败', { txnId: req.params.txnId, error });
    
    const errorMessage = error instanceof Error ? error.message : '未知错误';
    
    // 判断是否是业务错误（卡片相关错误）
    const isBusinessError = errorMessage.includes('卡片') || 
                           errorMessage.includes('余额') || 
                           errorMessage.includes('限额') || 
                           errorMessage.includes('状态异常');
    
    const response: ApiResponse = {
      success: false,
      error: {
        code: isBusinessError ? ErrorCodes.BUSINESS_ERROR : ErrorCodes.INTERNAL_ERROR,
        message: isBusinessError ? errorMessage : getErrorMessage(ErrorCodes.INTERNAL_ERROR),
        details: errorMessage
      }
    };
    
    // 业务错误返回400，系统错误返回500
    res.status(isBusinessError ? 400 : 500).json(response);
  }
});

/**
 * 无偿通过接口
 * POST /api/transactions/:txnId/free-pass
 */
router.post('/:txnId/free-pass', [
  param('txnId').notEmpty().withMessage('交易ID不能为空'),
], async (req: Request, res: Response): Promise<void> => {
  try {
    // 验证请求参数
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      const response: ApiResponse = {
        success: false,
        error: {
          code: ErrorCodes.INVALID_REQUEST,
          message: '请求参数验证失败',
          details: errors.array()
        }
      };
      res.status(400).json(response);
      return;
    }

    const { txnId } = req.params;
    
    logger.info('📝 开始执行无偿通过', { txnId });

    const result = await transactionService.processFreePass(txnId);
    
    const response: ApiResponse = {
      success: true,
      data: result
    };
    
    logger.info('✅ 无偿通过执行成功', { txnId, result });
    res.json(response);
  } catch (error) {
    logger.error('❌ 无偿通过执行失败', { txnId: req.params.txnId, error });
    
    const errorMessage = error instanceof Error ? error.message : '未知错误';
    
    // 判断是否是业务错误（卡片相关错误）
    const isBusinessError = errorMessage.includes('Card provider API error') || 
                           errorMessage.includes('交易不存在') ||
                           errorMessage.includes('交易状态不正确') ||
                           errorMessage.includes('余额不足');
    
    const response: ApiResponse = {
      success: false,
      error: {
        code: isBusinessError ? ErrorCodes.BUSINESS_ERROR : ErrorCodes.INTERNAL_ERROR,
        message: isBusinessError ? errorMessage : getErrorMessage(ErrorCodes.INTERNAL_ERROR),
        details: errorMessage
      }
    };
    
    // 业务错误返回400，系统错误返回500
    res.status(isBusinessError ? 400 : 500).json(response);
  }
});

export default router;
