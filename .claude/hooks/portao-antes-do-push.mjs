// Congela a contagem de avisos: nenhum `git push` sai daqui com um aviso a
// mais do que o repositorio ja tinha.
//
// Porque existe: `lint:portao` e `eslint . --max-warnings 69`. Esse 69 nao e
// uma meta — e a contagem REAL do dia em que as regras entraram. A regra do
// toolkit e que regra nova nasce em `warn`, anota-se a contagem, corrige-se
// ate zero e so entao se promove a `error`. Enquanto nao chega a zero, o que
// protege o numero e ninguem o deixar crescer. Um portao que so corre quando
// alguem lembra nao protege nada.
//
// Bloqueia — e a diferenca para o hook da edicao. Aqui o codigo esta prestes a
// sair da maquina.
import { execSync } from "node:child_process";

import { parseHookEvent, readStdinRaw } from "./hook-io.mjs";

const evento = parseHookEvent(readStdinRaw());
if (evento === null) process.exit(0);

// O `if` do settings.json ja filtra por `git push`, mas e uma optimizacao,
// nao a decisao: um `if` mal escrito desligaria o portao sem avisar ninguem.
// A decisao vive aqui.
const comando = evento?.tool_input?.command ?? "";
if (!/\bgit\s+push\b/.test(comando)) process.exit(0);

const raiz = process.env.CLAUDE_PROJECT_DIR ?? process.cwd();

try {
  execSync("npm run lint:portao --silent", {
    cwd: raiz,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  });
  process.exit(0);
} catch (erro) {
  // So o resumo. A saida inteira do ESLint sao ~20 mil caracteres — despeja-la
  // aqui enche o contexto com avisos ANTIGOS, que nao sao o assunto: o assunto
  // e o aviso que subiu o numero. Quem quiser a lista corre `npx eslint .`.
  const bruto = `${erro.stdout ?? ""}${erro.stderr ?? ""}`.trim();
  const detalhe = bruto
    .split("\n")
    .filter((linha) => /problems?\s*\(|too many warnings/.test(linha))
    .join("\n")
    .trim() || bruto.slice(-500);
  console.log(
    JSON.stringify({
      hookSpecificOutput: {
        hookEventName: "PreToolUse",
        permissionDecision: "deny",
        permissionDecisionReason:
          "O push nao sai: o numero de avisos do ESLint subiu acima do teto " +
          "congelado (69) do `lint:portao`.\n\n" +
          `${detalhe}\n\n` +
          "Corre `npx eslint .` para ver a lista inteira e achar o que entrou.\n" +
          "Corrige o aviso novo. Subir o teto no package.json e a saida errada: " +
          "apaga exactamente a medida que o portao existe para guardar.",
      },
    })
  );
  process.exit(0);
}
