/**
 * 🔍 设备指纹识别系统
 * 
 * 功能：
 * - 浏览器指纹生成
 * - 设备特征收集
 * - 异常设备检测
 * - 设备信任度评估
 */

interface DeviceInfo {
  userAgent: string;
  language: string;
  platform: string;
  screenResolution: string;
  timezone: string;
  colorDepth: number;
  cookieEnabled: boolean;
  doNotTrack: string | null;
  hardwareConcurrency: number;
  deviceMemory?: number;
  maxTouchPoints: number;
}

interface CanvasFingerprint {
  canvasData: string;
  webglData: string;
}

interface AudioFingerprint {
  audioData: string;
}

interface DeviceFingerprint {
  id: string;
  deviceInfo: DeviceInfo;
  canvasFingerprint: CanvasFingerprint;
  audioFingerprint: AudioFingerprint;
  timestamp: number;
  ipAddress: string;
  trustScore: number;
}

class DeviceFingerprintCollector {
  /**
   * 收集设备基本信息
   */
  static collectDeviceInfo(): DeviceInfo {
    const nav = navigator as any;
    
    return {
      userAgent: nav.userAgent || '',
      language: nav.language || nav.userLanguage || '',
      platform: nav.platform || '',
      screenResolution: `${screen.width}x${screen.height}`,
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      colorDepth: screen.colorDepth || 0,
      cookieEnabled: nav.cookieEnabled || false,
      doNotTrack: nav.doNotTrack || null,
      hardwareConcurrency: nav.hardwareConcurrency || 0,
      deviceMemory: nav.deviceMemory || undefined,
      maxTouchPoints: nav.maxTouchPoints || 0,
    };
  }

  /**
   * 生成Canvas指纹
   */
  static generateCanvasFingerprint(): CanvasFingerprint {
    try {
      // Canvas 2D指纹
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      
      if (!ctx) {
        return { canvasData: 'no-canvas', webglData: 'no-webgl' };
      }

      canvas.width = 200;
      canvas.height = 50;
      
      // 绘制复杂图形
      ctx.textBaseline = 'top';
      ctx.font = '14px Arial';
      ctx.fillStyle = '#f60';
      ctx.fillRect(125, 1, 62, 20);
      ctx.fillStyle = '#069';
      ctx.fillText('VCard Security 🔐', 2, 15);
      ctx.fillStyle = 'rgba(102, 204, 0, 0.7)';
      ctx.fillText('Device Fingerprint', 4, 35);
      
      const canvasData = canvas.toDataURL();

      // WebGL指纹
      let webglData = 'no-webgl';
      try {
        const webglCanvas = document.createElement('canvas');
        const gl = webglCanvas.getContext('webgl') || webglCanvas.getContext('experimental-webgl');
        
        if (gl) {
          const debugInfo = gl.getExtension('WEBGL_debug_renderer_info');
          if (debugInfo) {
            const vendor = gl.getParameter(debugInfo.UNMASKED_VENDOR_WEBGL);
            const renderer = gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL);
            webglData = `${vendor}~${renderer}`;
          }
        }
      } catch (e) {
        webglData = 'webgl-error';
      }

      return { canvasData, webglData };
    } catch (error) {
      return { canvasData: 'canvas-error', webglData: 'webgl-error' };
    }
  }

  /**
   * 生成音频指纹
   */
  static async generateAudioFingerprint(): Promise<AudioFingerprint> {
    try {
      // 检查浏览器支持
      const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioContext) {
        return { audioData: 'no-audio-context' };
      }

      const audioContext = new AudioContext();
      const oscillator = audioContext.createOscillator();
      const analyser = audioContext.createAnalyser();
      const gainNode = audioContext.createGain();
      const scriptProcessor = audioContext.createScriptProcessor(4096, 1, 1);

      gainNode.gain.setValueAtTime(0, audioContext.currentTime);
      oscillator.frequency.setValueAtTime(10000, audioContext.currentTime);
      oscillator.type = 'triangle';

      oscillator.connect(analyser);
      analyser.connect(scriptProcessor);
      scriptProcessor.connect(gainNode);
      gainNode.connect(audioContext.destination);

      oscillator.start(0);

      return new Promise((resolve) => {
        scriptProcessor.onaudioprocess = function(event) {
          const samples = event.inputBuffer.getChannelData(0);
          let sum = 0;
          for (let i = 0; i < samples.length; i++) {
            sum += Math.abs(samples[i]);
          }
          
          const audioData = sum.toString();
          oscillator.stop();
          audioContext.close();
          
          resolve({ audioData });
        };

        // 超时保护
        setTimeout(() => {
          try {
            oscillator.stop();
            audioContext.close();
          } catch (e) {}
          resolve({ audioData: 'audio-timeout' });
        }, 1000);
      });
    } catch (error) {
      return { audioData: 'audio-error' };
    }
  }

  /**
   * 生成完整设备指纹
   */
  static async generateFingerprint(ipAddress?: string): Promise<DeviceFingerprint> {
    const deviceInfo = this.collectDeviceInfo();
    const canvasFingerprint = this.generateCanvasFingerprint();
    const audioFingerprint = await this.generateAudioFingerprint();

    // 生成唯一ID
    const fingerprintData = JSON.stringify({
      deviceInfo,
      canvasFingerprint,
      audioFingerprint,
    });

    const id = await this.generateHash(fingerprintData);
    const trustScore = this.calculateTrustScore(deviceInfo, canvasFingerprint);

    return {
      id,
      deviceInfo,
      canvasFingerprint,
      audioFingerprint,
      timestamp: Date.now(),
      ipAddress: ipAddress || 'unknown',
      trustScore,
    };
  }

  /**
   * 生成哈希值
   */
  private static async generateHash(data: string): Promise<string> {
    if (typeof crypto !== 'undefined' && crypto.subtle) {
      const encoder = new TextEncoder();
      const dataBuffer = encoder.encode(data);
      const hashBuffer = await crypto.subtle.digest('SHA-256', dataBuffer);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    } else {
      // 降级到简单哈希（开发环境）
      let hash = 0;
      for (let i = 0; i < data.length; i++) {
        const char = data.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash; // 转换为32位整数
      }
      return Math.abs(hash).toString(16);
    }
  }

  /**
   * 计算设备信任度
   */
  private static calculateTrustScore(deviceInfo: DeviceInfo, canvasFingerprint: CanvasFingerprint): number {
    let score = 50; // 基础分数

    // 用户代理检查
    if (deviceInfo.userAgent && deviceInfo.userAgent.length > 50) {
      score += 10;
    }

    // 语言设置检查
    if (deviceInfo.language && deviceInfo.language.length > 0) {
      score += 5;
    }

    // 屏幕分辨率检查
    if (deviceInfo.screenResolution && deviceInfo.screenResolution !== '0x0') {
      score += 10;
    }

    // 时区检查
    if (deviceInfo.timezone && deviceInfo.timezone.length > 0) {
      score += 5;
    }

    // Cookie支持检查
    if (deviceInfo.cookieEnabled) {
      score += 10;
    }

    // Canvas指纹检查
    if (canvasFingerprint.canvasData && canvasFingerprint.canvasData !== 'no-canvas') {
      score += 10;
    }

    // WebGL支持检查
    if (canvasFingerprint.webglData && canvasFingerprint.webglData !== 'no-webgl') {
      score += 10;
    }

    // 硬件并发检查
    if (deviceInfo.hardwareConcurrency > 0) {
      score += 5;
    }

    // 设备内存检查
    if (deviceInfo.deviceMemory && deviceInfo.deviceMemory > 0) {
      score += 5;
    }

    return Math.min(100, Math.max(0, score));
  }
}

