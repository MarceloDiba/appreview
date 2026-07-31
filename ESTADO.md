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
- Dados legais da MDR, lei e foro do Brasil e texto LGPD+RGPD (PR #16). O texto
  está publicado no código, mas continua pendente de revisão jurídica externa.
- Configuração guiada em `/configuracao`.
- Fluxo do cliente em pt-BR, pt-PT e inglês, sem espanhol.
- Painel completo do dono em pt-BR, pt-PT e inglês (PR #15). O merge `6eda1c9`
  chegou à `main` e o deploy automático ficou saudável no Vercel.
- Sem dados demonstrativos à vista do cliente nas telas principais.
- `tsc` obrigatório no CI.

## Em revisão

- **PR #17 — prontidão do piloto**, branch `codex/prontidao-piloto`:
  `npm run verify`, checklist ponta a ponta, logout funcional e documentação da
  limpeza de teste.

## Antes do piloto

1. Marcelo executar `docs/checklist-piloto-e2e.md`: criar conta, configurar o
   Google, criar/imprimir e escanear o QR, avaliar e confirmar o caso no painel.
2. Decidir depois o destino da conta de teste mista preservada: ela contém dados
   reais do H5 e não pode ser apagada em bloco.
3. Revisão jurídica externa do PR #16.

## Limpeza de dados de teste

Concluída com inventário e verificação em 30/07. Foram removidas três contas
puramente de teste e cinco registros E2E/smoke de uma quarta conta. A conta
operacional da Noá e os 7 registros reais do H5 (vínculo, lugar e 5 avaliações
em cache) foram preservados. Evidência completa em
`docs/limpeza-dados-teste-2026-07-30.md`.

## Próximos temas

1. **Notificações:** a interface sem efeito foi removida no PR #18. Para
   reintroduzir, definir eventos, canais, provedor, consentimento e tratamento
   de falhas; só então implementar entrega real e preferências persistidas.
2. **Google self-service:** adicionar busca/autocomplete; hoje é preciso colar
   o link. Não bloqueia o piloto concierge.
3. **Admin:** a rota demonstrativa com usuários, receita e pagamentos
   inventados foi removida no PR #19. Antes de criar uma área real, aplicar
   `20260731_harden_admin_access.sql`, definir quem provisiona administradores e
   implementar autorização no servidor.
4. **Modelo de agência:** permitir que a NOÁ administre vários clientes num
   único lugar. Passa a doer a partir do terceiro cliente.
5. **Stripe:** cobrança real continua manual. Qualquer integração exige
   aprovação por mexer com dinheiro.
6. **Infra do cache Google:** migration e RLS preparados na branch
   `codex/reproduz-cache-google`. Ordem obrigatória de publicação: aplicar a
   migration e só depois publicar a Edge Function autenticada.

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
