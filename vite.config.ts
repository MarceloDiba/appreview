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
    /**
     * O QUE ESTA NO AR PASSA A DIZER DE ONDE VEIO.
     *
     * A classe de erro que mais custou em 05/09/2026, quatro vezes no mesmo
     * dia: merge sem deploy, build falhada em silencio, conserto pronto e nao
     * publicado. Todas partilham a mesma cegueira — nao havia como perguntar a
     * uma pagina servida qual o commit que a gerou.
     *
     * A Vercel poe `VERCEL_GIT_COMMIT_SHA` no ambiente da build. Aqui ele fica
     * gravado na propria pagina, e o vigia diario compara-o com o `main` do
     * GitHub. Fora da Vercel a etiqueta sai vazia, e o vigia trata isso como
     * "nao consegui medir" — nunca como "esta tudo bem".
     */
    {
      name: 'binno-commit-no-html',
      transformIndexHtml: (html: string) => html.replace(
        '</head>',
        `  <meta name="binno-commit" content="${process.env.VERCEL_GIT_COMMIT_SHA || ''}" />\n  </head>`,
      ),
    },
  ].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  };
});
