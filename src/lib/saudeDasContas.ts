import { supabase } from '@/integrations/supabase/client';

/**
 * A leitura da área de administrador.
 *
 * O QUE ELA NÃO TRAZ, E POR QUÊ
 *
 * Nenhum texto de avaliação, nenhum comentário privado, nenhum nome ou telefone
 * de quem escreveu. Isso foi decidido por Marcelo em 02/09/2026, e a fronteira
 * não é esta tela: é a lista de colunas que `saude_das_contas()` devolve, no
 * banco. Aqui só se lê o que de lá vem — e é por isso que a decisão aguenta,
 * mesmo que alguém reescreva esta página amanhã.
 *
 * A RECUSA É UM ERRO, E NÃO UMA LISTA VAZIA
 *
 * Quem não está em `admins` recebe exceção do Postgres. Se a função devolvesse
 * uma lista vazia, uma pessoa sem permissão olharia para um painel tranquilo e
 * concluiria que está tudo bem — a pior mentira que este produto pode contar,
 * porque ele existe justamente para acabar com o silêncio.
 */
export type SinalDaConta =
  | 'coleta_parada_na_fila'
  | 'nunca_coletou'
  | 'mensagem_falhou'
  | 'fila_presa_no_envio'
  | 'fila_parada_na_saida'
  | 'sem_canal_de_aviso'
  | 'resumo_nao_saiu'
  | 'coleta_antiga';

export type SaudeDaConta = {
  userId: string;
  negocio: string | null;
  emailDaConta: string | null;
  criadaEm: string | null;
  nota: number | null;
  totalDeAvaliacoes: number | null;
  avaliacoesLidas: number | null;
  comentariosPrivados: number;
  filaDeRespostas: number;
  ultimaColetaEm: string | null;
  diasDesdeAColeta: number | null;
  sinais: SinalDaConta[];
  gravidade: 'travado' | 'atencao' | 'ok';
};

/**
 * O que cada sinal quer dizer e o que fazer com ele.
 *
 * O nome técnico (`fila_presa_no_envio`) serve ao banco. Quem lê a página às
 * oito da manhã precisa da frase, e precisa sobretudo do PASSO — um painel que
 * diz "algo está errado" e não diz o que fazer é um alarme de carro.
 */
export const EXPLICACAO_DOS_SINAIS: Record<SinalDaConta, { titulo: string; passo: string }> = {
  coleta_parada_na_fila: {
    titulo: 'Coleta pedida e parada há mais de 30 minutos',
    passo: 'O cadastro pediu a coleta e ela não saiu. Verifique se a automação está ligada.',
  },
  nunca_coletou: {
    titulo: 'Cadastrou e nunca coletou',
    passo: 'A conta tem nome e link do Google, mas nenhum dado. É o pior estado possível: o cliente abre o painel vazio.',
  },
  mensagem_falhou: {
    titulo: 'Mensagem falhou nas últimas 72 horas',
    passo: 'Um aviso não chegou. Veja o canal desta conta antes que ela perca outro.',
  },
  fila_presa_no_envio: {
    titulo: 'Mensagem presa no meio do envio',
    passo: 'Foi reservada para envio e nunca concluiu. O enviador morreu no caminho.',
  },
  fila_parada_na_saida: {
    titulo: 'Mensagem parada na fila há mais de 30 minutos',
    passo: 'Foi enfileirada e não saiu. Normalmente é um canal sem chave ou um segredo faltando.',
  },
  sem_canal_de_aviso: {
    titulo: 'Consentiu receber avisos, mas não tem canal',
    passo: 'Sem Telegram ligado, os avisos dela vão para o WhatsApp — que está bloqueado. Não chegam a lugar nenhum.',
  },
  resumo_nao_saiu: {
    titulo: 'Resumo semanal não saiu',
    passo: 'Passou o dia escolhido e nenhum resumo foi enfileirado nos últimos sete dias.',
  },
  coleta_antiga: {
    titulo: 'Última coleta há mais de 30 dias',
    passo: 'Informação, não problema: hoje só existe a coleta do cadastro, não há coleta recorrente.',
  },
};

type LinhaDaFuncao = {
  user_id: string;
  negocio: string | null;
  email_da_conta: string | null;
  criada_em: string | null;
  nota: number | string | null;
  total_de_avaliacoes: number | null;
  avaliacoes_lidas: number | null;
  comentarios_privados: number | null;
  fila_de_respostas: number | null;
  ultima_coleta_em: string | null;
  dias_desde_a_coleta: number | null;
  sinais: string[] | null;
  gravidade: string | null;
};

export type LeituraDaSaude =
  | { estado: 'ok'; contas: SaudeDaConta[] }
  | { estado: 'sem-permissao' }
  | { estado: 'falhou'; detalhe: string };

export const lerSaudeDasContas = async (): Promise<LeituraDaSaude> => {
  // `as never` porque os tipos gerados do Supabase ainda não conhecem esta
  // função; regenerá-los é um passo à parte, e a forma da resposta está
  // guardada pelo `check-area-de-administrador`, que corre a função de verdade.
  const { data, error } = await supabase.rpc('saude_das_contas' as never);

  if (error) {
    // `42501` é `insufficient_privilege`: é assim que a função recusa quem não
    // é administrador. Qualquer outro erro é uma falha de verdade, e dizer
    // "sem permissão" a uma falha de rede esconderia o problema.
    if (error.code === '42501' || /nao autorizado/i.test(error.message || '')) {
      return { estado: 'sem-permissao' };
    }
    return { estado: 'falhou', detalhe: error.message };
  }

  const linhas = (data || []) as unknown as LinhaDaFuncao[];
  return {
    estado: 'ok',
    contas: linhas.map((linha) => ({
      userId: linha.user_id,
      negocio: linha.negocio,
      emailDaConta: linha.email_da_conta,
      criadaEm: linha.criada_em,
      // O Postgres devolve `numeric` como string no JSON, para não perder
      // precisão. Sem este `Number` a nota chegaria à tela como texto e
      // `toFixed` rebentaria.
      nota: linha.nota === null ? null : Number(linha.nota),
      totalDeAvaliacoes: linha.total_de_avaliacoes,
      avaliacoesLidas: linha.avaliacoes_lidas,
      comentariosPrivados: linha.comentarios_privados ?? 0,
      filaDeRespostas: linha.fila_de_respostas ?? 0,
      ultimaColetaEm: linha.ultima_coleta_em,
      diasDesdeAColeta: linha.dias_desde_a_coleta,
      sinais: (linha.sinais || []) as SinalDaConta[],
      gravidade: (linha.gravidade === 'travado' || linha.gravidade === 'atencao') ? linha.gravidade : 'ok',
    })),
  };
};
