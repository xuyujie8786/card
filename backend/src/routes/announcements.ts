/**
 * 公告管理路由
 */

import { Router } from 'express';
import { authenticateToken, authorizeRoles } from '../middleware/auth';
import { handleValidationErrors } from '../middleware/validation';
import AnnouncementController, {
  createAnnouncementValidation,
  updateAnnouncementValidation,
  getAnnouncementValidation,
  getAnnouncementsValidation
} from '../controllers/announcementController';

const router = Router();

/**
 * 获取公告列表（所有用户都可以访问）
 * GET /api/announcements
 */
router.get(
  '/',
  getAnnouncementsValidation,
  handleValidationErrors,
  authenticateToken,
  AnnouncementController.getAnnouncements
);

/**
 * 获取单个公告（所有用户都可以访问）
 * GET /api/announcements/:id
 */
router.get(
  '/:id',
  getAnnouncementValidation,
  handleValidationErrors,
  authenticateToken,
  AnnouncementController.getAnnouncementById
);

/**
 * 获取紧急公告（用于通知铃铛，无需认证）
 * GET /api/announcements/urgent/list
 */
router.get(
  '/urgent/list',
  AnnouncementController.getUrgentAnnouncements
);

/**
 * 创建公告（仅管理员）
 * POST /api/announcements
 */
router.post(
  '/',
  authenticateToken,
  authorizeRoles(['SUPER_ADMIN', 'ADMIN']),
  createAnnouncementValidation,
  handleValidationErrors,
  AnnouncementController.createAnnouncement
);

/**
 * 更新公告（仅管理员）
 * PUT /api/announcements/:id
 */
router.put(
  '/:id',
  authenticateToken,
  authorizeRoles(['SUPER_ADMIN', 'ADMIN']),
  updateAnnouncementValidation,
  handleValidationErrors,
  AnnouncementController.updateAnnouncement
);

/**
 * 删除公告（仅管理员）
 * DELETE /api/announcements/:id
 */
router.delete(
  '/:id',
  authenticateToken,
  authorizeRoles(['SUPER_ADMIN', 'ADMIN']),
  getAnnouncementValidation,
  handleValidationErrors,
  AnnouncementController.deleteAnnouncement
);

export default router;


