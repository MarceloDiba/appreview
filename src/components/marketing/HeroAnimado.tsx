import { useCallback, useEffect, useRef, useState } from 'react';
import { Star } from 'lucide-react';
import type { MarketingCopy } from '@/i18n/marketing';

/**
 * A avaliação real por trás da animação do hero.
 *
 * NÃO TRADUZIDA DE PROPÓSITO: é a mesma avaliação (cliente "Mesquita") que
 * aparece no print real da seção de prova (`public/marketing/
 * prova-avaliacao-google.jpg`). Traduzir as palavras dela para vender a um
 * visitante inglês inventaria uma citação que a cliente nunca escreveu. Só a
 * interface ao redor (rótulos, botão, confirmação) vem de `copy` e muda por
 * idioma — ver `src/i18n/marketing.ts`.
 */
const AVALIACAO_REAL = {
  autora: 'Mesquita',
  comentario: 'Agência Top de serviços de Sergipe, profissionais muito capacitados.',
  resposta: 'Olá, Mesquita, muito obrigado pelas suas palavras. Fico feliz em saber que tenha tido uma boa experiência com a gente. Noá Digital',
};

/** #A8790A: o amber da prévia, corrigido em 05/09/2026 por contraste (era #F5B301, 1,85:1). */
const AMBAR = 'text-[#A8790A] fill-[#A8790A]';

type Fase = 'sistema' | 'digitando1' | 'aviso' | 'enviado' | 'digitando2' | 'confirmado';

const pad2 = (n: number) => (n < 10 ? `0${n}` : `${n}`);

const TypingDots = () => (
  <div className="flex w-fit items-center gap-1 self-start rounded-2xl rounded-tl-sm bg-white px-3 py-2 shadow-sm" aria-hidden="true">
    {[0, 1, 2].map((dot) => (
      <span key={dot} className="h-1.5 w-1.5 animate-pulse rounded-full bg-slate-300" style={{ animationDelay: `${dot * 0.2}s` }} />
    ))}
  </div>
);

const NoticeBubble = ({ copy, fase, onPublicar }: { copy: MarketingCopy['hero']; fase: Fase; onPublicar: () => void }) => (
  <div className="max-w-[90%] self-start overflow-hidden rounded-2xl rounded-tl-sm bg-white text-sm leading-relaxed shadow-sm">
    <div className="px-3 pt-2.5">
      <p>{copy.chatNoticeIntro}</p>
      <p className="mt-2">⭐ {copy.chatRatingLabel}: {copy.chatRatingValue}</p>
      <p>👤 {copy.chatCustomerLabel}: {AVALIACAO_REAL.autora}</p>
      <p>💬 {copy.chatCommentLabel}: "{AVALIACAO_REAL.comentario}"</p>
      <p className="mt-2">✍️ {copy.chatDraftIntro}</p>
      <p>"{AVALIACAO_REAL.resposta}"</p>
      <p className="mt-2 pb-2.5">{copy.chatInstruction}</p>
    </div>
    <button
      type="button"
      onClick={onPublicar}
      disabled={fase !== 'aviso'}
      className={`flex min-h-11 w-full items-center justify-center gap-1.5 border-t border-slate-200 bg-white py-2.5 text-sm font-medium text-[#128C7E] disabled:cursor-default ${fase === 'aviso' ? 'animate-pulse' : ''}`}
    >
      ↩ {copy.chatButton}
    </button>
  </div>
);

/** A conversa dentro do telemóvel: uma bolha por vez, na ordem da fase atual. */
const ChatThread = ({ copy, fase, onPublicar }: { copy: MarketingCopy['hero']; fase: Fase; onPublicar: () => void }) => {
  const passouDoAviso = fase === 'enviado' || fase === 'digitando2' || fase === 'confirmado';
  return (
    <div className="flex min-h-[26rem] flex-col gap-2.5 bg-[radial-gradient(circle_at_1px_1px,rgba(0,0,0,0.05)_1px,transparent_0)] bg-[length:18px_18px] p-3">
      <div className="max-w-[90%] self-center rounded-lg bg-[#FFF5C4] px-3 py-1.5 text-center text-[0.68rem] text-[#5B4A00]">{copy.chatSystem}</div>
      {fase === 'digitando1' && <TypingDots />}
      {(fase === 'aviso' || passouDoAviso) && <NoticeBubble copy={copy} fase={fase} onPublicar={onPublicar} />}
      {passouDoAviso && <div className="max-w-[88%] self-end rounded-2xl rounded-tr-sm bg-[#DCF8C6] px-3 py-2 text-sm">{copy.chatButton}</div>}
      {fase === 'digitando2' && <TypingDots />}
      {fase === 'confirmado' && (
        <div className="max-w-[88%] self-start rounded-2xl rounded-tl-sm border-l-[3px] border-[#0B7A5B] bg-white px-3 py-2 text-sm leading-relaxed shadow-sm">
          <p className="font-bold">{copy.chatConfirmedTitle}</p>
          <p>{copy.chatConfirmedBody}</p>
        </div>
      )}
    </div>
  );
};

