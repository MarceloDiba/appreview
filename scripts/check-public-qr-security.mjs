import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const root = process.cwd();
const read = (path) => readFileSync(resolve(root, path), 'utf8');
const migration = read('supabase/migrations/20260821090000_harden_public_qr_data.sql');
const tokenMigration = read('supabase/migrations/20260821103000_restrict_google_token_function_execution.sql');
const loader = read('src/lib/publicQrBusiness.ts');
const review = read('src/pages/Review.tsx');
const feedback = read('src/pages/Feedback.tsx');

const requirements = [
  ['consulta pública limitada por QR ativo', migration.includes('get_public_qr_business') && migration.includes('q.is_active = true')],
  ['perfil, links e QR não têm seleção pública direta', ['profiles_select_public', 'platform_links_select_public', 'qr_codes_public_select'].every((policy) => migration.includes(`drop policy if exists "${policy}"`))],
  ['tabelas privadas ficam restritas ao dono', ['profiles_owner_select', 'platform_links_owner_select', 'qr_codes_owner_select'].every((policy) => migration.includes(`create policy "${policy}"`))],
  ['rotas públicas usam a consulta limitada', loader.includes("rpc('get_public_qr_business'") && review.includes('loadPublicQrBusiness') && feedback.includes('loadPublicQrBusiness')],
  ['rotas públicas não voltam a consultar as tabelas diretamente', ![review, feedback].some((source) => source.includes(".from('profiles')") || source.includes(".from('platform_links')") || source.includes(".from('qr_codes')"))],
  ['tokens do Google ficam exclusivos da service role', tokenMigration.includes('from public, anon, authenticated') && tokenMigration.includes('to service_role')],
];

const failed = requirements.filter(([, ok]) => !ok).map(([label]) => label);
if (failed.length) {
  console.error(`Contrato de segurança do QR violado:\n- ${failed.join('\n- ')}`);
  process.exit(1);
}

console.log(`Segurança pública do QR verificada: ${requirements.length} proteções ativas.`);
