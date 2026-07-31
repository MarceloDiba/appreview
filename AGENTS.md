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

## Verificação obrigatória

Antes de propor um PR:

```bash
npx tsc --noEmit -p tsconfig.app.json
npm run check:i18n-owner
```

Depois de subir a branch, aguardar o CI. O build do Vite não verifica tipos.

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
