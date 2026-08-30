import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

// `src/lib/whatsappPhone.ts` é a lógica pura por trás do campo de WhatsApp do
// formulário público (`WhatsAppField.tsx`, usado por `FeedbackForm.tsx`). É
// TypeScript, e este repositório não tem um executor de testes. Em vez de
// duplicar a lógica em JavaScript aqui (o que testaria a cópia, não o
// arquivo real), o guarda importa o módulo diretamente: o Node roda a partir
// da versão 22.6, sem transpilar, com `--experimental-strip-types` (por isso
// o script `check:whatsapp-field` no `package.json` passa essa flag). As
// anotações de tipo em `whatsappPhone.ts` são simples o bastante para isso
// funcionar sem build.

const modulePath = resolve(process.cwd(), 'src/lib/whatsappPhone.ts');
const {
  isValidWhatsAppNumber,
  toInternationalWhatsApp,
  formatNationalDigits,
  sanitizeDigits,
} = await import(pathToFileURL(modulePath).href);

const requirements = [
  // Um número válido em cada país formata e valida.
  ['Brasil: 11 96123-4567 valida', isValidWhatsAppNumber('BR', '11961234567')],
  ['Brasil: 11 96123-4567 formata como (11) 96123-4567', formatNationalDigits('BR', '11961234567') === '(11) 96123-4567'],
  ['Portugal: 912 345 678 valida', isValidWhatsAppNumber('PT', '912345678')],
  ['Portugal: 912 345 678 formata como 912 345 678', formatNationalDigits('PT', '912345678') === '912 345 678'],
  ['Espanha: 612 345 678 valida', isValidWhatsAppNumber('ES', '612345678')],
  ['Espanha: 712 345 678 (prefixo 7) também valida', isValidWhatsAppNumber('ES', '712345678')],
  ['Espanha: 612 345 678 formata como 612 345 678', formatNationalDigits('ES', '612345678') === '612 345 678'],

  // Um tamanho obviamente errado é recusado.
  ['Brasil: 10 dígitos (faltando 1) é recusado', !isValidWhatsAppNumber('BR', '1196123456')],
  ['Brasil: assinante sem começar em 9 é recusado', !isValidWhatsAppNumber('BR', '11861234567')],
  ['Portugal: 8 dígitos é recusado', !isValidWhatsAppNumber('PT', '91234567')],
  ['Portugal: fixo (começa em 2) é recusado', !isValidWhatsAppNumber('PT', '212345678')],
  ['Espanha: 10 dígitos é recusado', !isValidWhatsAppNumber('ES', '6123456789')],
  ['Espanha: prefixo 5 é recusado', !isValidWhatsAppNumber('ES', '512345678')],

  // Um valor vazio é aceito: o campo é opcional e nunca bloqueia sozinho.
  ['Brasil: vazio não valida (mas não é um erro de "tamanho", é campo em branco)', !isValidWhatsAppNumber('BR', '')],
  ['sanitizeDigits de string vazia continua vazia', sanitizeDigits('BR', '') === ''],

  // O formato internacional guardado é o correto, o mesmo que o painel usa.
  ['Brasil: formato internacional é +5511961234567', toInternationalWhatsApp('BR', '11961234567') === '+5511961234567'],
  ['Portugal: formato internacional é +351912345678', toInternationalWhatsApp('PT', '912345678') === '+351912345678'],
  ['Espanha: formato internacional é +34612345678', toInternationalWhatsApp('ES', '612345678') === '+34612345678'],

  // sanitizeDigits nunca deixa passar mais dígitos do que o país aceita, nem
  // caracteres que não sejam dígitos (por exemplo colados de um contato com
  // parênteses e espaços).
  ['sanitizeDigits corta excesso de dígitos no Brasil', sanitizeDigits('BR', '119612345678888') === '11961234567'],
  ['sanitizeDigits remove tudo que não é dígito', sanitizeDigits('BR', '(11) 96123-4567') === '11961234567'],
];

const failed = requirements.filter(([, ok]) => !ok).map(([label]) => label);
if (failed.length) {
  console.error(`Campo de WhatsApp com regra quebrada:\n- ${failed.join('\n- ')}`);
  process.exit(1);
}

console.log(`Campo de WhatsApp verificado: ${requirements.length} regras conferidas.`);
