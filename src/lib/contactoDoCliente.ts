/**
 * O contacto que o cliente deixou, e o que ele é de facto.
 *
 * A coluna chama-se `internal_feedback.customer_email` e guarda TELEFONES:
 * em 02/09/2026, cinco das seis linhas reais começavam por `+55`. O formulário
 * do QR pede «contacto» e a pessoa escreve o que quiser.
 *
 * Este ficheiro existe para essa mentira parar aqui. Quem precisa de saber se
 * pode abrir o WhatsApp pergunta a este módulo, e não ao nome da coluna.
 */

/** Só os algarismos, para o endereço do WhatsApp. */
export const apenasDigitos = (valor: string): string => (valor || '').replace(/\D/g, '');

/**
 * Um telefone tem entre 8 e 15 algarismos: 8 é o mais curto que ainda é um
 * número local, e 15 é o máximo do padrão E.164. Abaixo disso é lixo, e acima
 * é outra coisa qualquer. Um e-mail reconhece-se pela arroba com texto dos dois
 * lados; não se valida mais do que isso, porque aqui só se decide qual botão
 * mostrar, e um endereço inválido dá erro no cliente de e-mail, não aqui.
 */
export const tipoDoContacto = (valor: string | null | undefined): 'telefone' | 'email' | 'nenhum' => {
  const limpo = (valor || '').trim();
  if (!limpo) return 'nenhum';
  if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(limpo)) return 'email';
  const digitos = apenasDigitos(limpo);
  if (digitos.length >= 8 && digitos.length <= 15) return 'telefone';
  return 'nenhum';
};
