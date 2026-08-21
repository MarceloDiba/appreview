# Plano de prontidão para venda do Binno

**Fotografia:** 21 de agosto de 2026.
**Objetivo:** sair do demo publicado para um piloto pago, operável e honesto,
sem alterar o cockpit aprovado nem prometer capacidade que ainda não esteja
entregue.

## Decisões consolidadas

- O Binno é o assessor de reputação no Google. QR, fila, Radar, WhatsApp e
  boas práticas são capacidades dentro desta proposta, não produtos separados.
- O cockpit aprovado é contrato de produto. Evoluções são aditivas e não podem
  substituir fila, volume, curvas por estrela, QR, temas, Radar, plano,
  reputação, WhatsApp, completude ou resultado observado.
- O QR oferece sempre a avaliação pública. Ele mede abertura e clique, nunca
  infere uma avaliação publicada.
- O gestor revisa e decide. O Binno não publica resposta automaticamente.
- Apify é um piloto manual e limitado. A conexão oficial continua sendo a
  fonte necessária para a fila completa, o estado real das respostas e a
  publicação confirmada.
- Não será anunciado como capacidade entregue aquilo que ainda é só local,
  experimental, manual ou depende de um fornecedor futuro.

## Estado atual comprovado

| Frente | Estado | Limite atual |
| --- | --- | --- |
| Página oficial e demo | Publicadas | Demo é ilustrativa e não cria automação real. |
| Cockpit | Consolidado | Depende da origem disponível para preencher métricas. |
| Apify | Piloto manual funcional | Sem agenda, teto e intervalo de segurança ativos. |
| Google oficial | Código e migration existem | Banco e Edge Functions oficiais ainda não estão aplicados no projeto de produção; faltam credenciais OAuth e acesso à API. |
| WhatsApp | Piloto local com OpenWA | Preferências e logs são locais; não há entrega recorrente em produção. |
| Cobrança | Preço apresentado | Não há checkout, assinatura nem cobrança automática. |
| Privacidade | Correção em andamento | A política atual expõe perfis por leitura pública direta; este primeiro lote elimina essa exposição. |

## Execução por lotes

### Lote 1. Fundação segura do piloto

**Em execução nesta branch.**

1. Trocar as leituras públicas diretas de perfil, QR e links por uma função
   mínima para QR ativo.
2. Restringir `profiles`, `platform_links` e `qr_codes` ao respetivo dono.
3. Verificar TypeScript, i18n, contrato do produto e build.
4. Abrir PR temático. A aplicação da migration no Supabase é uma alteração de
   produção e acontece somente depois de revisão e merge autorizados.

**Resultado:** o QR público continua oferecendo o nome do negócio e os links
necessários, sem expor telefone, dados de assinatura ou outros links do dono.

### Lote 2. Conexão oficial do Perfil da Empresa

**Pré-requisitos externos, sem custo novo conhecido:** acesso Basic do Google
para o projeto correto, APIs habilitadas e cliente OAuth Web configurado.

1. Confirmar o acesso Basic do Google e habilitar somente as APIs aprovadas.
2. Cadastrar no cofre do Supabase `GOOGLE_OAUTH_CLIENT_ID`,
   `GOOGLE_OAUTH_CLIENT_SECRET`, `GOOGLE_OAUTH_REDIRECT_URI` e `APP_URL`.
3. Aplicar `20260814193000_google_business_profile_connection.sql` no banco de
   produção e publicar as funções `start-google-business-oauth`,
   `google-business-oauth-callback` e `sync-google-business-profile`.
4. Ligar a flag pública de OAuth apenas depois da verificação técnica.
5. Com um gestor presente, conectar, escolher uma localização e sincronizar
   até o fim da paginação. Conferir média, total e pendências contra o Perfil
   da Empresa.

**Resultado:** fila completa e verificável, estado real de resposta e ponte
segura para publicar uma resposta após confirmação explícita do gestor.

### Lote 3. Histórico e inteligência do assessor

**Pode começar depois que o Lote 2 tiver uma primeira sincronização real.**

1. Persistir leituras datadas por localização, com fonte, período, contagem,
   distribuição por estrelas, resposta observada e temas agregados.
2. Definir uma segunda leitura comparável como condição mínima para tendência.
3. Calcular anomalia só quando houver queda ou aumento relevante, período
   comparável e causa recorrente em comentários.
4. Gerar Radar com evidência: força, fragilidade, possível causa e uma ação
   operacional sugerida.
5. Registrar o resultado observado somente a partir de uma leitura posterior,
   sem atribuir causalidade automática.

**Resultado:** o Binno deixa de apenas mostrar dados e passa a explicar o que
mudou, por que importa e o que o gestor pode fazer.

### Lote 4. WhatsApp de produção

**Exige decisão de fornecedor, política de consentimento e orçamento.**

1. Escolher provedor oficial de WhatsApp Business e definir custo por conversa,
   templates, limites e responsável operacional.
2. Persistir no servidor o número confirmado, consentimento, interesses,
   fuso, frequência e histórico de entrega.
3. Implementar fila de envio, idempotência, logs, falha, opt-out e limites.
4. Enviar apenas alertas elegíveis e resumos configurados pelo gestor.
5. Validar com um número de teste e depois com o primeiro piloto consentido.

**Resultado:** o Binno chega ao gestor com uma ação útil, sem depender de um
processo local aberto nem de envio manual da equipa.

### Lote 5. Cobrança, operação e venda

**Exige decisão comercial e financeira.**

1. Confirmar plano, moeda, impostos, período de teste, cancelamento e suporte.
2. Escolher e configurar checkout, assinatura, webhooks e acesso por status de
   pagamento.
3. Publicar termos, privacidade, política de dados de avaliações e canal de
   suporte.
4. Instrumentar o funil comercial: visita, cadastro, onboarding concluído,
   QR criado, conexão Google e primeira ação útil. Não chamar evento de venda
   sem evidência de pagamento.
5. Criar playbook de piloto: convite, consentimento, checklist, revisão
   semanal e critério explícito de sucesso.

**Resultado:** processo comercial e operacional repetível para cobrar, atender
e reter sem assumir promessas indevidas.

### Lote 6. Liberação controlada

1. Executar o fluxo completo com uma conta nova e um negócio consentido.
2. Validar QR impresso, idioma, avaliação pública disponível, fila, cópia e
   abertura do comentário correto, sincronização, alerta, WhatsApp e cobrança.
3. Revisar segurança, conteúdo público, mobile, acessibilidade básica e
   observabilidade de erros.
4. Abrir para uma coorte pequena antes de divulgação ampla.

## Portões de decisão

| Após | Decisão necessária | Motivo |
| --- | --- | --- |
| Lote 1 | Merge e aplicação da migration | Altera política de produção. |
| Lote 2 | Uso da API e credenciais Google | Depende de acesso externo e configuração de produção. |
| Lote 4 | Provedor e teto de custo WhatsApp | Cria gasto recorrente e obrigação operacional. |
| Lote 5 | Checkout, preço final e termos | Cria cobrança, obrigação comercial e exposição pública. |
| Lote 6 | Abertura para venda | Só após evidência ponta a ponta. |

## Critério de “pronto para vender”

O Binno só será apresentado como disponível para venda quando houver, em
produção: privacidade corrigida, onboarding/QR funcional, conexão Google
verificada, histórico suficiente para não inventar tendência, WhatsApp por
canal operável com consentimento, cobrança funcional e uma passagem ponta a
ponta comprovada. Até lá, a página pode captar interesse e demonstrar o
produto, mas não deve prometer entrega automática que ainda não existe.
