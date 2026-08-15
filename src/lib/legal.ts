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
  servico: 'Binno',
  /** Entidade que presta o serviço e assina os contratos. */
  entidade: 'MDR Propaganda Ltda. ME',
  /** NIPC/CNPJ ou equivalente da entidade acima. */
  identificacaoFiscal: 'CNPJ 20.927.148/0001-83',
  /** Morada da sede, exigida no contrato e na política de privacidade. */
  morada: 'Rua Itaporanga, 433, Aracaju, Sergipe, Brasil',
  /** Endereço para exercer direitos de protecção de dados e para suporte. */
  email: 'diba@noadigital.com.br',
  /** Meio de pagamento em vigor. */
  meioPagamento: 'Stripe',
  /** Preço em vigor, tal como anunciado na página inicial. */
  precoMensal: '49 €',
  /**
   * Lei e foro aplicáveis. Decisão do Marcelo (30/07/2026): Brasil, foro de
   * Aracaju, por a entidade que presta o serviço ser brasileira. O cliente do
   * piloto é português, por isso — independentemente da lei escolhida — os
   * titulares na UE mantêm os direitos do RGPD, que não se afastam por
   * contrato. Isto e o regime duplo LGPD+RGPD ficam por validar com advogado.
   */
  leiAplicavel: 'brasileira',
  foro: 'comarca de Aracaju, Sergipe, Brasil',
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
