# Fluxo de pagamento dividido e crédito parcelado

Data: 15/11/2026. Implementação restrita ao frontend de Vendas. Nenhum arquivo do backend foi alterado.

## 1. Objetivo

Permitir que um pedido seja recebido em uma ou até quatro partes e que a parte em crédito possa ser parcelada. A tela deve preservar recebimentos já confirmados, recuperar uma operação interrompida e nunca tratar cobrança pendente como pagamento aprovado.

O campo **Dividir o pagamento?** oferece **Não / Sim**:

- **Não:** um grupo de recebimento, com o saldo restante sugerido. Ainda permite registrar um valor menor, mantendo a capacidade anterior de pagamento parcial.
- **Sim:** Quantidade de partes (2, 3 ou 4) aparece na mesma linha dos botões Não/Sim. Cada parte tem forma e valor. A divisão inicial é igual em centavos, com o restante na última parte; ajustes mantêm as demais partes e recalculam o complemento.

As duas partes não são enviadas em paralelo. A segunda depende da confirmação da primeira. O backend recebe um pagamento por requisição, sem flag de divisão ou array de recebimentos.

## 2. Regras verificadas no backend

Fontes: PedidoCaixaService, RegistrarPagamentoPedidoRequestDto, PagamentoPedidoEntity, CalculoPagamentoEletronicoHelper e os contratos de configuração/terminais.

| Regra | Comportamento adotado |
| --- | --- |
| Cada pagamento pertence ao pedido | POST /caixa/pedidos/{id}/pagamentos, uma chamada por parte. |
| Somente formas habilitadas | Dinheiro, Pix, débito e crédito aparecem conforme a configuração. |
| Parcelamento somente no crédito | Dinheiro, débito e Pix sempre enviam parcelas=1. |
| Crédito em 1x | Permitido mesmo com parcelamento desligado. |
| Crédito com mais parcelas | Respeita configuração, quantidade mínima/máxima e valor mínimo por parcela. |
| Máximo de parcelas | A configuração limita a 12; a UI segue essa regra, apesar de o DTO isolado aceitar até 24. |
| Dinheiro | Valor entregue precisa cobrir o valor aplicado nessa parte; troco calculado somente nessa parte. |
| Saldo comprometido | APROVADO, PENDENTE, PENDENTE_NA_POINT, EM_TERMINAL e PENDENTE_CONCILIACAO comprometem o saldo, conforme a entidade. |
| Estado final | Pedido só é considerado concluído quando o backend retorna CONCLUIDO. |
| Idempotência | Cada tentativa usa chave própria; uma repetição incerta preserva exatamente o payload e a chave. |
| Pendente não é aprovado | A segunda parte permanece bloqueada enquanto a primeira aguarda processamento ou conciliação. |

O backend aceita múltiplos recebimentos, inclusive repetição da forma. A UI limita a composição a quatro partes, sem impor uma proibição de backend que não existe para, por exemplo, dois cartões de crédito.

## 3. Exemplo completo

Pedido de R$ 100,00:

1. Selecionar Sim.
2. Informar R$ 40,00 na primeira parte; a segunda acompanha R$ 60,00.
3. Primeira parte em dinheiro: cliente entrega R$ 50,00 e a prévia mostra R$ 10,00 de troco.
4. Segunda parte em crédito: selecionar 3x, se a configuração permitir R$ 20,00 por parcela.
5. Confirmar o primeiro pagamento.
6. Após APROVADO, a primeira parte fica protegida contra edição e reenvio.
7. Confirmar a segunda parte. A cobrança integrada segue para a maquininha selecionada.
8. Somente após a confirmação do servidor e do pedido CONCLUIDO, o atendimento é encerrado e a posição visual 1 a 5 pode ser liberada pelo fluxo existente.

Se a segunda parte falhar, os R$ 40,00 aprovados continuam registrados. O cliente não recebe uma nova cobrança da primeira parte e a UI continua trabalhando com o saldo restante.

## 4. Campos e apresentação

### Resumo

Mostrar Total do pedido, Recebido aprovado e Saldo restante. Os números vêm da resposta de detalhe do pedido. Pagamentos pendentes não são apresentados como recebimento aprovado.

### Cada parte

- Forma de pagamento: opções habilitadas pelo caixa.
- Valor aplicado ao pedido: máscara monetária e valor positivo.
- Dinheiro: valor entregue e prévia de troco.
- Crédito: seletor de parcelas. As opções abaixo do valor mínimo aparecem indisponíveis.
- Point: maquininha ativa do caixa da sessão. Uma única opção pode ser selecionada automaticamente.
- Contingência: opção visível somente quando permitida; referência de comprovante opcional, com até 255 caracteres.

