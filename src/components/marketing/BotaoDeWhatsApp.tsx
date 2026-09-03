import { linkDoWhatsAppDoBinno } from '@/lib/contactoDoBinno';

/**
 * O botão para falar com o Binno no WhatsApp.
 *
 * Pedido por Marcelo em 02/09/2026, na véspera de começar a prospecção: "quero
 * adicionar o botão de whatsapp tanto na página de vendas, quanto na página do
 * negócio pra que possam me consultar".
 *
 * DUAS FORMAS, PORQUE SÃO DUAS AUDIÊNCIAS
 *
 * `flutuante` é para a PÁGINA DE VENDAS. Quem está ali está a avaliar comprar,
 * e a pergunta que trava a compra aparece a meio da página, não no fim: o botão
 * fica sempre alcançável, canto inferior, sem obrigar a rolar de volta.
 *
 * `discreto` é para a PÁGINA DO NEGÓCIO — a que abre no telemóvel de um cliente
 * do nosso cliente, depois de ler o QR. A tarefa dessa pessoa é avaliar o
 * negócio, e nada pode competir com isso: um botão flutuante ali roubaria o
 * clique que o nosso cliente paga para receber. Fica uma linha no rodapé, a
 * seguir à escolha, para quem reparar e quiser perguntar. É o mesmo caminho
 * pelo qual um dono de negócio descobre o Binno ao ver o QR de outro.
 *
 * O NÚMERO NÃO VIVE AQUI. Vive em `src/lib/contactoDoBinno.ts`, para trocar num
 * sítio só quando existir um número comercial.
 */
type BotaoDeWhatsAppProps = {
  forma: 'flutuante' | 'discreto';
  /** O texto que já vai escrito na conversa. Diz de onde a pessoa veio. */
  mensagem: string;
  /** O que o botão diz. */
  rotulo: string;
};

const IconeDoWhatsApp = ({ className }: { className?: string }) => (
  // Desenhado à mão, e não trazido de uma biblioteca de ícones: o `lucide` que
  // o projeto usa não tem a marca do WhatsApp, e puxar um pacote inteiro por um
  // caminho de SVG custa mais do que este bloco.
  <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51l-.57-.01c-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884a9.82 9.82 0 016.988 2.898 9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z" />
  </svg>
);

export const BotaoDeWhatsApp = ({ forma, mensagem, rotulo }: BotaoDeWhatsAppProps) => {
  const href = linkDoWhatsAppDoBinno(mensagem);

  if (forma === 'discreto') {
    return (
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-1.5 rounded-full px-2 py-1 text-xs font-medium text-slate-500 underline-offset-2 transition hover:text-[#128C7E] hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#128C7E]"
      >
        <IconeDoWhatsApp className="h-3.5 w-3.5" />
        {rotulo}
      </a>
    );
  }

  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      // `fixed` com margem de segurança em baixo para não tapar nada em ecrãs
      // pequenos, e `z-40` para ficar abaixo de um diálogo (z-50) mas acima da
      // barra fixa do topo (z-30). Um botão de contacto por cima de um diálogo
      // de confirmação é a forma mais fácil de alguém carregar no errado.
      className="fixed bottom-5 right-5 z-40 inline-flex items-center gap-2 rounded-full bg-[#25D366] px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-emerald-900/20 transition hover:bg-[#1eb457] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#128C7E]"
    >
      <IconeDoWhatsApp className="h-5 w-5" />
      <span className="hidden sm:inline">{rotulo}</span>
      <span className="sr-only sm:hidden">{rotulo}</span>
    </a>
  );
};

export default BotaoDeWhatsApp;
