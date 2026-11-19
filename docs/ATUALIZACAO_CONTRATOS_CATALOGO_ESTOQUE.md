# Atualização dos contratos de Catálogo e Estoque

Revisão: 15/11/2026. Backend analisado: `6dbb46d`, incluindo `4964746` (lote/validade no cadastro) e `a913997` (remoção de código de barras/descrição). Somente o frontend foi alterado.

Este documento substitui as orientações anteriores sobre cadastro em duas etapas e campos EAN/descrição de produtos. Exportação de Produtos e drinks permaneceu fora do escopo, conforme solicitado anteriormente.

## 1. Alterações identificadas no backend

### Produto com lote e validade na criação

`ProdutoRequestDto` aceita `lote` e `validade` junto de `quantidadeInicial`. Em `ProdutoService.criarProduto`, a transação cria produto, estoque, lote e histórico inicial. Não é mais necessário criar com saldo zero e chamar uma ENTRADA separada.

Quando há saldo positivo, o servidor registra `ENTRADA_INICIAL` e vincula os lotes. Quando o saldo é zero, ele também pode criar o lote identificado pela validade, sem movimentação de quantidade zero. Sem código de lote e com validade, utiliza `VAL-<data>`.

### Campos removidos

`codigoBarras` e `descricao` foram removidos dos DTOs de criação, atualização e resposta de produtos. A migration correspondente é `V22__remover_codigo_barras_e_descricao_de_produto.sql`. A busca de `/produtos` agora considera nome ou SKU, sem EAN.

As descrições de **categorias, perfis e funcionalidades** continuam no backend e não foram removidas do frontend.

### Contratos preservados

Continuam disponíveis, sem mudança necessária de payload nesta revisão:

- `/categorias`: consulta paginada e criação/edição/exclusão.
- `/drinks/{id}/receita`: leitura e gravação de ingredientes ML/UN.
- `/lotes` e `/lotes/resumo`: filtros, paginação e indicadores de validade.
- `/movimentacoes-estoque`: entradas, saídas, perdas, ajustes, validade e escolha de `loteId`.
- `/movimentacoes-estoque/saida-drink`: consumo da receita.
- `/dashboard/resumo`: KPIs de estoque e até cinco alertas de reposição.

## 2. Novo fluxo de cadastro

1. O usuário escolhe Produto padrão.
2. Preenche identificação, preço, custo/mínimo/saldo inicial quando desejado e **Data de validade**, que continua obrigatória na interface.
3. O adaptador converte quantidade inicial e mínimo de embalagens para ml se o produto for fracionado. Produto unitário mantém sua quantidade.
4. O frontend realiza **um único POST `/produtos`**, incluindo quantidade inicial e validade.
5. A API salva o conjunto na transação existente e devolve o produto.
6. A interface invalida o catálogo e retorna à lista. Não faz um POST adicional de movimentação e não duplica o saldo.

Exemplo de produto unitário:

```json
{
  "nome": "Morango",
  "categoriaId": 1,
  "unidadeMedida": "un",
  "precoVenda": 10,
  "precoCusto": 5,
  "tipo": "PADRAO",
  "fracionado": false,
  "fardo": false,
  "estoqueMinimo": 5,
  "quantidadeInicial": 80,
  "validade": "2027-03-31"
}
```

Para duas embalagens fracionadas de 750 ml, `quantidadeInicial` será 1500. O adaptador realiza essa conversão uma vez.

### Saldo inicial zero

A restrição de saldo positivo existia no frontend por causa da antiga solução em duas requisições. Foi retirada: o backend atualizado permite lote inicial zerado com validade. A data continua obrigatória conforme a regra de interface solicitada pelo usuário. O backend, por contrato, ainda a considera opcional para outros clientes.

Na tela de Validades e lotes, o lote zerado será encontrado usando **Incluir zerados**. Os KPIs consideram apenas lotes com saldo positivo, como definido pelo serviço.

### Erros e duplicidade

Foi removida a lógica `initialLotRef` e a retomada de ENTRADA inicial separada. Falha de criação não é apresentada como uma segunda etapa pendente. Em perda de conexão, o envio pode ter sido confirmado no servidor; o frontend mantém o bloqueio de repetição e orienta consultar o catálogo antes de cadastrar novamente.

O fluxo de drink continua em duas operações porque a API de receita permanece separada: cria produto e depois grava receita. Nesse caso, o ID criado continua preservado em falha de receita, evitando duplicar drinks.

## 3. Edição e leitura de produtos

