# Vigia diário — especificação

Escrita pela sessão `Binno - QA` em 05/09/2026, a pedido do Marcelo.
**Quem implementa é o `Binno - Assessor`.** Esta é a medição, não o código.

---

## O que este vigia é, e o que ele não é

**Não é um varredor de segurança.** Rodei o `nuclei` em 05/09 — 2.949 testes,
5.881 requisições — e ele não encontrou **nada** que a passagem à mão não tivesse
encontrado. Scanner genérico conhece software de prateleira; o Binno quase não
tem prateleira.

Os achados que valeram naquele dia — as páginas legais no endereço errado, as
três estrelas já acesas no formulário do cliente, "1 esperando resposta" numa
fila vazia, o webhook sem recibo de entrega — **nenhum** seria apanhado por um
scanner. Todos vieram de comparar o que o produto promete com o que ele faz.

Este vigia cobre outra coisa: **o que muda sozinho, sem ninguém mexer.** É o
espaço entre duas passagens de QA.

---

## As quatro medições

Cada uma tem um PASSA sem ambiguidade. Se o resultado não for exactamente o
PASSA, é falha.

### 1. As portas continuam a recusar

Bater nas 19 funções com a **chave publicável do site** — a mesma que qualquer
visitante baixa no JavaScript — e sem sessão.

```
PASSA: 18 recusam (401, 402, 403 ou 400 de assinatura inválida)
       `comprar` devolve 200 com uma URL de checkout   <- por decisão
FALHA: qualquer outra porta devolver 200
```

Medido em 05/09 às 15:23 UTC: 18 de 19 recusam. É a linha de base.

### 2. Nenhum segredo no pacote publicado

Baixar o `index-*.js` de `binno.pro` e procurar 13 padrões:

```
sk_live_  sk_test_  rk_live_  whsec_  service_role  SUPABASE_SERVICE_ROLE
AIza[...]  apify_api_  sk-proj-  BINNO_WORKER_SECRET  TELEGRAM_BOT_TOKEN
GOOGLE_OAUTH_CLIENT_SECRET  WHATSAPP_CLOUD_API_TOKEN
```

E qualquer JWT (`eyJ...`).

```
PASSA: zero ocorrências dos 13, e zero JWT
FALHA: uma que seja
```

### 3. O que está no ar é o que está no `main`

A classe de erro que mais custou em 05/09, **quatro vezes no mesmo dia**: merge
sem deploy, build falhada em silêncio, commit num ramo descrito como estando no
`main`, conserto pronto e não publicado.

```
PASSA: o hash do pacote servido corresponde à última build do `main`
FALHA: `main` tem commits que não estão no ar
```

### 4. Nenhuma função nova chamável por anónimo

O próprio Supabase já responde isto (`get_advisors`, categoria segurança).

```
PASSA: a lista de funções `security definer` executáveis por `anon`
       é igual à lista conhecida
FALHA: apareceu uma nova
```

A lista conhecida em 05/09: as cinco do `auditoria_pro` (esquema dormente) e a
`get_public_qr_business` (por desenho).

---

## As três regras de construção

Estas não são detalhe de implementação. Cada uma nasceu de um defeito medido em
05/09, e sem elas o vigia parece funcionar e não funciona.

### Regra 1 — um teste que não consegue medir tem de gritar, nunca passar

**É a lição do dia, e apareceu cinco vezes com roupas diferentes:**

- um guarda filtrava `TS2304` e o defeito real saía como `TS2552`
- uma fronteira de recorte usava como marco a frase que o conserto removia
- com o recorte vazio, `!''.includes(...)` passava sempre
- um sinal novo que podia nunca acender era indistinguível de saúde
- uma imagem `lazy` que ninguém rolou lia-se como imagem partida

Todas a mesma frase: **uma verificação que ficou sem o que medir devolve "tudo
bem" em vez de erro.**

Se a rede cair, se `binno.pro` não responder, se o Supabase recusar — o vigia
sai com erro e **diz que não conseguiu medir**. Nunca em silêncio, nunca verde.

### Regra 2 — o aviso só sai quando muda

O contrato já tem esta regra para a área de administrador, e a razão é a mesma:
*"sem isso o Marcelo recebe o mesmo aviso todos os dias até deixar de o ler, e um
aviso que se deixa de ler é pior do que nenhum."*

Mas com a emenda que o próprio contrato faz: **um problema resolvido e voltado
tem de voltar a avisar, no mesmo dia inclusive.**

### Regra 3 — o aviso vai para onde alguém lê

**Telegram**, que funciona e está provado. **Não e-mail.**

Em 05/09 a Vercel mandou quatro avisos de build falhada para o e-mail do
Marcelo. Três continuavam **por ler** horas depois, e o quarto — o da produção
— foi lido depois de o problema já estar consertado. O alarme funcionou e não
serviu para nada.

---

## Cadência

**Uma vez por dia** enquanto não houver cliente pagante. Nada aqui muda de hora
a hora, e correr mais vezes só gasta.

**O gatilho para apertar isto não é o calendário: é o primeiro cliente pagante.**
Aí passa a haver dado de terceiro, dinheiro recorrente e alguém que reclama em
público — e aí vale rever cadência e âmbito.

---

## O que este vigia deliberadamente NÃO faz

- **Não corre scanner genérico.** Medido: não acrescenta nada aqui.
- **Não varre o Supabase.** É infraestrutura de terceiro; mede a plataforma
  deles, não o Binno, e varrer o endereço de um fornecedor pode disparar a
  detecção de abuso — e quem leva o bloqueio é o produto.
- **Não substitui uma passagem de QA.** Guarda apanha regressão do que já se
  sabe; uma passagem apanha o que ninguém pensou em vigiar. As três estrelas
  acesas estavam em produção há semanas e nenhum guarda podia tê-las visto.
