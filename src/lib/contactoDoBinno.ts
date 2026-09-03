/**
 * Por onde um interessado fala com o Binno.
 *
 * POR QUE ISTO É UM MÓDULO E NÃO UM `href` ESCRITO NA TELA
 *
 * O número aparece em dois sítios com públicos diferentes — a página de vendas
 * e a página do negócio — e vai aparecer em mais. Escrito à mão em cada um,
 * mudar de número (ou passar a usar um número comercial em vez do pessoal) vira
 * uma caça ao `wa.me` pelo repositório, e o que sobra esquecido é sempre o menos
 * visitado. Aqui é uma linha só.
 *
 * QUAL DOS DOIS NÚMEROS, E POR QUÊ (03/09/2026)
 *
 * Marcelo tem dois: o que ENVIA mensagens aos clientes e o de PROSPECTAR. Este
 * é o de prospectar, e a razão é técnica antes de ser de gosto.
 *
 * O número de envio está a caminho de virar API oficial da Meta. Quando for
 * aprovado, deixa de ser um WhatsApp comum: não se conversa a partir dele no
 * aplicativo, tudo passa pela API e por uma caixa própria. Um interessado que
 * escrevesse para lá cairia num número que não foi feito para responder à mão —
 * seria construir para quebrar na aprovação.
 *
 * Somam-se duas razões. Aquele número já foi BLOQUEADO uma vez, em 31/08/2026,
 * por padrão de envio automatizado; juntar-lhe conversas frias de entrada é
 * perder as conversas de venda no próximo bloqueio. E separá-los significa que,
 * se o de envio cair outra vez, o canal de vendas continua vivo.
 *
 * Até 03/09/2026 esta constante tinha o número onde o próprio Marcelo RECEBE os
 * avisos do Binno, lido das preferências dele — o único que o sistema conhecia
 * quando o botão nasceu, e nenhum dos dois que ele usa para trabalhar.
 */
export const WHATSAPP_DO_BINNO = '5579981418956';

/**
 * O texto que já vai escrito na conversa.
 *
 * Ele diz DE ONDE a pessoa veio, e é isso que o torna útil: uma mensagem que só
 * diz "olá" obriga a perguntar de volta. Sabendo a origem, a primeira resposta
 * já pode ser a certa — e numa prospecção isso é a diferença entre uma conversa
 * e um "quem fala?".
 */
export const linkDoWhatsAppDoBinno = (mensagem: string): string => {
  const limpa = mensagem.replace(/\s+/g, ' ').trim();
  const base = `https://wa.me/${WHATSAPP_DO_BINNO}`;
  return limpa ? `${base}?text=${encodeURIComponent(limpa)}` : base;
};
