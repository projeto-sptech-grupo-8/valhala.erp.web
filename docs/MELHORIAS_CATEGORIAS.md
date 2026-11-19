# Melhoria da página de categorias

Implementado em 16/11/2026, somente no frontend. A página e sua rota foram mantidas; criação e edição continuam em modal.

## Apresentação

- Busca, status e tamanho de página ficam em uma linha compacta no desktop e empilhados em telas pequenas.
- Recolher filtros esconde busca, status e tamanho de página; título e ações continuam disponíveis. Os valores aplicados são preservados ao recolher.
- Limpar/atualizar permanecem à esquerda de Nova categoria no cabeçalho.
- Tabela com Categoria, Status e Ações. Nome em destaque e descrição abaixo, limitada a duas linhas; o texto completo permanece no atributo title e no formulário de edição.
- Status combina texto, ícone e cor. Nenhum indicador global ou contagem de produtos foi inventado.
- Estados vazios distinguem ausência de cadastro e busca sem resultados. Ação de criar só é apresentada com GERENCIAR_ESTOQUE.

## Regras do backend respeitadas

Categoria pertence ao estabelecimento autenticado. Nome obrigatório, até 100 caracteres, único sem diferenciar maiúsculas e minúsculas, inclusive entre categorias inativas. Descrição opcional. Criação inicia ativa.

Inativar não altera o status dos produtos existentes nem desfaz seus vínculos. Categoria inativa não pode ser atribuída em novos vínculos no cadastro/alteração de produto. Reativar a torna disponível novamente.

Excluir é bloqueado pelo servidor quando existem produtos vinculados, inclusive inativos. Não há exclusão em cascata ou transferência automática dos produtos.

Consulta exige VISUALIZAR_ESTOQUE; criação, edição, exclusão e mudança de status exigem GERENCIAR_ESTOQUE. O backend continua sendo a autoridade sobre duplicidade, permissões e vínculos.

## Ações e integração

Ações visíveis em cada linha: Ver produtos, Editar categoria, Inativar/Reativar categoria e Excluir categoria, conforme permissão. O menu de três pontos foi removido. Em telas menores, os botões usam ícones com título e nome acessível para preservar espaço.

Mudança de status exige confirmação com explicação do efeito e envia PATCH /categorias/{id} somente com ativo. A linha é atualizada após confirmação e nova consulta. Falha é exibida no próprio diálogo.

DELETE /categorias/{id} com conflito 409 mantém o erro visível, bloqueia nova tentativa naquele diálogo e oferece Ver produtos vinculados ou Inativar categoria, se ativa. Inativar substitui o diálogo de exclusão pelo de confirmação de status; não empilha modais. Nenhuma consulta por produto é feita antecipadamente para tentar adivinhar vínculos.

Ver produtos navega para o catálogo com categoriaId. Busca, status, ordenação e paginação continuam remotos em GET /categorias; não se carrega a lista completa.

## Criação rápida no cadastro de produto e drink

Nova categoria ao lado do campo abre o mesmo formulário reutilizado pela página. O modal fica fora do formulário do produto na árvore HTML para evitar formulários aninhados. Cancelar preserva o produto sem criar nada. Após POST /categorias confirmado, seleciona o ID devolvido e preserva os demais campos. Não salva o produto automaticamente.

O autocomplete consulta a categoria selecionada por ID. Duplicidade e erro de validação permanecem no modal. Criação sem confirmação por falha de conexão bloqueia reenvio para evitar cadastro duplicado e orienta consultar a lista. Apenas fechar/cancelar não desfaz uma categoria já confirmada no servidor.

## Organização e validação

O formulário foi extraído para features/catalog/category-editor/ui/CategoriaModal.jsx com CSS próprio. CategoriesPage mantém consulta e confirmações de exclusão/status. CategoryRowActions mantém o menu e ProductForm reutiliza o editor de categoria.

Validação com APIs simuladas: navegação por ID, exclusão bloqueada seguida de inativação/reativação com payload mínimo, estados vazios e permissão de leitura, criação rápida preservando produto e seleção do ID confirmado, tratamento de conflito e bloqueio durante envio. Cinco testes de navegador passaram; lint e build concluídos. Nenhum dado real ou backend foi alterado. Layout conferido em desktop e largura de 390 px.
