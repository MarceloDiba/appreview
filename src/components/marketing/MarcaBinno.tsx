/**
 * A marca, com o selo de fase.
 *
 * POR QUE UM COMPONENTE PARA DUAS PALAVRAS
 *
 * O nome "Binno" era desenhado à mão em sete sítios: as duas barras de
 * navegação, o login, o cadastro, o rodapé da página de vendas, a demonstração
 * e o painel ilustrativo. Marcelo pediu "Beta" abaixo da marca em 02/09/2026;
 * repetir o selo à mão nos sete garante que um deles fica para trás, e o que
 * fica para trás é sempre o menos visitado — que numa prospecção pode ser
 * exactamente o que o prospecto abre.
 *
 * Mais importante: o "Beta" vai SAIR um dia. Quando sair, sai daqui, de uma
 * vez, e não de sete sítios que alguém tem de encontrar.
 *
 * POR QUE O SELO É HONESTO E NÃO ENFEITE
 *
 * O Binno está a ser vendido antes de o WhatsApp oficial estar aprovado e antes
 * de o acesso ao Perfil da Empresa sair da análise do Google. Dizer "Beta" na
 * cara do produto é a diferença entre um cliente que entende o que está a
 * comprar e um cliente que se sente enganado na primeira coisa que falhar.
 */
type MarcaBinnoProps = {
  /** `md` nas barras de navegação, `lg` no login e no cadastro. */
  tamanho?: 'md' | 'lg';
  /** A cor do nome. Rodapé escuro pede branco; o resto usa o roxo da casa. */
  tom?: 'marca' | 'claro';
  className?: string;
};

export const MarcaBinno = ({ tamanho = 'md', tom = 'marca', className = '' }: MarcaBinnoProps) => {
  const nome = tamanho === 'lg' ? 'text-2xl' : 'text-xl';
  const cor = tom === 'claro' ? 'text-white' : 'text-[#6D43C0]';
  const corDoSelo = tom === 'claro' ? 'text-slate-300' : 'text-slate-500';
  return (
    <span className={`inline-flex flex-col leading-none ${className}`}>
      <span className={`${nome} font-bold tracking-tight ${cor}`}>Binno</span>
      {/*
        O selo fica ABAIXO do nome, como Marcelo pediu, e não ao lado: ao lado
        ele compete com o nome do negócio do cliente, que já se senta à direita
        da marca nas duas barras de navegação.

        `aria-label` porque quem ouve a página precisa de saber que isto é a
        fase do produto, e não uma palavra solta a seguir ao nome.
      */}
      <span
        className={`mt-0.5 text-[10px] font-semibold uppercase tracking-[0.18em] ${corDoSelo}`}
        aria-label="Versão beta"
      >
        Beta
      </span>
    </span>
  );
};

export default MarcaBinno;
