/**
 * 公告管理服务接口
 */

import { request } from '@umijs/max';
import type {
  AnnouncementItem,
  CreateAnnouncementRequest,
  UpdateAnnouncementRequest,
  AnnouncementListQuery
} from '@/types/announcement';

const API_PREFIX = '/announcements';

/**
 * 获取公告列表
 */
export async function getAnnouncements(params?: AnnouncementListQuery) {
  return request<{
    success: boolean;
    data: AnnouncementItem[];
    total: number;
    current: number;
    pageSize: number;
  }>(`${API_PREFIX}`, {
    method: 'GET',
    params,
  });
}

/**
 * 获取单个公告
 */
export async function getAnnouncementById(id: number) {
  return request<{
    success: boolean;
    data: AnnouncementItem;
  }>(`${API_PREFIX}/${id}`, {
    method: 'GET',
  });
}

/**
 * 创建公告
 */
export async function createAnnouncement(data: CreateAnnouncementRequest) {
  return request<{
    success: boolean;
    data: AnnouncementItem;
    message: string;
  }>(`${API_PREFIX}`, {
    method: 'POST',
    data,
  });
}

/**
 * 更新公告
 */
export async function updateAnnouncement(id: number, data: UpdateAnnouncementRequest) {
  return request<{
    success: boolean;
    data: AnnouncementItem;
    message: string;
  }>(`${API_PREFIX}/${id}`, {
    method: 'PUT',
    data,
  });
}

/**
 * 删除公告
 */
export async function deleteAnnouncement(id: number) {
  return request<{
    success: boolean;
    message: string;
  }>(`${API_PREFIX}/${id}`, {
    method: 'DELETE',
  });
}

/**
 * 获取紧急公告（用于通知铃铛）
 */
export async function getUrgentAnnouncements() {
  return request<{
    success: boolean;
    data: AnnouncementItem[];
  }>(`${API_PREFIX}/urgent/list`, {
    method: 'GET',
  });
}
