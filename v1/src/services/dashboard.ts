import { request } from '@umijs/max';
import { API_CONFIG } from '@/config/api';

export interface DashboardData {
  totalRecharge: number;
  totalConsumption: number;
  cardLocked: number;
  availableAmount: number;
}

export interface SystemOverview {
  totalUsers: number;
  totalCards: number;
  totalTransactions: number;
  totalVolume: number;
  systemStatus: 'healthy' | 'warning' | 'error';
}

/**
 * 获取用户仪表盘数据
 */
export async function getDashboardData(): Promise<{
  success: boolean;
  data: DashboardData;
  message: string;
}> {
  console.log('🔍 获取仪表盘数据', {
    useMock: API_CONFIG.useMock,
    forceRealAPI: true,
    url: '/dashboard/data'
  });

  return request(`${API_CONFIG.baseURL}/dashboard/data`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
    },
  });
}

/**
 * 获取系统总览数据（管理员专用）
 */
export async function getSystemOverview(): Promise<{
  success: boolean;
  data: SystemOverview;
  message: string;
}> {
  console.log('🔍 获取系统总览数据', {
    useMock: API_CONFIG.useMock,
    forceRealAPI: true,
    url: '/dashboard/system-overview'
  });

  return request(`${API_CONFIG.baseURL}/dashboard/system-overview`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
    },
  });
}

/**
 * 获取用户财务详情
 */
export async function getFinancialDetails(): Promise<{
  success: boolean;
  data: DashboardData & {
    lastUpdated: string;
  };
  message: string;
}> {
  console.log('🔍 获取财务详情', {
    useMock: API_CONFIG.useMock,
    forceRealAPI: true,
    url: '/dashboard/financial-details'
  });

  return request(`${API_CONFIG.baseURL}/dashboard/financial-details`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
    },
  });
}

/**
 * 获取消费趋势数据
 */
export async function getConsumptionTrend(days: number = 7): Promise<{
  success: boolean;
  data: Array<{
    date: string;
    consumption: number;
  }>;
  message: string;
}> {
  console.log('📊 获取消费趋势数据', {
    days,
    useMock: API_CONFIG.useMock,
    forceRealAPI: true,
    url: '/dashboard/consumption-trend'
  });

  return request(`${API_CONFIG.baseURL}/dashboard/consumption-trend`, {
    method: 'GET',
    params: { days },
    headers: {
      'Content-Type': 'application/json',
    },
  });
}

