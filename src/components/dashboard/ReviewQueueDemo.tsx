import React, { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Check, CheckCircle2, Clock3, MessageSquareText, RotateCcw, Sparkles, Star } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Textarea } from '@/components/ui/textarea';
import { useOwnerTranslation } from '@/i18n/owner/useOwnerTranslation';

type QueueStatus = 'answered' | 'pending' | 'deferred';

interface QueueReview {
  id: string;
  authorName: string;
  rating: number;
  time: string;
  text: string;
  suggestedReply: string;
  initialStatus: QueueStatus;
}

const reviews: QueueReview[] = [
  {
    id: 'mariana',
    authorName: 'Mariana Souza',
    rating: 2,
    time: '10:42',
    text: 'O atendimento foi demorado e não resolveram meu problema como eu esperava.',
    suggestedReply: 'Olá, Mariana! Lamentamos pela demora e por não termos atendido às suas expectativas. Estamos revendo o atendimento nos horários de maior movimento. Podemos conversar em privado para entendermos melhor o que aconteceu?',
    initialStatus: 'pending',
  },
  {
    id: 'ricardo',
    authorName: 'Ricardo Lima',
    rating: 3,
    time: '12:18',
    text: 'A comida estava boa, mas o pedido demorou bastante para chegar.',
    suggestedReply: 'Olá, Ricardo! Obrigado por destacar a comida e por nos alertar sobre a demora. Estamos revendo os tempos de saída da cozinha nos horários de maior movimento. Esperamos recebê-lo novamente com uma experiência mais ágil.',
    initialStatus: 'pending',
  },
  {
    id: 'camila',
    authorName: 'Camila Rocha',
    rating: 5,
    time: '14:05',
    text: 'Equipe muito atenciosa e hambúrguer excelente. Voltarei com certeza!',
    suggestedReply: 'Olá, Camila! Ficamos muito felizes em saber que gostou do atendimento e do hambúrguer. Obrigado por compartilhar sua experiência. Será um prazer recebê-la novamente!',
    initialStatus: 'pending',
  },
  {
    id: 'joao',
    authorName: 'João Ribeiro',
    rating: 5,
    time: '09:16',
    text: 'Tudo ótimo, atendimento rápido e ambiente agradável.',
    suggestedReply: 'Olá, João! Muito obrigado pela avaliação. Ficamos felizes em saber que gostou do atendimento e do ambiente. Esperamos vê-lo novamente em breve!',
    initialStatus: 'answered',
  },
  {
    id: 'ines',
    authorName: 'Inês Martins',
    rating: 4,
    time: '08:37',
    text: 'Gostei muito. O espaço estava cheio, mas a equipa foi simpática.',
    suggestedReply: 'Olá, Inês! Obrigado pela visita e por reconhecer o cuidado da nossa equipa mesmo num horário movimentado. Esperamos recebê-la novamente em breve!',
    initialStatus: 'answered',
  },
];

const ExampleBadge = () => (
  <span className="rounded-full border border-indigo-100 bg-indigo-50 px-2.5 py-1 text-[11px] font-medium text-indigo-700">
    Exemplo ilustrativo
  </span>
);

const ReviewStars = ({ rating, label }: { rating: number; label: string }) => (
  <div className="flex" aria-label={label}>
    {[1, 2, 3, 4, 5].map((star) => (
      <Star key={star} className={`h-5 w-5 ${star <= rating ? 'fill-amber-400 text-amber-400' : 'text-stone-200'}`} />
    ))}
  </div>
);

