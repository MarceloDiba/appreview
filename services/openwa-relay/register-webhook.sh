#!/usr/bin/env bash
set -euo pipefail

cd /opt/binno/openwa
api_key="$(docker compose exec -T openwa-api cat /app/data/.api-key </dev/null)"
session_id="$(cat .binno-session-id)"
webhook_secret="$(cat /opt/binno/relay/.openwa-webhook-secret)"
hooks="$(curl -fsS -H "X-API-Key: $api_key" "http://127.0.0.1:2785/api/sessions/$session_id/webhooks")"
webhook_id="$(printf '%s' "$hooks" | jq -r '.[] | select(.url == "https://relay.binno.pro/webhook/openwa") | .id' | head -n1)"

if [ -z "$webhook_id" ] || [ "$webhook_id" = null ]; then
  payload="$(jq -nc --arg url "https://relay.binno.pro/webhook/openwa" --arg secret "$webhook_secret" '{url:$url,secret:$secret,events:["message.ack","message.failed"],retryCount:3}')"
  webhook_id="$(curl -fsS -X POST -H "X-API-Key: $api_key" -H "Content-Type: application/json" --data "$payload" "http://127.0.0.1:2785/api/sessions/$session_id/webhooks" | jq -r .id)"
fi

test_result="$(curl -fsS -X POST -H "X-API-Key: $api_key" "http://127.0.0.1:2785/api/sessions/$session_id/webhooks/$webhook_id/test")"
printf '%s' "$test_result" | jq '{success, statusCode, error}'
curl -fsS -H "X-API-Key: $api_key" "http://127.0.0.1:2785/api/sessions/$session_id/webhooks" | jq 'map({id,url,events,active,retryCount})'