- Código de barras e descrição foram retirados de todos os formulários de produto/drink, inclusive edição.
- `fromProduto` possui somente campos ainda aceitos pelo contrato. Não envia `codigoBarras` ou `descricao`, mesmo que algum consumidor legado mantenha essas propriedades em memória.
- `lote` e `validade` só entram no payload de **criação de produto padrão**, nunca no PATCH ou no cadastro de drink.
- O mapeamento lê `lote` e `validade` quando devolvidos pela API.
- A resposta de criação pode ecoar o lote e a validade informados, mas o mapper do backend usado no GET/PATCH normalmente retorna esses campos nulos. Não são tratados como uma validade global editável do produto.
- Para consultar a situação atual dos lotes, usa-se `/lotes`, com filtro por produto. O detalhe do catálogo ganhou **Ver lotes e validades**, que abre essa consulta com `produtoId` e todos os lotes.
- O detalhe também apresenta a configuração real de fardo, quando existente.

## 4. Etiquetas e XML

### Etiquetas

O catálogo atual não fornece EAN. Foram removidos os avisos que pediam para revisar um código de barras inexistente no cadastro, a indicação por produto “Com/Sem código” e a tentativa de gerar barras a partir de valores antigos.

As etiquetas preservam nome, SKU, preço, formato, quantidades, cor e lote/validade escolhidos. Não convertem SKU/UUID em um EAN inventado. Se o SKU estiver ausente, mostram “SKU não informado”. Preferências de impressão continuam locais por usuário.

Lotes e validade continuam sendo consultados na API somente no modo de impressão por validade. Essa parte da integração não foi substituída por campos de lote ecoados no POST de criação.

### Importação XML

O EAN existente no XML continua visível como dado fiscal do arquivo, mas não é usado para associar automaticamente a produtos: o catálogo não possui mais esse campo para comparação.

A associação utiliza vínculo fornecedor/item já salvo e ainda válido ou escolha manual de um produto existente. O frontend verifica se o produto do vínculo continua no catálogo antes de aplicá-lo. Quantidade, número de NF, lote e validade continuam sendo enviados nas entradas existentes. Controle da NF e vínculos permanecem no fluxo legado local; não foi inventado um endpoint de importação fiscal transacional.

## 5. Estoque, reposição e desempenho

Os filtros e paginação de lotes/produtos/categorias/movimentações continuam no backend. Validades usa o resumo oficial, a situação oficial e as quantidades-base; a perda continua informando `loteId` e quantidade exata. Os detalhes de movimentação continuam mostrando `lotes[]`.

Reposição continua usando o dashboard: até cinco alertas prioritários e KPIs globais. O contrato ainda não oferece lista completa paginada de reposição. Os filtros locais ficam identificados como filtros desses alertas, sem prometer uma consulta global.

Não houve alteração no conversor de fardos para fracionados no backend: ele ainda multiplica somente por `unidadesPorFardo`. Por isso, o seletor de movimentação em fardos continua limitado aos não fracionados; não se introduziu uma interpretação silenciosa de garrafas como ml.

A atualização reduz uma requisição e um ponto de falha por cadastro de produto padrão com validade. Não aumenta a carga das consultas de listagem, não baixa o histórico inteiro e não altera a regra de giro calculada no frontend.

## 6. Arquivos e validação

| Arquivo | Ajuste |
| --- | --- |
| `src/shared/api/api.js` | Campos novos de criação/leitura e remoção de campos extintos |
| `src/features/catalog/remote/catalogModel.js` | Cadastro padrão direto, sem ENTRADA adicional |
| `src/features/catalog/product-editor/ui/ProductForm.jsx` | Formulários compatíveis e validade obrigatória com saldo inicial zero permitido |
| `src/features/catalog/remote/ProductDetail.jsx` | Configuração de fardo e link para lotes do produto |
| `src/features/catalog/product-labels/ui/EtiquetasModal.jsx` | Comunicação de impressão compatível com catálogo sem EAN |
| `src/features/catalog/product-labels/ui/ProductLabel.jsx` | Identificação por SKU sem barras inventadas |
| `src/pages/inventory/invoice-import/ui/InvoiceImportPage.jsx` | Associação manual/vínculo existente sem comparação de EAN |
| `e2e/catalog-remote.spec.js` | Contratos atualizados de criação, edição, impressão e regressões de estoque |

Os testes verificam cadastro unitário/fracionado com um único POST, bloqueio sem validade, saldo inicial zero, ausência de campos removidos, edição sem campos de criação, etiquetas sem EAN, receita de drink, lotes, perdas, fardos e reposição. Os testes de interface utilizam API simulada, sem alterações no banco real. Homologação com o serviço em execução deve usar o backend atualizado e as migrations correspondentes; nenhum arquivo do backend foi alterado pelo frontend.
