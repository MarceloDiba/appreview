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
 * O endereço que abre o WhatsApp com a mensagem já escrita. `null` quando não
 * há por onde: sem contacto, sem mensagem, ou com um contacto que é e-mail.
 * Quem chama desenha outro botão nesse caso, em vez de um que não faz nada.
 */
export const linkDeWhatsApp = (contacto: string | null, mensagem: string): string | null => {
  if (!mensagem.trim()) return null;
  if (tipoDoContacto(contacto) !== 'telefone') return null;
  return `https://wa.me/${apenasDigitos(contacto || '')}?text=${encodeURIComponent(mensagem)}`;
};
