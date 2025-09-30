import https from 'https';
import http from 'http';
import { URL } from 'url';
import { AESCrypto, createAESCrypto } from './crypto';
import logger from '../config/logger';

/**
 * 卡商API响应接口
 */
interface CardProviderResponse<T = any> {
  code: number;
  msg: string;
  data: string; // AES加密的数据
}

/**
 * HTTP请求选项
 */
interface RequestOptions {
  timeout?: number;
  retries?: number;
  headers?: Record<string, string>;
}

/**
 * 卡商API客户端
 */
export class CardProviderClient {
  private readonly baseUrl: string;
  private readonly token: string;
  private readonly crypto: AESCrypto;
  private readonly defaultTimeout = 30000; // 30秒
  private readonly defaultRetries = 3;

  constructor(
    baseUrl?: string,
    token?: string,
    aesKey?: string
  ) {
    this.baseUrl = baseUrl || process.env.CARD_PROVIDER_API_URL || 'https://openapi-hk.vccdaddy.com';
    this.token = token || process.env.CARD_PROVIDER_API_KEY || 'w5Epkw0M257ocOwB';
    this.crypto = createAESCrypto(aesKey);

    // 验证配置
    if (!this.baseUrl || !this.token) {
      throw new Error('Card provider API URL and token are required');
    }

    logger.info('CardProviderClient initialized', {
      baseUrl: this.baseUrl,
      hasToken: !!this.token
    });
  }

  /**
   * 发送POST请求到卡商API
   * @param endpoint API端点
   * @param data 请求数据
   * @param options 请求选项
   * @returns 解密后的响应数据
   */
  async post<TRequest, TResponse>(
    endpoint: string,
    data: TRequest,
    options: RequestOptions = {}
  ): Promise<TResponse> {
    const url = `${this.baseUrl}${endpoint}`;
    const timeout = options.timeout || this.defaultTimeout;
    const retries = options.retries || this.defaultRetries;

    logger.info('Sending request to card provider', {
      endpoint,
      url,
      dataKeys: typeof data === 'object' && data ? Object.keys(data) : 'primitive'
    });

    for (let attempt = 1; attempt <= retries; attempt++) {
      try {
        const response = await this.makeRequest<TResponse>(url, data, timeout, options.headers);
        
        logger.info('Card provider request successful', {
          endpoint,
          attempt,
          responseCode: (response as any).code
        });
        
        return response;
      } catch (error) {
        const isLastAttempt = attempt === retries;
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        
        logger.warn('Card provider request failed', {
          endpoint,
          attempt,
          error: errorMessage,
          isLastAttempt
        });

        if (isLastAttempt) {
          logger.error('Card provider request failed after all retries', {
            endpoint,
            attempts: retries,
            error: errorMessage
          });
          throw error;
        }

        // 等待后重试（指数退避）
        await this.sleep(Math.pow(2, attempt - 1) * 1000);
      }
    }

    throw new Error('Request failed after all retries');
  }

  /**
   * 执行HTTP请求
   * @param url 请求URL
   * @param data 请求数据
   * @param timeout 超时时间
   * @param customHeaders 自定义请求头
   * @returns 解密后的响应数据
   */
  private async makeRequest<TResponse>(
    url: string,
    data: any,
    timeout: number,
    customHeaders?: Record<string, string>
  ): Promise<TResponse> {
    return new Promise((resolve, reject) => {
      const parsedUrl = new URL(url);
      const isHttps = parsedUrl.protocol === 'https:';
      const httpModule = isHttps ? https : http;

      // 加密请求数据
      const encryptedData = this.crypto.encrypt(data);
      const requestBody = JSON.stringify({ data: encryptedData });

      // 构建请求头
      const headers = {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(requestBody),
        'oaToken': this.token, // 卡商要求的token字段名
        'User-Agent': 'VCard-Management-System/1.0',
        ...customHeaders
      };

      const requestOptions = {
        hostname: parsedUrl.hostname,
        port: parsedUrl.port || (isHttps ? 443 : 80),
        path: parsedUrl.pathname + parsedUrl.search,
        method: 'POST',
        headers,
        timeout
      };

      const req = httpModule.request(requestOptions, (res) => {
        let responseData = '';

        res.on('data', (chunk) => {
          responseData += chunk;
        });

        res.on('end', () => {
          try {
            // 解析响应
            const response: CardProviderResponse = JSON.parse(responseData);
            
            // 检查响应状态
            if (response.code !== 1) {
              reject(new Error(`Card provider API error: ${response.msg} (code: ${response.code})`));
              return;
            }

            // 解密响应数据
            const decryptedData = this.crypto.decryptToJson<TResponse>(response.data);
            resolve(decryptedData);
          } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown parsing error';
            reject(new Error(`Response parsing failed: ${errorMessage}`));
          }
        });
      });

      req.on('error', (error) => {
        reject(new Error(`Request failed: ${error.message}`));
      });

      req.on('timeout', () => {
        req.destroy();
        reject(new Error(`Request timeout after ${timeout}ms`));
      });

      // 发送请求数据
      req.write(requestBody);
      req.end();
    });
  }

  /**
   * 测试连接
   * @returns 是否连接成功
   */
  async testConnection(): Promise<boolean> {
    try {
      // 使用获取用户余额接口测试连接
      await this.post('/openapi/user/hk/get_bal', {});
      return true;
    } catch (error) {
      logger.error('Card provider connection test failed', {
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      return false;
    }
  }

  /**
   * 获取AES加密实例（用于测试）
   */
  getCrypto(): AESCrypto {
    return this.crypto;
  }

  /**
   * 延迟函数
   * @param ms 毫秒数
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// 默认导出一个客户端实例
export default new CardProviderClient();
