import React, { useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { Check, Copy, ExternalLink, Mail, MessageSquareQuote } from 'lucide-react';
import {
  buildReplySuggestions,
  detectReplyLocale,
  LOCALE_LABEL,
  type ReplyChannel,
  type ReplyLocale,
} from '@/lib/replySuggestions';
import { useOwnerTranslation } from '@/i18n/owner/useOwnerTranslation';

interface ReplySuggestionsProps {
  /** `null` para o caso interno em que o cliente escreveu sem avaliar. */
  rating: number | null;
  text?: string | null;
  customerName?: string | null;
  customerEmail?: string | null;
  businessName?: string | null;
  /**
   * `profiles.business_country`, para escolher pt-BR vs. pt-PT na sugestão.
   * Obrigatório, como em `ReplySuggestionInput`: se este componente pudesse
   * omiti-lo, o campo voltaria a ser esquecível uma casa acima do lugar onde
   * o tornámos obrigatório, e o dono brasileiro voltaria a ver português de
   * Portugal. Quem não sabe o país escreve `null` e a escolha fica à vista.
   */
  businessCountry: string | null;
  channel: ReplyChannel;
}

const LOCALES: ReplyLocale[] = ['pt', 'es', 'en'];

/**
 * A sugestão é editável de propósito. Ninguém deve colar isto tal e qual: o
 * dono é quem sabe o nome do prato, o turno e o que já fez. O texto existe para
 * destravar a primeira frase, não para escrever por ele.
 *
 * E não publicamos nada em nome de ninguém. Responder no Google exige o perfil
 * de empresa do próprio dono; o botão leva-o lá, o texto vai na área de
 * transferência.
 */
const ReplySuggestions: React.FC<ReplySuggestionsProps> = ({
  rating,
  text,
  customerName,
  customerEmail,
  businessName,
  businessCountry,
  channel,
}) => {
  const { t } = useOwnerTranslation();
  const [open, setOpen] = useState(false);
  const [locale, setLocale] = useState<ReplyLocale>(() => detectReplyLocale(text));
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const suggestions = useMemo(
    () =>
      buildReplySuggestions({
        rating,
        text,
        customerName,
        businessName,
        businessCountry,
        channel,
        locale,
      }),
    [rating, text, customerName, businessName, businessCountry, channel, locale]
  );

  const bodyOf = (id: string, fallback: string) => drafts[`${locale}:${id}`] ?? fallback;

  const handleCopy = async (id: string, body: string) => {
    try {
      await navigator.clipboard.writeText(body);
      setCopiedId(id);
      window.setTimeout(() => setCopiedId((current) => (current === id ? null : current)), 2000);
      toast.success(t('reply.copiedToast'));
    } catch {
      // Safari em http, telemóvel antigo, permissão negada: o texto está à
      // vista e é seleccionável, por isso isto é um aviso, não um erro fatal.
      toast.error(t('reply.copyErrorToast'));
    }
  };

  const mailtoHref = (body: string) => {
    const subject = businessName?.trim()
      ? t('reply.emailSubject', { business: businessName.trim() })
      : t('reply.emailSubjectGeneric');
    return `mailto:${encodeURIComponent(customerEmail || '')}?subject=${encodeURIComponent(
      subject
    )}&body=${encodeURIComponent(body)}`;
  };

  if (!open) {
    return (
      <Button
        variant="ghost"
        size="sm"
        className="mt-3 h-8 px-2 text-gray-600 hover:text-gray-900"
        onClick={() => setOpen(true)}
      >
        <MessageSquareQuote size={15} className="mr-2" aria-hidden="true" />
        {t('reply.cta')}
      </Button>
    );
  }

  return (
    <div className="mt-4 rounded-lg border border-gray-200 bg-gray-50 p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2 text-sm font-medium text-gray-900">
          <MessageSquareQuote size={16} aria-hidden="true" />
          {t('reply.title')}
        </div>
        <Button variant="ghost" size="sm" className="h-7 px-2 text-xs" onClick={() => setOpen(false)}>
          {t('reply.close')}
        </Button>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <span className="text-xs text-gray-500">{t('reply.languageLabel')}</span>
        {LOCALES.map((code) => (
          <button
            key={code}
            type="button"
            onClick={() => setLocale(code)}
            aria-pressed={locale === code}
            className={`rounded-full border px-3 py-1 text-xs transition-colors ${
              locale === code
                ? 'border-primary bg-primary text-primary-foreground'
                : 'border-gray-300 bg-white text-gray-600 hover:bg-gray-100'
            }`}
          >
            {LOCALE_LABEL[code]}
          </button>
        ))}
      </div>

      <div className="mt-4 space-y-4">
        {suggestions.map((suggestion) => {
          const body = bodyOf(suggestion.id, suggestion.body);
          const isCopied = copiedId === suggestion.id;
          return (
            <div key={suggestion.id} className="rounded-lg border border-gray-200 bg-white p-3">
              <p className="text-sm font-medium text-gray-900">{suggestion.title}</p>
              <p className="mt-0.5 text-xs text-gray-500">{suggestion.hint}</p>

              <Textarea
                value={body}
                onChange={(e) =>
                  setDrafts((prev) => ({ ...prev, [`${locale}:${suggestion.id}`]: e.target.value }))
                }
                rows={Math.min(12, body.split('\n').length + 2)}
                className="mt-3 resize-y text-sm"
                aria-label={t('reply.textareaLabel', { title: suggestion.title })}
              />

              {/*
                `flex flex-wrap` sozinho não salva um botão mais largo do que
                a caixa: a quebra acontece ENTRE botões, e um item que não
                cabe na linha continua a transbordar. "Abrir o Google para
                responder" é longo, `whitespace-nowrap` vem do próprio Button,
                e esta caixa está dentro de dois padding (o cartão do item e
                este painel). No celular cada botão ocupa a largura toda e
                empilha; a partir de `sm` volta a ser a linha de sempre.
              */}
              <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:flex-wrap">
                <Button size="sm" variant="outline" className="w-full sm:w-auto" onClick={() => handleCopy(suggestion.id, body)}>
                  {isCopied ? (
                    <Check size={14} className="mr-2" aria-hidden="true" />
                  ) : (
                    <Copy size={14} className="mr-2" aria-hidden="true" />
                  )}
                  {isCopied ? t('reply.copied') : t('reply.copy')}
                </Button>

                {channel === 'private' && customerEmail && (
                  <Button size="sm" variant="outline" className="w-full sm:w-auto" asChild>
                    <a href={mailtoHref(body)}>
                      <Mail size={14} className="mr-2" aria-hidden="true" />
                      {t('reply.sendEmail')}
                    </a>
                  </Button>
                )}

                {channel === 'public' && (
                  <Button size="sm" variant="ghost" className="w-full sm:w-auto" asChild>
                    <a
                      href="https://business.google.com/reviews"
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      {t('reply.openGoogle')}
                      <ExternalLink size={13} className="ml-2" aria-hidden="true" />
                    </a>
                  </Button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <p className="mt-4 text-xs text-gray-500">
        {channel === 'public' ? t('reply.footerPublic') : t('reply.footerPrivate')}
      </p>
    </div>
  );
};

export default ReplySuggestions;
