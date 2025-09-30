import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';

// 扩展UTC插件
dayjs.extend(utc);

/**
 * 格式化时间字符串（数据库中存储的是北京时间）
 * @param timeStr 时间字符串，格式如：2025-09-26T04:23:31Z
 * @param format 格式化字符串，默认 'YYYY-MM-DD HH:mm'
 * @returns 格式化后的时间字符串
 */
export const formatBeijingTime = (timeStr: string | null | undefined, format: string = 'YYYY-MM-DD HH:mm'): string => {
  if (!timeStr) return '-';
  
  // 数据库中存储的UTC时间实际表示北京时间
  // 使用 dayjs.utc() 避免时区自动转换，直接格式化UTC时间
  return dayjs.utc(timeStr).format(format);
};

/**
 * 格式化时间字符串（包含秒）
 * @param timeStr 时间字符串
 * @returns 格式化后的时间字符串（包含秒）
 */
export const formatBeijingTimeWithSeconds = (timeStr: string | null | undefined): string => {
  return formatBeijingTime(timeStr, 'YYYY-MM-DD HH:mm:ss');
};

/**
 * 获取当前北京时间
 * @param format 格式化字符串，默认 'YYYY-MM-DD HH:mm:ss'
 * @returns 格式化后的当前北京时间字符串
 */
export const getCurrentBeijingTime = (format: string = 'YYYY-MM-DD HH:mm:ss'): string => {
  // 获取当前UTC时间，然后转换为北京时间（+8小时）
  return dayjs.utc().add(8, 'hour').format(format);
};

/**
 * 将本地时间转换为UTC时间
 * @param localTime 本地时间
 * @returns UTC时间字符串
 */
export const toUTCTime = (localTime: string | Date): string => {
  return dayjs(localTime).toISOString();
};
