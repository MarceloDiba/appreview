/**
 * O que o Binno guarda no navegador, e de quem é.
 *
 * O QUE ACONTECEU EM 04/09/2026
 *
 * O Marcelo entrou numa conta NOVA, recém-criada, sem nenhuma ligação ao
 * Google. O painel mostrou-lhe as avaliações da Noá: os nomes dos clientes, os
 * textos, as notas, e um rascunho assinado "Noá Agência Digital". Nada disso
 * veio do servidor — a conta nova tem zero linhas em
 * `google_business_reviews`. Veio do próprio aparelho.
 *
 * As quatro chaves abaixo eram literais fixas, sem o dono dentro. Quem entrava
 * a seguir no mesmo navegador lia o que o anterior tinha deixado. Num
 * computador de agência, numa máquina de demonstração, num aparelho
 * emprestado, um cliente via os dados de outro — e o painel deixava-o agir
 * sobre eles.
 *
 * POR QUE APAGAR, E NÃO GUARDAR UMA CHAVE POR DONO
 *
 * Guardar por dono corrigiria a leitura, mas deixaria os dados do cliente
 * anterior no disco de quem quer que seja o dono do computador — só que com
 * outro nome. Num aparelho partilhado, o que se quer é que os dados de quem
 * saiu não fiquem lá.
 *
 * E há uma razão prática igualmente forte: estas chaves são lidas e escritas
 * por uma dúzia de componentes. Uma porta só, aqui, não pode ser esquecida
 * pelo décimo terceiro componente que apareça; passar o dono a todos eles,
 * sim.
 *
 * O que se perde é um cache de dados públicos com 14 dias de validade, que se
 * refaz com um clique. Não há aqui nada que só exista no navegador.
 */

/** Onde fica escrito de quem é este aparelho, para se saber quando muda. */
const DONO_DESTE_APARELHO = 'binno.dono-deste-aparelho';

/**
 * Tudo o que é de UMA conta e não do aparelho.
 *
 * O idioma escolhido e o tema NÃO entram aqui: são preferências de quem usa o
 * computador, não dados de um negócio, e apagá-los seria só irritante.
 */
export const CHAVES_DE_UMA_CONTA = [
  // As avaliações do Google lidas do perfil: nomes públicos, textos, links.
  'binno.experimental-apify-snapshot',
  // Quais avaliações este dono já tratou.
  'binno.approved-cockpit-actions.v2',
  // Preferências de aviso, incluindo o telefone para onde o Binno escreve.
  'binno.local-whatsapp-preferences',
  'binno.local-whatsapp-advisor-deliveries',
] as const;

const apagarTudoDaContaAnterior = () => {
  for (const chave of CHAVES_DE_UMA_CONTA) window.localStorage.removeItem(chave);
};

/**
 * Diz de quem é este aparelho agora, e apaga o que era do dono anterior.
 *
 * `null` significa "ninguém está autenticado": também apaga, porque sair da
 * sessão não pode deixar os dados do negócio à espera do próximo.
 *
 * Um aparelho sem dono escrito — o caso de todos os navegadores no primeiro
 * carregamento depois desta correcção — conta como dono diferente. É de
 * propósito: é isso que limpa os dados que já lá estão hoje, na primeira vez
 * que cada pessoa abre o painel.
 */
export const oAparelhoAgoraEDe = (userId: string | null) => {
  if (typeof window === 'undefined') return;
  try {
    const anterior = window.localStorage.getItem(DONO_DESTE_APARELHO);
    if (anterior === userId) return;
    apagarTudoDaContaAnterior();
    if (userId) window.localStorage.setItem(DONO_DESTE_APARELHO, userId);
    else window.localStorage.removeItem(DONO_DESTE_APARELHO);
  } catch {
    // Um navegador que recusa `localStorage` (janela anónima, armazenamento
    // bloqueado) não tem nada guardado para vazar. Falhar aqui em silêncio é
    // seguro; deixar a excepção subir partiria o arranque da aplicação.
  }
};
