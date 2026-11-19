# Auditoria do caixa: apresentação e integração

## Escopo

Melhorias no frontend de Auditoria do caixa, usando o contrato existente de `GET /caixa/auditoria`. O backend não foi alterado.

## Tabela

Antes: data, código técnico do evento, responsável, descrição e ações.

Agora: data e hora com ano, evento traduzido com ícone e cor, responsável, pedido/referência, valor, resumo e botão direto **Ver detalhes**. A descrição completa fica disponível no painel lateral. O valor zero aparece como R$ 0,00; valores ausentes aparecem como —. Referências usam o rótulo do pedido ou o tipo de registro, sem expor UUIDs.

Cores representam a natureza do evento: vermelho para cancelamento, falha e divergência; amarelo para solicitações; verde para aprovação e resolução; verde-água para abertura, reforço e novos registros; roxo para configuração, fechamento e estorno; laranja para sangria, expiração e desconto acima do limite; azul para os demais eventos informativos. Pagamento registrado e conciliação manual não são classificados automaticamente como aprovação. Eventos futuros têm texto legível e estilo neutro.

## Filtros e consulta

- Evento: opções agrupadas em Caixa, Configuração, Pedidos, Descontos e Pagamentos, com os códigos definidos pelo backend.
- Período e itens por página: preservam a consulta remota.
- Responsável: o campo **Buscar responsável** permite digitar o nome e escolher uma opção. O filtro ativo pode ser removido sem limpar os demais. Os nomes na tabela são texto; não há botão junto ao nome nem botão Minhas ações.
- Data, evento, responsável e valor enviam ordenação ao servidor.
- Paginação usa o mesmo tamanho selecionado nos filtros e informa o total retornado pelo servidor. Ajustado também o tamanho repassado à tabela compartilhada de pedidos e sessões, evitando que a consulta use 20 registros e a navegação calcule páginas de 10.
- Limpar e atualizar continuam no cabeçalho dos filtros, somente com ícones e nomes acessíveis.

Por autorização do usuário, a busca por nomes acontece no frontend. A lista de `/usuario` é carregada somente ao usar o campo pela primeira vez, preservada em memória enquanto a tela estiver montada e filtrada localmente, ignorando acentos e diferenças entre maiúsculas e minúsculas. São exibidas até 20 opções de cada vez; digitar mais letras refina a lista. Não há requisição por letra digitada. A seleção envia `usuarioId` à auditoria, que continua filtrada e paginada no servidor. O campo respeita a permissão USUARIOS_VISUALIZAR. Como o endpoint de usuários não tem paginação, essa lista ainda é recebida integralmente; a mudança não baixa todos os eventos de auditoria.

## Ver detalhes

O painel lateral específico de auditoria mostra evento, descrição, data, responsável, referência, valor, motivo e nome do autorizador. Dados ausentes são informados sem assumir ausência de autorização ou valor zero.

A comparação Antes/Depois transforma os snapshots em campos legíveis, destaca alterações, preserva zero e falso e oculta identificadores e credenciais. Aceita objetos ou JSON serializado; dados inválidos não quebram o painel. A visualização é limitada a 80 campos e cinco níveis, evitando renderização excessiva de snapshots extensos. Ela é uma apresentação resumida, não uma exportação integral dos registros.

O valor pertence ao evento, não necessariamente a uma movimentação de dinheiro. Não foram criados totais de faturamento ou indicadores globais somando eventos: o mesmo pedido ou pagamento pode aparecer em vários registros.

## Organização

- `src/entities/sales/model/auditPresentation.js`: catálogo de eventos, rótulos, referência, data e preparação segura da comparação.
- `src/pages/sales/remote/CashAudit.jsx`: filtros específicos, evento, responsável e painel lateral.
- `src/pages/sales/remote/AuditResponsibleSearch.jsx`: carregamento sob demanda e busca local dos nomes, com teclado, estados de carregamento e tentativa novamente.
- `src/pages/sales/remote/SalesRemote.jsx`: consulta remota, colunas e integração dos componentes.
- `src/pages/sales/remote/SalesRemote.module.css`: estilos locais, cores, comparação e adaptação para telas pequenas.

## Validação

Testes de apresentação cobrem dados aninhados, ocultação de identificadores/credenciais, valores zero e falso, snapshots inválidos e eventos desconhecidos. Teste de navegador com API simulada cobre filtros, remoção de filtros, ordenação, paginação, detalhes e carregamento único da lista de usuários ao abrir a busca. Também verifica busca sem acentos, ausência de chamadas de auditoria durante a digitação e remoção dos botões junto aos responsáveis e Minhas ações. A tabela de pedidos compartilhada também foi verificada. Build e lint dos arquivos alterados foram executados. A validação simulada não substitui a conferência com os dados do ambiente real.
