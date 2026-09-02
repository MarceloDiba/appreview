/**
 * O relatório da semana, escrito uma vez e servido em dois formatos.
 *
 * POR QUE ESTE FICHEIRO EXISTE
 *
 * Até 02/09/2026 o resumo semanal era montado dentro do próprio
 * `materialize-whatsapp-notifications`, numa função de trinta linhas que só
 * sabia escrever mensagem curta. Quando o e-mail entrou como canal, havia duas
 * saídas possíveis: escrever um segundo compositor só para o e-mail, ou tirar o
 * primeiro de dentro do materializador e fazer os dois nascerem do mesmo sítio.
 *
 * Duas composições separadas divergem na primeira vez que alguém mexe numa
 * delas, e a divergência é invisível: o dono recebe uma nota por WhatsApp e
 * outra por e-mail, e ninguém descobre até um cliente perguntar. Por isso há um
 * compositor só, que lê o retrato da coleta e devolve as duas formas do MESMO
 * conteúdo.
 *
 * NÃO IMPORTA NADA, DE PROPÓSITO
 *
 * Sem `import`, este ficheiro corre tal e qual dentro do Deno e dentro do Node.
 * É o que deixa o guarda executar o compositor de verdade, com retratos reais,
 * em vez de procurar palavras no código-fonte. Um guarda que lê o nome de uma
 * função prova que o nome existe; um que a executa prova o que ela faz.
 *
 * O QUE ELE NÃO FAZ
 *
 * Não decide se envia, não sabe para quem, não conhece canal nenhum. Recebe o
 * retrato, devolve texto. Quem envia é o materializador e cada drenador.
 */

export type SemanaDoHistorico = {
  start: string;
  reviewCount: number;
  ratingBreakdown: Record<string, number>;
  ownerReplies: number;
};

export type Relatorio = {
  assunto: string;
  texto: string;
  html: string;
};

export const PAINEL = 'https://binno.pro';
export const PAINEL_DAS_RESPOSTAS = 'https://binno.pro/reviews';

/**
 * Os temas vêm da coleta como identificadores em inglês (`service`, `wait`).
 * O dono lê português. Um tema que não esteja nesta lista é ignorado em vez de
 * aparecer cru: melhor uma secção mais curta do que uma palavra que ele não
 * reconhece no relatório que ele mostra a um cliente.
 */
export const ROTULOS_DOS_TEMAS: Record<string, string> = {
  service: 'Atendimento',
  wait: 'Tempo de espera',
  food: 'Comida',
  cleanliness: 'Limpeza',
  price: 'Preço',
  atmosphere: 'Ambiente',
  delivery: 'Entrega',
};

const objecto = (valor: unknown): Record<string, unknown> | null =>
  valor && typeof valor === 'object' && !Array.isArray(valor) ? valor as Record<string, unknown> : null;

const numero = (valor: unknown): number | null =>
  typeof valor === 'number' && Number.isFinite(valor) ? valor : null;

const frase = (valor: unknown): string | null => {
  if (typeof valor !== 'string') return null;
  const limpo = valor.trim();
  return limpo ? limpo : null;
};

/**
 * O asterisco sai do texto que não é nosso.
 *
 * O corpo em texto usa `*assim*` para negrito, e é o que o WhatsApp desenha e o
 * `telegram-dispatch` converte em `<b>`. Um asterisco vindo do nome do negócio
 * ou da frase de um cliente emparelha com os nossos e põe negrito no sítio
 * errado — ou, no Telegram, faz a mensagem inteira cair para texto simples.
 */
export const semAsterisco = (texto: string): string => texto.replace(/\*/g, '');

/**
 * E no HTML, o que não é nosso não pode abrir etiqueta nenhuma.
 *
 * O nome do negócio vem do Google e o Binno não o escreveu. Escapar antes de
 * compor é a mesma ordem que protege o Telegram: ao contrário, um `<b>` no nome
 * sobreviveria até à caixa de entrada do dono.
 */
export const escaparHtml = (texto: string): string => texto
  .replace(/&/g, '&amp;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;');

const comVirgula = (valor: number, casas = 1): string =>
  valor.toFixed(casas).replace('.', ',');

const plural = (quantidade: number, singular: string, plural_: string): string =>
  `${quantidade} ${quantidade === 1 ? singular : plural_}`;

