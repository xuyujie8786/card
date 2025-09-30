import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import { config } from './config';
import logger from './config/logger';
import redisClient from './config/redis';
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
    : ['http://localhost:3000', 'http://localhost:8000'],
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

// API 路由
import authRoutes from './routes/authRoutes';
import cardRoutes from './routes/cardRoutes';
import userRoutes from './routes/userRoutes';
import transactionRoutes from './routes/transaction';
import syncRoutes from './routes/sync';

app.use('/api/auth', authRoutes);
app.use('/api/virtual-cards', cardRoutes);
app.use('/api/transactions', transactionRoutes);
app.use('/api/users', userRoutes);
app.use('/api/sync', syncRoutes);

// 404 处理
app.use(notFound);

// 错误处理中间件
app.use(errorHandler);

// 优雅关闭处理
process.on('SIGINT', async () => {
  logger.info('Shutting down server...');
  
  // 关闭 Redis 连接
  if (redisClient.isOpen) {
    await redisClient.quit();
  }
  
  process.exit(0);
});

export default app;