/**
 * 设备指纹管理器
 */
class DeviceFingerprintManager {
  private static readonly STORAGE_KEY = 'vcard_device_fingerprint';
  private static readonly TRUST_THRESHOLD = 70;

  /**
   * 获取或创建设备指纹
   */
  static async getOrCreateFingerprint(): Promise<DeviceFingerprint> {
    try {
      // 尝试从本地存储获取
      const stored = localStorage.getItem(this.STORAGE_KEY);
      if (stored) {
        const fingerprint = JSON.parse(stored) as DeviceFingerprint;
        
        // 检查是否过期（7天）
        const now = Date.now();
        const sevenDays = 7 * 24 * 60 * 60 * 1000;
        
        if (now - fingerprint.timestamp < sevenDays) {
          return fingerprint;
        }
      }
    } catch (error) {
      console.warn('📱 读取设备指纹失败:', error);
    }

    // 生成新的设备指纹
    const fingerprint = await DeviceFingerprintCollector.generateFingerprint();
    
    // 保存到本地存储
    try {
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(fingerprint));
    } catch (error) {
      console.warn('📱 保存设备指纹失败:', error);
    }

    return fingerprint;
  }

  /**
   * 验证设备指纹
   */
  static async verifyFingerprint(serverFingerprint: DeviceFingerprint): Promise<{
    isValid: boolean;
    similarity: number;
    riskLevel: 'low' | 'medium' | 'high';
    reasons: string[];
  }> {
    const currentFingerprint = await this.getOrCreateFingerprint();
    const similarity = this.calculateSimilarity(currentFingerprint, serverFingerprint);
    const reasons: string[] = [];

    // 基本信息对比
    if (currentFingerprint.deviceInfo.userAgent !== serverFingerprint.deviceInfo.userAgent) {
      reasons.push('用户代理不匹配');
    }

    if (currentFingerprint.deviceInfo.screenResolution !== serverFingerprint.deviceInfo.screenResolution) {
      reasons.push('屏幕分辨率不匹配');
    }

    if (currentFingerprint.deviceInfo.timezone !== serverFingerprint.deviceInfo.timezone) {
      reasons.push('时区不匹配');
    }

    if (currentFingerprint.canvasFingerprint.canvasData !== serverFingerprint.canvasFingerprint.canvasData) {
      reasons.push('Canvas指纹不匹配');
    }

    // 计算风险等级
    let riskLevel: 'low' | 'medium' | 'high' = 'low';
    if (similarity < 0.5) {
      riskLevel = 'high';
    } else if (similarity < 0.8) {
      riskLevel = 'medium';
    }

    return {
      isValid: similarity > 0.7,
      similarity,
      riskLevel,
      reasons,
    };
  }

  /**
   * 计算指纹相似度
   */
  private static calculateSimilarity(fp1: DeviceFingerprint, fp2: DeviceFingerprint): number {
    let matches = 0;
    let total = 0;

    // 设备信息对比
    const deviceFields = Object.keys(fp1.deviceInfo) as (keyof DeviceInfo)[];
    for (const field of deviceFields) {
      total++;
      if (fp1.deviceInfo[field] === fp2.deviceInfo[field]) {
        matches++;
      }
    }

    // Canvas指纹对比
    total += 2;
    if (fp1.canvasFingerprint.canvasData === fp2.canvasFingerprint.canvasData) {
      matches++;
    }
    if (fp1.canvasFingerprint.webglData === fp2.canvasFingerprint.webglData) {
      matches++;
    }

    return total > 0 ? matches / total : 0;
  }

  /**
   * 检查设备是否可信
   */
  static isDeviceTrusted(fingerprint: DeviceFingerprint): boolean {
    return fingerprint.trustScore >= this.TRUST_THRESHOLD;
  }

  /**
   * 清除设备指纹
   */
  static clearFingerprint(): void {
    try {
      localStorage.removeItem(this.STORAGE_KEY);
    } catch (error) {
      console.warn('📱 清除设备指纹失败:', error);
    }
  }
}