/**
 * As duas semanas que dá para comparar com honestidade.
 *
 * O histórico traz doze semanas e a última é a semana CORRENTE, ainda a
 * decorrer: compará-la com uma semana inteira diria sempre que o negócio piorou.
 * Por isso a comparação é entre a última semana FECHADA e a anterior a ela.
 *
 * Há uma segunda razão, e é sobre a qualidade do dado. A coleta lê no máximo 50
 * avaliações, as mais recentes. Isso torna as semanas antigas incompletas e as
 * recentes fiáveis — e são exactamente as duas recentes que esta função
 * devolve. Comparar as duas pontas do histórico seria comparar uma amostra
 * cheia com uma cortada.
 */
export const semanasParaComparar = (semanas: SemanaDoHistorico[]): { passada: SemanaDoHistorico; anterior: SemanaDoHistorico } | null => {
  if (!Array.isArray(semanas) || semanas.length < 3) return null;
  return { passada: semanas[semanas.length - 2], anterior: semanas[semanas.length - 3] };
};

/**
 * A média de uma semana, a partir das notas dela.
 *
 * Devolve `null` quando não houve avaliação nenhuma: escrever "média 0,0" numa
 * semana sem avaliações seria dizer ao dono que ele levou zeros.
 */
export const mediaDaSemana = (semana: SemanaDoHistorico): number | null => {
  const notas = semana?.ratingBreakdown;
  if (!notas) return null;
  let soma = 0;
  let total = 0;
  for (const estrela of ['1', '2', '3', '4', '5']) {
    const quantas = numero(notas[estrela]) ?? 0;
    soma += quantas * Number(estrela);
    total += quantas;
  }
  return total ? Math.round((soma / total) * 10) / 10 : null;
};

type Leitura = {
  nome: string;
  nota: number | null;
  total: number | null;
  lidas: number;
  porNota: Record<string, number>;
  semRespostaDoDono: number | null;
  horasParaResponder: number | null;
  temas: Array<{ rotulo: string; contagem: number; sentimento: string }>;
  comparacao: { passada: SemanaDoHistorico; anterior: SemanaDoHistorico } | null;
};

/**
 * Lê o retrato da coleta e devolve só o que o relatório usa.
 *
 * Cada campo é lido com defesa porque o retrato é JSON gravado no banco por uma
 * versão anterior do coletor: um retrato de agosto não tem `insights.history`, e
 * um relatório que rebentasse ao lê-lo deixaria o dono sem relatório nenhum, em
 * silêncio. O que falta vira `null` e a secção correspondente não sai.
 */
export const lerRetrato = (resumo: unknown): Leitura | null => {
  const raiz = objecto(resumo);
  if (!raiz) return null;
  const negocio = objecto(raiz.business);
  const amostra = objecto(raiz.sample);
  const nome = frase(negocio?.name);
  if (!nome) return null;

  const insights = objecto(amostra?.insights);
  const historico = objecto(insights?.history);
  const semanas = Array.isArray(historico?.weeks) ? historico.weeks : [];
  const porNota = objecto(amostra?.ratingBreakdown) || {};
  const lidas = numero(amostra?.reviewCount) ?? 0;
  const respondidas = numero(amostra?.ownerRepliesFound);

  const temas = (Array.isArray(insights?.topics) ? insights.topics : [])
    .map((item) => objecto(item))
    .filter((item): item is Record<string, unknown> => item !== null)
    .map((item) => ({
      rotulo: ROTULOS_DOS_TEMAS[String(item.id)] || '',
      contagem: numero(item.count) ?? 0,
      sentimento: String(item.sentiment ?? 'mixed'),
    }))
    .filter((tema) => tema.rotulo !== '' && tema.contagem > 0);

  return {
    nome: semAsterisco(nome),
    nota: numero(negocio?.googleRating),
    total: numero(negocio?.googleReviewCount),
    lidas,
    porNota: Object.fromEntries(['1', '2', '3', '4', '5'].map((n) => [n, numero(porNota[n]) ?? 0])),
    semRespostaDoDono: respondidas === null ? null : Math.max(0, lidas - respondidas),
    horasParaResponder: numero(insights?.averageResponseHours),
    temas,
    comparacao: semanasParaComparar(semanas as SemanaDoHistorico[]),
  };
};

/**
 * A frase da semana: o que mudou, e não o que existe.
 *
 * Marcelo perguntou em 31/08/2026 qual era o período da análise, e a resposta
 * honesta era que não havia nenhum — a mensagem dizia "resumo" e enviava o
 * estado do instante. Desde que o histórico por semana passou a viajar no
 * retrato, há duas janelas fechadas para comparar, e a palavra passou a ser
 * verdadeira.
 */
