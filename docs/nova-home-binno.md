# Nova home do binno.pro, especificação para implementar

*Atualizado em 05/09/2026. Substitui, para a página principal, o `62-copy-pagina-binno.md` e o
`submissao-copy-binno.md`. Onde este documento e aqueles discordarem, vale este.*

**Protótipo aprovado, no próprio repo:** `docs/nova-home-binno.html`
Abrir no navegador (`open docs/nova-home-binno.html`). É um HTML único, sem dependência de rede, com
a página inteira funcionando: hero interativo, demonstração navegável e o print embutido. Ele é a
referência de layout, ordem, copy e interação, e dá para portar quase linha a linha.
Versão publicada, se preferir ver online: https://claude.ai/code/artifact/f8bbe63a-0341-42a6-b066-af66d7220029

Este documento explica o que o protótipo é, o que precisa virar código e o que não pode mudar.

---

## 1. O que muda, em uma frase

A home deixa de vender "um assessor que acompanha sua reputação" e passa a vender uma coisa
concreta e verificável: **a avaliação chega no seu WhatsApp com a resposta pronta, você toca uma
vez, e ela aparece no seu Google**. Tudo o mais na página existe para sustentar essa frase.

Três decisões que vieram junto:

1. O preço do lote de fundadores (R$99, depois R$129) sai da nota de rodapé e vira argumento, com
   faixa fixa no topo. Os valores já estão certos em `src/lib/precoBinno.ts`, a copy só passa a
   refleti-los.
2. A demonstração (o cockpit do Bistrô Horizonte) sobe do `/demo` para dentro da home.
3. Entra uma seção nova sobre review gating, que hoje não existe em nenhuma das 9 seções.

---

## 2. Ordem final das seções

A ordem importa tanto quanto o texto. É a sequência de uma página de venda de autoatendimento:
dor, mecanismo, prova, identificação, profundidade, transformação, confiança, preço, objeção,
fechamento.

| # | Seção | Chave | Papel |
|---|---|---|---|
| 0 | Faixa do lote fundador | `pricing.promoLabel` | Escassez com número, fixa acima do menu |
| 1 | Hero interativo | `hero` | Promessa mais a prova funcionando |
| 2 | O problema | `maps` (renomear o conteúdo) | A cena do cliente calado mais os 3 números com fonte |
| 3 | Como funciona | `alerts` mais os pilares | Os três pilares |
| 4 | Isso não é mockup | seção nova `prova` | Print real do Google mais a linha do tempo |
| 5 | Para quem é | seção nova `segments` | Cinco segmentos, nesta ordem |
| 6 | Demonstração | `demo` mais `BinnoDemoCockpit` | A tela interna, dentro da home |
| 7 | Sem o Binno / Com o Binno | seção nova `compare` | A transformação em cinco linhas |
| 8 | A regra que não muda | seção nova `honest` | Review gating, antes do preço |
| 9 | Plano | `pricing` | R$99 no lote, R$129 depois |
| 10 | Perguntas frequentes | seção nova `faq` | As objeções que restam |
| 11 | Fechamento | seção nova `finalCta` | "Segundos ou semanas?" |

As seções `history`, `radar`, `profile` e `whatsapp` do arquivo atual saem da home como blocos
próprios: o conteúdo delas foi absorvido pelos pilares e pela demonstração.

---

## 3. Copy final, pt-BR

Copiar daqui, não reescrever. As três regras de sempre continuam valendo: nada de travessão, nada
de claim de ranking ou de nota, nada de prova social inventada.

### Faixa do topo
> **Lote fundador:** R$ 99/mês para as 50 primeiras assinaturas. Depois, R$ 129/mês.

