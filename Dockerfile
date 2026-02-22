# 构建阶段
FROM node:20-alpine AS builder

WORKDIR /app

# 复制依赖文件
COPY package.json ./
COPY package-lock.json* ./

# 安装依赖
RUN npm install

# 复制源代码
COPY . .

# 构建（不嵌入 API key，运行时通过 nginx 注入）
RUN npm run build

# 生产阶段
FROM nginx:alpine

# 安装 envsubst 工具（通常已包含在 alpine nginx 中）
RUN apk add --no-cache bash

# 复制构建产物
COPY --from=builder /app/dist /usr/share/nginx/html

# 复制 Nginx 配置模板
COPY nginx.conf /etc/nginx/conf.d/default.conf

# 复制启动脚本
COPY start.sh /start.sh
RUN chmod +x /start.sh

EXPOSE 7860

CMD ["/start.sh"]
