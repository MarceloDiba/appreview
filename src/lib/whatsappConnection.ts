/**
 * O que o Binno pode honestamente afirmar sobre a ligação do WhatsApp.
 *
 * Decisão de Marcelo em 31/08/2026: a ligação do WhatsApp vira um teste só, e
 * depois de o teste passar a tela mostra apenas que a ligação está ativa e um
 * botão para refazer o teste. Antes de escrever esse estado foi preciso ver
 * como o código sabe que uma ligação existe. Sabe assim, e só assim:
 *
 * - `useLocalWhatsApp` consulta a sessão local do piloto OpenWA, e o próprio
 *   hook desliga-se fora de `import.meta.env.DEV`. Em produção ele devolve
 *   sempre "indisponível", então nunca pode servir de prova de ligação.
 * - O backend responder ao pedido de preferências (`getWhatsAppDeliveryState`)
 *   prova que a função `whatsapp-notifications` está de pé. Não prova nada
 *   sobre WhatsApp: ela responde igual com o retransmissor desligado.
 * - O que existe de verdade é o estado da mensagem em `whatsapp_outbox`. Ela
 *   nasce `queued`; `claim_whatsapp_outbox` põe em `sending`; o retransmissor
 *   grava `accepted` quando o OpenWA aceitou a mensagem, e o webhook grava
 *   `delivered` ou `read` quando o WhatsApp confirmou. `failed` é a falha.
 *
 * Daí a regra: só `accepted`, `delivered` e `read` provam que existe uma
 * ligação, porque só esses três exigem que alguém do outro lado tenha aceitado
 * a mensagem. `queued` e `sending` provam que o Binno guardou a intenção, o
 * que é exatamente o que ele faria com o WhatsApp desligado.
 *
 * Módulo puro de propósito, sem `@/` e sem Supabase, para
 * `scripts/check-whatsapp-ligacao.mjs` o carregar direto com
 * `node --experimental-strip-types` e provar cada mapeamento executando-o.
 */

/** Os estados de `whatsapp_outbox` que exigem aceitação do outro lado. */
export const ESTADOS_QUE_PROVAM_ENTREGA = ['accepted', 'delivered', 'read'] as const;

/** Os estados terminais de falha: o teste acabou, e acabou mal. */
export const ESTADOS_DE_FALHA = ['failed', 'skipped', 'cancelled'] as const;

export type EstadoDaLigacao = 'sem-teste' | 'a-caminho' | 'ativa' | 'falhou';

/**
 * O estado da ligação, a partir do estado da última mensagem de teste.
 *
 * `null` (nenhum teste registado) não é "desligado", é "ainda não testámos": a
 * tela oferece o teste em vez de afirmar que algo está errado.
 */
export const lerEstadoDaLigacao = (statusDoUltimoTeste: string | null | undefined): EstadoDaLigacao => {
  if (!statusDoUltimoTeste) return 'sem-teste';
  if ((ESTADOS_QUE_PROVAM_ENTREGA as readonly string[]).includes(statusDoUltimoTeste)) return 'ativa';
  if ((ESTADOS_DE_FALHA as readonly string[]).includes(statusDoUltimoTeste)) return 'falhou';
  return 'a-caminho';
};
