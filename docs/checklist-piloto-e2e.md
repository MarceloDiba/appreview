# Checklist do piloto — teste ponta a ponta

Use este roteiro em produção antes de ativar cada negócio piloto. Registe a
data, a conta usada, o negócio e o slug do QR. Não publique uma avaliação real
no Google durante o teste.

- [ ] Criar uma conta nova, entrar e concluir a configuração inicial.
- [ ] Configurar o Google com o negócio correto e confirmar nome e link exibidos.
- [ ] Criar um QR, baixar o cartão para impressão e imprimir uma cópia.
- [ ] Escanear **o QR impresso** com o telemóvel e confirmar que abre o negócio
  e o idioma esperados.
- [ ] Escolher uma nota baixa, enviar um comentário de teste identificável e
  confirmar que a opção de avaliação pública continua disponível. Não avançar
  para publicar no Google.
- [ ] Voltar ao painel, abrir a Central de Atenção e confirmar que o comentário,
  a nota, o negócio e o estado do caso correspondem ao envio.
- [ ] Marcar o caso como tratado e confirmar que o estado persiste após atualizar
  a página.
- [ ] Sair pelo menu do perfil e confirmar que uma rota protegida volta ao login.

Se algum item falhar, pare o piloto desse negócio e registe: etapa, horário,
conta, slug do QR, resultado esperado e resultado observado.

## Execução registada — 31/07/2026

Passagem feita por Marcelo com a conta existente da Noá:

- **Passou:** configurar o negócio e o link do Google.
- **Passou:** criar, baixar, imprimir e escanear o QR físico; negócio e idioma
  corretos.
- **Passou:** enviar nota baixa e comentário identificável mantendo a avaliação
  pública disponível.
- **Passou:** comentário, nota, negócio e caso correspondentes na Central de
  Atenção.
- **Passou:** caso marcado como tratado e estado persistente.
- **Passou:** logout encerrou a sessão e voltou à página inicial.
- **Não executado:** criar uma conta totalmente nova.
- **Primeira falha corrigida:** o link curto `g.page` foi salvo sem Place ID. A
  função publicada passou a resolver o redirecionamento autenticado do próprio
  Google automaticamente.
- **Reteste de 31/07:** o Place ID foi identificado e gravado corretamente, mas
  a consulta seguinte recebeu erro no endpoint legado da Places API. O painel
  mostrou “Não foi possível carregar as avaliações do Google agora”.
- **Correção preparada:** migrar a consulta para Place Details (New), mantendo
  o cache de 12 horas e os vínculos individuais de autor e origem exigidos pelo
  Google Maps.
- **Reteste pendente:** depois da publicação da migração, abrir Avaliações do
  Google e confirmar negócio, média, total, avaliações e links de origem.
