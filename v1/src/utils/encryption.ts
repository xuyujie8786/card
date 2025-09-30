/**
 * 🔐 敏感数据加密工具
 * 
 * 功能：
 * - AES-256-GCM加密敏感数据
 * - 动态密钥派生
 * - 数据完整性验证
 * - 安全的随机数生成
 */

import CryptoJS from 'crypto-js';

interface EncryptionResult {
  encryptedData: string;
  iv: string;
  tag: string;
  timestamp: number;
}

interface DecryptionResult {
  data: string;
  timestamp: number;
  isExpired: boolean;
}

class DataEncryption {
  // 🔑 主密钥（生产环境应从环境变量获取）
  private static readonly MASTER_KEY = process.env.ENCRYPTION_MASTER_KEY || 
    'your-super-secret-master-key-change-this-in-production-256bit';
  
  // ⏰ 数据过期时间（默认1年）
  private static readonly DEFAULT_TTL = 365 * 24 * 60 * 60 * 1000; // 1年

  /**
   * 生成数据特定的密钥
   * @param dataType 数据类型（如 'card_number', 'cvv', 'password'）
   * @param userId 用户ID
   * @returns 派生密钥
   */
  private static deriveKey(dataType: string, userId: string): string {
    const keyMaterial = `${this.MASTER_KEY}:${dataType}:${userId}`;
    return CryptoJS.SHA256(keyMaterial).toString();
  }

  /**
   * 加密敏感数据
   * @param data 原始数据
   * @param dataType 数据类型
   * @param userId 用户ID
   * @param ttl 过期时间（毫秒）
   * @returns 加密结果
   */
  static encrypt(
    data: string,
    dataType: 'card_number' | 'cvv' | 'password' | 'personal_info',
    userId: string,
    ttl: number = this.DEFAULT_TTL
  ): EncryptionResult {
    try {
      // 生成随机IV
      const iv = CryptoJS.lib.WordArray.random(16);
      
      // 派生密钥
      const key = this.deriveKey(dataType, userId);
      
      // 创建加密数据包
      const timestamp = Date.now();
      const payload = JSON.stringify({
        data,
        timestamp,
        expiresAt: timestamp + ttl,
        dataType,
        userId,
      });

      // AES-256-GCM加密
      const encrypted = CryptoJS.AES.encrypt(payload, key, {
        iv: iv,
        mode: CryptoJS.mode.GCM,
        padding: CryptoJS.pad.NoPadding
      });

      return {
        encryptedData: encrypted.ciphertext.toString(),
        iv: iv.toString(),
        tag: encrypted.tag?.toString() || '',
        timestamp,
      };
    } catch (error) {
      console.error('❌ 数据加密失败:', error);
      throw new Error('数据加密失败');
    }
  }

  /**
   * 解密敏感数据
   * @param encryptionResult 加密结果
   * @param dataType 数据类型
   * @param userId 用户ID
   * @returns 解密结果
   */
  static decrypt(
    encryptionResult: EncryptionResult,
    dataType: 'card_number' | 'cvv' | 'password' | 'personal_info',
    userId: string
  ): DecryptionResult {
    try {
      // 派生密钥
      const key = this.deriveKey(dataType, userId);
      
      // 重建加密对象
      const encrypted = CryptoJS.lib.CipherParams.create({
        ciphertext: CryptoJS.enc.Hex.parse(encryptionResult.encryptedData),
        iv: CryptoJS.enc.Hex.parse(encryptionResult.iv),
        tag: CryptoJS.enc.Hex.parse(encryptionResult.tag)
      });

      // 解密
      const decrypted = CryptoJS.AES.decrypt(encrypted, key, {
        mode: CryptoJS.mode.GCM,
        padding: CryptoJS.pad.NoPadding
      });

      const payload = JSON.parse(decrypted.toString(CryptoJS.enc.Utf8));
      
      // 验证数据完整性
      if (payload.dataType !== dataType || payload.userId !== userId) {
        throw new Error('数据完整性验证失败');
      }

      const now = Date.now();
      const isExpired = now > payload.expiresAt;

      return {
        data: payload.data,
        timestamp: payload.timestamp,
        isExpired,
      };
    } catch (error) {
      console.error('❌ 数据解密失败:', error);
      throw new Error('数据解密失败或数据已损坏');
    }
  }

  /**
   * 加密卡号（特殊处理：保留后4位明文用于显示）
   * @param cardNumber 完整卡号
   * @param userId 用户ID
   * @returns 加密结果和显示用的掩码
   */
  static encryptCardNumber(cardNumber: string, userId: string) {
    // 移除空格和特殊字符
    const cleanCardNumber = cardNumber.replace(/\D/g, '');
    
    // 验证卡号格式
    if (!/^\d{13,19}$/.test(cleanCardNumber)) {
      throw new Error('无效的卡号格式');
    }

    const encrypted = this.encrypt(cleanCardNumber, 'card_number', userId);
    
    // 生成显示用的掩码（保留后4位）
    const last4 = cleanCardNumber.slice(-4);
    const maskedNumber = '**** **** **** ' + last4;

    return {
      encrypted,
      maskedNumber,
      last4,
    };
  }

