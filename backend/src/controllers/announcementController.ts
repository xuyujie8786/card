/**
 * 公告管理控制器
 */

import { Request, Response } from 'express';
import { body, param, query } from 'express-validator';
import { AnnouncementService } from '../services/announcementService';
import { AuthRequest } from '../middleware/auth';
import { AnnouncementType, AnnouncementStatus } from '../types/announcement';
import logger from '../config/logger';

export class AnnouncementController {
  /**
   * 创建公告
   */
  static async createAnnouncement(req: AuthRequest, res: Response) {
    try {
      const announcement = await AnnouncementService.createAnnouncement(req.body, req.user!);
      
      res.json({
        success: true,
        data: announcement,
        message: '公告创建成功'
      });
    } catch (error: any) {
      logger.error('创建公告失败', { error: error.message, body: req.body, userId: req.user?.id });
      res.status(400).json({
        success: false,
        message: error.message || '创建公告失败'
      });
    }
  }

  /**
   * 获取公告列表
   */
  static async getAnnouncements(req: AuthRequest, res: Response) {
    try {
      const result = await AnnouncementService.getAnnouncements(req.query as any, req.user);
      
      res.json({
        success: true,
        data: result.data,
        total: result.total,
        current: result.current,
        pageSize: result.pageSize
      });
    } catch (error: any) {
      logger.error('获取公告列表失败', { error: error.message, query: req.query });
      res.status(400).json({
        success: false,
        message: error.message || '获取公告列表失败'
      });
    }
  }

  /**
   * 获取单个公告
   */
  static async getAnnouncementById(req: AuthRequest, res: Response) {
    try {
      const id = parseInt(req.params.id);
      const announcement = await AnnouncementService.getAnnouncementById(id, req.user);
      
      res.json({
        success: true,
        data: announcement
      });
    } catch (error: any) {
      logger.error('获取公告详情失败', { error: error.message, id: req.params.id });
      res.status(404).json({
        success: false,
        message: error.message || '获取公告详情失败'
      });
    }
  }

  /**
   * 更新公告
   */
  static async updateAnnouncement(req: AuthRequest, res: Response) {
    try {
      const id = parseInt(req.params.id);
      const announcement = await AnnouncementService.updateAnnouncement(id, req.body, req.user!);
      
      res.json({
        success: true,
        data: announcement,
        message: '公告更新成功'
      });
    } catch (error: any) {
      logger.error('更新公告失败', { error: error.message, id: req.params.id, body: req.body });
      res.status(400).json({
        success: false,
        message: error.message || '更新公告失败'
      });
    }
  }

  /**
   * 删除公告
   */
  static async deleteAnnouncement(req: AuthRequest, res: Response) {
    try {
      const id = parseInt(req.params.id);
      await AnnouncementService.deleteAnnouncement(id, req.user!);
      
      res.json({
        success: true,
        message: '公告删除成功'
      });
    } catch (error: any) {
      logger.error('删除公告失败', { error: error.message, id: req.params.id });
      res.status(400).json({
        success: false,
        message: error.message || '删除公告失败'
      });
    }
  }

  /**
   * 获取紧急公告（用于通知铃铛）
   */
  static async getUrgentAnnouncements(req: Request, res: Response) {
    try {
      const announcements = await AnnouncementService.getUrgentAnnouncements();
      
      res.json({
        success: true,
        data: announcements
      });
    } catch (error: any) {
      logger.error('获取紧急公告失败', { error: error.message });
      res.status(400).json({
        success: false,
        message: error.message || '获取紧急公告失败'
      });
    }
  }
}

/**
 * 验证规则
 */
export const createAnnouncementValidation = [
  body('title')
    .trim()
    .notEmpty()
    .withMessage('标题不能为空')
    .isLength({ max: 200 })
    .withMessage('标题长度不能超过200字符'),
  body('content')
    .trim()
    .notEmpty()
    .withMessage('内容不能为空'),
  body('type')
    .isIn(Object.values(AnnouncementType))
    .withMessage('公告类型无效'),
  body('status')
    .optional()
    .isIn(Object.values(AnnouncementStatus))
    .withMessage('公告状态无效')
];

export const updateAnnouncementValidation = [
  param('id')
    .isInt({ min: 1 })
    .withMessage('公告ID必须是正整数'),
  body('title')
    .optional()
    .trim()
    .notEmpty()
    .withMessage('标题不能为空')
    .isLength({ max: 200 })
    .withMessage('标题长度不能超过200字符'),
  body('content')
    .optional()
    .trim()
    .notEmpty()
    .withMessage('内容不能为空'),
  body('type')
    .optional()
    .isIn(Object.values(AnnouncementType))
    .withMessage('公告类型无效'),
  body('status')
    .optional()
    .isIn(Object.values(AnnouncementStatus))
    .withMessage('公告状态无效')
];

export const getAnnouncementValidation = [
  param('id')
    .isInt({ min: 1 })
    .withMessage('公告ID必须是正整数')
];

export const getAnnouncementsValidation = [
  query('current')
    .optional()
    .isInt({ min: 1 })
    .withMessage('页码必须是正整数'),
  query('pageSize')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('每页条数必须在1-100之间'),
  query('type')
    .optional()
    .isIn(Object.values(AnnouncementType))
    .withMessage('公告类型无效'),
  query('status')
    .optional()
    .isIn(Object.values(AnnouncementStatus))
    .withMessage('公告状态无效')
];

export default AnnouncementController;


