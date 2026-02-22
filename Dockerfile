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

# 设置构建时环境变量
ARG GEMINI_API_KEY
ENV VITE_GEMINI_API_KEY=$GEMINI_API_KEY

# 构建
RUN npm run build

# 生产阶段
FROM nginx:alpine

# 复制构建产物
COPY --from=builder /app/dist /usr/share/nginx/html

# 复制 Nginx 配置
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 7860

CMD ["nginx", "-g", "daemon off;"]
