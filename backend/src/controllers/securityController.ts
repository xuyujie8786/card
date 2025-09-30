import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import speakeasy from 'speakeasy';
import { PrismaClient } from '@prisma/client';
import logger from '../config/logger';
import { successResponse, errorResponse } from '../utils/response';

// 扩展Express Request接口
declare global {
  namespace Express {
    interface Request {
      user?: {
        id: number;
        username: string;
        email: string;
        role: string;
      };
    }
  }
}

const prisma = new PrismaClient();

// 简单的TOTP实现
function generateTOTP(secret: string, timeStep: number = 30): string {
  const time = Math.floor(Date.now() / 1000 / timeStep);
  const timeHex = time.toString(16).padStart(16, '0');
  const hmac = crypto.createHmac('sha1', Buffer.from(secret));
  hmac.update(Buffer.from(timeHex, 'hex'));
  const hash = hmac.digest();
  
  const offset = hash[hash.length - 1] & 0xf;
  const code = (hash[offset] & 0x7f) << 24 |
               (hash[offset + 1] & 0xff) << 16 |
               (hash[offset + 2] & 0xff) << 8 |
               (hash[offset + 3] & 0xff);
  
  return (code % 1000000).toString().padStart(6, '0');
}

function verifyTOTP(secret: string, token: string, window: number = 2): boolean {
  const timeStep = 30;
  const currentTime = Math.floor(Date.now() / 1000 / timeStep);
  
  console.log(`TOTP验证: 当前时间步=${currentTime}, 输入token=${token}`);
  
  // Base32解码
  function base32Decode(encoded: string): Buffer {
    const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
    encoded = encoded.toUpperCase().replace(/=+$/, '');
    
    let bits = '';
    for (let i = 0; i < encoded.length; i++) {
      const val = alphabet.indexOf(encoded[i]);
      if (val === -1) throw new Error('Invalid base32 character');
      bits += val.toString(2).padStart(5, '0');
    }
    
    const bytes = [];
    for (let i = 0; i < bits.length; i += 8) {
      if (i + 8 <= bits.length) {
        bytes.push(parseInt(bits.substr(i, 8), 2));
      }
    }
    
    return Buffer.from(bytes);
  }
  
  for (let i = -window; i <= window; i++) {
    const time = currentTime + i;
    const timeBuffer = Buffer.alloc(8);
    timeBuffer.writeUInt32BE(Math.floor(time / 0x100000000), 0);
    timeBuffer.writeUInt32BE(time & 0xffffffff, 4);
    
    try {
      const secretBuffer = base32Decode(secret);
      const hmac = crypto.createHmac('sha1', secretBuffer);
      hmac.update(timeBuffer);
      const hash = hmac.digest();
      
      const offset = hash[hash.length - 1] & 0xf;
      const code = (hash[offset] & 0x7f) << 24 |
                   (hash[offset + 1] & 0xff) << 16 |
                   (hash[offset + 2] & 0xff) << 8 |
                   (hash[offset + 3] & 0xff);
      
      const expectedToken = (code % 1000000).toString().padStart(6, '0');
      console.log(`时间步${time}(offset ${i}): 期望token=${expectedToken}, 输入token=${token}`);
      
      if (expectedToken === token) {
        console.log('TOTP验证成功!');
        return true;
      }
    } catch (error) {
      console.error('TOTP verification error:', error);
      return false;
    }
  }
  
  console.log('TOTP验证失败，所有时间窗口都不匹配');
  return false;
}

export class SecurityController {
  // 修改密码
  async changePassword(req: Request, res: Response) {
    try {
      logger.info(`🔐 修改密码请求开始`, { userId: req.user?.id });
      const userId = req.user?.id;
      const { currentPassword, newPassword } = req.body;

      if (!userId) {
        return errorResponse(res, '用户未认证', 401);
      }

      if (!currentPassword || !newPassword) {
        return errorResponse(res, '当前密码和新密码不能为空', 400);
      }

      // 获取用户信息
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { id: true, passwordHash: true }
      });

      if (!user) {
        return errorResponse(res, '用户不存在', 404);
      }

      // 验证当前密码
      const isCurrentPasswordValid = await bcrypt.compare(currentPassword, user.passwordHash);
      if (!isCurrentPasswordValid) {
        return errorResponse(res, '当前密码错误', 400);
      }

      // 检查新密码强度
      if (newPassword.length < 6) {
        return errorResponse(res, '新密码长度至少为6位', 400);
      }

      // 加密新密码 (降低rounds避免超时)
      const hashedNewPassword = await bcrypt.hash(newPassword, 8);

      // 更新密码
      await prisma.user.update({
        where: { id: userId },
        data: { passwordHash: hashedNewPassword }
      });

      logger.info(`User ${userId} changed password`);

