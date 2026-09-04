import { renderToStaticMarkup } from 'react-dom/server';
import { StaticRouter } from 'react-router-dom/server';
import Privacy from '@/pages/Privacy';

/**
 * Renderiza a Politica de Privacidade a HTML, fora do navegador.
 *
 * O componente e o MESMO que o dono ve em `/privacidade`. E esse o ponto: uma
 * segunda politica escrita a mao divergiria da primeira sem ninguem ver, e a
 * que o robo da Meta le seria a errada.
 */
export const render = () => renderToStaticMarkup(
  <StaticRouter location="/privacidade">
    <Privacy />
  </StaticRouter>,
);
