#!/usr/bin/env bash
# Poe no Cloudflare os tres registos que fazem o binno.pro poder enviar e-mail.
#
# POR QUE ISTO EXISTE
#
# Em 05/09/2026 descobriu-se por que o e-mail do Binno nunca funcionou: o
# dominio nao tinha NENHUM dos registos que autorizam envio. Sem SPF, sem DKIM,
# sem retorno. Ninguem os criou alguma vez. O remendo para contornar isso foi
# confirmar contas automaticamente — uma conta nasce com o endereco dado como
# confirmado sem ninguem provar ser dono dele, e foi por causa desse remendo
# que o `reclamar_compra` deixou de aceitar e-mail como prova de compra.
#
# O DNS NAO ESTA NO GODADDY. O `~/CLAUDE.md` diz GoDaddy; os nameservers de
# binno.pro respondem `sergi.ns.cloudflare.com` e `deborah.ns.cloudflare.com`.
# O GoDaddy e o registador, a Cloudflare e que serve o DNS.
#
# POR QUE FALA COM A CLOUDFLARE DIRECTAMENTE, E NAO PELO COMPOSIO
#
# A primeira versao usava o Composio e falhava em TODOS os pedidos de DNS com
# "Authentication failed (code 9106)" — que na Cloudflare quer dizer que os
# cabecalhos de autenticacao nao chegaram. Testado com DUAS credenciais
# diferentes, uma delas criada de raiz com `Zone:DNS:Edit`:
#
#   LIST_ZONES        ok nas duas
#   LIST_DNS_RECORDS  9106 nas duas
#
# Duas chaves distintas com o mesmo resultado, e a leitura de zonas a funcionar,
# apontam para o conector e nao para a chave. Insistir era gastar o tempo do
# Marcelo a criar tokens que nao iam resolver.
#
# O SEGREDO NAO PASSA PELA CONVERSA. O Marcelo copia o token e corre
#
#   ! pbpaste > ~/.cf-token && chmod 600 ~/.cf-token
#
# O token vai da area de transferencia para o ficheiro sem nunca ser escrito
# numa mensagem. Este script le o ficheiro e nunca o imprime.
set -uo pipefail

FICHEIRO_DO_TOKEN="${CF_TOKEN_FILE:-$HOME/.cf-token}"
ZONA='a321c68cdd6b6127ed373e839fbca582'   # binno.pro
DKIM='p=MIGfMA0GCSqGSIb3DQEBAQUAA4GNADCBiQKBgQDijEogrNZd3x5Km0Pl3fvS20zjC/K+Plh76YSPNsR/01Hf1klLbucXHYXBofcI07fzRXYiBBLSEQzYq57MEvg1s2kjeGNEBFzofmOUugEinYzAzeK2LRAdqERPn4ujmK8ZRMmx1vOlnNBu7AxQxZOUVpSa3utbm5zSmjpd/poXgwIDAQAB'

if [ ! -s "$FICHEIRO_DO_TOKEN" ]; then
  echo "Nao encontrei o token em $FICHEIRO_DO_TOKEN."
  echo 'Copie o token da Cloudflare e corra:  ! pbpaste > ~/.cf-token && chmod 600 ~/.cf-token'
  exit 2
fi
TOKEN="$(tr -d '[:space:]' < "$FICHEIRO_DO_TOKEN")"

# CONFERIR A FORMA ANTES DE PERGUNTAR A CLOUDFLARE. Na primeira tentativa o
# `pbpaste` apanhou outra coisa qualquer que estava na area de transferencia —
# 48 caracteres com espacos no meio — e a Cloudflare respondeu "Invalid format
# for Authorization header", que nao diz a ninguem que o problema foi copiar a
# coisa errada. Um token e 40 caracteres de [A-Za-z0-9_-] e mais nada.
if ! printf '%s' "$TOKEN" | grep -Eq '^[A-Za-z0-9_-]{40}$'; then
  echo "O conteudo de $FICHEIRO_DO_TOKEN nao tem forma de token da Cloudflare."
  echo "  esperado: 40 caracteres, so letras, digitos, _ ou -"
  echo "  recebido: ${#TOKEN} caracteres"
  echo
  echo 'A area de transferencia devia ter o token e tinha outra coisa. Na'
  echo 'Cloudflare, abra o token, clique Roll para gerar um valor novo, copie-o'
  echo 'no momento em que ele aparece (so aparece uma vez) e repita:'
  echo '  ! pbpaste > ~/.cf-token && chmod 600 ~/.cf-token'
  exit 2
