# 构建阶段
FROM node:20-alpine AS builder

# 安装必要的构建工具
RUN apk add --no-cache python3 make g++ curl

WORKDIR /app

# 复制package文件
COPY package*.json ./
COPY prisma/ ./prisma/

# 安装依赖
RUN npm ci --only=production

# 生成Prisma客户端
RUN npx prisma generate

# 复制源代码
COPY . .

# 构建TypeScript代码
RUN npm run build

# 生产阶段
FROM node:20-alpine AS production

# 安装curl用于健康检查和tzdata用于时区设置
RUN apk add --no-cache curl tzdata

# 设置时区为中国标准时间
ENV TZ=Asia/Shanghai

# 确保定时任务相关的环境变量有默认值
ENV SYNC_ENABLED=true
ENV SYNC_AUTH_PREVIOUS_CRON="0 1 * * *"
ENV SYNC_AUTH_CURRENT_CRON="0 13 * * *"
ENV SYNC_SETTLE_PREVIOUS_CRON="30 1 * * *"
ENV SYNC_SETTLE_CURRENT_CRON="30 13 * * *"

# 创建应用用户
RUN addgroup -g 1001 -S nodejs
RUN adduser -S vcard -u 1001

WORKDIR /app

# 从builder阶段复制构建产物
COPY --from=builder --chown=vcard:nodejs /app/dist ./dist
COPY --from=builder --chown=vcard:nodejs /app/node_modules ./node_modules
COPY --from=builder --chown=vcard:nodejs /app/package*.json ./
COPY --from=builder --chown=vcard:nodejs /app/prisma ./prisma

# 创建日志目录
RUN mkdir -p /app/logs && chown -R vcard:nodejs /app/logs

# 切换到非root用户
USER vcard

# 暴露端口
EXPOSE 3001

# 健康检查
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:3001/api/health || exit 1

# 启动应用
CMD ["node", "dist/index.js"]