const ReviewQueueDemo = () => {
  const { t } = useOwnerTranslation();
  const initialStatuses = useMemo(
    () => Object.fromEntries(reviews.map((review) => [review.id, review.initialStatus])) as Record<string, QueueStatus>,
    []
  );
  const initialReplies = useMemo(
    () => Object.fromEntries(reviews.map((review) => [review.id, review.suggestedReply])) as Record<string, string>,
    []
  );
  const [statuses, setStatuses] = useState(initialStatuses);
  const [replies, setReplies] = useState(initialReplies);
  const [activeId, setActiveId] = useState(reviews.find((review) => review.initialStatus === 'pending')?.id || reviews[0].id);

  const activeReview = reviews.find((review) => review.id === activeId) || reviews[0];
  const pendingReviews = reviews.filter((review) => statuses[review.id] === 'pending');
  const answeredCount = reviews.filter((review) => statuses[review.id] === 'answered').length;
  const deferredCount = reviews.filter((review) => statuses[review.id] === 'deferred').length;
  const completed = pendingReviews.length === 0;
  const progress = ((answeredCount + deferredCount) / reviews.length) * 100;

  const moveToNext = (currentId: string, nextStatus: QueueStatus) => {
    const nextStatuses = { ...statuses, [currentId]: nextStatus };
    setStatuses(nextStatuses);
    const nextReview = reviews.find((review) => nextStatuses[review.id] === 'pending');
    if (nextReview) setActiveId(nextReview.id);
  };

  const reset = () => {
    setStatuses(initialStatuses);
    setReplies(initialReplies);
    setActiveId(reviews.find((review) => review.initialStatus === 'pending')?.id || reviews[0].id);
  };

  return (
    <div className="min-h-screen bg-[#f7f6f2] px-4 pb-12 pt-24">
      <div className="container mx-auto max-w-7xl">
        <div className="mb-5 flex flex-wrap items-start justify-between gap-4">
          <div>
            <Button asChild variant="ghost" className="mb-3 h-auto p-0 text-stone-600 hover:bg-transparent hover:text-stone-950">
              <Link to="/demo?view=panel"><ArrowLeft className="mr-2 h-4 w-4" />{t('dashboard.reviewQueue.back')}</Link>
            </Button>
            <div className="flex flex-wrap items-center gap-3">
              <h1 className="text-3xl font-semibold tracking-tight text-stone-950">{t('dashboard.reviewQueue.title')}</h1>
              <ExampleBadge />
            </div>
            <p className="mt-2 text-stone-600">{t('dashboard.reviewQueue.subtitle')}</p>
          </div>
          <Button variant="outline" onClick={reset}><RotateCcw className="mr-2 h-4 w-4" />{t('dashboard.reviewQueue.reset')}</Button>
        </div>

        <Card className="border-stone-200 bg-white shadow-sm">
          <CardContent className="p-5 sm:p-6">
            <div className="grid gap-5 sm:grid-cols-3">
              <div><p className="text-sm text-stone-500">{t('dashboard.reviewQueue.newToday')}</p><p className="mt-1 text-3xl font-semibold text-stone-950">5</p></div>
              <div><p className="text-sm text-stone-500">{t('dashboard.reviewQueue.awaiting')}</p><p className="mt-1 text-3xl font-semibold text-amber-700">{pendingReviews.length}</p></div>
              <div><p className="text-sm text-stone-500">{t('dashboard.reviewQueue.answered')}</p><p className="mt-1 text-3xl font-semibold text-emerald-700">{answeredCount}</p></div>
            </div>
            <Progress className="mt-5 h-2" value={progress} />
          </CardContent>
        </Card>

        {completed ? (
          <Card className="mt-4 border-emerald-200 bg-white shadow-sm">
            <CardContent className="flex min-h-[420px] flex-col items-center justify-center p-8 text-center">
              <span className="flex h-16 w-16 items-center justify-center rounded-full bg-emerald-50"><CheckCircle2 className="h-8 w-8 text-emerald-600" /></span>
              <h2 className="mt-5 text-2xl font-semibold text-stone-950">{t('dashboard.reviewQueue.completedTitle')}</h2>
              <p className="mt-2 max-w-lg text-stone-600">{t('dashboard.reviewQueue.completedBody', { answered: answeredCount, count: deferredCount })}</p>
              <div className="mt-6 flex flex-wrap justify-center gap-3">
                <Button asChild className="bg-[#102878] hover:bg-[#0b1d5b]"><Link to="/demo?view=panel">{t('dashboard.reviewQueue.returnPanel')}</Link></Button>
                <Button variant="outline" onClick={reset}>{t('dashboard.reviewQueue.repeat')}</Button>
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="mt-4 grid gap-4 lg:grid-cols-[1.55fr_0.85fr]">
            <Card className="border-stone-200 bg-white shadow-sm">
              <CardContent className="p-5 sm:p-6">
                <div className="flex flex-wrap items-start justify-between gap-4 border-b border-stone-200 pb-5">
                  <div>
                    <div className="flex flex-wrap items-center gap-3">
                      <p className="text-lg font-semibold text-stone-950">{activeReview.authorName}</p>
                      <span className="rounded-full bg-amber-50 px-2.5 py-1 text-xs font-medium text-amber-800">{t('dashboard.reviewQueue.priority')}</span>
                    </div>
                    <p className="mt-1 text-xs text-stone-500">{t('dashboard.reviewQueue.todayAt', { time: activeReview.time })}</p>
                  </div>
                  <ReviewStars rating={activeReview.rating} label={t('dashboard.advisor.ratingAria', { rating: activeReview.rating })} />
                </div>

                <p className="mt-5 text-base leading-relaxed text-stone-700">{activeReview.text}</p>
                <div className="mt-5 rounded-xl border border-indigo-100 bg-indigo-50/60 p-4">
                  <p className="flex items-center gap-2 text-sm font-semibold text-[#102878]"><Sparkles className="h-4 w-4" />{t('dashboard.reviewQueue.advisorReading')}</p>
                  <p className="mt-2 text-sm leading-relaxed text-stone-700">{activeReview.rating <= 3 ? t('dashboard.reviewQueue.lowReading') : t('dashboard.reviewQueue.positiveReading')}</p>
                </div>

                <div className="mt-6 flex flex-wrap items-center justify-between gap-2">
                  <label htmlFor={`reply-${activeReview.id}`} className="text-sm font-semibold text-stone-900">{t('dashboard.reviewQueue.suggestedReply')}</label>
                  <span className="text-xs text-stone-500">{t('dashboard.reviewQueue.editBefore')}</span>
                </div>
                <Textarea
                  id={`reply-${activeReview.id}`}
                  className="mt-3 min-h-36 resize-y border-stone-300 bg-white leading-relaxed"
                  value={replies[activeReview.id]}
                  onChange={(event) => setReplies((current) => ({ ...current, [activeReview.id]: event.target.value }))}
                />

                <div className="mt-5 flex flex-col gap-3 sm:flex-row">
                  <Button className="flex-1 bg-[#102878] hover:bg-[#0b1d5b]" onClick={() => moveToNext(activeReview.id, 'answered')} disabled={!replies[activeReview.id].trim()}>
                    <Check className="mr-2 h-4 w-4" />{t('dashboard.reviewQueue.simulateReply')}
                  </Button>
                  <Button variant="outline" onClick={() => moveToNext(activeReview.id, 'deferred')}>
                    <Clock3 className="mr-2 h-4 w-4" />{t('dashboard.reviewQueue.defer')}
                  </Button>
                </div>
                <p className="mt-4 text-xs leading-relaxed text-stone-500">{t('dashboard.reviewQueue.demoDisclaimer')}</p>
              </CardContent>
            </Card>

            <Card className="border-stone-200 bg-white shadow-sm">
              <CardContent className="p-5 sm:p-6">
                <div className="flex items-center justify-between gap-3">
                  <div><h2 className="text-lg font-semibold text-stone-950">{t('dashboard.reviewQueue.todayQueue')}</h2><p className="mt-1 text-sm text-stone-500">{t('dashboard.reviewQueue.queueHint')}</p></div>
                  <MessageSquareText className="h-5 w-5 text-[#102878]" />
                </div>
                <div className="mt-5 divide-y divide-stone-200 rounded-xl border border-stone-200">
                  {reviews.map((review) => {
                    const status = statuses[review.id];
                    const selectable = status === 'pending';
                    return (
                      <button
                        key={review.id}
                        type="button"
                        disabled={!selectable}
                        onClick={() => setActiveId(review.id)}
                        className={`flex w-full items-center gap-3 p-3 text-left transition-colors first:rounded-t-xl last:rounded-b-xl ${activeId === review.id && selectable ? 'bg-indigo-50' : selectable ? 'hover:bg-stone-50' : 'cursor-default bg-stone-50/60'}`}
                      >
                        <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${status === 'answered' ? 'bg-emerald-50 text-emerald-700' : status === 'deferred' ? 'bg-amber-50 text-amber-700' : 'bg-white text-stone-600'}`}>
                          {status === 'answered' ? <Check className="h-4 w-4" /> : status === 'deferred' ? <Clock3 className="h-4 w-4" /> : review.rating}
                        </span>
                        <span className="min-w-0 flex-1"><span className="block truncate text-sm font-medium text-stone-900">{review.authorName}</span><span className="block text-xs text-stone-500">{t(`dashboard.reviewQueue.status.${status}`)}</span></span>
                        <span className="text-xs text-stone-400">{review.time}</span>
                      </button>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
};

export default ReviewQueueDemo;
