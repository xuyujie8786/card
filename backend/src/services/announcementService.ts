/**
 * 公告管理服务
 */

import { PrismaClient, AnnouncementType, AnnouncementStatus } from '@prisma/client';
import {
  CreateAnnouncementRequest,
  UpdateAnnouncementRequest,
  AnnouncementResponse,
  AnnouncementListQuery,
  PaginatedAnnouncementResponse
} from '../types/announcement';
import { JwtPayload } from '../types/auth';
import logger from '../config/logger';

const prisma = new PrismaClient();

export class AnnouncementService {
  /**
   * 创建公告
   */
  static async createAnnouncement(
    data: CreateAnnouncementRequest,
    currentUser: JwtPayload
  ): Promise<AnnouncementResponse> {
    try {
      // 检查权限：只有管理员可以创建公告
      if (currentUser.role !== 'SUPER_ADMIN' && currentUser.role !== 'ADMIN') {
        throw new Error('无权限创建公告');
      }

      const announcement = await prisma.announcement.create({
        data: {
          title: data.title,
          content: data.content,
          type: data.type,
          status: data.status || AnnouncementStatus.ACTIVE,
          createdBy: currentUser.id,
          publishedAt: (data.status === AnnouncementStatus.ACTIVE || !data.status) ? new Date() : null
        },
        include: {
          creator: {
            select: {
              id: true,
              username: true,
              name: true
            }
          }
        }
      });

      logger.info('公告创建成功', {
        announcementId: announcement.id,
        title: announcement.title,
        type: announcement.type,
        createdBy: currentUser.username
      });

      return this.formatAnnouncementResponse(announcement);
    } catch (error) {
      logger.error('创建公告失败', { error, data, userId: currentUser.id });
      throw error;
    }
  }

  /**
   * 获取公告列表
   */
  static async getAnnouncements(
    query: AnnouncementListQuery,
    currentUser?: JwtPayload
  ): Promise<PaginatedAnnouncementResponse> {
    try {
      const {
        current = 1,
        pageSize = 20,
        type,
        status,
        title
      } = query;

      const skip = (current - 1) * pageSize;
      const take = Math.min(pageSize, 100);

      // 构建查询条件
      const where: any = {};

      if (type) {
        where.type = type;
      }

      if (status) {
        where.status = status;
      } else {
        // 普通用户只能看到已发布的公告
        if (!currentUser || (currentUser.role !== 'SUPER_ADMIN' && currentUser.role !== 'ADMIN')) {
          where.status = AnnouncementStatus.ACTIVE;
        }
      }

      if (title) {
        where.title = {
          contains: title,
          mode: 'insensitive'
        };
      }

      const [announcements, total] = await Promise.all([
        prisma.announcement.findMany({
          where,
          include: {
            creator: {
              select: {
                id: true,
                username: true,
                name: true
              }
            }
          },
          orderBy: [
            { type: 'desc' }, // 紧急公告优先
            { publishedAt: 'desc' },
            { createdAt: 'desc' }
          ],
          skip,
          take
        }),
        prisma.announcement.count({ where })
      ]);

      return {
        data: announcements.map(this.formatAnnouncementResponse),
        total,
        current,
        pageSize
      };
    } catch (error) {
      logger.error('获取公告列表失败', { error, query });
      throw error;
    }
  }

  /**
   * 获取单个公告
   */
  static async getAnnouncementById(
    id: number,
    currentUser?: JwtPayload
  ): Promise<AnnouncementResponse> {
    try {
      const announcement = await prisma.announcement.findUnique({
        where: { id },
        include: {
          creator: {
            select: {
              id: true,
              username: true,
              name: true
            }
          }
        }
      });

      if (!announcement) {
        throw new Error('公告不存在');
      }

      // 权限检查：普通用户只能查看已发布的公告
      if (!currentUser || (currentUser.role !== 'SUPER_ADMIN' && currentUser.role !== 'ADMIN')) {
        if (announcement.status !== AnnouncementStatus.ACTIVE) {
          throw new Error('公告不存在或已下线');
        }
      }

      return this.formatAnnouncementResponse(announcement);
    } catch (error) {
      logger.error('获取公告详情失败', { error, id });
      throw error;
    }
  }

  /**
   * 更新公告
   */
  static async updateAnnouncement(
    id: number,
    data: UpdateAnnouncementRequest,
    currentUser: JwtPayload
  ): Promise<AnnouncementResponse> {
    try {
      // 检查权限
      if (currentUser.role !== 'SUPER_ADMIN' && currentUser.role !== 'ADMIN') {
        throw new Error('无权限编辑公告');
      }

      const existingAnnouncement = await prisma.announcement.findUnique({
        where: { id }
      });

      if (!existingAnnouncement) {
        throw new Error('公告不存在');
      }

      // 如果状态变为已发布，设置发布时间
      const updateData: any = { ...data };
      if (data.status === AnnouncementStatus.ACTIVE && existingAnnouncement.status !== AnnouncementStatus.ACTIVE) {
        updateData.publishedAt = new Date();
      }

      const announcement = await prisma.announcement.update({
        where: { id },
        data: updateData,
        include: {
          creator: {
            select: {
              id: true,
              username: true,
              name: true
            }
          }
        }
      });

      logger.info('公告更新成功', {
        announcementId: id,
        title: announcement.title,
        updatedBy: currentUser.username
      });

      return this.formatAnnouncementResponse(announcement);
    } catch (error) {
      logger.error('更新公告失败', { error, id, data, userId: currentUser.id });
      throw error;
    }
  }

  /**
   * 删除公告
   */
  static async deleteAnnouncement(id: number, currentUser: JwtPayload): Promise<void> {
    try {
      // 检查权限
      if (currentUser.role !== 'SUPER_ADMIN' && currentUser.role !== 'ADMIN') {
        throw new Error('无权限删除公告');
      }

      const announcement = await prisma.announcement.findUnique({
        where: { id }
      });

      if (!announcement) {
        throw new Error('公告不存在');
      }

      await prisma.announcement.delete({
        where: { id }
      });

      logger.info('公告删除成功', {
        announcementId: id,
        title: announcement.title,
        deletedBy: currentUser.username
      });
    } catch (error) {
      logger.error('删除公告失败', { error, id, userId: currentUser.id });
      throw error;
    }
  }

  /**
   * 获取紧急公告（用于通知铃铛）
   */
  static async getUrgentAnnouncements(): Promise<AnnouncementResponse[]> {
    try {
      const announcements = await prisma.announcement.findMany({
        where: {
          type: AnnouncementType.URGENT,
          status: AnnouncementStatus.ACTIVE
        },
        include: {
          creator: {
            select: {
              id: true,
              username: true,
              name: true
            }
          }
        },
        orderBy: {
          publishedAt: 'desc'
        },
        take: 10 // 最多显示10条紧急公告
      });

      return announcements.map(this.formatAnnouncementResponse);
    } catch (error) {
      logger.error('获取紧急公告失败', { error });
      throw error;
    }
  }

  /**
   * 格式化公告响应数据
   */
  private static formatAnnouncementResponse(announcement: any): AnnouncementResponse {
    return {
      id: announcement.id,
      title: announcement.title,
      content: announcement.content,
      type: announcement.type,
      status: announcement.status,
      createdBy: announcement.createdBy,
      createdAt: announcement.createdAt.toISOString(),
      updatedAt: announcement.updatedAt.toISOString(),
      publishedAt: announcement.publishedAt?.toISOString(),
      creator: announcement.creator
    };
  }
}

export default AnnouncementService;
