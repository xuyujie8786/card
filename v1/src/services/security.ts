/**
 * 安全设置服务接口
 */

import { request } from '@umijs/max';

const API_PREFIX = '/security';

export interface ChangePasswordRequest {
  currentPassword: string;
  newPassword: string;
}

export interface TwoFASetupResponse {
  secret: string;
  qrCode: string;
  backupCodes: string[];
}

export interface VerifyTwoFARequest {
  token: string;
}

export interface TwoFAStatusResponse {
  enabled: boolean;
  setupAt?: string;
}

/**
 * 修改密码
 */
export async function changePassword(data: ChangePasswordRequest) {
  return request<{
    code: number;
    message: string;
    data: any;
  }>(`${API_PREFIX}/change-password`, {
    method: 'POST',
    data,
  });
}

/**
 * 获取两步验证状态
 */
export async function getTwoFAStatus() {
  return request<{
    code: number;
    message: string;
    data: TwoFAStatusResponse;
  }>(`${API_PREFIX}/2fa/status`, {
    method: 'GET',
  });
}

/**
 * 设置两步验证 - 获取二维码和密钥
 */
export async function setup2FA() {
  return request<{
    code: number;
    message: string;
    data: TwoFASetupResponse;
  }>(`${API_PREFIX}/2fa/setup`, {
    method: 'POST',
  });
}

/**
 * 验证两步验证代码并启用
 */
export async function verify2FA(data: VerifyTwoFARequest) {
  return request<{
    code: number;
    message: string;
    data: any;
  }>(`${API_PREFIX}/2fa/verify`, {
    method: 'POST',
    data,
  });
}

/**
 * 禁用两步验证
 */
export async function disable2FA(verificationCode: string) {
  return request<{
    code: number;
    message: string;
    data: any;
  }>(`${API_PREFIX}/2fa/disable`, {
    method: 'POST',
    data: {
      verificationCode,
    },
  });
}

/**
 * 重新生成备用码
 */
export async function regenerateBackupCodes() {
  return request<{
    success: boolean;
    data: {
      backupCodes: string[];
    };
  }>(`${API_PREFIX}/2fa/backup-codes/regenerate`, {
    method: 'POST',
  });
}
