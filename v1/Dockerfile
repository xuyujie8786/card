FROM node:18-alpine AS builder

WORKDIR /app

COPY package*.json ./
# 使用 npm install 而不是 npm ci，因为 package-lock.json 可能不在构建上下文中
RUN npm install --legacy-peer-deps

COPY . .

ENV NODE_ENV=production
RUN npm run build

FROM nginx:alpine

COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
