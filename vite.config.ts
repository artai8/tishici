import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, '.', '');
    // 构建时如果有环境变量就用，否则用运行时占位符
    const geminiApiKey = process.env.GEMINI_API_KEY || env.GEMINI_API_KEY || '__GEMINI_API_KEY_RUNTIME__';
    
    if (geminiApiKey === '__GEMINI_API_KEY_RUNTIME__') {
      console.warn('⚠️  GEMINI_API_KEY not found in environment variables. App will require manual key entry or runtime injection.');
    } else {
      console.log('✅ GEMINI_API_KEY loaded successfully.');
    }

    return {
      server: {
        port: 7860,
        host: '0.0.0.0',
      },
      plugins: [react()],
      define: {
        'process.env.API_KEY': JSON.stringify(geminiApiKey),
        'process.env.GEMINI_API_KEY': JSON.stringify(geminiApiKey)
      },
      resolve: {
        alias: {
          '@': path.resolve(__dirname, '.'),
        }
      },
      build: {
        outDir: 'dist',
        sourcemap: false,
      }
    };
});
