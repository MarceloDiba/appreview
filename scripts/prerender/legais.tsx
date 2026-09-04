import { renderToStaticMarkup } from 'react-dom/server';
import { StaticRouter } from 'react-router-dom/server';
import Privacy from '@/pages/Privacy';
import Terms from '@/pages/Terms';

/**
 * Renderiza as paginas legais a HTML, fora do navegador.
 *
 * Os componentes sao os MESMOS que o dono ve em `/privacidade` e `/termos`. E
 * esse o ponto: um segundo texto legal escrito a mao divergiria do primeiro sem
 * ninguem ver, e o que o robo le — que e o que vale como compromisso — seria o
 * errado.
 */
export const renderPolitica = () => renderToStaticMarkup(
  <StaticRouter location="/privacidade">
    <Privacy />
  </StaticRouter>,
);

export const renderTermos = () => renderToStaticMarkup(
  <StaticRouter location="/termos">
    <Terms />
  </StaticRouter>,
);