export const fraseDaSemana = (comparacao: Leitura['comparacao']): string | null => {
  if (!comparacao) return null;
  const { passada, anterior } = comparacao;
  const agora = numero(passada?.reviewCount) ?? 0;
  const antes = numero(anterior?.reviewCount) ?? 0;
  if (agora === 0 && antes === 0) {
    return 'Nenhuma avaliação nova nas duas últimas semanas. É aqui que o convite faz diferença.';
  }
  if (agora > antes) {
    return `${plural(agora, 'avaliação nova', 'avaliações novas')} na semana passada, contra ${antes} na anterior.`;
  }
  if (agora < antes) {
    return `${plural(agora, 'avaliação nova', 'avaliações novas')} na semana passada, contra ${antes} na anterior.`;
  }
  return `${plural(agora, 'avaliação nova', 'avaliações novas')} na semana passada, o mesmo da anterior.`;
};

const setaDaSemana = (comparacao: Leitura['comparacao']): string => {
  if (!comparacao) return '📈';
  const agora = numero(comparacao.passada?.reviewCount) ?? 0;
  const antes = numero(comparacao.anterior?.reviewCount) ?? 0;
  if (agora > antes) return '📈';
  if (agora < antes) return '📉';
  return '➡️';
};

/**
 * A chamada para agir, escolhida pelo que o dono pode fazer HOJE.
 *
 * O relatório serve para vender e para aumentar avaliações, por esta ordem de
 * prioridade: se há avaliações à espera de resposta, responder é o passo com
 * retorno imediato; se não há, o passo é convidar. Nunca sai um relatório sem
 * um passo, porque um relatório sem passo é um extracto bancário.
 */
export const passoDaSemana = (leitura: Leitura): { titulo: string; detalhe: string; link: string } => {
  if (leitura.semRespostaDoDono !== null && leitura.semRespostaDoDono > 0) {
    return {
      titulo: `Responder ${plural(leitura.semRespostaDoDono, 'avaliação', 'avaliações')}`,
      detalhe: 'O Binno escreve o rascunho a partir do que o cliente disse. Você lê, ajusta se quiser, e publica.',
      link: PAINEL_DAS_RESPOSTAS,
    };
  }
  return {
    titulo: 'Convidar quem já foi atendido',
    detalhe: 'Todas as avaliações lidas já têm resposta sua. O passo seguinte é pedir avaliação a quem passou pela loja esta semana.',
    link: PAINEL_DAS_RESPOSTAS,
  };
};

const BARRA_LARGURA = 10;

const barraDeTexto = (quantas: number, maior: number): string => {
  if (maior <= 0) return '';
  const cheias = Math.max(quantas > 0 ? 1 : 0, Math.round((quantas / maior) * BARRA_LARGURA));
  return '▇'.repeat(cheias);
};

/**
 * A versão curta, para WhatsApp e Telegram.
 *
 * Cabe num ecrã de telemóvel, usa `*negrito*` (que o WhatsApp desenha e o
 * `telegram-dispatch` converte para HTML) e acaba sempre no link do painel.
 * Os emojis são MARCADORES e não enfeite: cada um abre uma parte que o dono
 * pode querer sem ler tudo. Pedido por Marcelo em 01/09/2026.
 */
export const textoDoRelatorio = (leitura: Leitura): string => {
  const linhas: string[] = [`🏪 *${leitura.nome}*`, ''];
  if (leitura.nota !== null && leitura.total !== null) {
    linhas.push(`⭐ *Nota atual: ${comVirgula(leitura.nota)}*`);
    linhas.push(`${plural(leitura.total, 'avaliação', 'avaliações')} no total, hoje.`);
  }
  const semana = fraseDaSemana(leitura.comparacao);
  if (semana) {
    linhas.push('');
    linhas.push(`${setaDaSemana(leitura.comparacao)} ${semana}`);
  }
  if (leitura.semRespostaDoDono !== null && leitura.semRespostaDoDono > 0) {
    linhas.push('');
    linhas.push(`✍️ *${plural(leitura.semRespostaDoDono, 'avaliação', 'avaliações')}* ainda sem resposta sua.`);
  }
  if (leitura.temas.length) {
    linhas.push('');
    linhas.push(`💬 Os clientes repetem: ${leitura.temas.slice(0, 3).map((tema) => semAsterisco(tema.rotulo)).join(', ')}.`);
  }
  linhas.push('');
  linhas.push(`👉 ${PAINEL}`);
  return linhas.join('\n');
};

