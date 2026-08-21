# Piloto operacional OpenWA

Este piloto entrega a experiência do Binno por uma arquitetura que não depende
do navegador do gestor. Ele é uma etapa temporária antes de trocar somente o
adaptador de transporte por um provedor oficial.

## Contrato do Binno

O painel não conversa com OpenWA. Ele guarda preferências, consentimento e uma
fila de saída no Supabase. O cliente pode acompanhar `na fila`, `em envio`,
`aceito`, `entregue`, `lido` ou `falhou` somente quando o canal reportar esse
estado. Não há confirmação inventada.

O contrato a manter na futura migração é:

1. O painel chama `whatsapp-notifications` para salvar preferências ou criar
   um teste.
2. O assessor cria itens de `whatsapp_outbox` para alerta, resumo ou lembrete.
3. Um relay privado reivindica itens com `claim_whatsapp_outbox` e envia pelo
   provedor selecionado.
4. Webhooks atualizam `whatsapp_delivery_events` e o estado da fila.

Trocar OpenWA por Meta Cloud API deve mudar somente o relay/adaptador. A fila,
as preferências, as regras de consentimento, a UI e o histórico permanecem.

## Componentes deste repositório

- Migração `20260821193000_whatsapp_delivery_outbox.sql`: preferências, fila,
  eventos e a operação atômica de claim.
- Função `whatsapp-notifications`: API autenticada do painel.
- Função `materialize-whatsapp-notifications`: cria resumos semanais de forma
  idempotente a partir da leitura agregada mais recente do Apify.
- `sync-experimental-apify`: cria um alerta quando houver evidência suficiente
  e o gestor tiver autorizado alertas do Radar.
- `services/openwa-relay`: processo persistente que chama o OpenWA, recebe seus
  webhooks e registra os estados de entrega.

## Implantação do piloto

1. Aplicar a migração antes das funções.
2. Publicar `whatsapp-notifications`, `materialize-whatsapp-notifications` e a
   versão atualizada de `sync-experimental-apify`.
3. Definir `BINNO_WORKER_SECRET` somente no Supabase e no relay.
4. Subir o relay em uma instância privada e persistente com as variáveis de
   `services/openwa-relay/.env.example`. `OPENWA_SESSION_ID` é o UUID retornado
   ao criar a sessão, não o nome legível dela.
5. Manter OpenWA em uma sessão e número dedicados ao piloto. O URL e a chave do
   OpenWA ficam apenas no relay, nunca no Vite, Supabase público ou navegador.
6. Configurar o webhook do OpenWA para
   `/webhook/openwa` do relay, com o mesmo `OPENWA_WEBHOOK_SECRET`, e validar o ciclo de
   teste: `na fila` -> `aceito` -> `entregue` ou `lido`, quando o OpenWA emitir
   o evento.

## Limites transparentes

OpenWA é um canal temporário não oficial. A camada Binno é preparada para a
troca futura, mas não deve ser apresentada como tendo as mesmas garantias de
entrega, política ou suporte de um provedor oficial. O relay também não lê nem
importa conversas; ele cuida exclusivamente das notificações opt-in do Binno.
