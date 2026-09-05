#!/usr/bin/env bash
# Poe no Cloudflare os tres registos que fazem o binno.pro poder enviar e-mail.
#
# POR QUE ISTO EXISTE COMO SCRIPT, e nao como comandos soltos numa conversa
#
# Em 05/09/2026 descobriu-se por que o e-mail do Binno nunca funcionou: o
# dominio nao tinha NENHUM dos registos que autorizam envio. Sem SPF, sem DKIM,
# sem retorno. Ninguem os criou alguma vez. E o remendo para contornar isso foi
# confirmar contas automaticamente — ou seja, uma conta nasce com o endereco
# dado como confirmado sem ninguem provar ser dono dele.
#
# O dominio ja foi criado no Resend (regiao sa-east-1, a mesma do Supabase). Os
# valores abaixo sao os que o Resend emitiu para ELE; se o dominio for apagado e
# recriado, o DKIM muda e este ficheiro fica desactualizado.
#
# A LIGACAO DO CLOUDFLARE PRECISA DE PODER EDITAR DNS. A primeira tentativa
# falhou com "Authentication failed (code 9106)" em todos os pedidos de DNS,
# enquanto a listagem de zonas funcionava — a credencial ligada lia zonas mas
# nao lhes tocava. Pior: o Composio devolvia `successful: true` com o erro
# aninhado la dentro, entao os tres registos pareceram criados e nao existia
# nenhum. O `dig` no fim deste script e o que nao deixa isso repetir-se.
set -uo pipefail

COMPOSIO="${COMPOSIO:-$HOME/.local/bin/composio}"
ZONA='a321c68cdd6b6127ed373e839fbca582'   # binno.pro
DKIM='p=MIGfMA0GCSqGSIb3DQEBAQUAA4GNADCBiQKBgQDijEogrNZd3x5Km0Pl3fvS20zjC/K+Plh76YSPNsR/01Hf1klLbucXHYXBofcI07fzRXYiBBLSEQzYq57MEvg1s2kjeGNEBFzofmOUugEinYzAzeK2LRAdqERPn4ujmK8ZRMmx1vOlnNBu7AxQxZOUVpSa3utbm5zSmjpd/poXgwIDAQAB'

# NOTA SOBRE OS NOMES DOS CAMPOS: `CREATE_DNS_RECORD` usa `zone_identifier` e
# `LIST_DNS_RECORDS` usa `zone_id`. Nao e gralha; sao mesmo diferentes, e trocar
# um pelo outro da um erro de validacao que nao parece ter nada a ver.
criar() {
  local rotulo="$1" corpo="$2"
  printf '%-30s ' "$rotulo"
  "$COMPOSIO" execute CLOUDFLARE_CREATE_DNS_RECORD -d "$corpo" 2>&1 | python3 -c '
import json, sys
bruto = sys.stdin.read()
try:
    fora = json.loads(bruto)
except Exception:
    print("resposta ilegivel:", bruto[:200]); sys.exit(1)
# O `successful` de fora e do Composio; o `success` de dentro e do Cloudflare.
# So o de dentro diz se o registo existe.
dentro = fora.get("data") or {}
if dentro.get("success"):
    r = dentro.get("result") or {}
    print("criado", r.get("type", ""), r.get("name", ""))
else:
    erros = dentro.get("errors") or fora.get("error") or "sem detalhe"
    print("FALHOU ->", str(erros)[:180]); sys.exit(1)
'
}

criar 'DKIM  TXT resend._domainkey' "{\"zone_identifier\":\"$ZONA\",\"type\":\"TXT\",\"name\":\"resend._domainkey\",\"content\":\"$DKIM\",\"ttl\":1}"
criar 'SPF   TXT send'              "{\"zone_identifier\":\"$ZONA\",\"type\":\"TXT\",\"name\":\"send\",\"content\":\"v=spf1 include:amazonses.com ~all\",\"ttl\":1}"
criar 'RETORNO MX send'             "{\"zone_identifier\":\"$ZONA\",\"type\":\"MX\",\"name\":\"send\",\"content\":\"feedback-smtp.sa-east-1.amazonses.com\",\"priority\":10,\"ttl\":1}"

echo
echo 'A confirmar no DNS publico, que e o unico juiz:'
sleep 10
falta=0
for alvo in 'TXT resend._domainkey.binno.pro' 'TXT send.binno.pro' 'MX send.binno.pro'; do
  tipo="${alvo%% *}"; nome="${alvo#* }"
  printf '  %-4s %-32s ' "$tipo" "$nome"
  resposta="$(dig +short @1.1.1.1 "$tipo" "$nome" | head -1)"
  if [ -n "$resposta" ]; then echo "responde"; else echo 'AINDA NADA'; falta=1; fi
done

if [ "$falta" -eq 1 ]; then
  echo
  echo 'Um ou mais registos nao respondem. Pode ser propagacao (dar 2 minutos e'
  echo 'repetir) ou a credencial do Cloudflare sem permissao de DNS.'
  exit 1
fi

echo
echo 'Os tres respondem. Falta so o Resend reconhecer:'
echo "  $COMPOSIO execute RESEND_VERIFY_DOMAIN -d '{\"domain_id\":\"ac23f4ac-4e21-4250-bf81-da5117cd164a\"}'"
