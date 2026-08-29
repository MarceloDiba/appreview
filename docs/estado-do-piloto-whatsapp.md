# Estado do piloto de WhatsApp — 29/08/2026

Escrito no fim da sessao em que a primeira mensagem do Binno chegou a um
telefone real. Ate esta data nenhuma mensagem havia sido entregue: as tabelas
`whatsapp_outbox`, `whatsapp_notification_preferences` e `review_funnel_events`
estavam vazias desde a criacao do produto.

## O que ficou provado funcionando

Caminho completo, ponta a ponta: painel -> `whatsapp-notifications` ->
`whatsapp_outbox` -> relay (`relay.binno.pro`, VPS Hostinger `srv1460410`) ->
OpenWA (`openwa-api:2785`, sessao `binno-piloto`, numero 557991986091) ->
WhatsApp do destinatario.

Envio direto verificado: `ENVIO 201 {"messageId":"true_262757643468907@lid_...` em 2539ms.

## As quatro falhas encontradas, e o estado de cada uma

### 1. O painel nao deixava enviar (RESOLVIDO, no ar)

`enqueue-test` exigia `preferences.consented_at`. Salvar preferencias exigia
`preferenceInput` completo, que falhava no telefone. O painel tinha DOIS campos
de telefone — o do gestor e o do teste — e quem preenchia so o do teste recebia
"Preferencias invalidas.", mensagem que nao dizia qual campo faltava.

Correcoes (edge function `whatsapp-notifications` v9, ja publicada; front no
commit `9de4a77`, ja em `origin/main`):
- Um numero so. `testRecipient` deixou de ser estado proprio e passou a derivar
  de `preferences.recipient`.
- `enqueue-test` nao exige mais consentimento continuo. O consentimento autoriza
  os envios AUTOMATICOS; o teste e manual, unico, disparado pelo dono da conta
  para o proprio numero, com confirmacao na tela.
- `preferenceProblem()` nomeia o campo que falta em vez de recusar em bloco.

### 2. O relay nao tinha limite de tempo (RESOLVIDO NA VPS EM 29/08/2026)

Commit `40d3c5a`, ainda nao empurrado quando este documento foi escrito.

Sem limite, uma chamada que o OpenWA aceita e nunca responde ficava presa pelo
padrao do Node — 5 minutos — e so entao virava `fetch failed`. Esse erro
significa "conexao recusada" e mandou a investigacao para rede, container parado
e DNS, tres coisas que nao eram o problema. Evidencia: as duas mensagens presas
foram reivindicadas 11:42:39 e 11:52:05 e falharam 11:48:22 e 11:57:22.

Agora: `AbortSignal.timeout(20000)`, codigo de erro legivel
(`sem resposta do OpenWA em 20s`) e `console.error` no relay — antes a falha era
engolida pelo catch e so existia no banco, por isso `docker logs` nao mostrava nada.

O lote e enviado com `Promise.all` sobre ate 10 itens: uma chamada pendurada
atrasava o lote inteiro.

**Resolvido em 29/08/2026:** o `services/openwa-relay/src/server.mjs` do
commit `40d3c5a` foi copiado para `/opt/binno/relay/src/server.mjs` na VPS
(`srv1460410.hstgr.cloud`, 72.61.131.23) e a imagem foi reconstruida.
Confirmado no container em execucao: `AbortSignal.timeout` presente no
codigo, container `Up`, log `Binno OpenWA relay listening on 8788`.

### 3. Janela do WhatsApp Web travando a pagina (CONFIGURADO EM 29/08/2026, RECONEXAO NOVA AINDA NAO OBSERVADA)

Log do `openwa-api` em 29/08 09:48:16:

```
"O WhatsApp esta aberto em outra janela. Clique em 'Usar nesta janela' para usar"
botoes: ["Fechar", "Usar nesta janela"]
action: onboarding_dialog_unrecognized
```

Surgiu como efeito da reconexao automatica do proprio OpenWA as 09:47, nao por
uso externo. A janela bloqueia a pagina; `sendMessage` precisa avaliar codigo
dentro dela e fica esperando para sempre (`ProtocolError: Runtime.callFunctionOn
timed out`). A sessao continua reportando `ready` e ler conversas continua
funcionando, porque vem da memoria — so o envio depende da pagina.

O proprio OpenWA avisou como resolver, e o alerta nao chegava a lugar nenhum:
preencher `WWEBJS_ONBOARDING_CONTINUE_LABELS` com o rotulo do botao. A variavel
existe na imagem mas estava VAZIA, porque nao havia `.env` em
`/opt/binno/openwa`.

