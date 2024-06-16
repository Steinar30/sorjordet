import { defineConfig } from 'vite';
import solidPlugin from 'vite-plugin-solid';
import suidPlugin from "@suid/vite-plugin";

export default defineConfig({
  plugins: [suidPlugin(), solidPlugin()],
  css: { modules: {
    scopeBehaviour: 'local',
    localsConvention: 'camelCaseOnly',
  } },
  server: {
    port: 3000,
    proxy: {
      '/api': {
        target: 'http://localhost:8000',
        changeOrigin: true
      },
    }
  },
  build: {
    target: 'esnext',
  },
});
