# Binno — regras para o assistente

O produto chama-se **Binno**. `AppReview` permanece apenas como nome histórico
do repositório e de identificadores técnicos (`appreview:*`), por
compatibilidade. Estas regras valem para qualquer assistente que trabalhe no
projeto (Codex, Claude ou outro).

## Hierarquia de documentos

1. [`docs/contrato-produto-binno.md`](docs/contrato-produto-binno.md) — contrato
   de produto aprovado. Arquitetura do painel, invariantes e limites de
   apresentação. Nenhum outro documento o substitui e nenhuma refatoração o
   altera sem aprovação explícita de Marcelo.
2. `HANDOFF.md` — estado operacional completo, para retomar sem redescobrir.
3. `ESTADO.md` — backlog vivo.
4. Este ficheiro — regras de trabalho. `CLAUDE.md` é só um espelho curto dele.

## Produto e invariantes

O Binno é o assessor de reputação no Google de um pequeno negócio: QR na mesa →
cliente avalia → o painel organiza a leitura, sugere resposta editável e aponta
a próxima ação útil. O gestor decide e publica; o Binno nunca publica sozinho.

- A avaliação pública é sempre oferecida, qualquer que seja a nota. Condicionar
  ou esconder a opção pública conforme a nota é review gating e é proibido.
  Nunca reintroduzir.
- Nunca mostrar dado ilustrativo, inferência ou amostra como dado oficial,
  completo ou real sem identificá-lo corretamente.
- O funil do QR termina em **clicou no Google**; clique não é avaliação
  publicada.
- Nome, texto e URL de avaliação obtidos no piloto Apify ficam só no navegador
  autenticado, por até 14 dias.

A lista completa das invariantes está no contrato de produto.

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

**Ter o acesso não é ter a autorização.** O assistente pode ter credenciais de
GitHub, Vercel, Supabase, Stripe, Google Cloud, VPS e DNS; nada disso muda a
lista acima. Em particular, a conta Stripe é partilhada com outro produto da
casa: não sobrescrever configuração padrão, portal ou webhook alheios.

## Verificação obrigatória

Antes de propor um PR:

```bash
npm run verify
```

É o mesmo comando do CI (`.github/workflows/ci.yml`) e o contrato único de
verificação: TypeScript (`tsc --noEmit -p tsconfig.app.json`), paridade dos
catálogos i18n do painel, guarda do contrato de produto, guarda de segurança do
QR público e build. O build do Vite sozinho **não** verifica tipos. Depois de
subir a branch, aguardar o CI; o lint continua informativo por dívida herdada.

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
