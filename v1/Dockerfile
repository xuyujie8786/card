# 构建阶段
FROM node:20-alpine AS builder

# 设置工作目录
WORKDIR /app

# 安装 pnpm (比 npm 快 2-3 倍)
RUN npm install -g pnpm

# 复制package文件
COPY package*.json ./

# 使用淘宝镜像加速 pnpm 安装
RUN pnpm config set registry https://registry.npmmirror.com && \
    pnpm config set strict-ssl false

# 安装依赖 (pnpm 使用硬链接，速度更快)
RUN pnpm install --shamefully-hoist --ignore-scripts

# 手动运行必要的 setup
RUN npx max setup || true

# 复制源代码
COPY . .

# 构建应用
RUN pnpm run build

# 生产阶段
FROM nginx:alpine AS production

# 安装curl用于健康检查
RUN apk add --no-cache curl

# 删除默认nginx配置
RUN rm /etc/nginx/conf.d/default.conf

# 复制构建产物
COPY --from=builder /app/dist /usr/share/nginx/html

# 复制nginx配置文件
COPY nginx.conf /etc/nginx/conf.d/default.conf

# 创建nginx用户和日志目录
RUN mkdir -p /var/log/nginx && \
    chown -R nginx:nginx /var/log/nginx && \
    chown -R nginx:nginx /usr/share/nginx/html

# 暴露端口
EXPOSE 80

# 健康检查
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD curl -f http://localhost || exit 1

# 启动nginx
CMD ["nginx", "-g", "daemon off;"]


