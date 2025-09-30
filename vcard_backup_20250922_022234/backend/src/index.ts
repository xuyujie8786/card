import app from './app';
import { config } from './config';
import logger from './config/logger';
import redisClient from './config/redis';
import prisma from './config/database';

async function startServer() {
  try {
    // 连接到 Redis
    await redisClient.connect();
    logger.info('Connected to Redis');

    // 测试数据库连接
    await prisma.$connect();
    logger.info('Connected to PostgreSQL');

    // 启动服务器
    const server = app.listen(config.port, () => {
      logger.info(`Server is running on port ${config.port} in ${config.nodeEnv} mode`);
    });

    // 优雅关闭处理
    const gracefulShutdown = async (signal: string) => {
      logger.info(`Received ${signal}. Starting graceful shutdown...`);
      
      server.close(async () => {
        logger.info('HTTP server closed');
        
        // 关闭数据库连接
        await prisma.$disconnect();
        logger.info('Database connection closed');
        
        // 关闭 Redis 连接
        if (redisClient.isOpen) {
          await redisClient.quit();
          logger.info('Redis connection closed');
        }
        
        logger.info('Graceful shutdown completed');
        process.exit(0);
      });

      // 强制关闭超时
      setTimeout(() => {
        logger.error('Could not close connections in time, forcefully shutting down');
        process.exit(1);
      }, 10000);
    };

    // 监听关闭信号
    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
    process.on('SIGINT', () => gracefulShutdown('SIGINT'));

  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
}

// 启动服务器
startServer();
