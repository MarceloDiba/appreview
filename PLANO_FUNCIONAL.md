# AppReview — plano funcional do assessor de reputação

Fotografia em 14/08/2026. Este plano separa o que já funciona, o que depende de
integração e o que só deve avançar após decisão de custo ou política.

## Resultado pretendido

O gestor abre o AppReview e recebe uma leitura curta: como está a reputação no
Google, o que mudou, o que merece atenção e qual é a ação mais útil. O produto
reduz interpretação e trabalho; não cria uma operação paralela de casos.

## O que funciona localmente agora

- Nota e quantidade total observadas no Google pela Places API.
- Cache de até cinco avaliações retornadas pelo Google e seleção de uma
  avaliação escrita, priorizando notas até 3.
- Rascunho determinístico, editável e sem custo de IA ou publicação automática.
- Aberturas do QR, cliques para Google e taxa de continuidade, após a migration
  local ser aplicada no ambiente autorizado.
- Snapshots para comparar nota e volume ao longo do tempo.
- Painel real com estados vazios honestos e demo reutilizando os mesmos
  componentes, sempre identificado como ilustrativo.
- Protótipo local da sessão assistida com cinco avaliações: três pendentes,
  duas respondidas, rascunho editável, adiamento e resumo final. Esta fila é
  demonstrativa e não lê nem publica estados no Google.

Limite atual: a Places API devolve no máximo cinco avaliações e não informa o
conjunto completo de respostas do proprietário. Portanto, ela não sustenta uma
contagem real de avaliações sem resposta nem a idade da última foto publicada.

## Fase 1 — consolidar o núcleo atual

1. Revisar o painel local com Marcelo.
2. Ajustar o demo e a landing à mesma promessa, sem apresentar recursos
   planejados como disponíveis.
3. Aplicar a migration de métricas somente em rollout autorizado.
4. Validar em produção: snapshots, eventos do QR, cache e estados vazios.

Ferramentas: React/Vite, Supabase, Places API, Vercel e GitHub Actions.
Custo novo: nenhum para o trabalho local. Uso de Places continua sujeito à
conta e à tabela vigente do Google; confirmar novamente antes do rollout.

## Fase 2 — ligar o Perfil da Empresa no Google

Objetivo: tornar reais os indicadores de saúde e permitir assessoria completa.

### Fundação local concluída em 14/08/2026

- migration `20260814193000_google_business_profile_connection.sql` com
  conexão, localizações, avaliações e estados OAuth isolados por proprietário;
- refresh token armazenado no Supabase Vault, sem exposição pelo navegador;
- Edge Functions para iniciar OAuth, concluir o callback e listar localizações,
  importar uma página de avaliações ou publicar uma resposta explicitamente
  escolhida;
- Configurações com entrada de consentimento e seleção da localização; a página
  Avaliações já prefere a fila real quando existir uma conexão válida e mantém
  o cache Places como leitura pública limitada enquanto ela não existir;
- cada página de avaliações devolve `next_page_token`; enquanto ele existir,
  nenhuma interface pode dizer que a fila ou a contagem de pendências está
  completa;
- configuração de ambiente e passo a passo em
  `docs/google-business-profile-rollout.md`.

Nada desta fundação foi aplicado em Supabase, Google Cloud ou produção. Ainda
não houve chamada à API Business Profile, consentimento de cliente ou custo.

Entregas:

- OAuth do Google com consentimento explícito e escopo mínimo
  `business.manage`.
- Seleção da conta e da localização administrada pelo cliente.
- Lista paginada de todas as avaliações, incluindo `reviewReply`.
- Contagem real de avaliações sem resposta e prioridade por nota/recência.
- Caixa de entrada real com ordenação por insatisfação concreta, antiguidade e
  depois avaliações positivas; cada resposta avança para o item seguinte.
- Estado da resposta confirmado novamente no Google após a publicação; sem
  transformar avaliações em casos operacionais paralelos.
- Leitura de media para calcular a idade da última foto do negócio.
- Leitura de horários, categorias, atributos e dados essenciais do perfil.
- Atualização segura de respostas somente após ação explícita do gestor; nunca
  publicar automaticamente.

Dependências:

- projeto Google Cloud e pedido de acesso às Business Profile APIs;
- política de privacidade e ecrã de consentimento OAuth coerentes;
- armazenamento cifrado e renovação de tokens no Supabase;
- revisão periódica das políticas da API;
- revogação de acesso disponível ao cliente.

Gate externo: o pedido de acesso Basic à API exige um projeto Google Cloud e um
Perfil da Empresa verificado e ativo por pelo menos 60 dias. O código local não
substitui essa aprovação do Google.

Ferramentas recomendadas: Google Business Profile APIs, OAuth 2.0, Supabase
Edge Functions e Vault/Secrets. O acesso à API tem aprovação e quotas; preço e
condições devem ser reconfirmados antes de ativar clientes.

## Fase 3 — rotina automática do assessor

Rotina diária ou semanal, sem exigir abertura constante do painel:

1. sincronizar avaliações, respostas, fotos e informações do perfil;
2. calcular sinais verificáveis;
3. escolher no máximo uma prioridade principal;
4. preparar o briefing e um rascunho de resposta;
5. registrar sucesso, falha e última sincronização;
6. não repetir alerta sem mudança relevante.

Ferramentas recomendadas: Supabase Scheduled Functions/cron para o piloto,
fila durável apenas se o volume justificar, logs do Supabase e Vercel. Sentry é
uma melhoria posterior, não requisito do primeiro piloto.

## Fase 4 — WhatsApp com consentimento

O WhatsApp deve entregar valor, não notificações genéricas:

- resumo semanal da evolução observada;
- alerta apenas para avaliação nova que mereça atenção;
- ligação direta para revisar a resposta no AppReview;
- frequência e silêncio configuráveis;
- opt-in, opt-out e histórico de consentimento.

Recomendação principal: Meta WhatsApp Cloud API para maior controlo e menor
dependência de intermediário. Alternativa: Twilio ou BSP para reduzir esforço de
onboarding, aceitando custo e dependência maiores. Nenhuma contratação deve ser
feita sem aprovação de preço, modelo de mensagem e estimativa por cliente.

## IA e custo

O gerador atual deve continuar como fallback gratuito e previsível. IA só deve
entrar quando melhorar materialmente personalização, resumo ou idioma:

- modelo pequeno para classificar tema e criar duas respostas curtas;
- limites por conta, cache e orçamento mensal;
- nunca enviar dados pessoais desnecessários;
- sempre exigir revisão humana antes de publicar.

Não há necessidade de IA paga para validar a proposta de valor do painel.

## Critérios para dizer que está funcional

- a conta liga a localização correta do Google;
- o total de avaliações sem resposta confere com o Perfil da Empresa;
- a última foto e os horários exibidos têm origem e data visíveis;
- uma nova avaliação chega ao painel dentro da janela definida;
- o gestor revisa e publica uma resposta sem o AppReview agir sozinho;
- o briefing não cria alertas repetidos ou tarefas irrelevantes;
- custos por conta e falhas de sincronização ficam observáveis.

## Ordem recomendada

1. Aprovar painel e narrativa.
2. Publicar o núcleo de métricas já preparado.
3. Solicitar e implementar Business Profile API + OAuth.
4. Validar uma conta real com consentimento.
5. Automatizar sincronização e briefing.
6. Pilotar WhatsApp com orçamento aprovado.
7. Só depois avaliar IA paga, múltiplas localizações e publicação de respostas
   dentro do AppReview.
