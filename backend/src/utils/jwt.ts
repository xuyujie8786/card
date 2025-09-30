import jwt, { SignOptions } from 'jsonwebtoken';
import { config } from '../config';
import { JwtPayload } from '../types/auth';

/**
 * 生成 JWT Token
 * @param payload JWT 载荷
 * @returns JWT Token
 */
export const generateToken = (payload: Omit<JwtPayload, 'iat' | 'exp'>): string => {
  return jwt.sign(payload, config.jwtSecret, {
    expiresIn: config.jwtExpiresIn,
  } as SignOptions);
};

/**
 * 验证 JWT Token
 * @param token JWT Token
 * @returns 解码后的载荷
 */
export const verifyToken = (token: string): JwtPayload => {
  return jwt.verify(token, config.jwtSecret) as JwtPayload;
};

/**
 * 解码 JWT Token（不验证）
 * @param token JWT Token
 * @returns 解码后的载荷
 */
export const decodeToken = (token: string): JwtPayload | null => {
  try {
    return jwt.decode(token) as JwtPayload;
  } catch {
    return null;
  }
};

/**
 * 检查 Token 是否即将过期
 * @param token JWT Token
 * @param threshold 阈值（秒）
 * @returns 是否即将过期
 */
export const isTokenExpiringSoon = (token: string, threshold: number = 3600): boolean => {
  const decoded = decodeToken(token);
  if (!decoded || !decoded.exp) return true;
  
  const now = Math.floor(Date.now() / 1000);
  return decoded.exp - now < threshold;
};
