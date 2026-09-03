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
 * O NÚMERO É O DA CONTA DO MARCELO, e isso é uma escolha provisória: é o único
 * que o Binno conhece hoje, lido das preferências de aviso dele. Quando existir
 * um número comercial do Binno, muda-se esta constante e mais nada.
 */
export const WHATSAPP_DO_BINNO = '5579991407447';

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
