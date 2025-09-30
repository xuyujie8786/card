import crypto from 'crypto';

/**
 * AES加密/解密工具类
 * 根据卡商API要求：
 * - 使用AES的CBC模式
 * - Padding类型为PKCS7
 * - IV固定为 "\x00\x01\x02\x03\x04\x05\x06\x07\x08\x09\x0A\x0B\x0C\x0D\x0E\x0F"
 * - 加密后使用base64进行编码
 */
export class AESCrypto {
  private readonly algorithm = 'aes-128-cbc';
  private readonly iv = Buffer.from([0x00, 0x01, 0x02, 0x03, 0x04, 0x05, 0x06, 0x07, 0x08, 0x09, 0x0A, 0x0B, 0x0C, 0x0D, 0x0E, 0x0F]);
  private readonly key: Buffer;

  constructor(key: string) {
    // 确保key长度为16字节（128位）
    if (key.length !== 16) {
      throw new Error('AES key must be 16 characters long');
    }
    this.key = Buffer.from(key, 'utf8');
  }

  /**
   * 加密数据
   * @param data 要加密的数据（JSON对象或字符串）
   * @returns Base64编码的加密字符串
   */
  encrypt(data: any): string {
    try {
      // 将数据转换为JSON字符串
      const plaintext = typeof data === 'string' ? data : JSON.stringify(data);
      
      // 创建加密器
      const cipher = crypto.createCipheriv(this.algorithm, this.key, this.iv);
      
      // 加密数据
      let encrypted = cipher.update(plaintext, 'utf8', 'base64');
      encrypted += cipher.final('base64');
      
      return encrypted;
    } catch (error) {
      throw new Error(`Encryption failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * 解密数据
   * @param encryptedData Base64编码的加密字符串
   * @returns 解密后的字符串
   */
  decrypt(encryptedData: string): string {
    try {
      // 创建解密器
      const decipher = crypto.createDecipheriv(this.algorithm, this.key, this.iv);
      
      // 解密数据
      let decrypted = decipher.update(encryptedData, 'base64', 'utf8');
      decrypted += decipher.final('utf8');
      
      return decrypted;
    } catch (error) {
      throw new Error(`Decryption failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * 解密并解析为JSON对象
   * @param encryptedData Base64编码的加密字符串
   * @returns 解析后的JSON对象
   */
  decryptToJson<T = any>(encryptedData: string): T {
    try {
      const decryptedText = this.decrypt(encryptedData);
      return JSON.parse(decryptedText) as T;
    } catch (error) {
      throw new Error(`JSON parsing failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * 验证加密功能（用于测试）
   * @param testData 测试数据
   * @returns 是否验证成功
   */
  verify(testData: any = { test: 'test' }): boolean {
    try {
      const encrypted = this.encrypt(testData);
      const decrypted = this.decryptToJson(encrypted);
      
      return JSON.stringify(testData) === JSON.stringify(decrypted);
    } catch (error) {
      console.error('AES verification failed:', error);
      return false;
    }
  }
}

/**
 * 创建AES加密实例（使用配置中的密钥）
 */
export const createAESCrypto = (key?: string): AESCrypto => {
  const aesKey = key || process.env.CARD_PROVIDER_AES_KEY || 'eoC31VaznV1ZBG6T';
  return new AESCrypto(aesKey);
};

// 默认导出一个实例
export default createAESCrypto();
