# Binno — visão geral do produto

**Fotografia:** 28 de agosto de 2026  
**Estado do documento:** referência executiva interna. Para arquitetura e regras
imutáveis, consultar o [Contrato de produto](contrato-produto-binno.md). Para
operação e pendências, consultar [HANDOFF.md](../HANDOFF.md) e
[ESTADO.md](../ESTADO.md).

## 1. Quem é o Binno

O **Binno** é o assessor de reputação no Google para pequenos negócios.

Ele não é apenas um QR Code e não é uma cópia do painel do Google. O seu papel
é transformar os sinais dispersos das avaliações e do Perfil da Empresa numa
leitura simples para o gestor: o que merece atenção, o que está a ajudar o
negócio e qual é a próxima ação útil.

O gestor continua no controlo. O Binno sugere, organiza e explica; o gestor
revisa e decide o que publicar no Google.

## 2. O problema que resolve

Pequenos negócios dependem do Google Maps para serem encontrados, mas o gestor
normalmente não tem tempo para acompanhar avaliações, perceber mudanças de
padrão, responder bem em outro idioma ou manter o perfil atualizado.

Sem uma leitura organizada, ele tende a descobrir uma reclamação repetida tarde
demais, não vê o que os clientes elogiam com frequência e trata as avaliações
como uma tarefa avulsa, em vez de uma fonte de decisões para a operação.

## 3. Como o Binno resolve

O produto trabalha em quatro movimentos:

1. **Capta o acesso à avaliação.** O QR leva o cliente à página correta do
   Google e mede abertura do QR e clique para o Google.
2. **Organiza a leitura.** A fila apresenta uma avaliação por vez, quando a
   fonte disponibiliza nome, comentário, nota e link individual.
3. **Orienta a ação.** O Binno sugere uma resposta editável no idioma da
   avaliação, destaca forças e fragilidades e transforma temas recorrentes em
   recomendações operacionais.
4. **Acompanha o que mudou.** Volume, distribuição por estrelas, temas, saúde
   do perfil e Radar mostram a evolução somente quando existe evidência
   suficiente para a comparação.

O objetivo é reduzir a interpretação exigida ao gestor, sem criar uma operação
burocrática de casos, responsáveis ou tarefas artificiais.

## 4. Para quem é

O público prioritário é o dono ou gestor de pequeno negócio local que depende
do Google para atrair clientes, como restaurantes, bares, lojas, clínicas,
serviços locais e negócios de atendimento presencial.

É especialmente útil para quem:

- recebe avaliações em mais de um idioma;
- não acompanha o Perfil da Empresa todos os dias;
- quer responder com mais consistência sem ter de começar do zero;
- precisa perceber se uma reclamação, produto ou aspecto do atendimento está
  a repetir-se;
- quer receber o essencial no WhatsApp, em vez de procurar informação em vários
  painéis.

## 5. O que o cliente vê no produto

### Visão geral do gestor

A Visão geral consolidada começa pelo que exige decisão e mantém os módulos de
apoio no mesmo cockpit:

- fila de respostas e resposta sugerida editável;
- Radar do Binno, com força, fragilidade, possível causa e próxima ação quando
  a evidência permite;
- volume de avaliações em 12 semanas;
- evolução separada de 5 a 1 estrelas;
- percurso do QR até ao clique no Google;
- temas mais citados;
- reputação no Google, tempo de resposta e novas avaliações quando a fonte os
  confirma;
- boas práticas, completude do perfil, mudança semanal, Plano de hoje e
  Resultado observado;
- resumo e preferências de WhatsApp.

Os módulos não são removidos quando faltam dados. Nesses casos, o Binno mostra
um estado neutro e curto, sem fabricar tendência, percentagem ou causa.

### Fila de respostas

Quando a origem devolver dados individuais, o gestor vê uma avaliação por vez,
com nome público, nota, comentário e rascunho de resposta. Pode editar, pular,
copiar e abrir o comentário correto no Google.

O botão só abre o link individual quando ele existe. Sem permalink, o produto
oferece apenas a cópia da resposta. O Binno nunca afirma que publicou uma
resposta automaticamente.

### Radar e inteligência do assessor

O Radar responde a duas perguntas:

- **O que está a ajudar o negócio a receber boas avaliações?**
- **O que o está a deixar mais frágil agora?**

Uma fragilidade só é apresentada quando há período comparável, mudança
relevante e causa recorrente em comentários. Uma oportunidade positiva depende
de repetição suficiente em elogios reais. Sem esses critérios, o Radar apenas
acompanha, sem transformar uma amostra pequena em conclusão.

### WhatsApp

O gestor escolhe individualmente o que quer receber: resumo semanal, avaliações
que pedem resposta, Alertas do Radar e lembretes do Perfil da Empresa. Escolhe
também dia, hora e consentimento.

O número informado no onboarding é reutilizado como ponto de partida e usa
seletor de país com bandeira e máscara internacional. A mensagem de teste vem
preenchida, mas pode ser editada antes de um envio manual confirmado.

