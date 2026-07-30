# Estado do AppReview — 30 de julho de 2026

Documento de passagem. Quem pegar este projecto lê isto primeiro.

## O que está em produção e verificado

https://appreview-flame.vercel.app

- **Review gating corrigido.** O produto encaminhava nota "Ruim" para um formulário
  interno que dizia "não é publicado", com cadeado, e terminava sem nunca oferecer
  avaliação pública. Corrigido no PR #6 e validado no fluxo real. **A opção pública
  não pode voltar a ser condicionada à nota** — há comentários no código a dizê-lo.
- **Landing** sem métricas inventadas, sem o modelo proibido, preço €49/mês.
- **Dashboard com dados reais** e Central de Atenção (uma prioridade + 4 indicadores,
  calculados só de `internal_feedback`, sem IA e sem dependência externa).
- **Avaliações reais do Google** a funcionar (H5 Texas Burger: 4,8 com 1.585).
- **Fluxo do cliente em PT, ES e EN**, detectado pelo telemóvel do visitante.
- **App 36% mais leve** (666 kB → 425 kB no caminho do cliente).
- **Verificação de tipos obrigatória no CI.** `npm run build` (Vite) NÃO verifica tipos;
  foi o `tsc` que revelou o review gating. Rodar sempre
  `npx tsc --noEmit -p tsconfig.app.json` antes de qualquer deploy.

## Infraestrutura

| | |
|---|---|
| Supabase | `tjbznhwdjyabuacrfqie`, região sa-east-1 (São Paulo), activo |
| Vercel | deploy automático do `main` |
| Google Places | chave existe no segredo do Supabase desde 13/07, a funcionar |
| Edge Functions | `fetch-google-reviews` (produto), `search-prospects` (interno, apagar) |

**Pendência conhecida:** o banco está no Brasil e o piloto é em Lisboa — transferência
internacional de dados sob o RGPD. Marcelo decidiu adiar a mudança para a Europa até
o piloto provar. O risco começa no primeiro cliente real que escrever algo.

## O que falta, por ordem

Ver `memory/appreview-pendencias-produto.md` para o detalhe. Resumo:

1. QR code impresso aponta para endereço inexistente **(a corrigir agora)**
2. QR sem versão para impressão, e dependente de serviço externo **(a corrigir agora)**
3. `/reviews` mostra avaliações inventadas **(a corrigir agora)**
4. "Restaurante Exemplo" no cabeçalho de 4 páginas
5. `/admin` e `/profile` sem ligação ao banco
6. Configurar o Google exige colar URL à mão
7. Sugestões de resposta — não existe
8. Termos e Política de Privacidade — exigência do RGPD
9. Limpar dados de teste do banco
10. Modelo de agência para gerir vários clientes

## Posicionamento — importante

O produto **não é** resgate de nota baixa. É ferramenta de gestão de reputação para
donos que não sabem de tecnologia, e **serve também quem já tem boa nota**. Não é só
restaurante. Ver `memory/appreview-posicionamento-produto.md`.

## Piloto

H5 Texas Burger – Avenida e Mania de Petiscos, ambos em Lisboa, ambos com acesso de
Gestor do Google já nas mãos do Marcelo. Ele está no Brasil (Aracaju) até dezembro,
portanto o arranque é remoto — os donos imprimem e colocam o QR.

## Armadilhas conhecidas

- A documentação original (`appreview-documentacao-completa.pdf`, 13/07) tem **dois
  erros materiais**: diz que o gating foi corrigido, e não tinha sido; e diz que a
  chave do Google era o bloqueio principal, quando já existia. Não confiar sem verificar.
- A migration `20260712_google_reviews_cache_tables.sql` nunca foi guardada no repo.
  As tabelas existem no banco, a receita para as recriar não existe no código.
- Lint tem 6 erros e 10 avisos herdados do projecto Lovable original. Não bloqueiam.
