import React from 'react';
import LegalLayout, { Dado, Seccao } from '@/components/layout/LegalLayout';
import { LEGAL, SUBCONTRATANTES } from '@/lib/legal';

/**
 * Política de Privacidade.
 *
 * Escrita para ser lida por um dono de restaurante, não por um jurista. Duas
 * coisas que não podem sair daqui, porque são as que nos expõem a sério:
 *
 * 1. A distinção de papéis. Nos dados dos clientes finais, quem manda é o
 *    estabelecimento (responsável) e o AppReview é subcontratante. É isso que
 *    determina quem responde perante a CNPD.
 * 2. A transferência para o Brasil. O banco está em São Paulo e o cliente está
 *    em Lisboa. Esconder isto seria a falha mais fácil de provar contra nós.
 */
const Privacy = () => (
  <LegalLayout title="Política de Privacidade" updatedAt={LEGAL.versao}>
    <p>
      Esta política explica que dados o {LEGAL.servico} recolhe, para que servem, onde ficam
      guardados e o que pode exigir a qualquer momento. Está escrita em linguagem simples de
      propósito. Se alguma coisa aqui não for clara, escreva para{' '}
      <a className="text-primary underline" href={`mailto:${LEGAL.email}`}>
        {LEGAL.email}
      </a>{' '}
      e explicamos.
    </p>

    <Seccao titulo="Quem é responsável pelos seus dados">
      <p>
        O serviço é prestado por <Dado valor={LEGAL.entidade} />, com o número de identificação
        fiscal <Dado valor={LEGAL.identificacaoFiscal} /> e sede em <Dado valor={LEGAL.morada} />.
        Para qualquer questão de protecção de dados, o contacto é{' '}
        <a className="text-primary underline" href={`mailto:${LEGAL.email}`}>
          {LEGAL.email}
        </a>
        .
      </p>
    </Seccao>

    <Seccao titulo="Há dois tipos de dados, com responsáveis diferentes">
      <p>
        <strong>Os dados da conta do estabelecimento.</strong> Nome, endereço de e-mail, nome do
        negócio e palavra-passe de quem cria a conta. Aqui o responsável pelo tratamento somos nós.
      </p>
      <p>
        <strong>Os dados de quem avalia.</strong> Quando um cliente do estabelecimento lê o QR code
        e escreve algo, esses dados pertencem ao estabelecimento: é ele que decide o que fazer com
        eles e quem responde por eles. O {LEGAL.servico} limita-se a guardá-los e a mostrá-los ao
        estabelecimento — somos subcontratante, e só tratamos esses dados conforme as instruções de
        quem contratou o serviço.
      </p>
    </Seccao>

    <Seccao titulo="Que dados recolhemos">
      <ul className="list-disc space-y-2 pl-5">
        <li>
          <strong>Conta:</strong> nome, e-mail, nome do estabelecimento e palavra-passe. A
          palavra-passe é guardada cifrada pelo serviço de autenticação e nunca é visível para nós.
        </li>
        <li>
          <strong>Avaliação interna:</strong> a nota dada, o texto escrito, e — apenas se o cliente
          os quiser dar — o nome e um contacto de e-mail ou WhatsApp. Os dois últimos são
          opcionais, e está escrito no formulário que o são.
        </li>
        <li>
          <strong>Configuração:</strong> os endereços públicos do estabelecimento no Google e no
          TripAdvisor, e os QR codes criados.
        </li>
        <li>
          <strong>Avaliações públicas:</strong> lemos as avaliações que já são públicas no perfil do
          Google do estabelecimento, através da API do Google Places, para as mostrar no painel.
        </li>
      </ul>
      <p>
        Não usamos cookies de publicidade nem ferramentas de análise de tráfego. O único
        armazenamento no seu navegador é o que mantém a sessão iniciada.
      </p>
    </Seccao>

    <Seccao titulo="Para que usamos e com que fundamento">
      <ul className="list-disc space-y-2 pl-5">
        <li>
          <strong>Prestar o serviço</strong> — mostrar os casos ao dono, gerar QR codes, ler as
          avaliações públicas. Fundamento: execução do contrato.
        </li>
        <li>
          <strong>Permitir que o estabelecimento responda</strong> a quem deixou um contacto.
          Fundamento: interesse legítimo do estabelecimento em resolver a reclamação de um cliente
          que pediu explicitamente que o contactassem.
        </li>
        <li>
          <strong>Cumprir obrigações legais</strong> de facturação e contabilidade.
        </li>
      </ul>
      <p>
        Não vendemos dados a ninguém, não os usamos para publicidade e não os cruzamos com outras
        fontes.
      </p>
    </Seccao>

    <Seccao titulo="Onde ficam os dados — e a transferência para fora da União Europeia">
      <p>
        A base de dados do {LEGAL.servico} está alojada na Supabase, na região de São Paulo, Brasil.
        Isto significa que os dados recolhidos em Portugal são transferidos para fora do Espaço
        Económico Europeu.
      </p>
      <p>
        O Brasil não tem decisão de adequação da Comissão Europeia. A transferência é feita ao
        abrigo das cláusulas contratuais-tipo aprovadas pela Comissão, incluídas no acordo de
        tratamento de dados com o fornecedor de alojamento. Está prevista a migração da base de
        dados para uma região da União Europeia.
      </p>
    </Seccao>

    <Seccao titulo="Quem trata dados por nós">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-200 text-left text-gray-500">
              <th className="py-2 pr-4 font-medium">Fornecedor</th>
              <th className="py-2 pr-4 font-medium">Para quê</th>
              <th className="py-2 font-medium">Onde</th>
            </tr>
          </thead>
          <tbody>
            {SUBCONTRATANTES.map((s) => (
              <tr key={s.nome} className="border-b border-gray-100 align-top">
                <td className="py-2 pr-4 font-medium text-gray-900">{s.nome}</td>
                <td className="py-2 pr-4">{s.funcao}</td>
                <td className="py-2">{s.local}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Seccao>

    <Seccao titulo="Durante quanto tempo guardamos">
      <ul className="list-disc space-y-2 pl-5">
        <li>
          <strong>Dados da conta:</strong> enquanto a conta existir, e até 30 dias depois do
          cancelamento, para permitir recuperá-la por engano.
        </li>
        <li>
          <strong>Avaliações internas:</strong> enquanto a conta do estabelecimento existir, porque
          é o histórico dele. O estabelecimento pode pedir o apagamento de qualquer caso a qualquer
          momento.
        </li>
        <li>
          <strong>Registos de facturação:</strong> o prazo exigido por lei.
        </li>
      </ul>
    </Seccao>

    <Seccao titulo="Os seus direitos">
      <p>
        Tem direito a saber que dados temos sobre si, a obter uma cópia, a corrigi-los, a apagá-los,
        a limitar ou opor-se ao tratamento e a levá-los para outro serviço. Basta escrever para{' '}
        <a className="text-primary underline" href={`mailto:${LEGAL.email}`}>
          {LEGAL.email}
        </a>
        . Respondemos no prazo de um mês.
      </p>
      <p>
        Se for um cliente que avaliou um estabelecimento e quiser apagar o que escreveu, pode
        escrever-nos directamente e nós encaminhamos o pedido ao estabelecimento, que é quem decide
        — mas cumprimos a instrução em qualquer caso.
      </p>
      <p>
        Se achar que os seus dados estão a ser mal tratados, pode apresentar queixa à autoridade de
        controlo. Em Portugal é a Comissão Nacional de Protecção de Dados (CNPD), em{' '}
        <a
          className="text-primary underline"
          href="https://www.cnpd.pt"
          target="_blank"
          rel="noopener noreferrer"
        >
          cnpd.pt
        </a>
        .
      </p>
    </Seccao>

    <Seccao titulo="Menores">
      <p>
        O {LEGAL.servico} não se dirige a menores de 16 anos e não recolhe dados deles
        conscientemente. Se souber que isso aconteceu, avise-nos e apagamos.
      </p>
    </Seccao>

    <Seccao titulo="Alterações a esta política">
      <p>
        Se mudarmos alguma coisa relevante — em particular onde ficam guardados os dados — avisamos
        por e-mail quem tem conta activa, antes da alteração entrar em vigor.
      </p>
    </Seccao>
  </LegalLayout>
);

export default Privacy;
