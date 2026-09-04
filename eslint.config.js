import js from "@eslint/js";
import globals from "globals";
import reactHooks from "eslint-plugin-react-hooks";
import reactRefresh from "eslint-plugin-react-refresh";
import tseslint from "typescript-eslint";
import { createRequire } from "node:module";

// As tres regras vem do vibe-coding-toolkit, copiadas e nao reescritas:
// https://github.com/soumatheusgomes/vibe-coding-toolkit/tree/main/templates/eslint
const quality = createRequire(import.meta.url)("./eslint-rules/index.cjs");

export default tseslint.config(
  { ignores: ["dist", "eslint-rules/**", "src/components/ui/**", "src/integrations/supabase/types.ts"] },
  {
    extends: [js.configs.recommended, ...tseslint.configs.recommended],
    files: ["**/*.{ts,tsx}"],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
    },
    plugins: {
      "react-hooks": reactHooks,
      "react-refresh": reactRefresh,
      quality,
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      "react-refresh/only-export-components": [
        "warn",
        { allowConstantExport: true },
      ],
      "@typescript-eslint/no-unused-vars": "off",

      /*
       * O ORCAMENTO DE TAMANHO E COMPLEXIDADE ENTRA TODO COMO AVISO.
       *
       * E a regra do toolkit de onde estas vieram: regra nova nasce em `warn`,
       * anota-se a contagem REAL de violacoes, corrige-se ate zero, e so entao
       * promove-se a `error` — que congela o numero e impede o proximo.
       *
       * Entrar como `error` numa base que ja as viola nao mede nada: bloqueia
       * tudo no primeiro dia e o lint acaba desligado na primeira sexta-feira
       * de prazo. A contagem inicial fica registada no commit.
       *
       * O teto de 350 linhas vale para `src/` e `supabase/functions/`. NAO
       * vale para `scripts/`: os guardas sao longos porque carregam o porque —
       * a historia do defeito que cada um impede — e cortar isso por contagem
       * removeria exactamente o que os faz sobreviver. O proprio toolkit diz:
       * corta-se por costura de responsabilidade, e sem costura o ficheiro
       * fica intacto.
       */
      "quality/max-lines": ["warn", { max: 350 }],
      complexity: ["warn", 12],
      "max-depth": ["warn", 4],
      "max-params": ["warn", 4],
      "max-nested-callbacks": ["warn", 3],
    },
  }
);
