/**
 * API配置文件
 * 用于管理前端API的真实/Mock切换
 */

// 从环境变量读取配置，禁用Mock直接使用真实API
const USE_MOCK = false;

export const API_CONFIG = {
  // 是否使用Mock数据
  useMock: USE_MOCK,
  
  // 后端API基础URL
  baseURL: 'http://localhost:3001/api',
    
  // API超时时间
  timeout: 10000,
  
  // 各模块的API切换配置
  modules: {
    auth: true, // 认证模块使用真实API
    user: true, // 用户管理使用真实API
    card: true, // 虚拟卡管理使用真实API
    transaction: true, // 交易管理使用真实API
    accountFlow: true, // 账户流水使用真实API
  }
};

// 环境变量说明：
// - 设置 USE_MOCK=false 来完全关闭Mock，使用真实API
// - 设置 USE_MOCK=true 来使用Mock数据
// - 生产环境默认使用真实API

console.log('🔧 API配置:', {
  environment: process.env.NODE_ENV,
  useMock: API_CONFIG.useMock,
  baseURL: API_CONFIG.baseURL,
  modules: API_CONFIG.modules
});
