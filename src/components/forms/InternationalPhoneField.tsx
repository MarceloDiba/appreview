import { useState } from 'react';
import PhoneInput, {
  isPossiblePhoneNumber,
  isValidPhoneNumber,
  parsePhoneNumber,
  type Country,
} from 'react-phone-number-input';
import flags from 'react-phone-number-input/flags';
import 'react-phone-number-input/style.css';
import { cn } from '@/lib/utils';
import { useOwnerTranslation } from '@/i18n/owner/useOwnerTranslation';

const fallbackCountry: Country = 'BR';

export const countryFromPhone = (value: string): Country =>
  parsePhoneNumber(value)?.country || parsePhoneNumber(value, fallbackCountry)?.country || fallbackCountry;

const normalizePhoneValue = (value: string) =>
  parsePhoneNumber(value)?.number || parsePhoneNumber(value, fallbackCountry)?.number || value;

interface InternationalPhoneFieldProps {
  id: string;
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  ariaLabel: string;
  disabled?: boolean;
}

/**
 * O país é uma escolha explícita: o número é guardado em formato internacional
 * e a apresentação acompanha a bandeira escolhida. Isso evita a máscara
 * brasileira aplicada por engano a um negócio português, ou o inverso.
 */
const InternationalPhoneField = ({
  id,
  value,
  onChange,
  placeholder,
  ariaLabel,
  disabled = false,
}: InternationalPhoneFieldProps) => {
  const { t } = useOwnerTranslation();
  const normalizedValue = normalizePhoneValue(value);
  const country = countryFromPhone(normalizedValue);

  /**
   * A biblioteca só devolve, via `onChange`, um número em E.164 quando ele já
   * fecha (ou `undefined` quando o campo ainda não tem nenhum dígito
   * nacional digitado). Ou seja, o `value` que o formulário recebe não
   * distingue "campo vazio" de "campo com dígitos que ainda não formam um
   * número válido" — os dois viram string vazia. É exatamente essa
   * distinção que falta: guardamos aqui a última tentativa bruta (o
   * argumento que a biblioteca passou para o `onChange`, antes de nós
   * trocarmos por `''`) só para decidir o que mostrar por baixo do campo.
   * O valor que sai para o formulário (mais abaixo) continua o mesmo de
   * sempre: número válido em formato internacional, ou vazio.
   */
  const [typedAttempt, setTypedAttempt] = useState<string | undefined>(undefined);

  const hasTypedSomething = Boolean(typedAttempt);
  const isValid = hasTypedSomething && isValidPhoneNumber(typedAttempt!);
  const isPossible = hasTypedSomething && isPossiblePhoneNumber(typedAttempt!);
  const showError = hasTypedSomething && !isValid;
  const errorMessage = showError ? (isPossible ? t('phoneField.invalid') : t('phoneField.incomplete')) : undefined;
  const errorId = `${id}-phone-error`;

  return (
    <div>
      <PhoneInput
        id={id}
        value={normalizedValue || undefined}
        defaultCountry={country}
        international
        countryCallingCodeEditable={false}
        flags={flags}
        onChange={(nextValue) => {
          setTypedAttempt(nextValue);
          onChange(nextValue || '');
        }}
        countrySelectProps={{ 'aria-label': ariaLabel }}
        numberInputProps={{
          placeholder,
          'aria-invalid': errorMessage ? true : undefined,
          'aria-describedby': errorMessage ? errorId : undefined,
          className: cn(
            'h-10 min-w-0 flex-1 rounded-r-md border-0 bg-transparent px-3 py-2 text-sm outline-none placeholder:text-muted-foreground focus-visible:ring-0',
            'disabled:cursor-not-allowed disabled:opacity-50'
          ),
        }}
        disabled={disabled}
        className={cn(
          'flex h-10 rounded-md border border-input bg-background text-sm ring-offset-background focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2',
          errorMessage && 'border-destructive focus-within:ring-destructive'
        )}
      />
      {errorMessage && (
        <p id={errorId} className="mt-1.5 text-sm font-medium text-destructive">
          {errorMessage}
        </p>
      )}
    </div>
  );
};

export default InternationalPhoneField;