Os dois grupos são visíveis quando a divisão está ativa. O valor entregue em dinheiro na segunda parte pode ser preenchido quando ela for recebida; não é exigido para iniciar a primeira cobrança. Forma, valor e regras de parcelamento das duas partes são conferidos antes do primeiro envio.

Depois de iniciar o plano, o modo Não/Sim fica bloqueado. Partes aprovadas ficam somente para leitura. Uma parte ainda não enviada pode ser ajustada, preservando tudo que já foi recebido. Se uma tentativa já foi enviada e sua resposta é incerta, forma e valor não podem ser alterados na retomada daquela chave.

## 5. Estados do fluxo

| Estado | Interface | Próxima ação |
| --- | --- | --- |
| Preenchimento | Modo e partes editáveis | Validar e receber primeira parte. |
| Enviando | Campos, confirmação e fechamento bloqueados | Aguardar resposta. |
| Primeira aprovada | Primeira parte congelada; segunda disponível | Receber segunda parte. |
| Aguardando Point | Mensagem de acompanhamento; segunda bloqueada | Atualizar ou voltar ao pedido. |
| Pendente de conciliação | Mensagem de conferência; segunda bloqueada | Voltar ao pedido e conciliar pelas ações existentes. |
| Recusado/expirado/cancelado | Exibir situação; preservar partes aprovadas | Nova tentativa explícita da parte pendente, com nova chave. |
| Resposta incerta sem registro identificado | Campos da tentativa congelados | Reenviar a mesma tentativa com chave/payload iguais. |
| Parte aprovada, outra falhou | Primeira preservada; segunda com erro contextual | Corrigir/repetir somente a parte não recebida. |
| Pedido concluído | Fechar o modal após a resposta final | Atualizar atendimento e posição visual. |

Voltar ao pedido depois de uma cobrança registrada não cancela nem estorna o recebimento. Cobranças externas continuam existindo no backend e podem ser acompanhadas nas ações do pedido.

## 6. Validação e envio

Antes de cada POST, consultar novamente o pedido para conferir estado, desconto pendente, pagamentos já existentes e saldo comprometido. Essa leitura reduz decisões com dados desatualizados, mas o backend continua sendo a autoridade para concorrência.

Na composição inicial dividida, a soma dos valores deve ser exatamente o saldo disponível em centavos. Na segunda parte, conferir o restante atualizado. Não utilizar juros repassados como valor abatido do pedido: valor é o principal; valorCobrado é determinado pelo servidor.

O payload é montado por uma função específica e contém somente os campos do contrato: forma, valor, parcelas, valorRecebido, terminalCaixaId, contingenciaManual, comprovanteReferencia e chaveIdempotencia. Campos de dinheiro não são enviados para Pix/crédito/débito, e seleção antiga de terminal não vaza para dinheiro.

Exemplo resumido de dois envios:

```json
{"forma":"DINHEIRO","valor":40,"parcelas":1,"valorRecebido":50,"terminalCaixaId":null,"chaveIdempotencia":"chave-da-primeira-tentativa"}
```

```json
{"forma":"CREDITO","valor":60,"parcelas":3,"valorRecebido":null,"terminalCaixaId":"id-do-vinculo-da-maquininha","chaveIdempotencia":"chave-da-segunda-tentativa"}
```

## 7. Taxas e parcelas

A prévia consulta taxas ativas por forma e identifica a faixa de parcelas. Repasse efetivo usa gross-up:

`valorCobrado = (valorAplicado + taxaFixa) / (1 - taxaPercentual / 100)`

R$ 100,00 com 7,59% repassados e taxa fixa zero gera aproximadamente R$ 108,21. A UI separa principal e acréscimo e evita divisão por zero em percentual de 100%.

A prévia é estimativa. Não existe nesta entrega um contrato de cotação imutável entre consulta e cobrança; o backend calcula os valores oficiais. Caso a consulta falhe ou não cubra todas as faixas na página, a UI avisa que a prévia está indisponível. A quantidade de parcelas segue a configuração real, e o valor aproximado por parcela não promete distribuição exata dos centavos da adquirente.

## 8. Recuperação e prevenção de duplicidade

