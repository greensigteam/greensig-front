import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  return {
    server: {
      port: 3000,
      host: '0.0.0.0',
      allowedHosts: true, // Autorise Cloudflare Tunnel
      hmr: {
        clientPort: 443,
        protocol: 'wss',
      },
      proxy: {
        '/api': {
          target: 'http://127.0.0.1:8000',
          changeOrigin: true,
          secure: false,
        },
        '/media': {
          target: 'http://127.0.0.1:8000',
          changeOrigin: true,
          secure: false,
        }
      }
    },
    plugins: [react()],
    define: {
      'process.env.API_KEY': JSON.stringify(env.GEMINI_API_KEY),
      'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY)
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      }
    },
    build: {
      rollupOptions: {
        output: {
          manualChunks: {
            // Split vendor chunks for better caching
            'vendor-react': ['react', 'react-dom', 'react-router-dom'],
            'vendor-calendar': ['react-big-calendar', 'date-fns'],
            'vendor-map': ['ol'],
            'vendor-charts': ['recharts'],
            'vendor-ui': ['lucide-react', '@headlessui/react'],
            'vendor-pdf': ['jspdf', 'html2canvas'],
          }
        }
      },
      // Increase chunk size warning limit since we're intentionally creating larger vendor chunks
      chunkSizeWarningLimit: 600,
    }
  };
});