### 1. Hero
- eyebrow: `Binno para negócios locais`
- title: `Sua avaliação no Google chega no WhatsApp.` mais, em destaque, `Você responde com um toque.`
- body: `O Binno te avisa a cada nova avaliação com a resposta já escrita. Você lê, aprova com um toque, e ela aparece no seu perfil do Google. Sem abrir painel, sem computador, sem deixar o cliente esperando.`
- primary: `Garantir preço fundador: R$ 99/mês` · secondary: `Ver a demonstração`
- micro: `Sem formulário antes de pagar · Cancele quando quiser · Sem fidelidade`
- três provas: `21 s` (do toque à resposta publicada, medido em 04/09) · `0` (painéis pra abrir no dia a dia) · `100%` (das respostas revisadas por você)

### 2. O problema
- eyebrow: `O problema`
- title: `Quem escolhe onde comprar olha a sua nota antes de te conhecer.`
- body: `Cliente insatisfeito quase nunca reclama na hora. Vai embora calado e escreve depois, no Google, onde todo mundo vê. E quem lê decide em segundos: não é o produto, não é o preço na porta, é a nota que aparece antes de a pessoa entrar.`
- números: `96%` leem avaliações no Google antes de escolher uma loja física · `93%` já desistiram de uma compra depois de ler avaliações negativas · `9 em 10` descartam empresas com nota abaixo de 4 estrelas. 40% só consideram acima de 4,5.
- fonte (obrigatória, visível): `Pesquisa Decisão Local 2025, Harmo e Reclame Aqui, 1.591 entrevistados no Brasil. Noticiada em:` mais os quatro links: [Relatório Harmo](https://harmo.me/relatorios/decisao-local), [Mercado&Consumo](https://mercadoeconsumo.com.br/26/03/2025/noticias-varejo/reclame-aqui-96-dos-consumidores-leem-avaliacoes-no-google-antes-de-comprar/), [Novo Varejo](https://novovarejo.com.br/avaliacoes-no-google-impactam-a-escolha-de-96-dos-consumidores/), [Meio&Mensagem](https://www.meioemensagem.com.br/marketing/reputacao-digital-como-as-avaliacoes-afetam-a-jornada-do-consumidor)

Citar as matérias por nome com link, sem faixa de logotipos: elas falam da pesquisa, não do Binno.

### 3. Como funciona
- title: `Controle da sua reputação sem parar a operação.`
- pilar 1, `Da avaliação à resposta publicada, em segundos`: `Chegou avaliação no Google? O Binno te avisa no WhatsApp com uma resposta pronta, escrita a partir do que aquele cliente escreveu. Você lê, aprova com um toque, e ela é publicada no seu perfil.`
- pilar 2, `Escute antes do Google, não no lugar dele`: `O QR Code no balcão dá ao seu cliente um canal direto com a sua equipe. Quem teve um problema fala com você primeiro, e você resolve enquanto ainda dá tempo. O caminho para avaliar no Google continua sempre lá.`
- pilar 3, `Não seja pego de surpresa`: `Quando o número de avaliações cai, as notas baixas ganham espaço ou três pessoas citam a mesma coisa, o Binno explica o que mudou e o que dá pra fazer agora. Uma coisa por vez.`

O pilar 2 é o único que não pode ser reescrito: "antes de", nunca "em vez de". Ver seção 8.

### 4. Isso não é mockup
- eyebrow: `Isso não é mockup`
- title: `A resposta que aparece no seu Google depois de um toque no WhatsApp.`
- body: `Sem aplicativo pra instalar e sem painel pra abrir. O Binno lê a avaliação, escreve um rascunho a partir do que o cliente disse e te entrega tudo numa mensagem só. Você toca, e a resposta vai pro seu perfil.`
- imagem: `public/marketing/prova-avaliacao-google.jpg` (já está no repo, 772x842)
- legenda: `Print real do perfil da Noá Digital no Google, 04/09/2026. Resposta publicada pelo WhatsApp, com um toque.`
- linha do tempo: `passo 1` A avaliação entra no Google (quatro estrelas, comentário curto, cliente real) · `passo 2` O Binno te avisa no WhatsApp (com o que o cliente escreveu e a resposta já pronta) · `1 toque` Você toca em "Publicar no Google" (se quiser mudar o texto antes, o painel está a um link de distância) · `21 s depois` Publicada no seu perfil do Google (quem publica é você, sempre. O Binno nunca publica sozinho)

### 5. Para quem é
- title: `Todo negócio que acredita que o Google pode ajudar a vender.`
- ordem fixa, decidida por Marcelo:
  1. `Negócio local`: Loja, comércio de bairro, quem atende no balcão do caixa. Um canal de escuta fácil e resposta rápida.
  2. `Gastronomia`: Restaurantes, bares e cafés: resolva um pedido errado no privado antes que ele vire nota.
  3. `Saúde e bem-estar`: Clínicas, consultórios, salões e estúdios: responda com agilidade e acolhimento.
  4. `Hospedagens`: Pousadas, hotéis e aluguel por temporada: cada avaliação decide a próxima reserva.
  5. `Serviços`: Oficinas, pet shops, assistências: perfil sempre ativo, sem tirar ninguém do serviço.

### 6. Demonstração
- title: `Veja o Binno funcionando antes de criar conta.`
- body: `Um exemplo completo, com dados ilustrativos: o aviso, a fila de respostas, a leitura da reputação e o que mudou na semana.`
- usa o `BinnoDemoCockpit` que já existe. Não recriar.

### 7. Sem o Binno / Com o Binno
- title: `Cuidar do Google do jeito tradicional custa cliente.`

| Hoje, sem o Binno | Com o Binno |
|---|---|
| Você só sabe da avaliação se lembrar de abrir o Google | Aviso no WhatsApp, na hora, com a resposta pronta |
| Dias ou semanas para responder um comentário | Resposta publicada em segundos, do seu WhatsApp |
| Abrir o painel do Google no computador | Aviso e aprovação com um toque, no celular |
| O cliente insatisfeito só tem o Google para falar | Canal direto com a sua equipe pelo QR Code, antes de virar avaliação |
| Você nunca sabe se uma avaliação virou um padrão | O Binno aponta o que mudou, com a frase do cliente que prova |

### 8. A regra que não muda
- eyebrow: `A regra que não muda`
- title: `O Binno nunca esconde uma avaliação ruim.`
- body: `Tem ferramenta que manda o cliente satisfeito pro Google e o insatisfeito pra um formulário privado. Isso se chama review gating, e a política do Google proíbe. Quem é pego pode ver avaliações apagadas, o perfil restrito e um aviso público na ficha dizendo que houve avaliação falsa.`
- note: `No Binno o caminho pro Google aparece sempre, qualquer que seja a nota. Verificações automáticas no código impedem que isso mude.`
- link: política de avaliações do Google
- as três linhas ao lado: `Cliente com 5 estrelas` vê o botão de avaliar no Google · `Cliente com 1 estrela` vê o mesmo botão de avaliar no Google, e pode, se quiser, também mandar um comentário privado pra você · `Perguntar "gostou?" antes de mostrar o Google` não existe no Binno, é isso que o Google chama de review gating.

Duas coisas que este texto deliberadamente **não** diz, porque a fonte não sustenta: não atribui a
punição especificamente ao gating (a política geral é que prevê remoção e aviso público), e não cita
"abril de 2026" nem "23 verificações". A atualização de abril endureceu a política de engajamento
falso; o gating já era proibido antes. Manter assim.

### 9. Plano
- eyebrow: `Plano fundador Binno`
- preço: `R$ 129` riscado, `R$ 99/mês` em destaque
- lote: `As 50 primeiras assinaturas mantêm esse preço enquanto seguirem ativas.`
- cta: `Garantir preço fundador: R$ 99/mês`
- rodapé do bloco: `Para negócios no Brasil. O país onde o negócio opera é confirmado no cadastro e validado no pagamento.`
- lista: aviso no WhatsApp a cada nova avaliação com a resposta já escrita · publicação no Google com um toque, sem abrir painel · canal de mensagem direta para o cliente falar com você antes · QR Codes para balcão, mesas e comanda · fila de respostas no painel, quando você quiser editar antes · leitura da reputação e o que mudou na semana · sem fidelidade, cancele quando quiser

"Alertas ilimitados" não entra: existe teto diário de avisos (`20260904160000_teto_diario_de_avisos_que_custam.sql`).

### 10. Perguntas frequentes
1. **Como a mensagem direta evita comentários negativos no Google?** Ela não impede ninguém de avaliar, e o Binno nunca esconde o caminho do Google. O que ela faz é te dar a chance de saber primeiro. Ao escanear o QR Code, o cliente pode mandar uma mensagem privada para a sua equipe; se algo deu errado, você resolve enquanto ele ainda está por perto.
2. **O Binno garante que minha nota no Google vai subir?** Não. A nota depende do que o seu cliente viveu, e ninguém honesto promete mudá-la. O que o Binno garante é velocidade de resposta e um canal direto para que insatisfações contornáveis cheguem a você antes de chegarem ao Google.
3. **Preciso instalar algum aplicativo?** Não. Depois de conectar seu Perfil da Empresa do Google ao Binno (uma vez só, pelo celular ou computador), responder avaliações acontece inteiramente no WhatsApp: você recebe o aviso, lê a resposta pronta e aprova com um toque.
4. **Preciso criar conta antes de assinar?** Não. Você paga primeiro e cria seu acesso depois, na tela seguinte. Sem formulário no meio do caminho.
5. **O valor de R$ 99/mês muda depois?** Não para você. Assinando no lote fundador, os R$ 99 ficam travados na sua conta mesmo quando o preço voltar a R$ 129.

A FAQ 3 é a mais sensível da página. O pré-requisito (conectar o Perfil da Empresa) tem que estar
escrito, porque sem ele nada do WhatsApp funciona, e quem comprar sem saber vira suporte no dia
seguinte. Não voltar para "100% dentro do WhatsApp".

### 11. Fechamento
- eyebrow: `Sua próxima avaliação chega hoje`
- title: `Você vai responder em segundos ou em semanas?`
- body: `Aviso no WhatsApp, resposta pronta, publicação com um toque. E um canal direto para o cliente falar com você antes de falar com o Google.`
- cta: `Quero o Binno por R$ 99/mês`

---

## 4. O hero interativo

É a única parte que exige componente novo de verdade. A prévia tem a implementação inteira em JS
puro, dá para portar quase linha a linha para React.

Sequência, disparada ao carregar:

1. Aviso de sistema da Meta ("Esta empresa usa um serviço seguro da Meta para gerenciar esta conversa").
2. Indicador de digitando, cerca de 1s.
3. A mensagem do Binno, com **o texto real que o produto envia hoje**:
   > Você recebeu uma avaliação nova no seu Perfil da Empresa no Google.
   > ⭐ Nota: 4 de 5
   > 👤 Cliente: Mesquita
   > 💬 Comentário: "Agência Top de serviços de Sergipe, profissionais muito capacitados."
   > ✍️ Preparamos esta resposta:
   > "Olá, Mesquita, muito obrigado pelas suas palavras. Fico feliz em saber que tenha tido uma boa experiência com a gente. Noá Digital"
   > Toque no botão abaixo para publicar a resposta no seu perfil.
   
   Com o botão nativo do WhatsApp no rodapé do balão: `↩ Publicar no Google`, pulsando.
4. Se o visitante clicar, a sequência avança na hora. Se não clicar em 9 segundos, avança sozinha.
5. Sai a mensagem enviada, o Binno confirma a publicação, e o cronômetro conta até 21 s.
6. Abaixo do celular se revela o card da avaliação no Google (visual do Google, não do Binno) com a
   resposta do proprietário publicada.
7. Botão `Ver de novo` reinicia.

Regras do componente:

- O texto da mensagem tem que continuar igual ao que o produto manda de verdade. Se o template do
  WhatsApp mudar, esta copy muda junto.
- Sem datas relativas no card do Google ("6 anos atrás", "6 horas atrás"). Só `agora` na resposta.
- `prefers-reduced-motion`: pular a animação e mostrar o estado final. Já está resolvido assim na
  prévia, manter.
- O botão do balão precisa ser acessível por teclado (`role="button"`, `tabindex="0"`, Enter e Espaço).

---

## 5. Correções de acessibilidade que vêm junto

Foram encontradas em auditoria e já estão aplicadas na prévia. Não regredir:

1. **Contraste**: o cinza claro dos textos pequenos passou de `#7A7390` para `#655F7C` (era 4,48:1,
   abaixo do mínimo de 4,5:1). O amarelo das estrelas passou de `#F5B301` para `#A8790A` (era 1,85:1,
   invisível para muita gente).
2. **Alvos de toque**: todo botão pequeno (Editar, Pular, Anterior, Próxima, chips de avaliação) tem
   altura mínima de 44px.
3. **Grid**: todo contêiner `display:grid` precisa de `grid-template-columns: minmax(0,1fr)` na regra
   base, não só dentro do media query. Sem isso o conteúdo força a largura do contêiner e a página
   ganha rolagem horizontal no celular. Foi assim que a seção de fontes e o cockpit ficaram cortados.
   No Tailwind isso é `grid-cols-[minmax(0,1fr)]` ou `min-w-0` nos filhos.
4. **Menu mobile**: o menu do topo some abaixo de 900px. Precisa de um Sheet ou Drawer do shadcn (o
   projeto já tem), com os quatro links mais o CTA. Na prévia isso está resolvido de forma
   simplificada, só para a prévia não demonstrar um padrão quebrado.
5. **Imagem**: `width` e `height` na proporção real (772x842) mais `loading="lazy"`, porque ela fica
   abaixo da dobra.

---

## 6. O que não pode entrar

Continua tudo valendo, sem exceção:

- Nenhum claim de ranking, posição no Maps, melhora de nota ou número de clientes.
- Nenhum depoimento, logotipo de cliente ou prova social fabricada. O Binno ainda não tem cliente
  pagante, e o print do Google que a página usa é do perfil da própria Noá Digital.
- Nenhuma promessa de teste grátis. Não existe.
- Nada de "o Binno publica sozinho". A publicação é sempre um toque humano.
- "Você seria o primeiro cliente" fica na conversa 1 a 1, fora da página.

---

## 7. Como executar

1. Reescrever `src/i18n/marketing.ts` nos três locales (pt-BR, pt-PT, en) com a copy acima.
   Chaves novas: `prova`, `segments`, `compare`, `honest`, `faq`, `finalCta`. Deixar qualquer locale
   de fora provavelmente quebra o `check:i18n-owner`.
2. Reordenar e reescrever os blocos em `src/pages/Index.tsx` conforme a tabela da seção 2.
3. Criar o componente do hero interativo (seção 4).
4. Usar `public/marketing/prova-avaliacao-google.jpg`, que já está no repo.
5. `npm run verify` (são 23 checks mais o build).
6. Abrir PR, **sem merge**. A página pública depende de aprovação explícita do Marcelo, como o
   `ESTADO.md` já registra.

---

## 8. Duas coisas a resolver antes de publicar

- **O adaptador da Cloud API.** A página promete aviso no WhatsApp em três lugares. O OpenWA está
  parado desde 03/09 no número +55 79 99198-6091, que agora é oficial na Cloud API. Enquanto o
  código não trocar o adaptador, a promessa central da home não está no ar. A home nova não sobe
  antes disso.
- **"Cancele quando quiser" nunca foi testado.** O portal do Stripe está configurado, mas ninguém
  assinou ainda para provar que ele abre. A promessa é legítima, só falta percorrer o caminho uma vez.