  /**
   * 加密CVV
   * @param cvv CVV码
   * @param userId 用户ID
   * @returns 加密结果
   */
  static encryptCVV(cvv: string, userId: string) {
    // 验证CVV格式
    if (!/^\d{3,4}$/.test(cvv)) {
      throw new Error('无效的CVV格式');
    }

    return this.encrypt(cvv, 'cvv', userId);
  }

  /**
   * 生成安全的随机密码
   * @param length 密码长度
   * @returns 随机密码
   */
  static generateSecurePassword(length: number = 16): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*';
    const randomBytes = CryptoJS.lib.WordArray.random(length);
    let password = '';
    
    for (let i = 0; i < length; i++) {
      const randomIndex = randomBytes.words[Math.floor(i / 4)] >>> ((i % 4) * 8) & 0xFF;
      password += chars[randomIndex % chars.length];
    }
    
    return password;
  }

  /**
   * 哈希密码（用于存储用户密码）
   * @param password 原始密码
   * @param salt 盐值（可选，自动生成）
   * @returns 哈希结果
   */
  static hashPassword(password: string, salt?: string): { hash: string; salt: string } {
    if (!salt) {
      salt = CryptoJS.lib.WordArray.random(32).toString();
    }
    
    const hash = CryptoJS.PBKDF2(password, salt, {
      keySize: 256 / 32,
      iterations: 100000
    }).toString();

    return { hash, salt };
  }

  /**
   * 验证密码
   * @param password 输入的密码
   * @param hash 存储的哈希
   * @param salt 盐值
   * @returns 是否匹配
   */
  static verifyPassword(password: string, hash: string, salt: string): boolean {
    const computedHash = CryptoJS.PBKDF2(password, salt, {
      keySize: 256 / 32,
      iterations: 100000
    }).toString();

    return computedHash === hash;
  }

  /**
   * 生成CSRF令牌
   * @param userId 用户ID
   * @param sessionId 会话ID
   * @returns CSRF令牌
   */
  static generateCSRFToken(userId: string, sessionId: string): string {
    const timestamp = Date.now();
    const payload = `${userId}:${sessionId}:${timestamp}`;
    const signature = CryptoJS.HmacSHA256(payload, this.MASTER_KEY).toString();
    
    return Buffer.from(`${payload}:${signature}`).toString('base64');
  }

  /**
   * 验证CSRF令牌
   * @param token CSRF令牌
   * @param userId 用户ID
   * @param sessionId 会话ID
   * @param maxAge 最大有效期（毫秒）
   * @returns 是否有效
   */
  static verifyCSRFToken(
    token: string,
    userId: string,
    sessionId: string,
    maxAge: number = 60 * 60 * 1000 // 1小时
  ): boolean {
    try {
      const decoded = Buffer.from(token, 'base64').toString('utf-8');
      const parts = decoded.split(':');
      
      if (parts.length !== 4) return false;
      
      const [tokenUserId, tokenSessionId, timestampStr, signature] = parts;
      const timestamp = parseInt(timestampStr);
      
      // 检查时间戳
      if (Date.now() - timestamp > maxAge) return false;
      
      // 检查用户ID和会话ID
      if (tokenUserId !== userId || tokenSessionId !== sessionId) return false;
      
      // 验证签名
      const payload = `${tokenUserId}:${tokenSessionId}:${timestamp}`;
      const expectedSignature = CryptoJS.HmacSHA256(payload, this.MASTER_KEY).toString();
      
      return signature === expectedSignature;
    } catch (error) {
      return false;
    }
  }
}

// 🎯 预定义的加密字段处理器
export const EncryptedFields = {
  /**
   * 处理虚拟卡数据加密
   */
  async encryptCardData(cardData: {
    cardNumber: string;
    cvv: string;
    userId: string;
  }) {
    const cardNumberResult = DataEncryption.encryptCardNumber(cardData.cardNumber, cardData.userId);
    const cvvResult = DataEncryption.encryptCVV(cardData.cvv, cardData.userId);

    return {
      encryptedCardNumber: cardNumberResult.encrypted,
      encryptedCVV: cvvResult,
      maskedCardNumber: cardNumberResult.maskedNumber,
      last4: cardNumberResult.last4,
    };
  },

  /**
   * 解密虚拟卡数据
   */
  async decryptCardData(encryptedData: {
    encryptedCardNumber: EncryptionResult;
    encryptedCVV: EncryptionResult;
    userId: string;
  }) {
    const cardNumber = DataEncryption.decrypt(
      encryptedData.encryptedCardNumber,
      'card_number',
      encryptedData.userId
    );
    
    const cvv = DataEncryption.decrypt(
      encryptedData.encryptedCVV,
      'cvv',
      encryptedData.userId
    );

    return {
      cardNumber: cardNumber.data,
      cvv: cvv.data,
      isCardNumberExpired: cardNumber.isExpired,
      isCVVExpired: cvv.isExpired,
    };
  },
};

export default DataEncryption;


