// O Chromium que ESTA nesta maquina, e nao o que o Playwright espera.
//
// O Playwright 1.48 procura `chromium-1140`, que nunca terminou de descarregar
// (204 KB, pacote partido, erro -88). Ha um `chromium_headless_shell-1234`
// completo, de 196 MB, marcado INSTALLATION_COMPLETE, deixado por outra
// ferramenta. Tentei descarregar 140 MB duas vezes antes de olhar para o que ja
// estava aqui.
import { homedir } from 'node:os';
import { join } from 'node:path';

export const CHROMIUM = join(homedir(),
  'Library/Caches/ms-playwright/chromium_headless_shell-1234/chrome-headless-shell-mac-arm64/chrome-headless-shell');
