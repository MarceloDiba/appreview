import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  const localEnv = loadEnv(mode, process.cwd(), '');
  const openwaApiKey = localEnv.OPENWA_LOCAL_API_KEY;
  const openwaUrl = localEnv.OPENWA_LOCAL_URL || 'http://127.0.0.1:2785';

  return {
  server: {
    host: "127.0.0.1",
    port: 4173,
    strictPort: true,
    proxy: mode === 'development' && openwaApiKey ? {
      '/api/openwa': {
        target: openwaUrl,
        changeOrigin: true,
        rewrite: (requestPath) => requestPath.replace(/^\/api\/openwa/, '/api'),
        configure: (proxy) => {
          proxy.on('proxyReq', (request) => request.setHeader('X-API-Key', openwaApiKey));
        },
      },
    } : undefined,
  },
  plugins: [
    react(),
    mode === 'development' &&
    componentTagger(),
  ].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  };
});