/**
 * React Hook: 使用设备指纹
 */
export function useDeviceFingerprint() {
  const [fingerprint, setFingerprint] = React.useState<DeviceFingerprint | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    let mounted = true;

    DeviceFingerprintManager.getOrCreateFingerprint()
      .then(fp => {
        if (mounted) {
          setFingerprint(fp);
          setLoading(false);
        }
      })
      .catch(err => {
        if (mounted) {
          setError(err.message);
          setLoading(false);
        }
      });

    return () => {
      mounted = false;
    };
  }, []);

  return { fingerprint, loading, error };
}

// 🎯 设备异常检测规则
export const DeviceAnomalyRules = {
  /**
   * 检测虚拟机环境
   */
  detectVirtualMachine(deviceInfo: DeviceInfo): boolean {
    const vmKeywords = ['virtualbox', 'vmware', 'qemu', 'xen', 'kvm', 'parallels'];
    const userAgent = deviceInfo.userAgent.toLowerCase();
    
    return vmKeywords.some(keyword => userAgent.includes(keyword));
  },

  /**
   * 检测自动化工具
   */
  detectAutomation(deviceInfo: DeviceInfo): boolean {
    const automationKeywords = ['selenium', 'webdriver', 'phantomjs', 'headless'];
    const userAgent = deviceInfo.userAgent.toLowerCase();
    
    return automationKeywords.some(keyword => userAgent.includes(keyword)) ||
           (window as any).webdriver === true ||
           (window as any).__webdriver_evaluate !== undefined;
  },

  /**
   * 检测移动设备
   */
  detectMobile(deviceInfo: DeviceInfo): boolean {
    const mobileKeywords = ['mobile', 'android', 'iphone', 'ipad', 'ipod', 'blackberry', 'windows phone'];
    const userAgent = deviceInfo.userAgent.toLowerCase();
    
    return mobileKeywords.some(keyword => userAgent.includes(keyword)) ||
           deviceInfo.maxTouchPoints > 0;
  },

  /**
   * 检测异常屏幕分辨率
   */
  detectAnomalousScreen(deviceInfo: DeviceInfo): boolean {
    const [width, height] = deviceInfo.screenResolution.split('x').map(Number);
    
    // 检查异常小的分辨率
    if (width < 800 || height < 600) {
      return true;
    }
    
    // 检查异常大的分辨率
    if (width > 7680 || height > 4320) {
      return true;
    }
    
    return false;
  },
};

export { DeviceFingerprintCollector, DeviceFingerprintManager };
export type { DeviceFingerprint, DeviceInfo };


