# Binno — regras para o assistente

> Espelho curto. As regras canônicas ficam em `AGENTS.md`; o contrato de
> produto aprovado fica em `docs/contrato-produto-binno.md`.

O Binno é o assessor de reputação no Google de um pequeno negócio. QR na mesa →
cliente avalia → o painel organiza a leitura, sugere resposta editável e aponta
a próxima ação; **a avaliação pública é sempre oferecida, qualquer que seja a
nota** (esconder isso é *review gating*, proibido — nunca reintroduzir). O
repositório ainda se chama `appreview` por motivo histórico.

## Método de trabalho (economia de tokens — obrigatório)

- **Verificar por `npm run verify` + CI, nunca por navegador/dev server.** O dev
  server/preview foi o maior sorvedouro de tokens. Só abrir navegador se o
  Marcelo pedir para *ver* algo, e numa passada só.
- **PRs grandes por tema**, não um por ajuste. Trabalhar em branch, propor PR.
  **Não fazer merge** (o Marcelo faz; sempre mandar o link do PR).
- **Decisões em lote**: juntar tudo que precisa de decisão dele, perguntar de
  uma vez.
- **Não relatar tela a tela.** Surgir com o PR já verde.
- Backlog vivo em `ESTADO.md`; estado completo em `HANDOFF.md`.
- Respostas curtas.

## Autonomia

- **Pode sozinho:** editar em branch, testar, ler, diagnosticar, apagar dados de
  **teste** do banco (o Marcelo pré-autorizou — mas só teste, nunca dado de
  cliente real, e reportar o que apagou).
- **Precisa de aval:** gastar dinheiro (Stripe, domínio, API paga), merge/deploy,
  decisão de preço/posicionamento, apagar dado de cliente real.
- **Ter o acesso não é ter a autorização.** Credenciais de Vercel, Supabase,
  Stripe, Google Cloud, VPS ou DNS não ampliam essa lista.

## Verificação (rodar antes de propor PR)

```
npm run verify
```

Mesmo comando do CI: tipos, paridade do i18n do painel, guarda do contrato de
produto, guarda do QR público e build. O build do Vite sozinho não checa tipos.

## i18n — dois sistemas separados por audiência

- **Cliente final** (telas do QR): dicionário à mão em `src/i18n/index.ts`.
  Leve, pt-BR/pt-PT/en, **sem espanhol**. Não pôr biblioteca aqui (caminho
  emagrecido de propósito).
- **Painel do dono**: **react-i18next**, um JSON por idioma em
  `src/i18n/owner/locales/` (`pt-BR.json`, `pt-PT.json`, `en.json`). Hook
  `useOwnerTranslation`, seletor `LanguageSwitcher`. Plural via
  `_one`/`_other`, interpolação `{{var}}`. Como só as páginas do painel (lazy)
  importam a instância, o react-i18next não entra no pacote do cliente.
  **Para traduzir uma tela:** adicionar as chaves aos 3 JSON, trocar os textos
  por `t('chave')`, verificar.

## Não regredir

- Review gating: a avaliação pública nunca pode ser condicionada à nota.
- Nada de dado inventado à vista do cliente nem apresentado como oficial.
- O painel não volta ao layout legado: a composição do contrato de produto
  (fila, volume, notas, QR, temas, laterais, Radar, Plano de hoje) é aditiva.
- Antes de deploy, `npm run verify` tem de passar.
