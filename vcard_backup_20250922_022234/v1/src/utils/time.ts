import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';

// 扩展UTC插件
dayjs.extend(utc);

/**
 * 将UTC时间转换为北京时间并格式化
 * @param utcTime UTC时间字符串  
 * @param format 格式化字符串，默认 'YYYY-MM-DD HH:mm'
 * @returns 格式化后的北京时间字符串
 */
export const formatBeijingTime = (utcTime: string | null | undefined, format: string = 'YYYY-MM-DD HH:mm'): string => {
  if (!utcTime) return '-';
  
  // 确保正确处理UTC时间，转换为北京时间（UTC+8）
  return dayjs.utc(utcTime).add(8, 'hour').format(format);
};

/**
 * 将UTC时间转换为北京时间并格式化（包含秒）
 * @param utcTime UTC时间字符串
 * @returns 格式化后的北京时间字符串（包含秒）
 */
export const formatBeijingTimeWithSeconds = (utcTime: string | null | undefined): string => {
  return formatBeijingTime(utcTime, 'YYYY-MM-DD HH:mm:ss');
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