Valor aplicado em 29/08/2026, cobrindo variacoes de idioma e versao:
`Usar nesta janela,Usar aqui,Continuar,Use Here,Continue`

**Configurado em 29/08/2026, ainda nao provado por uma reconexao nova.** Foi
criado `/opt/binno/openwa/.env` (modo 600) na VPS `srv1460410.hstgr.cloud`
(72.61.131.23; o nome curto `srv1460410` nao resolve) com exatamente duas
chaves: `WWEBJS_ONBOARDING_CONTINUE_LABELS` com o valor acima e
`AUTO_START_SESSIONS=true`. O `docker-compose.yml` daquela pasta ja encaminha
as duas variaveis (linhas 157 e 338), e nao foi editado porque pertence ao
projeto OpenWA. Isso cobre a proxima reconexao automatica, mas nenhuma
reconexao aconteceu ainda desde a mudanca para confirmar que o dialogo nao
volta a travar a pagina.

### 4. A sessao nao sobe sozinha apos reinicio do container (RESOLVIDO E PROVADO EM 29/08/2026)

Depois de `docker compose up -d --force-recreate openwa-api`, a sessao responde
`status: ready` (estado salvo no banco) mas o envio devolve
`400 Session is not active. Start the session first.` Foi preciso chamar
`POST /api/sessions/{id}/start` a mao.

**Resolvido e provado em 29/08/2026.** Com `AUTO_START_SESSIONS=true` no
`.env` novo, apos `docker compose up -d openwa-api` recriar o container, o log
mostrou `Session ready: 557991986091` as 16:33:00 com `action: ready`, e o
status da sessao devolveu `engineLoaded: true`, sem que fosse preciso chamar
`POST /api/sessions/{id}/start` a mao. Sessao
`629acdfb-4e29-4037-b819-9b48d71b1315`. Os dados da sessao ficam no volume
nomeado `openwa_openwa-data`, que sobrevive a recriacao do container. Ainda
nao ha uma nova mensagem entregue a um telefone desde essas mudancas; o teste
de envio ponta a ponta e do Marcelo, a partir do painel.

### 5. `relay.binno.pro` nao resolve em DNS (RESOLVIDO E PROVADO EM 29/08/2026)

Estado anterior: `binno.pro` resolvia (76.76.21.21, Vercel) e `relay.binno.pro`
devolvia NXDOMAIN. DNS na GoDaddy (`ns19`/`ns20.domaincontrol.com`).

Isso nao afetava o envio, que e interno (`http://openwa-api:2785`). Afetava a
confirmacao de entrega: o webhook do OpenWA aponta para
`relay.binno.pro/webhook/openwa`, e sem ele o painel nunca saia de "em envio"
mesmo com a mensagem entregue.

**Resolvido em 29/08/2026.** Marcelo criou na GoDaddy um registro A com nome
`relay` apontando para `72.61.131.23`, o IP publico da VPS. O certificado nao
precisou ser reemitido: o Caddy o manteve renovado desde 25/08, e
`https://relay.binno.pro/health` voltou a responder `{"ok":true}` assim que o
nome passou a resolver. O webhook `d418c772-7f53-4588-a5be-d12fadfdba03` ja
estava registrado e ativo, com os eventos `message.ack` e `message.failed`.

#### A armadilha de diagnostico, registrada para nao custar duas horas de novo

Logo apos o DNS propagar, o teste do webhook devolveu
`{"success":false,"error":"Destination address is not allowed"}`. A mensagem
parece bloqueio de seguranca e nao e. Ela nasce em
`/app/dist/common/security/ssrf-guard.js` e o guard a devolve tanto para
endereco proibido quanto para nome que ele nao consegue resolver.

A causa real era cache negativo de DNS. A VPS usa como resolvedor primario o
`153.92.2.6`, da propria Hostinger, que ainda guardava o NXDOMAIN anterior com
TTL negativo de 600 segundos. Enquanto isso durou, `8.8.8.8`, `1.1.1.1` e os
servidores autoritativos da GoDaddy ja respondiam `72.61.131.23`, e so o
resolvedor da Hostinger dizia que o nome nao existia.

Duas licoes que valem mais que a correcao:

1. `resolvectl flush-caches` na VPS NAO resolve, e essa foi a primeira
   hipotese, errada. O cache que importa e o do resolvedor de cima, nao o
   local. Medir camada por camada (maquina de fora, host da VPS, container)
   mostrou isso em um minuto.
