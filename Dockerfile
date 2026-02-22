FROM node:20-alpine
WORKDIR /app
COPY package.json ./
RUN npm install
COPY . .
ARG GEMINI_API_KEY
ENV GEMINI_API_KEY=$GEMINI_API_KEY
ENV PORT=7860
RUN npm run build
EXPOSE 7860
CMD ["sh","-c","npm run preview -- --host 0.0.0.0 --port ${PORT}"]
