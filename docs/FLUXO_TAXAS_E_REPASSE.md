# Taxas e repasse: interface, regras e integração

## Escopo

Reorganização do frontend da subaba Taxas e repasse em Ajustes do caixa. Foram mantidos os contratos e as regras existentes no backend, sem modificar o servidor, os pagamentos ou o módulo financeiro.

Antes, a subaba mostrava cards com códigos de formas de pagamento e valores, além de formulários genéricos. A criação não expunha o repasse; a edição preservava esse atributo sem permitir escolhê-lo. Agora, a lista diferencia os custos, a regra de repasse e a situação, e o formulário permite configurar explicitamente as três possibilidades do contrato.

## Lista e filtros

A tabela mostra forma de pagamento, quantidade de parcelas, percentual, taxa fixa, quem absorve os encargos, status e Editar taxa. Ações de criação e edição exigem CAIXA_CONFIGURAR. Usuários com acesso somente de visualização mantêm a consulta e os filtros.

O resultado **Cliente paga** ou **Loja absorve** usa `repasseEfetivo` retornado pelo servidor. A indicação secundária diferencia **Segue a política geral** (`repassarAoCliente = null`) de **Regra própria desta taxa** (`true` ou `false`). Um resultado efetivo ausente não é substituído silenciosamente por falso.

Filtros por forma e status, paginação e ordenação são enviados para GET /caixa/taxas. A busca não baixa a lista inteira para filtrar no navegador. O tamanho inicial é 10, com opções 5, 10 e 20. Os filtros são recolhíveis e as ações de limpar e atualizar usam ícones com nomes acessíveis. A ordenação usa somente campos permitidos no contrato, como forma, parcelas e taxaPercentual.

O carregamento, os erros e a ausência de resultados têm estados próprios. A lista de taxas possui consulta independente das demais subabas, evitando requisições duplicadas. O cadastro salvo respeita os filtros atuais; a mensagem de confirmação informa isso.

## Regras do backend consideradas

1. Somente Pix, débito e crédito têm taxas configuráveis; dinheiro não possui taxa.
2. Pix e débito aceitam uma parcela. Crédito aceita de 1 a 12.
3. A combinação de forma e parcelas é única por estabelecimento, inclusive para uma taxa inativa. Inativar não permite criar outra linha igual.
4. O percentual vai de 0 a 100 e aceita até quatro casas decimais. Ele representa o percentual total para a quantidade de parcelas, não uma taxa mensal.
5. A taxa fixa é por transação, não negativa, com até duas casas decimais. Zero significa ausência desse componente do custo.
6. `repassarAoCliente = null` segue a política global; `false` faz a loja absorver; `true` repassa ao cliente. A regra própria prevalece sobre a global.
7. Somente taxas ativas são usadas nos cálculos de novas cobranças. O servidor utiliza custo zero se não encontrar uma taxa ativa correspondente.
8. No PUT, forma e parcelas não são editáveis. Apenas percentual, taxa fixa, repasse e ativo são enviados.
9. O contrato consultado não oferece exclusão de taxas; a interface permite inativar, preservando o cadastro.

## Cadastro e edição

Nova taxa e Editar taxa usam modal específico com três seções: Identificação da taxa; Custos por transação; Repasse e situação. Os títulos têm ícones e ajuda por hover ou foco. Os campos obrigatórios são identificados com asterisco vermelho.

Ao selecionar Pix ou débito na criação, a quantidade é ajustada para uma parcela. Na edição, forma e parcelas ficam bloqueadas. O percentual aceita vírgula e quatro casas decimais; a taxa fixa usa a máscara monetária existente. Campos numéricos podem ser apagados durante a edição, mas valores obrigatórios em branco não são enviados.

O repasse tem três opções explícitas: seguir a política geral, a loja absorve ou repassar ao cliente. A política global é consultada ao abrir o formulário, e sua aplicação atual é informada. Se a consulta falhar, há tentativa novamente; salvar com herança da política fica bloqueado até a leitura. Uma escolha própria não depende da política global.

O frontend impede percentual igual a 100 quando o repasse efetivo é para o cliente. O backend valida esse limite quando o repasse próprio é verdadeiro; seu cálculo de cobranças também exige divisor positivo quando a herança da política resulta em repasse ao cliente. O frontend cobre essa segunda situação antes do envio, sem alterar a regra do servidor. Percentual de 100 pode ser mantido quando absorvido pela loja.

## Exemplo visual

Uma simulação para uma venda de R$ 100,00 mostra quanto o cliente paga, os encargos estimados e o líquido estimado da loja. Ela aparece somente quando os campos são válidos e a taxa está ativa.

Com repasse ao cliente, o cálculo segue a relação usada pelo servidor: `(valor da venda + taxa fixa) / (1 - percentual/100)`. Sem repasse, o cliente paga o valor da venda, e o custo estimado da loja é o percentual desse valor somado à taxa fixa.

Exemplo: 3,5% e R$ 0,50 produzem cobrança estimada de R$ 104,15 com repasse, preservando R$ 100,00 líquidos estimados para a loja. Com absorção, a cobrança fica em R$ 100,00, o custo estimado em R$ 4,00 e o líquido estimado em R$ 96,00. A simulação usa a política consultada e os dados do formulário; o servidor continua confirmando os valores de cada pagamento. Não representa liquidação real da operadora nem altera pagamentos anteriores.

## Falhas e segurança do fluxo

Validação local impede chamadas inválidas. O erro fica junto ao campo e o foco é direcionado ao primeiro campo inválido disponível. Erros da API mantêm o modal aberto e preservam os dados. Duplicidade informa que a taxa existente deve ser editada ou reativada, inclusive quando inativa.

O envio é protegido contra duplicação. Em resposta de rede incerta, o formulário bloqueia nova gravação e permite Conferir taxa salva. A conferência consulta a forma de pagamento, sem filtro de ativo, em uma página de até 20 registros: há no máximo 12 combinações para crédito e uma para cada outra forma. Exige uma resposta completa e compara os campos editáveis. Uma configuração correspondente conclui o fluxo sem repetir POST. Um cadastro existente com valores diferentes impede criar uma duplicata e orienta editar a linha existente. Outros erros preservam o bloqueio até nova conferência.

Nenhum resultado de listagem é alterado de forma otimista antes da confirmação. Depois de salvar, o modal fecha e a consulta é atualizada.

## Organização e validação

- `src/features/sales/cash-settings/model/cashFeeRules.js`: formas, rascunho, validações, payload, repasse efetivo do formulário e exemplo estimado.
- `src/features/sales/cash-settings/ui/CashRatesPanel.jsx`: filtros, consulta, tabela, paginação e abertura dos modais.
- `src/features/sales/cash-settings/ui/CashFeeModal.jsx`: cadastro, edição e conferência após resposta incerta.
- Arquivos CSS locais: estilos das seções, tags, campos e adaptação para celular.
- `src/pages/sales/remote/SalesRemote.jsx`: composição da subaba, mantendo o restante de Ajustes do caixa.

Testes de regras cobrem herança e override de repasse, imutabilidade da combinação na edição, precisão decimal, limites de parcelas e cálculo do exemplo. Testes de navegador com API simulada cobrem filtros e ordenação remotos, paginação, edição, criação, duplicidade, limite de percentual, valores zero, máscaras, conferência após resposta incerta, permissões e botão de salvar visível no celular. A navegação entre subabas também foi verificada. Lint e build foram executados. A validação simulada não substitui homologação com o backend e o Mercado Pago no ambiente real.
