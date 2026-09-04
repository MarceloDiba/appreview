# AppReview — regras para o Codex

## Produto e invariantes

O AppReview é uma ferramenta de gestão de reputação para donos de negócio que
não sabem de tecnologia. O fluxo principal é: QR na mesa → cliente avalia →
nota baixa vira caso interno para o dono resolver.

- A avaliação pública é sempre oferecida, qualquer que seja a nota.
- Condicionar ou esconder a opção pública conforme a nota é review gating e é
  proibido. Nunca reintroduzir.
- Nunca mostrar dados inventados como se fossem reais.

## Forma de trabalhar

- Antes de trabalho complexo, apresentar um plano curto. Depois do plano,
  decisões técnicas e alterações locais reversíveis podem seguir sem nova
  aprovação.
- Trabalhar localmente em blocos completos antes de publicar.
- Verificar por TypeScript e CI. Não abrir navegador, preview ou dev server,
  salvo se Marcelo pedir explicitamente para ver algo.
- Fazer PRs grandes por tema, em branch. Não fragmentar um tema em vários PRs.
- Não fazer merge nem deploy. Marcelo faz ambos.
- Antes de subir uma branch, concluir e verificar o pacote local.
- Ao terminar, enviar sempre o link do PR.
- Preservar mudanças paralelas e arquivos que não pertencem à tarefa. Fazer
  staging seletivo.
- Manter `ESTADO.md` como backlog vivo e `HANDOFF.md` como estado completo.
- Responder de forma curta e reunir decisões de Marcelo numa única rodada.

## Autonomia e aprovações

Pode seguir sozinho:

- decisões técnicas;
- leitura, diagnóstico, edição em branch e testes não destrutivos;
- refatorações locais necessárias para completar o tema;
- apagar apenas dados inequivocamente identificados como teste, reportando o
  que foi apagado.

Precisa de aprovação:

- gastos, Stripe, domínio ou API paga;
- merge ou deploy;
- preço ou posicionamento;
- apagar dados de cliente real;
- qualquer mudança pública, financeira ou difícil de reverter fora do escopo
  já aprovado.

## Comandos canônicos

Usar exatamente estes. Não adivinhar, não inventar variação.

| Para quê | Comando |
| --- | --- |
| Instalar | `npm install` |
| Lint | `npm run lint` |
| Portão do lint (teto congelado) | `npm run lint:portao` |
| Tipos | `npx tsc --noEmit -p tsconfig.app.json` |
| **Portão completo, antes do PR** | `npm run verify` |
| Build | `npm run build` |
| Rodar | `npm run dev` |
| Auto-teste das regras de ESLint | `node eslint-rules/verify.mjs ./eslint-rules/index.cjs` |

## Verificação obrigatória

Antes de propor um PR, o comando é **um**:

```bash
npm run verify
```

Ele encadeia os tipos, o portão do lint e os **63 guardas** `check:*` — cada um
guardando uma decisão de produto que já foi quebrada uma vez. Rodar só o `tsc`
passa por cima de todos eles. Depois de subir a branch, aguardar o CI. O build
do Vite não verifica tipos.

### O teto de avisos, e por que não se mexe nele

`lint:portao` é `eslint . --max-warnings 69`. Esse **69 não é uma meta — é a
contagem real** do dia em que as regras de qualidade entraram. A regra é: regra
nova nasce em `warn`, anota-se a contagem, corrige-se até zero, e só então se
promove a `error`. Enquanto não chega a zero, o que protege é ninguém deixar o
número crescer.

**Subir o teto no `package.json` é a saída errada:** apaga exatamente a medida
que o portão existe para guardar. Se um aviso novo aparecer, corrige-se o aviso.

## Dois hooks vigiam isto sozinhos

Vivem em `.claude/hooks/`, ligados por `.claude/settings.json`:

- **`lint-do-ficheiro-tocado.mjs`** — depois de cada escrita, passa o ESLint só
  no ficheiro tocado e devolve o resultado. **Avisa, não bloqueia.** Existe
  porque o `verify` é lento demais para rodar a cada edição, e sem ele o aviso
  novo só apareceria no fim, quando já custa caro desfazer.
- **`portao-antes-do-push.mjs`** — antes de um `git push`, confere o teto de
  avisos. **Bloqueia.** Aqui o código está prestes a sair da máquina.

Se algum deles ficar em silêncio quando devia falar, trata-se de portão
avariado, não de código limpo — os dois foram escritos para denunciar a própria
avaria em vez de falharem para o lado do silêncio.

## Trabalho em paralelo com subagentes

Quando um plano tiver tarefas genuinamente independentes, seguir
`.claude/rules/parallel-subagent-driven-development.md`. Em uma linha: só entram
na mesma onda tarefas cujos conjuntos de arquivos sejam **disjuntos**, e
**implementador nenhum faz commit** — quem comita é o orquestrador, uma tarefa
de cada vez, depois da onda. Sem essas duas condições, é serial.

| Especialista | Quando usar |
| --- | --- |
| `code-reviewer` | Depois de editar qualquer fonte. Bugs, tratamento de erro, cobertura. |
| `security-reviewer` | Antes de qualquer merge que toque autenticação, entrada de dados, segredos, RLS ou funções `public` do Postgres. **Obrigatório no caminho de pagamento.** |
| `test-engineer` | Depois de implementar lógica nova. |
| `backend-specialist` | `supabase/functions/`, migrations, filas. |
| `frontend-specialist` | `src/`, painel, telas do QR. |

## i18n

Há dois sistemas separados por audiência:

- Cliente final, nas telas do QR: dicionário leve em `src/i18n/index.ts`, com
  pt-BR, pt-PT e inglês. Não adicionar espanhol nem react-i18next a esse fluxo.
- Painel do dono: react-i18next, catálogos em
  `src/i18n/owner/locales/{pt-BR,pt-PT,en}.json`, hook
  `useOwnerTranslation` e seletor `LanguageSwitcher`.

Ao traduzir o painel:

- adicionar as mesmas chaves aos três catálogos;
- trocar texto visível por `t('chave')`;
- localizar datas e números, não apenas rótulos;
- usar `_one`/`_other` para plural e `{{var}}` para interpolação;
- não alterar textos do cartão impresso ou do cliente final quando o escopo for
  somente o painel.