      return successResponse(res, null, '密码修改成功');
    } catch (error) {
      logger.error('Change password error:', error);
      return errorResponse(res, '修改密码失败', 500);
    }
  }

  // 获取2FA状态
  async getTwoFAStatus(req: Request, res: Response) {
    try {
      const userId = req.user?.id;

      if (!userId) {
        return errorResponse(res, '用户未认证', 401);
      }

      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { twoFAEnabled: true, twoFASecret: true }
      });

      if (!user) {
        return errorResponse(res, '用户不存在', 404);
      }

      return successResponse(res, {
        enabled: user.twoFAEnabled || false,
        hasSecret: !!user.twoFASecret
      }, '获取2FA状态成功');
    } catch (error) {
      logger.error('Get 2FA status error:', error);
      return errorResponse(res, '获取2FA状态失败', 500);
    }
  }

  // 设置2FA - 生成简单的6位数字验证码
  async setup2FA(req: Request, res: Response) {
    try {
      const userId = req.user?.id;

      if (!userId) {
        return errorResponse(res, '用户未认证', 401);
      }

      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { id: true, email: true, username: true }
      });

      if (!user) {
        return errorResponse(res, '用户不存在', 404);
      }

      // 使用speakeasy生成密钥
      const secret = speakeasy.generateSecret({
        name: `VCard-${user.username}`,
        issuer: 'VCard Platform',
        length: 32
      });


      // 临时保存密钥（用户验证后才正式启用）
      await prisma.user.update({
        where: { id: userId },
        data: { 
          twoFASecret: secret.base32
        }
      });

      logger.info(`User ${userId} started 2FA setup`);

      return successResponse(res, {
        secret: secret.base32,
        qrCode: secret.otpauth_url,
        setupInstructions: '请使用任何支持TOTP的验证器应用（如Google Authenticator）扫描二维码或手动输入密钥'
      }, '2FA设置初始化成功');
    } catch (error) {
      logger.error('Setup 2FA error:', error);
      return errorResponse(res, '设置2FA失败', 500);
    }
  }

  // 验证2FA
  async verify2FA(req: Request, res: Response) {
    try {
      logger.info(`🔍 verify2FA 方法被调用`, { body: req.body, user: req.user });
      
      const userId = req.user?.id;
      const { code, token } = req.body;
      // 支持两种参数名：code 和 token
      const verificationCode = code || token;

      logger.info(`2FA验证请求`, { userId, verificationCode: verificationCode?.length || 0, actualCode: verificationCode });

      if (!userId) {
        return errorResponse(res, '用户未认证', 401);
      }

      if (!verificationCode) {
        return errorResponse(res, '验证码不能为空', 400);
      }

      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { twoFASecret: true, twoFABackupCodes: true }
      });

      if (!user || !user.twoFASecret) {
        logger.warn(`用户${userId} 2FA尚未设置`);
        return errorResponse(res, '2FA尚未设置', 400);
      }

      logger.info(`开始验证TOTP`, { 
        userId, 
        secretLength: user.twoFASecret?.length || 0,
        secret: user.twoFASecret,
        inputToken: verificationCode 
      });

      let verified = false;

      // 使用speakeasy验证TOTP token
      verified = speakeasy.totp.verify({
        secret: user.twoFASecret,
        encoding: 'base32',
        token: verificationCode,
        window: 2
      });

      logger.info(`TOTP验证结果`, { userId, verified, inputToken: verificationCode });

      if (!verified) {
        return errorResponse(res, '验证码错误', 400);
      }

      // 启用2FA
      await prisma.user.update({
        where: { id: userId },
        data: { twoFAEnabled: true }
      });

      logger.info(`User ${userId} enabled 2FA`);

      return successResponse(res, null, '2FA验证成功，已启用两步验证');
    } catch (error) {
      logger.error('Verify 2FA error:', error);
      return errorResponse(res, '验证2FA失败', 500);
    }
  }

  // 禁用2FA
  async disable2FA(req: Request, res: Response) {
    try {
      const userId = req.user?.id;
      const { verificationCode } = req.body;

      if (!userId) {
        return errorResponse(res, '用户未认证', 401);
      }

      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { twoFASecret: true, twoFAEnabled: true }
      });

      if (!user) {
        return errorResponse(res, '用户不存在', 404);
      }

      if (!user.twoFAEnabled) {
        return errorResponse(res, '2FA未启用', 400);
      }

      // 必须提供2FA验证码
      if (!verificationCode) {
        return errorResponse(res, '请输入2FA验证码', 400);
      }

      if (!user.twoFASecret) {
        return errorResponse(res, '2FA密钥不存在', 400);
      }

      // 验证2FA验证码
      const verified = speakeasy.totp.verify({
        secret: user.twoFASecret,
        token: verificationCode.toString(),
        encoding: 'base32',
        window: 1
      });

      logger.info(`2FA验证码验证`, { userId, verified, inputToken: verificationCode });

      if (!verified) {
        logger.warn(`User ${userId} failed 2FA verification when disabling 2FA`);
        return errorResponse(res, '验证码错误', 400);
      }

      // 禁用2FA
      await prisma.user.update({
        where: { id: userId },
        data: { 
          twoFAEnabled: false,
          twoFASecret: null,
          twoFABackupCodes: null
        }
      });

      logger.info(`User ${userId} disabled 2FA`);

      return successResponse(res, null, '2FA已禁用');
    } catch (error) {
      logger.error('Disable 2FA error:', error);
      return errorResponse(res, '禁用2FA失败', 500);
    }
  }

}

export const securityController = new SecurityController();
