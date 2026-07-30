/**
 * Dados de identificação e datas dos documentos legais.
 *
 * Estão todos num sítio só porque metade deles são factos jurídicos que só o
 * Marcelo tem: entidade, número de contribuinte, morada. Nada disto pode ser
 * inventado — um documento legal com uma identidade errada é pior do que não
 * ter documento.
 *
 * O que ainda falta fica marcado com `PENDENTE`. A página mostra-o como "a
 * confirmar", à vista, em vez de esconder o buraco. Enquanto houver um
 * PENDENTE, o documento não está pronto para um cliente real assinar.
 */

/** Sentinela para o que ainda não foi confirmado. Ver comentário acima. */
export const PENDENTE = '__PENDENTE__';

export const isPendente = (value: string): boolean => value === PENDENTE;

export const LEGAL = {
  /** Nome comercial do serviço. */
  servico: 'AppReview',
  /** Entidade que presta o serviço e assina os contratos. */
  entidade: PENDENTE,
  /** NIPC/CNPJ ou equivalente da entidade acima. */
  identificacaoFiscal: PENDENTE,
  /** Morada da sede, exigida no contrato e na política de privacidade. */
  morada: PENDENTE,
  /** Endereço para exercer direitos de protecção de dados e para suporte. */
  email: 'diba@noadigital.com.br',
  /** Preço em vigor, tal como anunciado na página inicial. */
  precoMensal: '49 €',
  /** Lei e foro aplicáveis. O cliente do piloto é português. */
  leiAplicavel: 'portuguesa',
  foro: 'comarca de Lisboa, Portugal',
  /** Data da versão em vigor destes documentos. */
  versao: '30 de julho de 2026',
} as const;

/**
 * Quem trata os dados por nós. Tem de estar público: o RGPD obriga a informar
 * quem são os subcontratantes e onde estão os dados.
 */
export const SUBCONTRATANTES = [
  {
    nome: 'Supabase',
    funcao: 'Base de dados, autenticação e funções de servidor',
    local: 'São Paulo, Brasil (região sa-east-1)',
  },
  {
    nome: 'Vercel',
    funcao: 'Alojamento e entrega da aplicação',
    local: 'Rede global de servidores, com pontos na União Europeia',
  },
  {
    nome: 'Google (Places API)',
    funcao: 'Leitura das avaliações públicas do estabelecimento',
    local: 'Estados Unidos e União Europeia',
  },
] as const;
