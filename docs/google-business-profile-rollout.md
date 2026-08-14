# Conexão oficial com o Perfil da Empresa no Google

Estado: fundação local preparada em 14/08/2026. Não aplicada, publicada ou
autorizada numa conta Google.

## O que este lote prepara

- consentimento OAuth explícito no escopo mínimo `business.manage`;
- refresh token guardado no Supabase Vault, nunca enviado ao navegador;
- estado OAuth aleatório, de uso único e com expiração de dez minutos;
- descoberta da conta e da localização administrada;
- importação paginada de avaliações, incluindo `reviewReply`;
- publicação de resposta somente por ação explícita e confirmação posterior no
  Google antes de atualizar a cópia local.

Com isso, o produto pode calcular uma fila real de respostas pendentes. O
Places permanece somente como fonte pública limitada; ele não deve ser usado
para afirmar que a fila está completa.

## Ordem de rollout autorizável

1. Criar ou escolher o projeto Google Cloud que representa o AppReview.
2. Solicitar acesso Basic às Google Business Profile APIs no projeto. O Google
   exige um Perfil da Empresa verificado e ativo há pelo menos 60 dias e um site
   representando o negócio.
3. Depois da aprovação, ativar as APIs necessárias, configurar a tela de
   consentimento e criar uma credencial OAuth Web.
4. Registar exatamente a URL de callback da Edge Function:
   `https://tjbznhwdjyabuacrfqie.supabase.co/functions/v1/google-business-oauth-callback`.
5. Aplicar a migration `20260814193000_google_business_profile_connection.sql`
   e publicar as três Edge Functions deste lote.
6. Configurar no Supabase, sem colocar no Git: `GOOGLE_OAUTH_CLIENT_ID`,
   `GOOGLE_OAUTH_CLIENT_SECRET`, `GOOGLE_OAUTH_REDIRECT_URI` e `APP_URL`.
7. Com o dono do primeiro piloto presente, clicar em **Conectar Google**,
   escolher a localização correta e sincronizar até a API não devolver mais
   `nextPageToken`.
8. Conferir total, média e respostas pendentes contra o próprio Perfil da
   Empresa antes de ativar a fila real no painel.

## Guardrails de produto

- O titular consente no Google e pode revogar o acesso.
- Não há publicação automática: uma resposta exige escolha, edição e comando
  explícito do gestor.
- Enquanto a sincronização tiver páginas pendentes, a interface não deve
  chamar a contagem de “completa”.
- Uma falha de token altera a conexão para `revoked`; não há tentativa oculta
  de usar outro perfil Google.
- Nenhum dado de avaliação é usado para esconder a opção pública: review
  gating continua proibido.

## Fontes oficiais consultadas em 14/08/2026

- [Pré-requisitos e pedido de acesso à API](https://developers.google.com/my-business/content/prereqs)
- [OAuth com Business Profile](https://developers.google.com/my-business/content/implement-oauth)
- [Lista paginada de avaliações](https://developers.google.com/my-business/reference/rest/v4/accounts.locations.reviews/list)
- [Publicação/atualização de resposta](https://developers.google.com/my-business/reference/rest/v4/accounts.locations.reviews/updateReply)
- [Armazenamento cifrado no Supabase Vault](https://supabase.com/docs/guides/database/vault)
