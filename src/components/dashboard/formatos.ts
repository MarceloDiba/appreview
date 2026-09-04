/**
 * Os formatadores de numero, num sitio so.
 *
 * Extraidos de `ApprovedCockpitDashboard` em 04/09/2026: os cartoes de leitura
 * sairam para ficheiro proprio e os dois lados precisam destes. Deixa-los no
 * painel obrigaria os cartoes a importar do painel, que ja os importa — um
 * ciclo, para poupar dois ficheiros de tres linhas.
 */
export const integer = new Intl.NumberFormat();

export const decimal = new Intl.NumberFormat(undefined, { minimumFractionDigits: 1, maximumFractionDigits: 1 });
// Âncoras que substituem as antigas abas. Os cartões que antes trocavam de
// aba agora levam a estes ids por link nativo (href="#..."), sem estado de aba
// nem JavaScript para funcionar.
//
// Em 31/08/2026 a âncora do WhatsApp saiu daqui junto com a configuração, que
// virou destino próprio do menu (`/whatsapp`). As âncoras do Radar, do volume
// e das notas saíram com o índice do celular: elas só existiam para ele.