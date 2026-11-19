# Mensagens, confirmações e carregamento

## Escopo

Frontend de catálogo, estoque, usuários, perfis, entrada de acesso e consulta de movimentações do painel inicial. Vendas, financeiro e configurações continuam com seu comportamento anterior. A importação XML também permanece com seu fluxo anterior. Nenhum contrato ou arquivo do backend foi alterado.

## Antes e depois

Algumas gravações falhavam apenas com um toast temporário. Agora os formulários de categoria, produto, usuário e perfil mantêm um aviso junto da operação, com ícone, título, mensagem do servidor e foco acessível. Valores preenchidos são preservados. Erros de campos continuam associados aos campos; não são trocados por uma mensagem genérica.

Confirmações de exclusão e de mudanças de acesso usam uma composição consistente: título com ícone, consequências legíveis, cancelar e confirmar. Ações destrutivas usam vermelho. Durante o envio, botões e fechamento ficam desativados e há um estado explícito de processamento. Cliques repetidos na confirmação são bloqueados. Falhas permanecem na própria janela para o usuário avaliar a mensagem antes de decidir o próximo passo.

Carregamentos exibem texto, indicador e esqueleto leve feito em CSS. Consultas com erro têm mensagem contextual e opção de tentar novamente. Permissão negada, sessão expirada, registro ausente e falha de conexão têm orientações específicas. Uma consulta com erro não deve parecer uma lista vazia bem-sucedida. Nas listagens principais, dados antigos não permanecem acionáveis enquanto outra consulta carrega ou falha.

## Fluxos de erro

1. Leitura: exibir carregamento; em sucesso, renderizar os dados; em falha, mostrar o estado de erro. Tentar novamente repete somente a leitura com os filtros atuais.
2. Validação: preservar valores, destacar os campos e orientar a correção.
3. Gravação: bloquear edição e envio concorrente enquanto aguarda o servidor; exibir confirmação de sucesso somente após resposta.
4. Resposta incerta ao criar: uma queda de conexão pode acontecer depois da gravação. Produto, usuário, categoria e perfil orientam consultar a lista e bloqueiam uma repetição imediata do cadastro na mesma instância de formulário. Isso não substitui idempotência no backend.
5. Ação em lote de usuários: executar as alterações sequencialmente para evitar uma rajada de requisições, atualizar na lista os usuários concluídos e deixar somente as falhas na operação pendente. Não há rollback automático nem promessa de transação única.
6. Estoque: preservar as regras já existentes de resultado incerto e de baixas parciais de lotes; o novo visual não autoriza repetição automática de movimentações.

## Organização

- ManagementFeedback.jsx: componentes optativos Notice, LoadingBlock, ErrorBlock, Modal e ConfirmModal.
- managementFeedback.module.css: estilos isolados, mensagens responsivas e respeito à preferência de redução de movimento.
- Modal.jsx: propriedade opcional busy, com valor padrão falso, permite desativar o fechamento visualmente. Os módulos excluídos não recebem esse comportamento novo.
- RemoteControls.jsx: centraliza o estado visual das consultas remotas de catálogo e estoque.
- Páginas e formulários: mantêm suas validações, permissões e chamadas de API. Somente os módulos selecionados adotam os novos componentes; o componente antigo de feedback e o provedor global de toast permanecem disponíveis para os demais módulos.

Não foram adicionadas dependências nem varreduras de todo o estoque. Carregamentos continuam usando os hooks atuais; skeletons não fazem requisições extras. O controle de acesso também não inventa zero usuários quando a leitura de vínculos não foi concluída.

## Validação

Os testes de navegador cobrem recuperação de falha de consulta, ausência de dados antigos acionáveis, carregamento, erro de categoria preservando os campos, fechamento bloqueado durante o envio e conflito de exclusão de perfil dentro do diálogo. A suíte existente verifica os fluxos de catálogo e estoque com API simulada. Compilação e análise estática verificam os módulos alterados. Os testes não gravam no banco real.

Resultado: 48 cenários passaram na suíte completa e os 3 cenários novos finais também passaram, além das verificações direcionadas de detalhes e baixas. Build e análise estática concluídos; o build mantém o aviso já existente sobre tamanho do bundle. A captura do erro de criação de perfil também foi conferida visualmente.
