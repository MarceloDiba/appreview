# AppReview — regras para o assistente

> Compatibilidade com Claude. As regras canônicas e atualizadas do projeto
> ficam em `AGENTS.md`, importado abaixo — os comandos canônicos, o portão de
> verificação, os hooks e a tabela de especialistas vivem lá, e só lá. O que
> sobra neste arquivo é o que ainda não foi movido; em conflito, `AGENTS.md`
> vence.

@AGENTS.md

Ferramenta de gestão de reputação para donos de negócio que não sabem de
tecnologia. QR na mesa → cliente avalia → nota baixa vira caso interno para o
dono resolver; **a avaliação pública é sempre oferecida, qualquer que seja a
nota** (esconder isso é *review gating*, proibido — nunca reintroduzir).

## Método de trabalho (economia de tokens — obrigatório)

- **Verificar por `tsc` + CI, nunca por navegador/dev server.** O dev
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

## Verificação (rodar antes de propor PR)

```
npm run verify   # tipos + portão do lint + os 63 guardas + build
```

Rodar só o `tsc` passa por cima dos 63 guardas `check:*`, e cada um deles
guarda uma decisão de produto que já foi quebrada uma vez. A tabela completa de
comandos canônicos está em `AGENTS.md`.

Para i18n do painel, checar chaves batendo e resolução: ver o script em
`HANDOFF.md` (secção "Verificação do i18n").

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
- Nada de dado inventado à vista do cliente (já limpámos "Restaurante Exemplo",
  faturas falsas, etc.).
- Antes de deploy, `tsc` tem de passar.
