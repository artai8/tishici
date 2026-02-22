#!/bin/bash

# 将环境变量中的 GEMINI_API_KEY 注入到 nginx 配置中
sed -i "s|GEMINI_API_KEY_PLACEHOLDER|${GEMINI_API_KEY}|g" /etc/nginx/conf.d/default.conf

# 同时将 API key 注入到所有 JS 文件中（构建产物）
find /usr/share/nginx/html -name '*.js' -exec sed -i "s|__GEMINI_API_KEY_RUNTIME__|${GEMINI_API_KEY}|g" {} +

# 启动 nginx
nginx -g 'daemon off;'
