import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  const localEnv = loadEnv(mode, process.cwd(), '');
  // `loadEnv` only reads env files. Keep local secrets there, but allow the
  // explicit one-command pilot switch (`BINNO_ENABLE_OPENWA_PROXY=true npm run dev`)
  // to work without changing a tracked file.
  const openwaApiKey = process.env.OPENWA_LOCAL_API_KEY || localEnv.OPENWA_LOCAL_API_KEY;
  const openwaUrl = process.env.OPENWA_LOCAL_URL || localEnv.OPENWA_LOCAL_URL || 'http://127.0.0.1:2785';
  const enableOpenwaProxy = (process.env.BINNO_ENABLE_OPENWA_PROXY || localEnv.BINNO_ENABLE_OPENWA_PROXY) === 'true';

  return {
  server: {
    host: "127.0.0.1",
    port: 4173,
    strictPort: true,
    proxy: mode === 'development' && enableOpenwaProxy ? {
      '/api/openwa': {
        target: openwaUrl,
        changeOrigin: true,
        rewrite: (requestPath) => requestPath.replace(/^\/api\/openwa/, '/api'),
        configure: (proxy) => {
          proxy.on('proxyReq', (request) => {
            if (openwaApiKey) request.setHeader('X-API-Key', openwaApiKey);
          });
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
