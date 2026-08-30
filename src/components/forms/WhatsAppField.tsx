import { useState } from 'react';
import { cn } from '@/lib/utils';
import {
  WHATSAPP_COUNTRIES,
  callingCodeFor,
  flagFor,
  formatNationalDigits,
  isValidWhatsAppNumber,
  maxDigitsFor,
  parseInternationalWhatsApp,
  sanitizeDigits,
  toInternationalWhatsApp,
  type WhatsAppCountry,
} from '@/lib/whatsappPhone';

interface WhatsAppFieldProps {
  id: string;
  value: string;
  onChange: (internationalValueOrEmpty: string) => void;
  onValidityChange: (hasInvalidAttempt: boolean) => void;
  placeholder: string;
  countryAriaLabel: string;
  errorMessage: string;
  disabled?: boolean;
}

const initialStateFromValue = (value: string): { country: WhatsAppCountry; digits: string } => {
  const parsed = value ? parseInternationalWhatsApp(value) : null;
  return parsed || { country: 'BR', digits: '' };
};

/**
 * Campo de WhatsApp escrito à mão, só para Brasil, Portugal e Espanha, a
 * lista de países da Noá. Sem biblioteca: `react-phone-number-input` foi
 * tentado antes neste mesmo formulário e adicionou 51,49 kB gzip à rota
 * pública só de metadata de países que não usamos. Aqui o custo é o tamanho
 * deste arquivo mais `src/lib/whatsappPhone.ts`.
 *
 * O valor que sobe para o formulário (via `onChange`) só existe quando o
 * número fecha: 9 ou 11 dígitos completos com o prefixo de celular certo.
 * Enquanto isso não acontece, `onChange` recebe string vazia, o mesmo
 * contrato que `InternationalPhoneField.tsx` já usa no painel do dono. A
 * distinção entre "campo vazio" e "dígitos digitados que ainda não fecham"
 * fica em `onValidityChange`, que o formulário usa para bloquear o envio só
 * quando há uma tentativa inválida, nunca quando o campo está simplesmente
 * em branco.
 */
const WhatsAppField = ({
  id,
  value,
  onChange,
  onValidityChange,
  placeholder,
  countryAriaLabel,
  errorMessage,
  disabled = false,
}: WhatsAppFieldProps) => {
  const [{ country, digits }, setState] = useState(() => initialStateFromValue(value));

  const hasTyped = digits.length > 0;
  const isValid = hasTyped && isValidWhatsAppNumber(country, digits);
  const showError = hasTyped && !isValid;
  const errorId = `${id}-whatsapp-error`;

  const emit = (nextCountry: WhatsAppCountry, nextDigits: string) => {
    setState({ country: nextCountry, digits: nextDigits });
    const nextIsValid = nextDigits.length > 0 && isValidWhatsAppNumber(nextCountry, nextDigits);
    onChange(nextIsValid ? toInternationalWhatsApp(nextCountry, nextDigits) : '');
    onValidityChange(nextDigits.length > 0 && !nextIsValid);
  };

  return (
    <div>
      <div
        className={cn(
          'flex h-10 rounded-md border border-input bg-background text-sm ring-offset-background focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2',
          showError && 'border-destructive focus-within:ring-destructive'
        )}
      >
        <select
          id={`${id}-country`}
          aria-label={countryAriaLabel}
          value={country}
          disabled={disabled}
          onChange={(e) => emit(e.target.value as WhatsAppCountry, '')}
          className="h-10 rounded-l-md border-0 border-r border-input bg-transparent pl-2 pr-1 text-sm outline-none disabled:cursor-not-allowed disabled:opacity-50"
        >
          {WHATSAPP_COUNTRIES.map((c) => (
            <option key={c} value={c}>
              {flagFor(c)} +{callingCodeFor(c)}
            </option>
          ))}
        </select>
        <input
          id={id}
          type="tel"
          inputMode="numeric"
          autoComplete="tel-national"
          value={formatNationalDigits(country, digits)}
          onChange={(e) => emit(country, sanitizeDigits(country, e.target.value))}
          placeholder={placeholder}
          maxLength={maxDigitsFor(country) + 4}
          aria-invalid={showError ? true : undefined}
          aria-describedby={showError ? errorId : undefined}
          disabled={disabled}
          className={cn(
            'h-10 min-w-0 flex-1 rounded-r-md border-0 bg-transparent px-3 py-2 text-sm outline-none placeholder:text-muted-foreground focus-visible:ring-0',
            'disabled:cursor-not-allowed disabled:opacity-50'
          )}
        />
      </div>
      {showError && (
        <p id={errorId} className="mt-1.5 text-sm font-medium text-destructive">
          {errorMessage}
        </p>
      )}
    </div>
  );
};

export default WhatsAppField;