/**
 * A paleta.
 *
 * `marca` e o azul do painel e do binno.pro. O relatorio e a peca do produto
 * que o dono mais mostra a outra pessoa, e uma cor que nao e a da casa faz
 * parecer que veio de outro sitio.
 *
 * `boa` e `ma` sao SEMANTICAS e nao decorativas: dizem se uma nota e alta ou
 * baixa. Ficam separadas da cor da marca de proposito — se as barras usassem o
 * azul, deixariam de dizer alguma coisa e passariam a enfeitar.
 */
const CORES = {
  tinta: '#111827',
  suave: '#6b7280',
  linha: '#e5e7eb',
  fundo: '#f6f7f9',
  papel: '#ffffff',
  marca: '#2457D6',
  boa: '#0f766e',
  ma: '#b91c1c',
};

const barraHtml = (estrela: string, quantas: number, maior: number): string => {
  const largura = maior > 0 ? Math.max(quantas > 0 ? 3 : 0, Math.round((quantas / maior) * 100)) : 0;
  const cor = Number(estrela) >= 4 ? CORES.boa : Number(estrela) <= 2 ? CORES.ma : CORES.suave;
  return `<tr>
  <td style="padding:3px 8px 3px 0;font:13px/1.4 -apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;color:${CORES.suave};white-space:nowrap;">${estrela} ★</td>
  <td style="padding:3px 0;width:100%;">
    <div style="background:${CORES.linha};border-radius:3px;height:8px;">
      <div style="background:${cor};border-radius:3px;height:8px;width:${largura}%;"></div>
    </div>
  </td>
  <td style="padding:3px 0 3px 8px;font:13px/1.4 -apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;color:${CORES.tinta};text-align:right;white-space:nowrap;">${quantas}</td>
</tr>`;
};

/**
 * A versão longa, para e-mail.
 *
 * É aqui que o e-mail ganha do WhatsApp: as barras por nota, os temas e a
 * comparação da semana não cabem numa mensagem de telemóvel sem virar um bloco
 * de texto. O HTML é de tabela e com estilo em linha porque é isso que o Gmail,
 * o Outlook e o Apple Mail desenham igual — folha de estilo separada e
 * `flex`/`grid` são descartados por metade dos leitores de e-mail.
 */
