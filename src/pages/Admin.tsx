import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { AlertTriangle, CheckCircle2, ChevronDown, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import NotFound from '@/pages/NotFound';
import MarcaBinno from '@/components/marketing/MarcaBinno';
import { EXPLICACAO_DOS_SINAIS, lerSaudeDasContas, type LeituraDaSaude, type SaudeDaConta } from '@/lib/saudeDasContas';

/**
 * A área do Marcelo: quem travou, agora.
 *
 * PARA QUEM ESTA PÁGINA NÃO É
 *
 * Não é para o cliente. Ele nunca a alcança: a função no banco recusa quem não
 * está em `admins`, e esta tela responde a essa recusa com a MESMA página de
 * "não encontrado" de qualquer rota inválida. Uma mensagem de "acesso negado"
 * confirmaria que a rota existe, e uma rota que se sabe existir é uma rota que
 * alguém tenta.
 *
 * O QUE ELA RESPONDE
 *
 * Uma pergunta só: o que preciso de resolver. Por isso a ordem é por gravidade
 * e não por nome, não há filtro nem procura, e não há gráfico nenhum — um
 * gráfico responde "como foi ao longo do tempo", que é a pergunta do painel
 * comercial, e esse ficou de fora de propósito.
 */
const CORES = {
  travado: { faixa: 'bg-red-500', etiqueta: 'bg-red-50 text-red-800 border-red-200', rotulo: 'Travado' },
  atencao: { faixa: 'bg-amber-400', etiqueta: 'bg-amber-50 text-amber-900 border-amber-200', rotulo: 'Atenção' },
  ok: { faixa: 'bg-emerald-500', etiqueta: 'bg-emerald-50 text-emerald-800 border-emerald-200', rotulo: 'Tudo certo' },
} as const;

const Numero = ({ rotulo, valor }: { rotulo: string; valor: string }) => (
  <div>
    <p className="text-xs text-slate-500">{rotulo}</p>
    <p className="text-sm font-semibold tabular-nums text-slate-950">{valor}</p>
  </div>
);

const LinhaDaConta = ({ conta }: { conta: SaudeDaConta }) => {
  const [aberta, setAberta] = useState(conta.gravidade === 'travado');
  const cor = CORES[conta.gravidade];
  // Os sinais informativos aparecem na lista, mas nunca fazem a conta parecer
  // um problema: `coleta_antiga` é o único hoje, e ele acende em toda conta que
  // não coleta há um mês — que é o normal, porque não existe coleta recorrente.
  const problemas = conta.sinais.filter((sinal) => sinal !== 'coleta_antiga');

  return (
    <li className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
      <div className="flex">
        <span className={`w-1.5 shrink-0 ${cor.faixa}`} aria-hidden="true" />
        <div className="flex-1 p-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="font-semibold text-slate-950">{conta.negocio || 'Sem nome de negócio'}</p>
              <p className="text-xs text-slate-500">{conta.emailDaConta}</p>
            </div>
            <span className={`rounded-full border px-2.5 py-1 text-xs font-semibold ${cor.etiqueta}`}>{cor.rotulo}</span>
          </div>

          <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-5">
            <Numero rotulo="Nota" valor={conta.nota === null ? '—' : conta.nota.toFixed(1).replace('.', ',')} />
            <Numero rotulo="Avaliações" valor={conta.totalDeAvaliacoes === null ? '—' : String(conta.totalDeAvaliacoes)} />
            <Numero rotulo="Última coleta" valor={conta.diasDesdeAColeta === null ? 'nunca' : `${conta.diasDesdeAColeta} d`} />
            <Numero rotulo="Comentários" valor={String(conta.comentariosPrivados)} />
            <Numero rotulo="A responder" valor={String(conta.filaDeRespostas)} />
          </div>

          {conta.sinais.length > 0 && (
            <>
              <button
                type="button"
                onClick={() => setAberta((valor) => !valor)}
                aria-expanded={aberta}
                className="mt-4 inline-flex items-center gap-1.5 text-sm font-medium text-[#2457D6] hover:underline"
              >
                <ChevronDown className={`h-4 w-4 transition ${aberta ? 'rotate-180' : ''}`} aria-hidden="true" />
                {problemas.length > 0
                  ? `${problemas.length} ${problemas.length === 1 ? 'sinal' : 'sinais'}`
                  : 'Informação'}
              </button>
              {aberta && (
                <ul className="mt-3 space-y-3 border-t border-slate-100 pt-3">
                  {conta.sinais.map((sinal) => {
                    const explicacao = EXPLICACAO_DOS_SINAIS[sinal];
                    const informativo = sinal === 'coleta_antiga';
                    return (
                      <li key={sinal} className="flex gap-2.5 text-sm leading-5">
                        <AlertTriangle
                          className={`mt-0.5 h-4 w-4 shrink-0 ${informativo ? 'text-slate-400' : 'text-red-600'}`}
                          aria-hidden="true"
                        />
                        <span>
                          <strong className="block text-slate-950">{explicacao.titulo}</strong>
                          <span className="text-slate-600">{explicacao.passo}</span>
                        </span>
                      </li>
                    );
                  })}
                </ul>
              )}
            </>
          )}
        </div>
      </div>
    </li>
  );
};

const Admin = () => {
  const [leitura, setLeitura] = useState<LeituraDaSaude | null>(null);
  const [carregando, setCarregando] = useState(true);

  const carregar = async () => {
    setCarregando(true);
    setLeitura(await lerSaudeDasContas());
    setCarregando(false);
  };

  useEffect(() => { void carregar(); }, []);

  if (carregando && !leitura) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <div className="h-10 w-10 animate-spin rounded-full border-b-2 border-t-2 border-[#2457D6]" />
      </div>
    );
  }

  // A recusa devolve a página de "não encontrado", e não uma negação: uma
  // negação confirma que a rota existe.
  if (!leitura || leitura.estado === 'sem-permissao') return <NotFound />;

  if (leitura.estado === 'falhou') {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 p-4">
        <div className="max-w-md rounded-xl border border-red-200 bg-red-50 p-5 text-sm leading-6 text-red-900">
          <p className="font-semibold">Não consegui ler a saúde das contas.</p>
          <p className="mt-1">{leitura.detalhe}</p>
          <Button variant="outline" className="mt-4" onClick={() => void carregar()}>Tentar de novo</Button>
        </div>
      </div>
    );
  }

  const travadas = leitura.contas.filter((conta) => conta.gravidade === 'travado').length;
  const atencao = leitura.contas.filter((conta) => conta.gravidade === 'atencao').length;

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-4 sm:px-6">
          <Link to="/dashboard" aria-label="Binno"><MarcaBinno /></Link>
          <Button variant="outline" size="sm" onClick={() => void carregar()} disabled={carregando}>
            <RefreshCw className={`mr-2 h-4 w-4 ${carregando ? 'animate-spin' : ''}`} aria-hidden="true" />
            Atualizar
          </Button>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
        <h1 className="text-2xl font-bold tracking-tight text-slate-950">Saúde das contas</h1>
        <p className="mt-2 max-w-prose text-sm leading-6 text-slate-600">
          {travadas === 0 && atencao === 0
            ? `Nenhuma conta com sinal de problema. ${leitura.contas.length} ${leitura.contas.length === 1 ? 'conta' : 'contas'} no total.`
            : `${travadas} ${travadas === 1 ? 'conta travada' : 'contas travadas'} e ${atencao} para acompanhar, de ${leitura.contas.length} no total.`}
        </p>

        {travadas === 0 && atencao === 0 && (
          <p className="mt-5 flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-900">
            <CheckCircle2 className="h-5 w-5 shrink-0" aria-hidden="true" />
            Tudo destravado agora.
          </p>
        )}

        <ul className="mt-6 space-y-3">
          {leitura.contas.map((conta) => <LinhaDaConta key={conta.userId} conta={conta} />)}
        </ul>

        <p className="mt-8 max-w-prose text-xs leading-5 text-slate-500">
          Esta página mostra números e sinais de saúde. Não mostra o texto de avaliações
          nem o nome ou telefone de quem escreveu — decisão de 02/09/2026, e a fronteira
          está no banco, não nesta tela.
        </p>
      </main>
    </div>
  );
};

export default Admin;