2. O TTL restante e consultavel e diz exatamente quanto falta:
   `dig relay.binno.pro @153.92.2.6` traz o SOA com o minimo de 600s e o TTL
   que resta. Nao ha o que consertar, so esperar. Expirou em 200 segundos e o
   teste do webhook passou a devolver `{"success":true,"statusCode":204}`, o
   mesmo 204 documentado em 25/08.

#### Pista sobre o que removeu o registro

O SOA da zona traz o numero de serie `2026082606`, ou seja, dia 26/08, revisao
6. O `lastTriggeredAt` do webhook tambem parou em 26/08. Alguma edicao na zona
naquele dia levou o `relay` junto. Continua sem resposta o que foi.

## Caminho completo provado em 29/08/2026

Tres linhas de `whatsapp_outbox` contam a historia do dia inteiro:

| Criada | Situacao | Erro | Tempo ate resolver |
|---|---|---|---|
| 14:42 e 14:52 | `failed` | `fetch failed` | 300,6 s |
| 17:07 | `accepted` | nenhum | 4,9 s |
| 17:21 | **`delivered`** | nenhum | 6 s apos reivindicar |

Os 300 segundos eram o padrao do Node sem limite de tempo. O commit `40d3c5a`
levou isso a 4,9 segundos. A linha das 17:21 e a primeira que chega a
`delivered`: ate ela, nenhuma mensagem do produto tinha ido alem de `accepted`,
porque a confirmacao de entrega nao tinha caminho de volta.

Antes de 29/08 nenhuma linha desta tabela tinha tido sucesso. A mensagem que
chegou a um telefone mais cedo no dia foi por chamada direta ao OpenWA,
contornando a fila; ela provou o ultimo trecho do caminho, nao o caminho todo.

## Achado de produto aberto: o botao de teste espera ate um minuto

O relay varre a fila a cada 60 segundos (`setInterval(runDispatch, 60_000)` em
`services/openwa-relay/src/server.mjs`). A mensagem das 17:21:50 so foi
reivindicada as 17:22:44.

Na pratica, quem aperta "enviar mensagem de teste" fica ate um minuto sem
qualquer sinal. Isso ja induziu ao erro de leitura durante a propria sessao de
29/08: o teste foi dado como falho aos 51 segundos, quando estava apenas na
fila. Um dono de negocio vai apertar de novo varias vezes e concluir que nao
funciona.

Duas saidas possiveis, nenhuma decidida:

1. O painel declarar "na fila, chega em ate um minuto" em vez de ficar em
   silencio. Barato.
2. O botao de teste acionar o relay na hora, em vez de esperar o tique. Melhor
   para quem usa, e mais trabalho.

## Estado do repositorio

- `main` = `461d9ac` = `origin/main`.
- `docs/openwa-vps-env` traz este documento e o registro das variaveis da VPS.
- `feat/aviso-comentario-privado` = `78660d5`, ja incorporada.
- `feat/preco-legal-e-guarda-cobranca` = `5dd46f8`, 13 commits, NAO empurrada.
  Muda o preco legal de EUR 49 para R$ 199 e traz a guarda de cobranca com 19
  asseveracoes. Segurada de proposito: exige leitura do texto legal antes de ir
  a producao.

## Portao de qualidade

`npm run verify` = `tsc --noEmit -p tsconfig.app.json` + `check:i18n-owner` +
`check:product-contract` + `check:public-qr-security` + `vite build`.
Nao ha suite de testes. As guardas sao `scripts/check-*.mjs` e fixam texto-fonte.

Ao escrever uma guarda nova: quebrar a invariante primeiro, escrever a asseveracao
olhando o estado quebrado, confirmar que falha, restaurar, confirmar que passa.
Revisoes anteriores acharam asseveracoes que passavam com `>` virando `>=`, com
`if (x)` virando `if (!x)` e com `||` virando `&&` — todas por nao fixarem
polaridade e operador.

## Comandos de diagnostico que funcionaram

Na VPS, o salto exato que o relay faz:

```
docker exec binno-openwa-relay node -e "const u=process.env.OPENWA_BASE_URL,k=process.env.OPENWA_LOCAL_API_KEY,s=process.env.OPENWA_SESSION_ID; fetch(u+'/api/sessions/'+s,{headers:{'X-API-Key':k}}).then(async r=>console.log(r.status,(await r.text()).slice(0,300)))"
```

Isso roda de dentro do container do relay, com as variaveis reais. Testar com os
valores do `.env.example` levou a uma conclusao errada: `openwa-api:2785`
respondia, mas nao era essa a chamada que falhava.