### QR Code para impressão

Cada QR tem endereço fixo enquanto estiver ativo. O cartão de impressão tem
moldura, convite para contar a experiência e identidade Binno. O idioma da
cópia é definido pelo país do negócio e a página pública adapta-se ao idioma do
telemóvel.

## 6. Regras que protegem o produto e o cliente

- A avaliação pública é sempre oferecida, independentemente da nota. O Binno
  não pratica review gating, não incentiva nota específica e não oferece
  recompensa por avaliação.
- Um clique no Google não é tratado como avaliação publicada.
- Dados ilustrativos são identificados como demonstração. Dados parciais não
  são apresentados como fila completa ou leitura oficial.
- O Binno não publica respostas por conta própria.
- O QR público recebe apenas os dados mínimos necessários para mostrar o
  negócio e os destinos de avaliação.
- Nome, comentário e permalink obtidos no piloto experimental não entram no
  banco agregado, no briefing ou no WhatsApp; ficam somente no navegador
  autenticado, por até 14 dias.

## 7. O que existe hoje

| Frente | Estado em 28/08/2026 | O que está comprovado |
| --- | --- | --- |
| Marca e página pública | **Confirmado** | Marca Binno, domínio `binno.pro`, página oficial e demonstração ilustrativa publicadas. |
| Onboarding e QR | **Confirmado** | Link público do Google como passo inicial, telefone internacional, QR fixo, cartão com moldura e medição de abertura/clique. |
| Cockpit do gestor | **Confirmado** | Arquitetura aprovada, fila, gráficos, Radar, temas, boas práticas, completude, WhatsApp e estados honestos para ausência de dados. |
| Sugestão de resposta | **Confirmado** | Rascunho editável, cópia e abertura do permalink individual quando disponível. Não há publicação automática. |
| Leitura temporária Apify | **Confirmado, experimental** | Coleta manual limitada, com teto, intervalo de 24 horas e identificação explícita de fonte não oficial. |
| Google Business Profile oficial | **Em análise externa** | Banco e fluxo preparados; candidatura Basic enviada ao Google. Ainda não há acesso Basic confirmado, OAuth específico ou sincronização oficial completa. |
| WhatsApp via OpenWA | **Piloto operacional** | Relay privado na VPS, sessão pareada, webhook técnico validado e nenhuma entrega recorrente comprovada. |
| Cobrança Brasil | **Em reconciliação** | Preço live de R$199, base de webhook e validação de país preparados. Falta isolar o Customer Portal do Binno e executar teste controlado de ponta a ponta. |
| Europa | **Indisponível** | Não há preço, Checkout ou operação europeia aberta. |

## 8. O que ainda não deve ser prometido como pronto

- fila oficial completa do Perfil da Empresa;
- confirmação real do estado de cada resposta no Google;
- publicação de respostas por API;
- alertas recorrentes enviados por WhatsApp em produção;
- tendência oficial de longo prazo ou causa operacional sem período comparável;
- cobrança autônoma aberta ao público;
- venda na Europa;
- resultado de ranking, aumento de clientes ou número de avaliações garantido.

## 9. Modelo comercial decidido até aqui

O Binno abre inicialmente apenas para negócios que operam no Brasil, por
**R$199 por mês**, depois da validação final de cobrança. O país onde o negócio
opera, salvo no perfil, determina o mercado. IP, idioma e telefone não alteram
o preço.

O endereço de cobrança é conferido na Stripe. Uma divergência com o país de
operação não ativa a assinatura nem libera acesso. A Europa permanece fora da
oferta até existir entidade, catálogo, termos, privacidade, fiscalidade,
portal, webhook e teste próprios.

## 10. Próximos marcos para colocar à venda

1. Restaurar o portal padrão do outro produto na conta Stripe MDR e criar uma
   segunda configuração, exclusiva e não padrão, para o Binno.
2. Executar um Checkout brasileiro de teste sem concluir pagamento e confirmar
   webhook, assinatura, bloqueio de divergência de país e portal do Binno.
3. Acompanhar a candidatura de acesso Basic do Google e, quando aprovada,
   configurar OAuth, escolher uma localização e concluir a sincronização
   oficial.
4. Fazer o primeiro envio manual autorizado via OpenWA e registar os estados
   reais de entrega. A decisão de operação recorrente ainda depende de
   fornecedor, consentimento, limites e custo.
5. Validar ponta a ponta com uma conta nova e negócio consentido: onboarding,
   QR impresso, avaliação pública disponível, leitura, resposta, WhatsApp e
   cobrança.
6. Fazer revisão jurídica de marca, termos, privacidade, operação internacional
   e regras fiscais antes de divulgação ampla.

## 11. Em uma frase

> **Binno é o assessor de reputação no Google que transforma avaliações e sinais
> do Perfil da Empresa em uma prioridade clara e uma próxima ação prática para
> o gestor.**
