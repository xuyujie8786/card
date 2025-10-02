FROM node:18-alpine AS builder

# 安装 OpenSSL 和其他必要的依赖
RUN apk add --no-cache openssl libc6-compat

WORKDIR /app

COPY package*.json ./
COPY prisma ./prisma/

# 安装所有依赖（包括devDependencies用于构建）
RUN npm ci && \
    npx prisma generate

COPY . .

# 构建TypeScript
RUN npm run build

# 清理devDependencies，只保留生产依赖
RUN npm prune --production

FROM node:18-alpine

# 安装运行时需要的 OpenSSL
RUN apk add --no-cache openssl libc6-compat

WORKDIR /app

COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/package*.json ./

ENV NODE_ENV=production

EXPOSE 3001

CMD ["sh", "-c", "npx prisma migrate deploy && node dist/index.js"]
