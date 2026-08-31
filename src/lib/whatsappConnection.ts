/**
 * O que o Binno pode honestamente afirmar sobre a ligação do WhatsApp.
 *
 * Decisão de Marcelo em 31/08/2026: a ligação do WhatsApp vira um teste só, e
 * depois de o teste passar a tela mostra apenas que a ligação está ativa e um
 * botão para refazer o teste. A parte difícil não é o desenho, é descobrir o
 * que o código sabe de facto:
 *
 * - `useLocalWhatsApp` consulta a sessão local do piloto OpenWA, e o próprio
 *   hook desliga-se fora de `import.meta.env.DEV`. Em produção devolve sempre
 *   "indisponível", então nunca pode servir de prova de ligação.
 * - O backend responder ao pedido de preferências prova que a função
 *   `whatsapp-notifications` está de pé. Não prova nada sobre WhatsApp: ela
 *   responde igual com o retransmissor desligado.
 * - O que existe é o estado da mensagem em `whatsapp_outbox`. Ela nasce
 *   `queued`; `claim_whatsapp_outbox` põe em `sending`; o retransmissor grava
 *   `accepted` quando a chamada HTTP ao OpenWA devolveu 2xx com um id de
 *   mensagem; o webhook (`message.ack`) grava `delivered` ou `read`.
 *
 * Esta função é a ÚNICA regra. Ela nasceu com uma segunda ao lado, no
 * componente: um `aceiteLocal ? 'ativa' : lerEstadoDaLigacao(...)` que dava a
 * volta a tudo isto quando o OpenWA local respondia 2xx em `npm run dev`, sem
 * linha nenhuma na outbox. Uma regra honesta com um atalho ao lado é o atalho,
 * não a regra. O atalho foi apagado em 31/08/2026, na auditoria da própria
 * mudança, e o caminho local de desenvolvimento passou a dizer o que sabe
 * ("saiu, sem confirmação") em vez de afirmar o que não sabe.
 *
 * Módulo puro de propósito, sem `@/` e sem Supabase, para
 * `scripts/check-whatsapp-ligacao.mjs` o carregar direto com
 * `node --experimental-strip-types` e provar cada mapeamento executando-o.
 */

/**
 * Os estados de `whatsapp_outbox` que exigem aceitação do outro lado.
 *
 * Sobre `accepted`, com precisão, porque a versão anterior deste comentário e
 * do contrato dizia que ele significava "o retransmissor entregou ao
 * WhatsApp", e isso é mais do que ele prova: `accepted` é gravado quando a
 * chamada HTTP do retransmissor ao OpenWA devolveu 2xx com um id de mensagem
 * (`services/openwa-relay/src/server.mjs`). Uma sessão despareada que ainda
 * responda 200 nesse endpoint seria lida como ligação ativa.
 *
 * Ele fica na lista mesmo assim, e é uma decisão, não um descuido: `delivered`
 * e `read` dependem do webhook `message.ack` estar registado no servidor
 * (`services/openwa-relay/register-webhook.sh`), e sem `accepted` uma
 * instalação sem webhook nunca conseguiria confirmar um teste que funcionou.
 * O risco residual é coberto pela janela de prova abaixo: um `accepted` velho
 * deixa de valer sozinho.
 */
export const ESTADOS_QUE_PROVAM_ENTREGA = ['accepted', 'delivered', 'read'] as const;

/** Os estados terminais de falha: o teste acabou, e acabou mal. */
export const ESTADOS_DE_FALHA = ['failed', 'skipped', 'cancelled'] as const;

/**
 * Por quanto tempo um teste que passou continua a provar alguma coisa.
 *
 * Sem isto, um `delivered` de há seis semanas fazia a tela dizer "ligação
 * ativa" para sempre, mesmo com a sessão do OpenWA despareada no dia seguinte.
 * "Funcionou uma vez" não é "está de pé agora", e a diferença entre as duas é
 * exatamente o tipo de afirmação que a secção 2 do contrato proíbe.
 *
 * Sete dias porque é a cadência do próprio produto: o resumo é semanal. Se
 * passou uma semana sem nenhuma confirmação, o Binno não tem observação
 * nenhuma dessa semana para sustentar a afirmação, e pedir um teste novo custa
 * um toque.
 */
export const JANELA_DE_PROVA_EM_DIAS = 7;

const DIA_EM_MS = 24 * 60 * 60 * 1_000;

export type EstadoDaLigacao = 'sem-teste' | 'a-caminho' | 'ativa' | 'falhou' | 'expirado';

/**
 * A forma do último teste, com os DOIS campos obrigatórios e com os nomes que a
 * linha da outbox já tem em `WhatsAppDelivery`.
 *
 * Obrigatórios de propósito. A primeira versão deste tipo chamava-lhes
 * `atualizadoEm` e deixava-os opcionais, e o componente passava-lhe uma
 * `WhatsAppDelivery`, que traz `updatedAt`. Compilava, porque campo opcional
 * ausente é válido, e a data chegava sempre `undefined`: toda ligação a
 * funcionar era lida como expirada. Com os campos obrigatórios e com o mesmo
 * nome, renomear qualquer um dos dois deixa de compilar em vez de mentir em
 * silêncio.
 */
export type UltimoTesteDeWhatsApp = {
  status: string;
  /** `updated_at` da linha: quando o estado atual foi gravado. */
  updatedAt: string;
} | null | undefined;

/**
 * O estado da ligação, a partir do último teste registado, e de mais nada.
 *
 * `null` (nenhum teste) não é "desligado", é "ainda não testámos": a tela
 * oferece o teste em vez de afirmar que algo está errado.
 */
export const lerEstadoDaLigacao = (
  ultimoTeste: UltimoTesteDeWhatsApp,
  agora: Date = new Date(),
): EstadoDaLigacao => {
  const status = ultimoTeste?.status;
  if (!status) return 'sem-teste';
  if ((ESTADOS_DE_FALHA as readonly string[]).includes(status)) return 'falhou';
  if (!(ESTADOS_QUE_PROVAM_ENTREGA as readonly string[]).includes(status)) return 'a-caminho';

  // Chegou. Falta saber se chegou recentemente o bastante para dizer alguma
  // coisa sobre agora. Sem data legível não dá para mostrar que é recente, e o
  // lado seguro é pedir um teste novo em vez de afirmar.
  const quando = ultimoTeste?.updatedAt ? new Date(ultimoTeste.updatedAt) : null;
  if (!quando || Number.isNaN(quando.getTime())) return 'expirado';
  const idadeEmDias = (agora.getTime() - quando.getTime()) / DIA_EM_MS;
  return idadeEmDias > JANELA_DE_PROVA_EM_DIAS ? 'expirado' : 'ativa';
};
