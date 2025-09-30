/**
 * 公告相关类型定义
 */

export enum AnnouncementType {
  NORMAL = 'NORMAL',
  URGENT = 'URGENT'
}

export enum AnnouncementPriority {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH'
}

export enum AnnouncementStatus {
  DRAFT = 'DRAFT',
  ACTIVE = 'ACTIVE', 
  ARCHIVED = 'ARCHIVED'
}

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

export interface AnnouncementItem {
  id: number;
  title: string;
  content: string;
  type: AnnouncementType;
  status: AnnouncementStatus;
  priority?: AnnouncementPriority;
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

// 公告类型文本映射
export const AnnouncementTypeText = {
  [AnnouncementType.NORMAL]: '普通公告',
  [AnnouncementType.URGENT]: '紧急公告'
};

// 公告状态文本映射
export const AnnouncementStatusText = {
  [AnnouncementStatus.DRAFT]: '草稿',
  [AnnouncementStatus.ACTIVE]: '已发布',
  [AnnouncementStatus.ARCHIVED]: '已归档'
};
