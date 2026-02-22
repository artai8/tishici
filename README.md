<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# 运行与部署

本项目是一个 Vite + React 应用，可本地运行或部署到 Hugging Face Spaces（Docker）。

## 本地运行

**前置条件：** Node.js

1. 安装依赖：
   `npm install`
2. 在 `.env.local` 中设置 `GEMINI_API_KEY`
3. 启动开发服务：
   `npm run dev`

## 部署到 Hugging Face Spaces（Docker）

1. 创建一个 Space，类型选择 Docker
2. 在 Space 的 Secrets 中设置 `GEMINI_API_KEY`
3. 将仓库推送到 Space，即可自动构建并运行

应用会在端口 `7860` 上启动，并监听 `0.0.0.0`