O plano técnico é guardado em sessionStorage, separado por usuário e pedido, antes do envio de cada cobrança. Contém valores, formas e chaves, sem senhas de autorizadores ou dados de cartão. Não é um histórico financeiro nem fonte de verdade sobre o recebimento.

Ao reabrir o modal ou recarregar a página, consultar o pedido e reconhecer as partes pelo campo chaveIdempotencia. Uma parte aprovada é preservada; uma parte pendente aguarda; uma tentativa sem confirmação é retomada com a mesma chave e payload.

Se um POST retornar erro, uma leitura do pedido tenta reconciliar o resultado. Encontrar a chave confirma que existe registro, evitando repetir a parte indevidamente. Um erro de cliente, seguido de leitura que confirma ausência do registro, libera a revisão da parte rejeitada. Falha de rede/servidor ou impossibilidade de conferir preserva a tentativa para repetição idempotente.

O modo antigo de tentativa única também é reconhecido quando existe uma chave local pendente do fluxo anterior. Quando todas as partes estiverem aprovadas, o registro técnico é removido. A persistência não transforma o navegador em autoridade de pagamento.

Não há retry automático de POST. Cliques concorrentes são bloqueados por estado e trava síncrona. Leituras de acompanhamento da Point ocorrem aproximadamente a cada cinco segundos, somente com a página visível e sem uma leitura anterior em carregamento. Conciliação manual não gera polling constante.

## 9. Organização de código

- `src/features/sales/payments/model/paymentRules.js`: formas, centavos, saldo comprometido, parcelas, validação, payload e prévia de taxas.
- `src/features/sales/payments/ui/SalePaymentModal.jsx`: composição Não/Sim, estado por parte, reconciliação, recuperação e envio sequencial.
- `src/features/sales/payments/ui/SalePaymentModal.module.css`: grupos, resumo, máscara visual e responsividade.
- `src/pages/sales/remote/SalesRemote.jsx`: abre o modal específico e mantém as ações existentes de conciliação/cancelamento/atualização.
- `src/entities/sales/api/cashApi.js`: transporte autenticado existente, sem duplicação de CSRF ou refresh de sessão.

O modal antigo genérico deixou de executar os novos pagamentos. O polling da página pai é pausado enquanto o modal está aberto, evitando desmontá-lo entre a primeira e a segunda parte. O recebimento não faz baixa manual de estoque; reserva e baixa continuam no backend.

## 10. Validação executada

Testes unitários cobrem parcelas permitidas, mínimo por parcela, dinheiro, payload por forma, saldo comprometido, terminal ativo e gross-up.

Testes de navegador com API simulada cobrem:

- Pagamento único já existente.
- Dinheiro + crédito em 3x.
- Falha na segunda parte preservando a primeira.
- Retomada após F5 sem nova cobrança da primeira parte.
- Cobrança da Point pendente impedindo envio da segunda parte.
- Confirmação posterior liberando somente o restante.
- Falha de rede com reenvio do payload e chave exatamente iguais.
- Preservação do fluxo de posições 1 a 5 e numeração real do histórico.

Não houve cobrança real nem homologação de aparelho físico. Backend, Financeiro, emissão fiscal e regras de refund externo permanecem intactos.

## Atualização: quantidade de partes na mesma linha

O seletor Quantidade de partes aparece somente em Sim, ao lado dos botões, com opções 2, 3 e 4. Após iniciar um recebimento, modo e quantidade ficam bloqueados para proteger as partes já confirmadas. Os rótulos distinguem primeiro, segundo, terceiro e quarto pagamento.

A divisão de R$ 100,01 em quatro partes produz R$ 25,00 + R$ 25,00 + R$ 25,00 + R$ 25,01. Alterar uma parte recalcula a última. Ao alterar a última, a penúltima é recalculada, sem modificar valores de partes já aprovadas. Antes de enviar, as partes ainda pendentes precisam somar exatamente o saldo disponível atualizado.

Cada parte usa seu próprio POST e chave. Não há cobrança das quatro partes em uma única transação atômica. Se a quarta falhar, as três primeiras permanecem confirmadas. A retomada local reconhece planos antigos de duas partes e novos planos de até quatro, sempre conferindo o pedido no servidor.

Testes adicionais: distribuição de centavos para três/quatro partes, ajuste sem alterar partes aprovadas, seletor alinhado ao lado de Sim, quatro formas de recebimento no mesmo pedido e retomada após F5 preservando as três primeiras partes. Backend e Financeiro não foram modificados.
