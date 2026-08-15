import React from 'react';
import { Link } from 'react-router-dom';
import LegalLayout, { Dado, Seccao } from '@/components/layout/LegalLayout';
import { LEGAL } from '@/lib/legal';

/**
 * Termos de Serviço.
 *
 * A cláusula que não pode desaparecer daqui é a da secção "Como o serviço tem
 * de ser usado": o cliente compromete-se a não usar o Binno para filtrar
 * avaliações. O produto foi desenhado para tornar isso impossível, mas quem
 * assina tem de saber que também está proibido de tentar — é a mesma linha que
 * o código defende em `FeedbackForm`.
 */
const Terms = () => (
  <LegalLayout title="Termos de Serviço" updatedAt={LEGAL.versao}>
    <p>
      Estes termos regulam o uso do {LEGAL.servico}. Ao criar uma conta, o estabelecimento aceita-os.
      Estão escritos para serem percebidos sem advogado.
    </p>

    <Seccao titulo="Quem presta o serviço">
      <p>
        O {LEGAL.servico} é prestado por <Dado valor={LEGAL.entidade} />, com o número de
        identificação fiscal <Dado valor={LEGAL.identificacaoFiscal} /> e sede em{' '}
        <Dado valor={LEGAL.morada} />. Contacto:{' '}
        <a className="text-primary underline" href={`mailto:${LEGAL.email}`}>
          {LEGAL.email}
        </a>
        .
      </p>
    </Seccao>

    <Seccao titulo="O que o serviço faz">
      <p>
        O {LEGAL.servico} gera QR codes para o ponto de atendimento, recolhe a avaliação de quem os
        lê, oferece sempre a esse cliente a possibilidade de avaliar publicamente no Google ou no
        TripAdvisor, e mostra ao estabelecimento os casos que precisam de resposta, com sugestões de
        texto.
      </p>
      <p>
        O que o serviço <strong>não</strong> faz: não apaga nem esconde avaliações públicas, não
        publica respostas em nome do estabelecimento, e não garante qualquer aumento de nota,
        posição ou número de avaliações.
      </p>
    </Seccao>

    <Seccao titulo="Conta e responsabilidade">
      <p>
        A conta é do estabelecimento e é ele que responde pelo que lá se passa, incluindo por quem
        lhe dá acesso. As credenciais não devem ser partilhadas. Se suspeitar que alguém entrou na
        sua conta, avise-nos de imediato.
      </p>
      <p>
        O estabelecimento é responsável pela veracidade dos dados que insere, incluindo os endereços
        do seu perfil público, e por ter direito a usar o nome e a marca que exibe.
      </p>
    </Seccao>

    <Seccao titulo="Como o serviço tem de ser usado">
      <p>
        A avaliação pública é sempre oferecida a qualquer cliente, independentemente da nota que
        deu. É assim que o produto foi construído e é assim que tem de ser usado. Em concreto, o
        estabelecimento compromete-se a não:
      </p>
      <ul className="list-disc space-y-2 pl-5">
        <li>
          filtrar, desviar ou desencorajar clientes insatisfeitos de deixarem avaliação pública —
          prática conhecida como <em>review gating</em>, proibida pelas políticas do Google e do
          TripAdvisor e pela Directiva Omnibus da União Europeia;
        </li>
        <li>
          oferecer dinheiro, descontos, refeições ou qualquer outro benefício em troca de uma
          avaliação positiva, ou da alteração ou remoção de uma avaliação existente;
        </li>
        <li>escrever ou encomendar avaliações falsas, próprias ou de terceiros;</li>
        <li>
          usar os contactos deixados pelos clientes para marketing, ou para qualquer fim que não
          seja responder ao caso concreto.
        </li>
      </ul>
      <p>
        O incumprimento destas regras dá-nos o direito de suspender a conta imediatamente, sem
        reembolso do período em curso. Não é uma formalidade: é o que separa este produto dos que
        são ilegais.
      </p>
    </Seccao>

    <Seccao titulo="Preço e pagamento">
      <p>
        O serviço custa {LEGAL.precoMensal} por mês por estabelecimento, com os impostos aplicáveis
        acrescidos quando devidos. O pagamento é feito à <Dado valor={LEGAL.entidade} />, processado
        pela {LEGAL.meioPagamento}, e cobrado no início de cada período mensal.
      </p>
      <p>
        Se o preço mudar, avisamos por e-mail com pelo menos 30 dias de antecedência. O novo preço
        só se aplica depois disso, e o estabelecimento pode cancelar antes de entrar em vigor.
      </p>
    </Seccao>

    <Seccao titulo="Duração e cancelamento">
      <p>
        Não há período mínimo de fidelização. O contrato renova-se mês a mês e pode ser cancelado a
        qualquer momento, com efeito no fim do período já pago. Não devolvemos a parte não usada do
        mês em curso, excepto quando a lei o exigir.
      </p>
      <p>
        Depois do cancelamento, os QR codes deixam de encaminhar para os formulários. Antes de
        cancelar, peça a exportação dos seus dados — entregamos gratuitamente.
      </p>
    </Seccao>

    <Seccao titulo="Disponibilidade">
      <p>
        Fazemos o possível para manter o serviço a funcionar, mas não garantimos disponibilidade
        ininterrupta. Pode haver paragens para manutenção, falhas de fornecedores externos ou
        indisponibilidade das plataformas de avaliação. Avisamos quando a paragem for planeada.
      </p>
    </Seccao>

    <Seccao titulo="Dados pessoais">
      <p>
        O tratamento de dados está descrito na{' '}
        <Link className="text-primary underline" to="/privacidade">
          Política de Privacidade
        </Link>
        , que faz parte destes termos. Nos dados dos clientes que avaliam, o estabelecimento é o
        responsável pelo tratamento e o {LEGAL.servico} actua como subcontratante, tratando-os
        apenas segundo as instruções do estabelecimento.
      </p>
    </Seccao>

    <Seccao titulo="Propriedade">
      <p>
        A aplicação, o seu código e a sua marca são nossos. Os dados do estabelecimento e as
        avaliações que recebe são dele, e pode levá-los consigo a qualquer momento.
      </p>
    </Seccao>

    <Seccao titulo="Responsabilidade">
      <p>
        Respondemos pelos danos que causarmos com dolo ou negligência grave, e nos restantes casos
        até ao valor pago pelo estabelecimento nos 12 meses anteriores ao facto. Não respondemos
        pelas decisões comerciais tomadas com base na informação do painel, nem pelo conteúdo que os
        clientes escrevem, nem pelo que as plataformas públicas fazem com as avaliações.
      </p>
      <p>Nada nestes termos exclui responsabilidades que a lei não permita excluir.</p>
    </Seccao>

    <Seccao titulo="Alterações">
      <p>
        Se estes termos mudarem, avisamos por e-mail com 30 dias de antecedência. Continuar a usar o
        serviço depois disso significa aceitar a nova versão.
      </p>
    </Seccao>

    <Seccao titulo="Lei aplicável">
      <p>
        Aplica-se a lei {LEGAL.leiAplicavel}. Para qualquer litígio que não se resolva por acordo, é
        competente o tribunal da {LEGAL.foro}.
      </p>
    </Seccao>
  </LegalLayout>
);

export default Terms;
