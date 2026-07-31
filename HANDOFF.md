# AppReview — documento de continuação (handoff)

Estado em 30/07/2026. Serve para retomar o trabalho noutra sessão ou noutra IA
sem re-descobrir nada. Leia também `CLAUDE.md` (regras) e `ESTADO.md` (backlog).

## Produto e infra

- Gestão de reputação para donos de negócio. QR na mesa → cliente avalia → nota
  baixa vira caso interno; **avaliação pública sempre oferecida** (não gating).
- Stack: Vite + React + TypeScript, shadcn/ui, Tailwind, react-router,
  @tanstack/react-query. Supabase (BD/auth/edge functions). Deploy na Vercel a
  partir do `main`. Preço 49 €/mês.
- Supabase: projeto `tjbznhwdjyabuacrfqie`, região sa-east-1 (São Paulo).
- Produção: https://appreview-flame.vercel.app
- **CI (`.github/workflows/ci.yml`)**: roda `tsc --noEmit` (bloqueante) + build +
  lint (não bloqueante). É a fonte de verdade da verificação.

## Já em produção (PRs mergeados)

#6/#8 gating + tripadvisor; #9 QR imprimível + fim de dado falso; #10 sugestões
de resposta; #11 Termos/Privacidade; #12 docs; #13 configuração guiada
(`/configuracao`) + fim dos dados inventados em `/settings` e `/profile` + fix do
spinner eterno de auth; #14 idioma do cliente por região (pt-BR/pt-PT/en, sem
espanhol).

## PRs abertos

- **#15 — painel do dono multilíngue (RASCUNHO).** É o PR em curso (ver abaixo).
  Só sair do rascunho quando o painel inteiro estiver traduzido.
- **#16 — dados legais.** Entidade **MDR Propaganda Ltda. ME**, CNPJ
  **20.927.148/0001-83**, sede **Rua Itaporanga, 433, Aracaju, Sergipe, Brasil**,
  pagamento **Stripe**, lei/foro **Brasil (Aracaju)**, privacidade reescrita para
  **LGPD+RGPD**. Verde. **Precisa de revisão de advogado** (Marcelo valida
  depois). Falta o Stripe de verdade (só o texto menciona; cobrança ainda é
  manual).

## Decisões tomadas (não re-perguntar)

- Idioma: Brasil→pt-BR, Portugal→pt-PT ou inglês, resto→inglês. **Sem espanhol**
  no fluxo do cliente (fica só nas sugestões de resposta, que respondem na língua
  em que o cliente escreveu).
- Legal: entidade brasileira (MDR), lei/foro Brasil, regime duplo LGPD+RGPD,
  revisão jurídica por fora.
