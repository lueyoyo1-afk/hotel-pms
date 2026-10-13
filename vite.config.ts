import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// 相对路径 base：构建产物可直接丢到任意静态服务器（含子目录部署）
export default defineConfig({
  base: './',
  plugins: [react()],
  server: {
    host: true,
    port: 5173,
    allowedHosts: true,
  },
  preview: {
    host: true,
    port: 4173,
    allowedHosts: true,
  },
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
    target: 'es2020',
    cssCodeSplit: false,
    sourcemap: false,
    chunkSizeWarningLimit: 900,
  },
});