const GoogleReviewCard = ({ copy, visivel }: { copy: MarketingCopy['hero']; visivel: boolean }) => (
  <div
    aria-live="polite"
    className={`w-full overflow-hidden rounded-xl bg-white text-[#202124] shadow-[0_30px_60px_-20px_rgba(0,0,0,0.65)] transition-[max-height,opacity,padding] duration-700 ${visivel ? 'max-h-[32rem] px-4 py-4 opacity-100' : 'max-h-0 px-4 py-0 opacity-0'}`}
  >
    <div className="flex items-center gap-2.5">
      <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[#C5221F] text-sm font-bold text-white">M</span>
      <div>
        <p className="text-sm">{AVALIACAO_REAL.autora}</p>
        <p className="text-xs text-[#5f6368]">{copy.googleReviewerMeta}</p>
      </div>
    </div>
    <div className="mt-2 flex" aria-hidden="true">
      {[1, 2, 3, 4].map((star) => <Star key={star} className={`h-4 w-4 ${AMBAR}`} />)}
      <Star className="h-4 w-4 text-[#dadce0]" />
    </div>
    <p className="mt-2 text-sm leading-relaxed">{AVALIACAO_REAL.comentario}</p>
    <div className="mt-2.5 flex gap-5 text-xs font-medium">
      <span>👍 {copy.googleLike}</span>
      <span>{copy.googleShare}</span>
    </div>
    <div className="mt-3 border-l-2 border-[#dadce0] pl-3">
      <p className="text-sm">{copy.googleReplyLabel} <span className="text-xs font-normal text-[#5f6368]">{copy.googleReplyTime}</span></p>
      <p className="mt-1 text-sm leading-relaxed">{AVALIACAO_REAL.resposta}</p>
    </div>
  </div>
);

/**
 * Porta `hero-animacao.js` da prévia para React. `prefers-reduced-motion`
 * salta direto para o estado final (mesmo comportamento da prévia); os
 * temporizadores só existem quando o movimento não foi recusado, e são
 * sempre limpos antes de reiniciar e ao desmontar.
 */
const HeroAnimado = ({ copy }: { copy: MarketingCopy['hero'] }) => {
  const reduzMovimento = useRef(
    typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches,
  ).current;
  const [fase, setFase] = useState<Fase>(reduzMovimento ? 'confirmado' : 'sistema');
  const [segundos, setSegundos] = useState(reduzMovimento ? 21 : 0);
  const temporizadores = useRef<ReturnType<typeof setTimeout>[]>([]);
  const intervalo = useRef<ReturnType<typeof setInterval> | null>(null);
  const jaPublicou = useRef(reduzMovimento);

  const limpar = useCallback(() => {
    temporizadores.current.forEach(clearTimeout);
    temporizadores.current = [];
    if (intervalo.current) {
      clearInterval(intervalo.current);
      intervalo.current = null;
    }
  }, []);

  const depois = useCallback((ms: number, fn: () => void) => {
    temporizadores.current.push(setTimeout(fn, ms));
  }, []);

  const publicar = useCallback(() => {
    if (jaPublicou.current) return;
    jaPublicou.current = true;
    setFase('enviado');
    setSegundos(0);
    intervalo.current = setInterval(() => {
      setSegundos((atual) => {
        const proximo = atual + 1;
        if (proximo >= 21 && intervalo.current) {
          clearInterval(intervalo.current);
          intervalo.current = null;
        }
        return proximo;
      });
    }, 100);
    depois(700, () => setFase('digitando2'));
    depois(2100, () => setFase('confirmado'));
  }, [depois]);

  const iniciar = useCallback(() => {
    limpar();
    setSegundos(0);
    if (reduzMovimento) {
      jaPublicou.current = true;
      setFase('confirmado');
      setSegundos(21);
      return;
    }
    jaPublicou.current = false;
    setFase('sistema');
    depois(600, () => setFase('digitando1'));
    depois(1600, () => setFase('aviso'));
    depois(1600 + 9000, publicar);
  }, [limpar, depois, publicar, reduzMovimento]);

  useEffect(() => {
    iniciar();
    return limpar;
  }, [iniciar, limpar]);

  return (
    <div className="grid justify-items-center gap-4">
      <div
        aria-label={copy.phoneAriaLabel}
        className="w-full max-w-sm overflow-hidden rounded-[2.2rem] border-[8px] border-[#17102B] bg-[#EFE7DD] text-slate-900 shadow-[0_40px_80px_-30px_rgba(0,0,0,0.7)]"
      >
        <div className="flex items-center gap-2.5 border-b border-slate-200 bg-[#F6F6F6] px-4 py-3">
          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[#6D43C0] text-[10px] font-extrabold text-white">Binno</span>
          <div>
            <p className="text-sm font-semibold">{copy.headerName}</p>
            <p className="text-xs text-[#655F7C]">{copy.headerBadge}</p>
          </div>
        </div>
        <ChatThread copy={copy} fase={fase} onPublicar={publicar} />
      </div>
      <GoogleReviewCard copy={copy} visivel={fase === 'confirmado'} />
      <div className="flex items-center gap-2.5 text-sm text-[#C9B6F5]">
        <span>{copy.timerLabel}</span>
        <b className="font-mono text-lg text-white">00:{pad2(Math.min(segundos, 21))}</b>
        <button
          type="button"
          onClick={iniciar}
          className="min-h-11 rounded-md border border-white/30 px-3 text-xs text-[#C9B6F5] hover:border-white hover:text-white"
        >
          {copy.replayLabel}
        </button>
      </div>
    </div>
  );
};

export default HeroAnimado;
