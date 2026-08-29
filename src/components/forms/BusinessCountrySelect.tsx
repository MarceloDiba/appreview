import { type Country } from 'react-phone-number-input';
import { cn } from '@/lib/utils';

type BusinessCountrySelectProps = {
  id: string;
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  locale: string;
  disabled?: boolean;
  className?: string;
};

/**
 * Onde a Noá opera ou pretende operar. Antes esta lista trazia os 195 países
 * do mundo, e este campo não é formatação: é o fato comercial que decide se o
 * negócio consegue assinar. Escolher errado aqui produz recusa na hora do
 * pagamento, sem o cliente entender o motivo.
 *
 * Hoje só o Brasil tem cobrança ligada. Portugal e Espanha ficam disponíveis
 * porque são os mercados seguintes e já existe operação em Portugal.
 */
const allowedCountries: Country[] = ['BR', 'PT', 'ES'];

const countryName = (country: Country, locale: string) => {
  try {
    return new Intl.DisplayNames([locale], { type: 'region' }).of(country) || country;
  } catch {
    return country;
  }
};

/**
 * The place where the business operates is a commercial fact. It is separate
 * from the manager's phone country, which only controls telephone formatting.
 */
const BusinessCountrySelect = ({
  id,
  value,
  onChange,
  placeholder,
  locale,
  disabled = false,
  className,
}: BusinessCountrySelectProps) => {
  const countries = allowedCountries
    .map((country) => ({ code: country, name: countryName(country, locale) }))
    .sort((left, right) => left.name.localeCompare(right.name, locale));

  return (
    <select
      id={id}
      value={value}
      onChange={(event) => onChange(event.target.value)}
      disabled={disabled}
      className={cn('h-10 w-full rounded-md border border-input bg-background px-3 text-sm disabled:cursor-not-allowed disabled:opacity-50', className)}
    >
      <option value="">{placeholder}</option>
      {countries.map(({ code, name }) => <option key={code} value={code}>{name}</option>)}
    </select>
  );
};

export default BusinessCountrySelect;
