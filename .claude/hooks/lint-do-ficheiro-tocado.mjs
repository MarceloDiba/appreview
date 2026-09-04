// Corre o ESLint SO no ficheiro que acabou de ser escrito, e devolve o
// resultado ao modelo em vez de o imprimir e esperar que alguem leia.
//
// Porque existe: `npm run verify` encadeia 63 guardas e um build. E o portao
// certo antes de um PR, e e lento demais para correr a cada edicao — na
// pratica ninguem o corre no meio do trabalho, e o aviso novo so aparece no
// fim, quando ja custa caro desfazer. Este hook fecha essa janela: um unico
// ficheiro, um par de segundos, o aviso na hora em que nasceu.
//
// NAO bloqueia. Um aviso de tamanho ou complexidade num ficheiro que ainda
// esta a meio de ser escrito nao e um defeito — e uma nota. O bloqueio vive
// no outro hook, antes do push.
//
// DUAS ARMADILHAS, as duas ja apanhadas aqui:
//
//   1. Um ficheiro com AVISOS faz o ESLint sair com codigo ZERO. Ler so o
//      `catch` deixaria passar exactamente aquilo que este hook existe para
//      mostrar — o orcamento de tamanho e complexidade entra todo como `warn`.
//      Por isso a saida e lida nos dois caminhos.
//   2. O formatter `unix` saiu do nucleo do ESLint 9. Pedi-lo faz o ESLint
//      abortar com codigo 2 e escrever a queixa no stderr; com o stderr
//      descartado, o hook devolvia silencio e parecia um ficheiro limpo. Um
//      portao que falha para o lado do silencio nao e um portao. Agora o
//      codigo 2 e denunciado como avaria, nao confundido com aprovacao.
import { spawnSync } from "node:child_process";
import path from "node:path";

import { parseHookEvent, readStdinRaw } from "./hook-io.mjs";

const evento = parseHookEvent(readStdinRaw());
if (evento === null) process.exit(0);

const ficheiro =
  evento?.tool_response?.filePath ?? evento?.tool_input?.file_path ?? "";

// As mesmas fronteiras do eslint.config.js: `scripts/` fica de fora de
// proposito (os guardas sao longos porque carregam a historia do defeito que
// impedem), e `src/components/ui/` e codigo de terceiros.
const raiz = process.env.CLAUDE_PROJECT_DIR ?? process.cwd();
const relativo = path.relative(raiz, ficheiro);
const vigiado =
  /\.tsx?$/.test(relativo) &&
  /^(src|supabase\/functions)\//.test(relativo) &&
  !relativo.startsWith("src/components/ui/") &&
  relativo !== "src/integrations/supabase/types.ts";

if (!vigiado) process.exit(0);

const fala = (texto) =>
  console.log(
    JSON.stringify({
      suppressOutput: true,
      hookSpecificOutput: {
        hookEventName: "PostToolUse",
        additionalContext: texto,
      },
    })
  );

const corrida = spawnSync("npx", ["eslint", "--format", "json", relativo], {
  cwd: raiz,
  encoding: "utf8",
});

if (corrida.status === 2 || corrida.error) {
  fala(
    `O portao de qualidade nao conseguiu correr sobre ${relativo}. Isto nao e ` +
      "um ficheiro limpo, e um portao avariado — trata como defeito:\n" +
      `${(corrida.stderr ?? corrida.error?.message ?? "").trim()}`
  );
  process.exit(0);
}

let queixas = [];
try {
  queixas = JSON.parse(corrida.stdout ?? "[]").flatMap((r) =>
    (r.messages ?? []).map(
      (m) =>
        `  ${relativo}:${m.line}:${m.column}  ${
          m.severity === 2 ? "erro" : "aviso"
        }  ${m.message}  ${m.ruleId ?? ""}`
    )
  );
} catch {
  fala(
    `O portao de qualidade devolveu algo que nao e JSON sobre ${relativo}. ` +
      "Trata como portao avariado, nao como ficheiro limpo."
  );
  process.exit(0);
}

if (queixas.length === 0) process.exit(0);

fala(
  `O portao de qualidade tem ${queixas.length} coisa(s) a dizer sobre ${relativo}:\n` +
    `${queixas.join("\n")}\n` +
    "Isto e um aviso, nao um bloqueio. Corrige o que pertence ao que estas a " +
    "fazer; nao alargues o trabalho para limpar aviso antigo."
);
