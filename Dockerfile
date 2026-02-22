FROM node:20-alpine

# 设置工作目录
WORKDIR /app

# 复制依赖文件
COPY package*.json ./

# 安装依赖
RUN npm ci --only=production || npm install

# 复制项目文件
COPY . .

# 构建参数（从 HF Secrets 获取）
ARG GEMINI_API_KEY
ENV GEMINI_API_KEY=$GEMINI_API_KEY

# Hugging Face 要求端口 7860
ENV PORT=7860
ENV NODE_ENV=production

# 构建项目
RUN npm run build

# 暴露端口
EXPOSE 7860

# 健康检查（可选但推荐）
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:7860', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

# 启动命令
CMD ["sh", "-c", "npm run preview -- --host 0.0.0.0 --port ${PORT}"]
