# Piloto local de WhatsApp com OpenWA

Este procedimento serve apenas para validar manualmente o canal de WhatsApp a
partir do painel local do Binno. Não é uma arquitetura de produção.

## O que ele valida

- O gestor vincula um dispositivo do WhatsApp a uma sessão OpenWA local.
- O painel autenticado reconhece a sessão `binno-piloto` como conectada.
- Um operador informa um número internacional, escreve a mensagem e confirma
  cada envio no próprio painel.
- O OpenWA devolve o resultado de aceitação do envio.

Não valida entrega recorrente, agendamento, consentimento persistido, webhook,
importação de conversas, multiempresa, métricas de entrega ou notificações
automáticas.

## Limites de segurança do piloto

- O OpenWA deve ficar em `127.0.0.1`; não publicar porta, dashboard ou API.
- A chave do OpenWA entra somente no processo do Vite como
  `OPENWA_LOCAL_API_KEY`. Ela nunca é enviada ao bundle do navegador nem entra
  no Git.
- O painel só chama `/api/openwa` em desenvolvimento. Em build publicado o
  canal aparece indisponível e não tenta contactar o computador local.
- O campo de destinatário não é persistido pelo Binno. Use formato E.164 com
  `+`, por exemplo `+351 911 056 526`.
- Cada envio exige a caixa de confirmação marcada. Não existe botão de agenda,
  reenvio automático ou envio em massa.

## Preparação local

1. Inicie uma instância temporária do OpenWA em `127.0.0.1:2785`, crie a
   sessão `binno-piloto` e vincule o WhatsApp por QR.
2. Inicie o Binno com a chave somente no ambiente do processo:

   ```bash
   BINNO_ENABLE_OPENWA_PROXY=true OPENWA_LOCAL_API_KEY='<chave-local-do-openwa>' npm run dev
   ```

   O proxy só é ativado com essa segunda variável explícita. Não a use numa
   prévia exposta à rede local: o teste QR em rede usa `npm run dev:lan` e não
   encaminha qualquer pedido ao OpenWA.

3. Abra `/dashboard`, vá para a aba **WhatsApp** e confirme o selo **Canal
   local conectado**.
4. Informe número, edite a mensagem, marque a confirmação e envie um único
   teste. Confirme o recebimento no telemóvel antes de concluir que o teste
   passou.

## Encerramento do piloto

No OpenWA, encerre a sessão e remova o dispositivo vinculado antes de eliminar
os dados locais do piloto. Não reutilize a implementação para clientes ou
envios recorrentes sem decidir provedor, número dedicado, consentimento,
registro de preferências, limites, observabilidade e tratamento de falhas.
