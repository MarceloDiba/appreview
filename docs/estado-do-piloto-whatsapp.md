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

### 2. O relay nao tinha limite de tempo (CORRIGIDO, FALTA SUBIR NA VPS)

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

**Pendente:** empurrar o commit e redeployar o relay na VPS. Ate la ele roda a
versao antiga.

### 3. Janela do WhatsApp Web travando a pagina (RESOLVIDO SO POR HOJE)

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
existe na imagem mas esta VAZIA. Nao ha `.env` em `/opt/binno/openwa`; precisa
ser declarada no `environment:` do `docker-compose.yml`.

Valor sugerido, cobrindo variacoes de idioma e versao:
`Usar nesta janela,Usar aqui,Continuar,Use Here,Continue`

**Pendente.** Sem isso, na proxima reconexao automatica o envio trava de novo.

### 4. A sessao nao sobe sozinha apos reinicio do container (RESOLVIDO SO POR HOJE)

Depois de `docker compose up -d --force-recreate openwa-api`, a sessao responde
`status: ready` (estado salvo no banco) mas o envio devolve
`400 Session is not active. Start the session first.` Foi preciso chamar
`POST /api/sessions/{id}/start` a mao.

**Pendente.** A VPS vai reiniciar em algum momento — atualizacao, queda, manutencao
da Hostinger. Quando isso acontecer o Binno para de enviar sem avisar ninguem.
Com cliente pagando, e uma falha silenciosa.

### 5. `relay.binno.pro` nao resolve em DNS (PENDENTE)

Verificado: `binno.pro` resolve (76.76.21.21, Vercel); `relay.binno.pro` retorna
NXDOMAIN. DNS na GoDaddy (`ns19`/`ns20.domaincontrol.com`).

Nao afeta o envio, que e interno (`http://openwa-api:2785`). Afeta a confirmacao
de entrega: o webhook do OpenWA aponta para `relay.binno.pro/webhook/openwa`, e
sem ele o painel nunca sai de "em envio" mesmo com a mensagem entregue.

A documentacao de 25/08 afirma que o relay subiu com HTTPS valido nesse dominio.
Para o certificado ter sido emitido o registro existia. Algo o removeu depois —
vale descobrir o que, senao volta a cair.

## Estado do repositorio

- `main` = `40d3c5a`, um commit a frente de `origin/main`.
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
