-- O QR impresso podia ser sequestrado por qualquer pessoa.
--
-- A politica `qr_codes_public_update_scan`, criada em 11/07/2026, permitia
-- UPDATE em qualquer linha com `is_active = true` e incluia o papel `anon`.
-- Somada aos GRANTs de coluna, que davam ao `anon` UPDATE em todas as colunas,
-- ela deixava qualquer pessoa na internet reescrever `redirect_url`, `slug` e
-- ate `user_id` de qualquer QR ativo. Bastava conhecer o codigo, que esta
-- impresso no cartao em cima da mesa: dava para apontar o QR de um restaurante
-- para outro site, ou tomar o QR passando-o para outra conta.
--
-- A politica existia para contar leituras. Esse recurso nunca foi
-- implementado: nao ha um unico UPDATE em `qr_codes` no codigo do painel, nas
-- Edge Functions ou no relay, e `times_scanned` estava em zero em todos os QRs
-- em 30/08/2026. Era permissao morta protegendo um buraco vivo.
--
-- Se um dia a contagem de leituras for feita, ela nao volta por aqui: entra
-- como funcao `security definer` que incrementa `times_scanned` e nada mais.

drop policy if exists "qr_codes_public_update_scan" on public.qr_codes;

revoke update on public.qr_codes from anon;
