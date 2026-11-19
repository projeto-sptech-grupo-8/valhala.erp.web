# Melhoria visual — lista de produtos e drinks

Data: 14/11/2026.

## Escopo

Alteração de apresentação e interação exclusivamente na listagem de produtos e drinks. A referência enviada orientou a organização do painel; o botão “Filtros avançados” não foi incluído.

Foram preservados os filtros suportados, a busca remota com debounce, a paginação, as permissões, a exportação da página e a geração de etiquetas. Não houve alteração de backend ou das demais abas.

## Antes e depois

| Elemento | Antes | Depois |
| --- | --- | --- |
| Filtros e buscas | Controles na mesma barra flexível, com alturas diferentes | Painel próprio, com filtros acima e buscas abaixo |
| Rótulos | Parte da identificação dependia de placeholders | Títulos visíveis: Categoria, Tipo, Cadastro, Itens por página, Buscar por nome, Buscar categoria e Ações |
| Exportação | “Exportar esta página” | “Exportar”, com ícone e dica mantendo o alcance da página |
| Etiquetas | “Etiquetas desta página” | “Etiqueta”, com ícone e dica sobre os produtos da página |
| Ações da linha | Vários botões ocupavam espaço variável | Um botão de três pontos, com menu de opções |
| Tabela | Larguras variáveis e botões extensos por linha | Larguras definidas, altura uniforme e números alinhados à direita |

## Painel acima da tabela

O painel “Filtros e ações” concentra os controles e usa borda, fundo e espaçamento compatíveis com o tema existente.

1. Cabeçalho com título, descrição, limpar filtros, atualizar e acesso a novo produto quando permitido.
2. Primeira linha com Categoria, Tipo, Cadastro e Itens por página.
3. Segunda linha com Buscar por nome, Buscar categoria e Ações.
4. A área Ações contém os dois botões solicitados: Exportar e Etiqueta.

A busca por nome continua aceitando código do produto. A pesquisa de categorias continua consultando opções paginadas no servidor, com navegação para mais opções e manutenção da categoria selecionada por ID. O controle foi organizado dentro desta página para separar visualmente pesquisa e seleção, sem modificar os seletores compartilhados das demais telas.

## Menu de três pontos

Cada linha apresenta um botão com nome acessível “Ações de [produto]”. As opções mantêm as permissões existentes:

- Ver detalhes: disponível para consulta.
- Editar produto ou Editar receita: exige gerenciamento de estoque.
- Registrar entrada: exige movimentação e produto padrão ativo.

O menu abre próximo ao botão, fora do recorte da tabela, e procura espaço acima quando está perto da borda inferior da janela. Fecha ao clicar fora, rolar, redimensionar ou escolher uma opção. Escape fecha e devolve o foco ao botão. Setas, Home e End navegam pelas opções; Tab permite sair.

Não foram adicionadas ações de exclusão ou regras novas de negócio.

## Simetria e responsividade

As colunas possuem larguras previsíveis. Preço, custo, margem e saldo usam alinhamento à direita e algarismos tabulares. A coluna Ações é centralizada e tem largura constante. Linhas possuem altura mínima uniforme, e nomes extensos são truncados visualmente com o nome completo disponível na dica e no detalhe.

A tabela preserva todas as informações por rolagem horizontal interna quando a largura disponível não comporta as colunas. Em celular, filtros ocupam duas colunas, buscas ficam empilhadas e os dois botões de ação dividem a largura. A página não ganha rolagem horizontal externa por causa da tabela.

Os estilos são locais à página. O componente compartilhado de tabela e os estilos de outras abas não foram modificados nesta melhoria.

## Arquivos desta melhoria

- `src/pages/catalog/products/ui/ProductsPage.jsx`: composição do painel e das colunas.
- `src/pages/catalog/products/ui/ProductsPage.module.css`: estilos locais e responsivos.
- `src/pages/catalog/products/ui/ProductRowActions.jsx`: menu contextual acessível.
- `e2e/catalog-remote.spec.js`: adaptação do rótulo de exportação e verificação do menu no teste existente.
- Este documento.

## Validação

O build de produção passou, e o lint dos componentes desta página passou. Dois testes direcionados com API simulada passaram: consulta/filtros/ordenação com abertura do menu e Escape; permissões de leitura e layout de celular sem transbordamento externo.

As capturas de desktop e celular foram inspecionadas. O teste preserva a verificação de que a listagem consulta uma página e não carrega receitas para todos os drinks.

O aviso já existente de bundle acima de 500 kB permanece; divisão global do bundle não faz parte desta melhoria visual.
