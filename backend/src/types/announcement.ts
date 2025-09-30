/**
 * 公告相关类型定义
 */

import { AnnouncementType, AnnouncementStatus } from '@prisma/client';

export { AnnouncementType, AnnouncementStatus };

export interface CreateAnnouncementRequest {
  title: string;
  content: string;
  type: AnnouncementType;
  status?: AnnouncementStatus;
}

export interface UpdateAnnouncementRequest {
  title?: string;
  content?: string;
  type?: AnnouncementType;
  status?: AnnouncementStatus;
}

export interface AnnouncementResponse {
  id: number;
  title: string;
  content: string;
  type: AnnouncementType;
  status: AnnouncementStatus;
  createdBy: number;
  createdAt: string;
  updatedAt: string;
  publishedAt?: string;
  creator?: {
    id: number;
    username: string;
    name?: string;
  };
}

export interface AnnouncementListQuery {
  current?: number;
  pageSize?: number;
  type?: AnnouncementType;
  status?: AnnouncementStatus;
  title?: string;
}

export interface PaginatedAnnouncementResponse {
  data: AnnouncementResponse[];
  total: number;
  current: number;
  pageSize: number;
}
