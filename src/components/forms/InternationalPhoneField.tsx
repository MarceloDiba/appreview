import PhoneInput, { parsePhoneNumber, type Country } from 'react-phone-number-input';
import flags from 'react-phone-number-input/flags';
import 'react-phone-number-input/style.css';
import { cn } from '@/lib/utils';

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
  const normalizedValue = normalizePhoneValue(value);
  const country = countryFromPhone(normalizedValue);

  return (
    <PhoneInput
      id={id}
      value={normalizedValue || undefined}
      defaultCountry={country}
      international
      countryCallingCodeEditable={false}
      flags={flags}
      onChange={(nextValue) => onChange(nextValue || '')}
      countrySelectProps={{ 'aria-label': ariaLabel }}
      numberInputProps={{
        placeholder,
        className: cn(
          'h-10 min-w-0 flex-1 rounded-r-md border-0 bg-transparent px-3 py-2 text-sm outline-none placeholder:text-muted-foreground focus-visible:ring-0',
          'disabled:cursor-not-allowed disabled:opacity-50'
        ),
      }}
      disabled={disabled}
      className="flex h-10 rounded-md border border-input bg-background text-sm ring-offset-background focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2"
    />
  );
};

export default InternationalPhoneField;
