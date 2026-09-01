# OpenWA no Binno: relé de piloto, não canal de produção

**Fotografia:** 21 de agosto de 2026.
**Decisão técnica:** usar OpenWA apenas para validar a utilidade dos alertas e
resumos do Binno com um número consentido. Ele não será apresentado como canal
de entrega recorrente nem como a infraestrutura definitiva do produto.

## O que o OpenWA permite

O projeto oferece sessões de WhatsApp, API HTTP autenticada por chave, envio de
texto, webhooks, estados de entrega e múltiplas sessões. A própria documentação
avisa que é uma integração não oficial baseada em clientes reversos do WhatsApp
e que existe risco não nulo de restrição ou banimento do número.

Fontes primárias:

- [README e limites do OpenWA](https://github.com/rmyndharis/OpenWA)
- [API e arquitetura do OpenWA](https://github.com/rmyndharis/OpenWA/tree/main/docs)

## Arquitetura recomendada para o piloto

```text
Binno (evento elegível e consentido)
        |
        v
outbox do Binno, com idempotência e auditoria
        |
        v
relé interno do piloto, autenticado e restrito por sessão
        |
        v
OpenWA em servidor privado, número dedicado do piloto
        |
        v
WhatsApp do gestor consentido
```

### Regras do relé

1. Um número dedicado por piloto ou pela operação NOÁ. Nunca conectar o número
   pessoal ou comercial principal de um cliente.
2. Uma sessão OpenWA explicitamente vinculada a esse número. Não compartilhar
   sessão ou chave entre clientes.
3. A API OpenWA fica privada, atrás de rede e autenticação. A aplicação web
   Binno nunca recebe a chave e não chama OpenWA diretamente.
4. O Binno cria um registro de outbox antes do envio: negócio, evento, versão
   do consentimento, tipo de mensagem, destinatário normalizado, conteúdo,
   idempotency key, data e estado.
5. O relé aceita somente uma mensagem já registrada e elegível. Na primeira
   fase, o disparo continua manual e confirmado por operador.
6. A confirmação do OpenWA é gravada como "aceito pelo relé". Entregue e lido
   só podem ser chamados assim se o webhook correspondente for recebido e
   validado.
7. Sem reenvio automático, envio em massa, importação de conversas ou agenda
   até haver opt-out, limites, observabilidade e operação responsável.

## Escopo de validação que faz sentido agora

- Um alerta de anomalia com evidência e ação sugerida.
- Um resumo semanal configurado pelo gestor.
- Uma oportunidade positiva baseada em avaliações reais.
- Confirmação manual de que a mensagem chegou ao número de teste.

Isso testa se o gestor percebe valor sem fingir que o canal já é uma operação
confiável de SaaS.

## Linha de corte para produção

Antes de vender notificações recorrentes, substituir o relé por WhatsApp
Business Platform oficial ou um fornecedor homologado. O motivo não é apenas
política: é disponibilidade, limites, templates, tratamento de falhas,
consentimento, opt-out, governança de dados e suporte operacional.

O OpenWA pode continuar como ambiente interno de experimentação, desde que
isolado, sem dados de clientes não consentidos e com um número que a operação
possa perder sem afetar o negócio.
