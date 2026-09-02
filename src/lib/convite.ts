import { tipoDoContacto, apenasDigitos } from './contactoDoCliente.ts';

/**
 * O convite para avaliar no Google, escrito para o dono enviar.
 *
 * O QUE ESTE MÓDULO NÃO SABE
 *
 * A nota. E isso é a regra, não um esquecimento: convidar só quem deu 4 ou 5 é
 * solicitação seletiva, e a política do Google proíbe. `EntradaDoConvite` não
 * tem campo de nota, para que ninguém possa condicionar a mensagem a ela sem
 * primeiro mudar esta interface e ter de explicar porquê.
 *
 * POR QUE O BINNO NÃO ENVIA
 *
 * Ele escreve e devolve um endereço; quem toca em enviar é o dono, do telemóvel
 * dele. É a mesma regra dos rascunhos de resposta, e resolve de caminho o
 * problema de canal: não é preciso número de empresa, nem API aprovada, nem
 * infraestrutura de envio.
 */
export interface EntradaDoConvite {
  nomeDoCliente: string | null;
  nomeDoNegocio: string;
  /** O link de avaliação do Google do próprio negócio. Sem ele não há convite. */
  linkDeAvaliacao: string | null;
  idioma: 'pt-PT' | 'pt-BR' | 'en';
}

const TEXTOS: Record<EntradaDoConvite['idioma'], (nome: string, negocio: string, link: string) => string> = {
  'pt-PT': (nome, negocio, link) => `${nome ? `Olá ${nome}, ` : 'Olá, '}obrigado por nos ter escrito. Se lhe apetecer, deixe a sua opinião no Google. Ajuda muito quem procura por nós.\n\n${link}\n\n${negocio}`,
  'pt-BR': (nome, negocio, link) => `${nome ? `Oi ${nome}, ` : 'Oi, '}obrigado por escrever pra gente. Se quiser, deixa sua opinião no Google. Ajuda muito quem procura por nós.\n\n${link}\n\n${negocio}`,
  en: (nome, negocio, link) => `${nome ? `Hi ${nome}, ` : 'Hi, '}thank you for writing to us. If you feel like it, leave your thoughts on Google. It helps a lot of people who are looking for us.\n\n${link}\n\n${negocio}`,
};

/**
 * Sem link não há mensagem. Devolver texto a convidar para lado nenhum seria
 * pôr o dono a mandar um convite que não leva a sítio algum.
 */
export const mensagemDoConvite = (entrada: EntradaDoConvite): string => {
  const link = (entrada.linkDeAvaliacao || '').trim();
  if (!link) return '';
  const nome = (entrada.nomeDoCliente || '').trim();
  const escrever = TEXTOS[entrada.idioma] || TEXTOS['pt-PT'];
  return escrever(nome, entrada.nomeDoNegocio, link);
};

/**
 * A língua da mensagem segue o país do NEGÓCIO, e nunca a preferência de
 * painel do dono.
 *
 * Quem lê esta mensagem é o cliente, não o dono. `i18n.language` é o idioma em
 * que o dono escolheu ver o painel dele, guardado no navegador e trocável no
 * seletor: um dono brasileiro com o painel em português de Portugal mandaria
 * «Se lhe apetecer, deixe a sua opinião» a um cliente brasileiro, e com o
 * painel em inglês mandaria em inglês. É o defeito de 01/09/2026 outra vez, o
 * mesmo que a resposta sugerida já corrigiu.
 *
 * A regra é a do resto do produto (`resolveContentLocale`, em
 * `src/lib/replySuggestions.ts`): só `'BR'` exacto vira brasileiro. Ausente,
 * vazio ou qualquer outro país cai no português de Portugal, que é o padrão
 * histórico, para que um país por ler nunca vire um brasileirismo indevido nem
 * o contrário.
 */
export const idiomaDoConvite = (paisDoNegocio: string | null | undefined): EntradaDoConvite['idioma'] =>
  (paisDoNegocio === 'BR' ? 'pt-BR' : 'pt-PT');

/**
 * O endereço que abre o WhatsApp com a mensagem já escrita.
 *
 * `wa.me` LÊ O NÚMERO COMO INTERNACIONAL, sempre, e não tem indicativo por
 * omissão. `wa.me/79998380767` não é um número de Aracaju a que faltou o
 * `+55`: o WhatsApp lê o `7` da frente como indicativo da Rússia e abre a
 * conversa com um desconhecido. Das seis linhas reais de 02/09/2026, cinco
 * começavam por `+55` e a sexta estava escrita `(79) 99838-0767`.
 *
 * Por isso o endereço só é montado quando o indicativo está lá: o contacto
 * começa por `+`, ou tem 12 a 15 algarismos (12 é o mais curto que já traz
 * indicativo, 15 é o máximo do E.164). Onze ou menos é número local, e um
 * número local não tem para onde ser enviado.
 *
 * A classificação de `tipoDoContacto` NÃO muda por causa disto: ela responde
 * "isto é telefone ou e-mail", e a resposta continua a ser telefone. Quem
 * exige indicativo é só quem monta o endereço.
 *
 * `null` quando não há por onde, e são quatro casos: sem mensagem, sem
 * contacto, com um contacto que é e-mail, e com um telefone sem indicativo.
 * Nesse caso quem chama desenha só o botão de copiar, o caminho que já existia
 * para o e-mail, em vez de um botão que abre a conversa errada.
 */
export const linkDeWhatsApp = (contacto: string | null, mensagem: string): string | null => {
  if (!mensagem.trim()) return null;
  if (tipoDoContacto(contacto) !== 'telefone') return null;
  const escrito = (contacto || '').trim();
  const digitos = apenasDigitos(escrito);
  if (!escrito.startsWith('+') && digitos.length < 12) return null;
  return `https://wa.me/${digitos}?text=${encodeURIComponent(mensagem)}`;
};
