import { useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { useOwnerTranslation } from '@/i18n/owner/useOwnerTranslation';
import type { BusinessReview } from '@/hooks/useGoogleBusinessReviewQueue';

/**
 * O caminho de volta a uma resposta JA publicada no Google.
 *
 * POR QUE ISTO EXISTE
 *
 * Em 03/09/2026 o Binno publicou uma resposta em INGLES no perfil público de
 * um cliente real. O texto saiu gramatical, ninguém viu erro nenhum, e só quem
 * conhecia o negócio reparou. Descoberto o defeito, a resposta continuou lá:
 * o Google aceita sobrescrever — `publish-reply` já é um PUT — mas o painel
 * escondia a avaliação assim que ela ganhava resposta, e não havia porta de
 * volta. O dono ficou com um erro público e nenhuma forma de corrigi-lo sem
 * sair do produto.
 *
 * Esta lista é essa porta. Não é um histórico para navegar: são as últimas
 * respostas publicadas, para alcançar a errada antes que mais clientes a leiam.
 *
 * DUAS REGRAS QUE NÃO SÃO DECORAÇÃO
 *
 * 1. Corrigir não é publicar. Publicar acrescenta o que não existia; corrigir
 *    APAGA o que o cliente já pode ter lido. Por isso o editor abre fechado, e
 *    o botão só acorda quando o texto mudou de verdade — um clique distraído
 *    não reescreve nada.
 * 2. A lista fica separada da fila. "N esperando resposta" conta a fila; somar
 *    as respondidas faria o número SUBIR a cada resposta publicada, que é o
 *    contrário do que ele significa.
 */

const UmaResposta = ({
  avaliacao,
  publicar,
  publicando,
}: {
  avaliacao: BusinessReview;
  publicar: (id: string, texto: string) => Promise<boolean>;
  publicando: boolean;
}) => {
  const { t } = useOwnerTranslation();
  const publicada = avaliacao.reply_text || '';
  const [aCorrigir, setACorrigir] = useState(false);
  const [rascunho, setRascunho] = useState(publicada);

  const autor = avaliacao.reviewer_name || t('reviews.google.official.anonymous');
  // O texto tem de MUDAR. Reenviar o mesmo texto não corrige nada e ainda
  // gasta uma escrita no perfil do cliente.
  const mudou = rascunho.trim().length > 0 && rascunho.trim() !== publicada.trim();

  const enviar = async () => {
    if (!mudou) return;
    if (await publicar(avaliacao.id, rascunho.trim())) {
      toast.success(t('reviews.google.official.corrected', { autor }));
      setACorrigir(false);
    } else {
      toast.error(t('reviews.google.official.publishError'));
    }
  };

  return (
    <li className="rounded-lg border border-slate-200 bg-white px-3 py-3">
      <p className="text-sm font-semibold text-slate-900">{autor}</p>
      {avaliacao.comment && (
        <p className="mt-1 text-sm leading-6 text-slate-600 whitespace-pre-wrap break-words">
          {avaliacao.comment}
        </p>
      )}
      <p className="mt-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
        {t('reviews.google.official.publishedLabel')}
      </p>
      <p className="mt-1 text-sm leading-6 text-slate-900 whitespace-pre-wrap break-words">
        {publicada}
      </p>

      {!aCorrigir ? (
        <Button
          variant="outline"
          className="mt-3 rounded-full"
          onClick={() => { setRascunho(publicada); setACorrigir(true); }}
        >
          {t('reviews.google.official.correct')}
        </Button>
      ) : (
        <div className="mt-3">
          <p className="text-sm leading-6 text-slate-700">
            {t('reviews.google.official.correctWarning')}
          </p>
          <Textarea
            className="mt-2 min-h-28 resize-y text-sm"
            value={rascunho}
            onChange={(evento) => setRascunho(evento.target.value)}
          />
          <div className="mt-3 flex flex-wrap gap-2">
            <Button
              className="rounded-full bg-[#2457D6] hover:bg-[#1d47b0]"
              disabled={publicando || !mudou}
              onClick={() => void enviar()}
            >
              {publicando
                ? t('reviews.google.official.publishing')
                : t('reviews.google.official.correctConfirm')}
            </Button>
            <Button variant="ghost" className="rounded-full" onClick={() => setACorrigir(false)}>
              {t('reviews.google.official.correctCancel')}
            </Button>
          </div>
        </div>
      )}
    </li>
  );
};

export const RespostasPublicadas = ({
  respondidas,
  publicar,
  publicando,
}: {
  respondidas: BusinessReview[];
  publicar: (id: string, texto: string) => Promise<boolean>;
  publicando: boolean;
}) => {
  const { t } = useOwnerTranslation();
  if (respondidas.length === 0) return null;

  return (
    <section className="mt-6 rounded-xl border border-slate-200 bg-slate-50 px-4 py-4">
      <h3 className="text-sm font-semibold text-slate-900">
        {t('reviews.google.official.publishedTitle')}
      </h3>
      <p className="mt-1 text-sm leading-6 text-slate-600">
        {t('reviews.google.official.publishedBody')}
      </p>
      <ul className="mt-3 space-y-3">
        {respondidas.map((avaliacao) => (
          <UmaResposta
            key={avaliacao.id}
            avaliacao={avaliacao}
            publicar={publicar}
            publicando={publicando}
          />
        ))}
      </ul>
    </section>
  );
};