fi

api() {
  curl -sS -X "$1" "https://api.cloudflare.com/client/v4/$2" \
    -H "Authorization: Bearer $TOKEN" -H 'Content-Type: application/json' \
    ${3:+--data "$3"}
}

# CONFERIR O TOKEN ANTES DE O USAR, e dizer o que ele pode. Um token sem
# `DNS:Edit` falha registo a registo com uma mensagem que parece de outra coisa;
# perguntar primeiro transforma tres erros confusos num so, claro.
echo 'A conferir o token:'
api GET 'user/tokens/verify' | python3 -c '
import json, sys
d = json.load(sys.stdin)
if d.get("success"):
    print("  valido e activo")
else:
    print("  RECUSADO ->", str(d.get("errors"))[:200]); sys.exit(1)
' || exit 1

criar() {
  local rotulo="$1" corpo="$2"
  printf '%-30s ' "$rotulo"
  api POST "zones/$ZONA/dns_records" "$corpo" | python3 -c '
import json, sys
bruto = sys.stdin.read()
try:
    d = json.loads(bruto)
except Exception:
    print("resposta ilegivel:", bruto[:200]); sys.exit(1)
if d.get("success"):
    r = d.get("result") or {}
    print("criado", r.get("type",""), r.get("name",""))
else:
    erros = d.get("errors") or []
    # 81058 e "ja existe um registo igual". Nao e falha: e o estado desejado.
    if any(e.get("code") == 81058 for e in erros):
        print("ja existia"); sys.exit(0)
    print("FALHOU ->", str(erros)[:200]); sys.exit(1)
'
}

criar 'DKIM  TXT resend._domainkey' "{\"type\":\"TXT\",\"name\":\"resend._domainkey\",\"content\":\"$DKIM\",\"ttl\":1}"
criar 'SPF   TXT send'              '{"type":"TXT","name":"send","content":"v=spf1 include:amazonses.com ~all","ttl":1}'
criar 'RETORNO MX send'             '{"type":"MX","name":"send","content":"feedback-smtp.sa-east-1.amazonses.com","priority":10,"ttl":1}'

# O DNS PUBLICO E O UNICO JUIZ. A resposta da API ja mentiu uma vez hoje: o
# Composio devolvia `successful: true` no nivel de fora com o erro aninhado
# dentro, e eu li "criado" tres vezes sem existir registo nenhum. Perguntar ao
# `dig` e o que nao deixa isso repetir-se.
echo
echo 'A confirmar no DNS publico, que e o unico juiz:'
sleep 10
falta=0
for alvo in 'TXT resend._domainkey.binno.pro' 'TXT send.binno.pro' 'MX send.binno.pro'; do
  tipo="${alvo%% *}"; nome="${alvo#* }"
  printf '  %-4s %-32s ' "$tipo" "$nome"
  if [ -n "$(dig +short @1.1.1.1 "$tipo" "$nome" | head -1)" ]; then echo 'responde'; else echo 'AINDA NADA'; falta=1; fi
done

if [ "$falta" -eq 1 ]; then
  echo
  echo 'Um ou mais nao respondem. Dar dois minutos para propagar e repetir.'
  exit 1
fi

echo
echo 'Os tres respondem. Falta o Resend reconhecer o dominio:'
echo "  ~/.local/bin/composio execute RESEND_VERIFY_DOMAIN -d '{\"domain_id\":\"ac23f4ac-4e21-4250-bf81-da5117cd164a\"}'"
