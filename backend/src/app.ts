import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import { config } from './config';
import logger from './config/logger';
// Redis client is managed in index.ts
import { errorHandler, notFound } from './middleware/errorHandler';
import { generalLimiter } from './middleware/rateLimiter';

// 创建 Express 应用
const app = express();

// 安全中间件
app.use(helmet());

// CORS 配置
app.use(cors({
  origin: process.env.NODE_ENV === 'production' 
    ? ['https://your-frontend-domain.com'] 
    : ['http://localhost:3000', 'http://localhost:8000', 'http://localhost:8002', 'http://localhost:8004'],
  credentials: true,
}));

// 限流中间件
app.use(generalLimiter);

// 请求日志中间件
app.use(morgan('combined', {
  stream: { write: (message) => logger.info(message.trim()) }
}));

// 解析 JSON 和 URL 编码的请求体
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// 健康检查端点
app.get('/health', (req, res) => {
  res.json({
    code: 200,
    message: 'Server is running',
    data: {
      timestamp: new Date().toISOString(),
      environment: config.nodeEnv,
      version: process.env.npm_package_version || '1.0.0',
    },
  });
});

app.get('/api/health', (req, res) => {
  res.json({
    code: 200,
    message: 'Server is running',
    data: {
      timestamp: new Date().toISOString(),
      environment: config.nodeEnv,
      version: process.env.npm_package_version || '1.0.0',
    },
  });
});

// API 路由
import authRoutes from './routes/authRoutes';
import cardRoutes from './routes/cardRoutes';
import userRoutes from './routes/userRoutes';
import transactionRoutes from './routes/transaction';
import syncRoutes from './routes/sync';
import operationLogRoutes from './routes/operationLogRoutes';
import accountFlowRoutes from './routes/accountFlowRoutes';
import dashboardRoutes from './routes/dashboardRoutes';
import announcementRoutes from './routes/announcements';
import securityRoutes from './routes/securityRoutes';

app.use('/api/auth', authRoutes);
app.use('/api/virtual-cards', cardRoutes);
app.use('/api/transactions', transactionRoutes);
app.use('/api/users', userRoutes);
app.use('/api/sync', syncRoutes);
app.use('/api/operation-logs', operationLogRoutes);
app.use('/api/account-flows', accountFlowRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/announcements', announcementRoutes);
app.use('/api/security', securityRoutes);

// 404 处理
app.use(notFound);

// 错误处理中间件
app.use(errorHandler);

// 优雅关闭处理在 index.ts 中统一管理

export default app;