export const htmlDoRelatorio = (leitura: Leitura): string => {
  const nome = escaparHtml(leitura.nome);
  const passo = passoDaSemana(leitura);
  const semana = fraseDaSemana(leitura.comparacao);
  const maior = Math.max(...['1', '2', '3', '4', '5'].map((n) => leitura.porNota[n] || 0), 0);
  const blocos: string[] = [];

  if (leitura.nota !== null && leitura.total !== null) {
    blocos.push(`<tr><td style="padding:0 24px 4px;">
  <div style="font:600 40px/1.1 -apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;color:${CORES.tinta};">${comVirgula(leitura.nota)} <span style="font-size:22px;color:${CORES.suave};">★</span></div>
  <div style="font:14px/1.5 -apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;color:${CORES.suave};padding-top:4px;">${plural(leitura.total, 'avaliação', 'avaliações')} no Google, hoje.</div>
</td></tr>`);
  }

  if (semana) {
    blocos.push(`<tr><td style="padding:16px 24px 0;">
  <div style="background:${CORES.fundo};border-radius:8px;padding:14px 16px;font:15px/1.5 -apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;color:${CORES.tinta};">${setaDaSemana(leitura.comparacao)} ${escaparHtml(semana)}</div>
</td></tr>`);
  }

  if (maior > 0) {
    const media = leitura.comparacao ? mediaDaSemana(leitura.comparacao.passada) : null;
    blocos.push(`<tr><td style="padding:24px 24px 0;">
  <div style="font:600 13px/1.4 -apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;color:${CORES.suave};letter-spacing:.06em;text-transform:uppercase;padding-bottom:10px;">Cada nota separada</div>
  <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="width:100%;">${['5', '4', '3', '2', '1'].map((n) => barraHtml(n, leitura.porNota[n] || 0, maior)).join('')}</table>
  <div style="font:13px/1.5 -apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;color:${CORES.suave};padding-top:10px;">Nas ${leitura.lidas} avaliações mais recentes que o Binno leu${media !== null ? `. Média da semana passada: ${comVirgula(media)}` : ''}.</div>
</td></tr>`);
  }

  if (leitura.temas.length) {
    const itens = leitura.temas.slice(0, 6).map((tema) => {
      const cor = tema.sentimento === 'negative' ? CORES.ma : tema.sentimento === 'positive' ? CORES.boa : CORES.suave;
      return `<span style="display:inline-block;border:1px solid ${CORES.linha};border-left:3px solid ${cor};border-radius:6px;padding:6px 10px;margin:0 6px 6px 0;font:14px/1.2 -apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;color:${CORES.tinta};">${escaparHtml(tema.rotulo)} <span style="color:${CORES.suave};">${tema.contagem}</span></span>`;
    }).join('');
    blocos.push(`<tr><td style="padding:24px 24px 0;">
  <div style="font:600 13px/1.4 -apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;color:${CORES.suave};letter-spacing:.06em;text-transform:uppercase;padding-bottom:10px;">O que os clientes repetem</div>
  ${itens}
</td></tr>`);
  }

  if (leitura.horasParaResponder !== null) {
    blocos.push(`<tr><td style="padding:24px 24px 0;">
  <div style="font:14px/1.5 -apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;color:${CORES.suave};">Você costuma responder em <strong style="color:${CORES.tinta};">${comVirgula(leitura.horasParaResponder)} horas</strong>.</div>
</td></tr>`);
  }

  blocos.push(`<tr><td style="padding:28px 24px 8px;">
  <div style="border-top:1px solid ${CORES.linha};padding-top:20px;">
    <div style="font:600 18px/1.3 -apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;color:${CORES.tinta};">${escaparHtml(passo.titulo)}</div>
    <div style="font:15px/1.6 -apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;color:${CORES.suave};padding:6px 0 16px;">${escaparHtml(passo.detalhe)}</div>
    <a href="${passo.link}" style="display:inline-block;background:${CORES.marca};color:#ffffff;text-decoration:none;border-radius:8px;padding:12px 20px;font:600 15px/1 -apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;">Abrir o painel</a>
  </div>
</td></tr>`);

  return `<!doctype html>
<html lang="pt"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${nome} no Google</title></head>
<body style="margin:0;padding:0;background:${CORES.fundo};">
<div style="display:none;max-height:0;overflow:hidden;opacity:0;">${escaparHtml(semana || `${nome} no Google`)}</div>
<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="width:100%;background:${CORES.fundo};">
<tr><td align="center" style="padding:24px 12px;">
<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="width:100%;max-width:560px;background:${CORES.papel};border-radius:12px;border:1px solid ${CORES.linha};">
<tr><td style="padding:24px 24px 0;">
  <div style="font:600 13px/1.4 -apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;color:${CORES.marca};letter-spacing:.08em;text-transform:uppercase;">Binno Maps · sua semana no Google</div>
  <div style="font:600 22px/1.3 -apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;color:${CORES.tinta};padding-top:8px;">${nome}</div>
</td></tr>
${blocos.join('\n')}
<tr><td style="padding:20px 24px 24px;">
  <div style="font:12px/1.6 -apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;color:${CORES.suave};border-top:1px solid ${CORES.linha};padding-top:14px;">
    Você recebe este relatório porque ligou os avisos do Binno no painel. Para trocar o canal ou parar de receber, abra <a href="${PAINEL}" style="color:${CORES.marca};">binno.pro</a>.
  </div>
</td></tr>
</table>
</td></tr>
</table>
</body></html>`;
};

/**
 * O assunto diz o que mudou, e não "Relatório semanal".
 *
 * Um assunto genérico é o que faz o dono não abrir a partir da terceira semana.
 * O que faz abrir é o número: a nota, ou quantas avaliações chegaram.
 */
export const assuntoDoRelatorio = (leitura: Leitura): string => {
  const novas = leitura.comparacao ? (numero(leitura.comparacao.passada?.reviewCount) ?? 0) : null;
  if (novas !== null && novas > 0) {
    return `${leitura.nome}: ${plural(novas, 'avaliação nova', 'avaliações novas')} na semana`;
  }
  if (leitura.semRespostaDoDono !== null && leitura.semRespostaDoDono > 0) {
    return `${leitura.nome}: ${plural(leitura.semRespostaDoDono, 'avaliação', 'avaliações')} à espera de resposta`;
  }
  if (leitura.nota !== null) {
    return `${leitura.nome}: nota ${comVirgula(leitura.nota)} no Google`;
  }
  return `${leitura.nome} no Google`;
};

/**
 * A porta de entrada. Devolve `null` quando o retrato não dá para ler, e quem
 * chama não enfileira nada: um relatório vazio na caixa de entrada do dono é
 * pior do que nenhum relatório.
 */
export const relatorioSemanal = (resumo: unknown): Relatorio | null => {
  const leitura = lerRetrato(resumo);
  if (!leitura) return null;
  return {
    assunto: assuntoDoRelatorio(leitura),
    texto: textoDoRelatorio(leitura),
    html: htmlDoRelatorio(leitura),
  };
};
