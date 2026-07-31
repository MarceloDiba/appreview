# Estado do AppReview — 30 de julho de 2026

Backlog vivo. Para contexto, decisões e armadilhas, ler também `HANDOFF.md` e
`AGENTS.md`.

## Regra de produto que não pode regredir

O AppReview é gestão de reputação para donos de negócio que não sabem de
tecnologia. A avaliação pública é sempre oferecida, qualquer que seja a nota.
Condicionar a opção pública à nota é review gating e é proibido.

## Em produção

Produção: https://appreview-flame.vercel.app

- Review gating corrigido.
- QR code real, gerado localmente, com cartão A6 pronto para imprimir.
- Dashboard e Central de Atenção com dados reais.
- Avaliações reais do Google.
- Sugestões de resposta editáveis, sem publicação automática.
- Termos e Privacidade.
- Configuração guiada em `/configuracao`.
- Fluxo do cliente em pt-BR, pt-PT e inglês, sem espanhol.
- Sem dados demonstrativos à vista do cliente nas telas principais.
- `tsc` obrigatório no CI.

## Em revisão

- **PR #15 — painel do dono multilíngue.** Implementação concluída na branch
  `feat/painel-multilingue`: pt-BR, pt-PT e inglês, com datas e números
  localizados. Inclui verificação automatizada dos catálogos no CI.
- **PR #16 — dados legais.** Entidade MDR Propaganda Ltda. ME, LGPD+RGPD e foro
  de Aracaju. Verde, mas precisa de revisão jurídica antes de ser tratado como
  texto definitivo.

## Antes do piloto

1. Marcelo fazer o teste completo: criar conta, configurar o Google, criar e
   imprimir um QR, escanear no telemóvel, enviar uma avaliação e confirmar o
   caso no painel.
2. Limpar os dados de teste do banco. Está pré-autorizado apagar somente dados
   inequivocamente identificados como teste; nunca dados reais.
3. Confirmar quais contas e registos pertencem ao H5 Texas Burger — Avenida e à
   Mania de Petiscos antes da limpeza.
4. Revisão jurídica externa do PR #16.

## Próximos temas

1. **Notificações:** os interruptores e o botão de guardar ainda não persistem.
   Implementar de verdade ou remover a interface.
2. **Google self-service:** adicionar busca/autocomplete; hoje é preciso colar
   o link. Não bloqueia o piloto concierge.
3. **Admin:** ligar `/admin` ao banco e remover os dados demonstrativos dessa
   área interna antes de uso real.
4. **Modelo de agência:** permitir que a NOÁ administre vários clientes num
   único lugar. Passa a doer a partir do terceiro cliente.
5. **Stripe:** cobrança real continua manual. Qualquer integração exige
   aprovação por mexer com dinheiro.
6. **Infra reproduzível:** guardar no repositório a migration das tabelas de
   cache do Google Reviews, que existem no banco mas não têm receita versionada.

## Piloto

H5 Texas Burger — Avenida e Mania de Petiscos, ambos em Lisboa. Marcelo está em
Aracaju até dezembro; o arranque será remoto.

## Riscos e armadilhas

- Supabase está em São Paulo e o piloto é português: há transferência
  internacional de dados. A Política de Privacidade declara LGPD+RGPD, mas isso
  não substitui revisão jurídica.
- O endereço do QR não é editável de propósito. A edição manual já causou QR
  apontando para página inexistente.
- O cartão impresso é material do cliente final e permanece trilingue.
- Há cópias locais do macOS com nomes `* 2.ts`/`* 2.tsx`; não pertencem ao git
  e não devem entrar em commits.
- O lint ainda é informativo por causa de dívida herdada do projeto original.
