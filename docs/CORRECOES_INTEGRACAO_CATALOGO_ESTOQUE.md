# Correções de integração de catálogo e estoque

Data: 15/11/2026. Escopo: frontend. Backend, importação XML e exportação de produtos não foram alterados.

## Giro de produtos padrão

Antes, a validação exigia UN para todos os produtos não fracionados. A API devolve a unidade cadastrada, como un ou garrafa, e isso impedia o cálculo em unidades válidas.

Agora, o hook preserva a unidade do produto e a regra compara a unidade cadastrada com a movimentação, ignorando somente espaços externos e diferença entre maiúsculas e minúsculas. Não converte unidades diferentes. Produtos fracionados continuam exigindo ML. As consultas continuam paginadas no servidor, limitadas a 1.000 registros por produto, com duas consultas concorrentes; uma soma parcial nunca é publicada. O período permanece os últimos 30 dias completos. O consumo inclui SAIDA e SAIDA_DRINK, excluindo perdas e ajustes; estornos registrados como ajuste positivo não são abatidos, portanto não representa vendas líquidas.

## Saldo e rendimento

O detalhe usa o rótulo Saldo físico. A API de produtos não fornece saldo reservado nem saldo disponível líquido. Um aviso explica que reservas e vencidos não foram descontados.

No drink, Quantidade possível virou Rendimento teórico: uma estimativa pelo estoque físico dos ingredientes. A disponibilidade real é validada pelo servidor na saída, com as regras de validade e reservas. O frontend não percorre todos os lotes para tentar reproduzir essa regra.

O giro de drinks permanece indisponível com uma explicação corrigida: existe quantidadeDrinks no snapshot, mas o mesmo preparo é repetido nas movimentações de cada ingrediente. Não há identificador único de preparo na resposta para deduplicar com segurança nem consulta agregada por drink. Somar snapshots ou agrupar somente por horário poderia duplicar ou perder preparos. Para disponibilizar um total confiável, o contrato precisa fornecer um identificador de preparo ou um agregado no servidor.

## Operador nas movimentações

O filtro Operador envia usuarioId à listagem no servidor e reinicia a paginação. A lista de usuários é consultada somente quando há permissão USUARIOS_VISUALIZAR, com cancelamento da leitura e reaproveitamento de chamadas simultâneas. Carregamento e falha têm estados explícitos e opção de tentar novamente. Sem essa permissão, a tela não tenta obter usuários. O endpoint atual de usuários não é paginado; por isso a lista de opções ainda depende dessa limitação do contrato. A filtragem do histórico é feita pelo backend.

## Exportação de movimentações

O CSV local da página foi substituído pelo GET /movimentacoes-estoque/exportar. O servidor gera o Excel usando produto, tipo, operador, período e ordenação da consulta. Paginação e tamanho não são enviados: exporta a consulta filtrada conforme os limites do endpoint, não apenas as linhas visíveis. O botão informa esse escopo no tooltip, bloqueia cliques durante o download e mostra falhas sem perder os filtros.

A requisição binária usa a infraestrutura existente de credenciais, renovação de sessão e mensagens de erro. O arquivo é baixado como movimentacoes com data e extensão xlsx; a URL temporária é liberada após iniciar o download. Nenhuma planilha é montada no navegador.

## Reposição

Os indicadores continuam sendo os dados globais de dashboard/resumo. O servidor retorna no máximo cinco alertas prioritários, sem endpoint de reposição paginado. A interface mantém explícito que seus filtros atuam somente nesses alertas e oferece Ver catálogo completo. Esse atalho não promete uma lista global de reposição. Não é possível transformar esses cinco registros em uma consulta global confiável somente com frontend.

## Verificação

Teste unitário cobre unidades un e garrafa e rejeita unidades incompatíveis. O teste de navegador verifica filtro por operador e download Excel com os filtros e sem paginação. Os testes usam API simulada, sem escrita em banco real. A compilação valida os módulos alterados; a validação em ambiente real ainda depende de um servidor disponível com esses contratos.
