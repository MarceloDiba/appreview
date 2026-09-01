import React, { useEffect, useMemo, useState } from 'react';
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
import {
  pedirRascunho,
  rascunhoGuardado,
  rascunhoNaTela,
  type ResultadoDoModelo,
} from '@/lib/rascunhoDoModelo';
import { pedirRascunhoAoBinno } from '@/lib/sugerirResposta';
import OrigemDoRascunho from '@/components/dashboard/OrigemDoRascunho';
import { useOwnerTranslation } from '@/i18n/owner/useOwnerTranslation';

interface ReplySuggestionsProps {
  /**
   * O id do item na fila somada (`ItemDaFila.id`, com o prefixo da origem).
   * É por ele que o rascunho do modelo é guardado na sessão, para que uma
   * avaliação a que o dono volta não seja paga duas vezes. O prefixo importa:
   * sem ele, um caso privado e uma avaliação do Google com o mesmo número
   * partilhariam o mesmo rascunho.
   */
  reviewId: string;
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
 *
 * O RASCUNHO QUE LÊ A AVALIAÇÃO (31/08/2026)
 *
 * O painel de variantes continua inteiro. O que mudou é que, numa avaliação
 * PÚBLICA, o painel pede também um rascunho a `sugerir-resposta`, que lê o que
 * o cliente escreveu, e o põe como um cartão A MAIS, à frente das variantes.
 * Nenhuma variante é reescrita: o título e a dica de cada uma descrevem o texto
 * que o molde produz ("Curta e directa", "A escolha segura quando ainda não
 * sabe o que correu mal"), e pôr o texto do modelo debaixo desses rótulos seria
 * uma etiqueta a mentir sobre o que está na caixa.
 *
 * O COMENTÁRIO PRIVADO TAMBÉM (01/09/2026)
 *
 * Até este dia, `channel === 'private'` não passava por aqui, e a razão estava
 * escrita neste mesmo lugar: a função `sugerir-resposta` estava afinada para o
 * público e RECUSAVA qualquer promessa de reparação. Em público essa recusa
 * está certa, porque uma oferta de dinheiro debaixo de uma avaliação ensina o
 * próximo leitor que uma estrela vale dinheiro. Em privado ela era o contrário
 * do que o dono quer dizer, e o molde tem uma variante inteira para isso
 * (`com-reparacao`, "Com uma compensação").
 *
 * Marcelo pediu o rascunho para o privado nesse dia. O que mudou não foi este
 * componente relaxar uma regra: foi a função ganhar DOIS canais, com listas de
 * recusa diferentes. O privado permite oferecer resolver e proíbe, no lugar,
 * trocar seja o que for por apagar ou mudar uma avaliação pública, que é o que
 * a dica da variante `com-reparacao` já dizia ao dono por escrito e passou a
 * ser verificado no texto.
 *
 * Por isso o `channel` vai no pedido. Ele não é decoração: é ele que escolhe,
 * do outro lado, qual pedido é feito ao modelo e qual lista é aplicada ao que
 * ele devolver. E o cartão muda de rótulo com ele, porque chamar "Resposta a
 * esta avaliação" a um recado privado seria uma etiqueta a mentir sobre o que
 * está na caixa, que é a mesma razão de o cartão do modelo não reaproveitar os
 * títulos das variantes do molde.
 */
const ReplySuggestions: React.FC<ReplySuggestionsProps> = ({
  reviewId,
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
  const [doModelo, setDoModelo] = useState<ResultadoDoModelo | undefined>(undefined);

  // Uma chamada por avaliação, e só quando o dono ABRE o painel.
  //
  // Abrir o painel é o "seleccionar" desta tela. A fila de `/reviews` é uma
  // lista, não uma selecção: pedir no desenho de cada cartão seria pagar pela
  // fila inteira sempre que a página abre, para responder a uma avaliação. O
  // cache do módulo cuida das voltas, e fechar e reabrir não paga de novo.
  //
  // Ao contrário da fila do painel, aqui não se pergunta antes se o dono já
  // escreveu: as edições dele são por variante e por idioma, e ter mexido numa
  // variante não quer dizer que ele não queira ler a resposta que leu a
  // avaliação. Cada cartão continua protegido um a um por `rascunhoNaTela`.
  useEffect(() => {
    if (!open) return;
    const comentario = (text || '').trim();
    // Sem texto não há o que ler, e a função devolveria `SEM_COMENTARIO`.
    if (comentario.length < 3) return;

    const guardado = rascunhoGuardado(reviewId);
    if (guardado) {
      setDoModelo(guardado);
      return;
    }

    let vivo = true;
    setDoModelo({ origem: 'pedindo' });
    void pedirRascunho(
      reviewId,
      {
        comment: comentario,
        rating,
        businessName: businessName ?? null,
        // O canal deste painel É o canal do pedido. Fixá-lo num literal aqui
        // mandaria todo comentário privado do QR pela lista do público, com
        // este componente a parecer correcto: o recado chegaria ao dono
        // proibido de oferecer o que ele quer oferecer.
        channel,
        customerName: customerName ?? null,
      },
      pedirRascunhoAoBinno,
    ).then((resultado) => { if (vivo) setDoModelo(resultado); });
    return () => { vivo = false; };
  }, [open, channel, reviewId, text, rating, businessName, customerName]);

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

  /**
   * Os cartões do painel: o do modelo à frente, quando existe, e as variantes
   * do molde a seguir, intactas.
   *
   * `chave` é onde a edição do dono é guardada. A do modelo NÃO leva o idioma:
   * o modelo responde na língua em que o cliente escreveu, e o selector de
   * idioma acima manda nas variantes do molde, não nele. Fixar a chave também
   * é o que impede a regra 3 de ser quebrada pelo relógio: se a chave mudasse
   * quando o modelo chega, o texto que o dono já tinha escrito ficaria noutra
   * gaveta e a caixa voltaria a encher-se sozinha.
   *
   * `padrao` do cartão do modelo é o corpo da primeira variante, e não uma
   * string vazia: é o chão dele. Assim, mesmo que este cartão viesse a ser
   * desenhado sem resposta do modelo, ele mostraria texto útil em vez de uma
   * caixa em branco.
   */
  const cartoes = [
    ...(doModelo?.origem === 'modelo'
      ? [{
          id: 'do-modelo',
          chave: `modelo:${reviewId}`,
          title: t(channel === 'private' ? 'reply.modelTitlePrivate' : 'reply.modelTitle'),
          hint: t(channel === 'private' ? 'reply.modelHintPrivate' : 'reply.modelHint'),
          padrao: suggestions[0]?.body || '',
          doModelo,
        }]
      : []),
    ...suggestions.map((suggestion) => ({
      id: suggestion.id,
      chave: `${locale}:${suggestion.id}`,
      title: suggestion.title,
      hint: suggestion.hint,
      padrao: suggestion.body,
      doModelo: undefined as ResultadoDoModelo | undefined,
    })),
  ];

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
        <div className="flex flex-wrap items-center gap-2 text-sm font-medium text-gray-900">
          <MessageSquareQuote size={16} aria-hidden="true" />
          {t('reply.title')}
          {/*
            Enquanto o pedido está em curso não há cartão do modelo a que
            prender a etiqueta, e é o painel inteiro que está à espera. Depois
            de resolver, quem diz de onde veio o texto é cada cartão, porque a
            resposta é diferente de cartão para cartão.
          */}
          {doModelo?.origem === 'pedindo' && <OrigemDoRascunho origem="pedindo" />}
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
        {cartoes.map((cartao) => {
          // Quem decide o que está nesta caixa é a mesma `rascunhoNaTela` da
          // fila do painel, cartão a cartão: o que o dono escreveu ganha do
          // modelo, e o modelo ganha do molde. Duas telas, uma regra só.
          const naTela = rascunhoNaTela(drafts[cartao.chave], cartao.doModelo, cartao.padrao);
          const body = naTela.texto;
          const isCopied = copiedId === cartao.id;
          return (
            <div key={cartao.id} className="rounded-lg border border-gray-200 bg-white p-3">
              <div className="flex flex-wrap items-center gap-2">
                <p className="text-sm font-medium text-gray-900">{cartao.title}</p>
                <OrigemDoRascunho origem={naTela.origem} />
              </div>
              <p className="mt-0.5 text-xs text-gray-500">{cartao.hint}</p>

              <Textarea
                value={body}
                onChange={(e) =>
                  setDrafts((prev) => ({ ...prev, [cartao.chave]: e.target.value }))
                }
                rows={Math.min(12, body.split('\n').length + 2)}
                className="mt-3 resize-y text-sm"
                aria-label={t('reply.textareaLabel', { title: cartao.title })}
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
                <Button size="sm" variant="outline" className="w-full sm:w-auto" onClick={() => handleCopy(cartao.id, body)}>
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
