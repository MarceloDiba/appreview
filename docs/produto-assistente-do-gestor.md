# AppReview como assistente do gestor

## Contrato do produto

O gestor não deve abrir o AppReview para descobrir se existe trabalho. O
produto deve organizar o contexto e pedir atenção apenas quando houver uma
decisão necessária.

O ciclo principal passa a ser:

1. o cliente escolhe qualquer nota e vê os mesmos destinos públicos;
2. se enviar um relato direto, o caso guarda o ponto de atendimento;
3. a equipa assume o caso, define responsável e regista a providência;
4. a conclusão exige um registo do que foi feito e pode guardar o resultado;
5. o painel mostra primeiro o que ainda precisa de ação.

## Primeiro lote local

- caminho idêntico para notas baixas, neutras e altas;
- origem do relato associada ao QR code;
- estados `new`, `in_progress` e `resolved`;
- responsável, providência, resultado, reconhecimento e conclusão;
- prioridade do painel separando novos, em atendimento e sem responsável;
- remoção do botão de atualização simulado e de estados de integração antigos;
- comunicação pública limitada ao que o produto realmente entrega.

## Alertas externos

O produto ainda não envia e-mail ou WhatsApp. Esse é o próximo mecanismo para
reduzir a dependência do painel, mas exige escolher canal e fornecedor. A
primeira implementação deve usar um evento de caso independente do provedor,
com link direto para a ação. Não contratar nem configurar serviço antes da
decisão de custo.

## Critérios para o piloto

- o gestor entende a prioridade sem procurar em várias páginas;
- um caso pode ser continuado por outra pessoa sem explicação fora do sistema;
- a conclusão informa quem agiu, o que foi feito e qual foi o resultado;
- a origem por QR corresponde ao ponto de atendimento real;
- todas as notas têm o mesmo acesso às avaliações públicas;
- medir tempo até assumir, tempo até concluir e casos sem responsável;
- não afirmar recuperação de cliente, melhoria no Google ou retorno financeiro
  sem evidência registada.

## Fora deste lote

- envio real de alertas;
- publicação automática de respostas no Google;
- otimização completa do Perfil da Empresa;
- classificação automática por IA;
- multiunidade e modelo de agência.