- Stripe: integrar **depois** (mexe em dinheiro → só com aval).
- Painel multilíngue: **fazer o painel inteiro num PR** (o #15). Tom do pt-BR já
  aprovado pelo Marcelo.
- i18n do painel: **react-i18next** (JSON por idioma), instância à parte do
  cliente. Ver `CLAUDE.md`.

## PR #15 — tradução do painel: o que está feito e o que falta

Branch `feat/painel-multilingue`. Infra pronta: `src/i18n/owner/instance.ts`,
`useOwnerTranslation.ts`, `LanguageSwitcher.tsx`, catálogos em
`src/i18n/owner/locales/{pt-BR,pt-PT,en}.json` (~245 chaves).

**Traduzido (commitado):** Onboarding, Login, Signup, Navbar (só painel/partilhado;
admin e marketing ficam em pt), Dashboard, **Central de Atenção** (o
`useAttentionInsights` gera o texto via i18next com plural), Configurações
(negócio, links externos, notificações), Perfil.

**FALTA traduzir (é o que continuar):**
1. `src/pages/Reviews.tsx` + `src/components/dashboard/cases/CasesList.tsx` +
   `src/components/dashboard/GoogleReviews.tsx` +
   `src/components/dashboard/reviews/*` (ReviewCard, ReviewsList, ReviewsHeader,
   LoadingState, ErrorState).
2. `src/pages/QRCodes.tsx` + `src/components/dashboard/QRCodeGenerator.tsx`
   (atenção: o **cartão de mesa impresso** é para o cliente final e é trilingue
   pt-PT+ES+EN — deixar como está, não é painel).
3. `src/components/dashboard/ReplySuggestions.tsx` — só a interface (botões,
   rótulos); o texto das respostas geradas fica no seu próprio sistema
   (`src/lib/replySuggestions.ts`), não mexer.

**Como continuar cada tela:** adicionar as chaves aos 3 JSON (manter as chaves
idênticas nos três), trocar textos por `t('chave')` via `useOwnerTranslation`,
verificar (abaixo), commitar na branch. **Quando as 3 telas acima estiverem
feitas:** tirar o #15 do rascunho (`gh pr ready 15`) e mandar o link ao Marcelo.

### Verificação do i18n (rodar antes de commitar)

```bash
node ./node_modules/typescript/bin/tsc --noEmit -p tsconfig.app.json   # tem de sair 0
```
E este script (chaves batendo nos 3 idiomas + toda chave `t()` resolve):
```python
python3 - <<'PY'
import json, io, re, glob
def flat(d,p=''):
    o=set()
    for k,v in d.items():
        nk=f"{p}.{k}" if p else k
        o|=flat(v,nk) if isinstance(v,dict) else {nk}
    return o
cats={l:flat(json.load(io.open(f'src/i18n/owner/locales/{l}.json'))) for l in ['pt-BR','pt-PT','en']}
base=cats['pt-BR']
for l,ks in cats.items():
    if base-ks or ks-base: print(l,"DIVERGE",sorted(base^ks))
valid=base|{k[:-4] for k in base if k.endswith('_one')}
used=set()
for f in glob.glob('src/**/*.tsx',recursive=True)+glob.glob('src/**/*.ts',recursive=True):
    if ' 2.' in f: continue
    for m in re.finditer(r"t\(\s*['\"]([a-zA-Z0-9_.]+)['\"]", io.open(f).read()): used.add(m.group(1))
pref=('onboarding.','nav.','auth.','signup.','attention.','dashboard.','settings.','profile.','reviews.','qrcodes.','reply.','language.')
print("t() faltando:", [k for k in used if k.startswith(pref) and k not in valid] or "NENHUMA")
PY
```

## Tarefas de fundo já sinalizadas (chips)

- **Logout do Navbar** não deslogava (era `<Link to="/">`). O Marcelo iniciou a
  correção numa sessão à parte; ela editou `Navbar.tsx` no working tree (fica com
  o fix + as traduções). **Não commitar o fix do logout na branch do painel** —
  é da task dele.
- **NotificationSettings não persiste nada** (interruptores e "salvar" que não
  gravam). Sinalizado para implementar de verdade ou remover.

## Armadilhas

- Há ficheiros duplicados do macOS em `src/` (`*  2.tsx`/`* 2.ts`), fora do git.
  Ignorar (os scripts já os saltam).
- O QR impresso e o endereço do QR **não são editáveis de propósito** (era o que
  causava o bug do QR apontar para página inexistente).
- Transferência de dados para o Brasil: agora a empresa é brasileira, mas o
  piloto é português → LGPD+RGPD juntos. Precisa de advogado.

## Piloto

H5 Texas Burger (Avenida) e Mania de Petiscos, ambos em Lisboa. Marcelo no Brasil
(Aracaju) até dezembro → arranque remoto. **Antes do piloto: limpar dados de
teste do banco** (pré-autorizado apagar teste; nunca dado real).

## O que falta além do painel (backlog, sem bloquear piloto)

`/admin` sem ligação ao banco; autocomplete do Google nas definições; limpar
dados de teste; modelo de agência (dói a partir do 3.º cliente); Stripe a sério.
