# Fechamento do caixa ao sair

Implementado no frontend em 17/11/2026, mantendo os endpoints e regras atuais do backend.

## Fluxo

O botão Sair da barra lateral consulta GET /caixa/sessoes/atual antes de encerrar o acesso, para usuários com CAIXA_VISUALIZAR.

- Sem sessão aberta (204): executa o logout normalmente, sem enviar fechamento.
- Sessão ABERTA confirmada: apresenta Fechar caixa e sair com o nome do caixa, dinheiro esperado e campo de dinheiro contado, inicialmente vazio.
- Dinheiro contado é obrigatório; zero precisa ser informado explicitamente. Não é preenchido com o dinheiro esperado, para não simular uma conferência física.
- Diferença conhecida exige justificativa. Observação é opcional. Justificativa/observação têm limite de 2.000 caracteres.
- A confirmação envia POST /caixa/sessoes/{id}/fechamento com dinheiroContado, justificativaDivergencia e observacao, antes de chamar o logout.
- FECHADA confirmada: encerra o acesso automaticamente.
- EM_FECHAMENTO: informa que a conferência foi registrada com divergência e exige aprovação gerencial. Não afirma fechamento definitivo. O usuário pode então Sair do sistema.
- Cancelar mantém o acesso; não desfaz um fechamento já enviado e confirmado.

## Regras e permissões

A sessão consultada pertence ao operador autenticado. Não são encerrados caixas de outros usuários. O backend valida operador/gerente, estabelecimento e CAIXA_FECHAR, calcula o dinheiro esperado e a diferença e bloqueia pagamentos pendentes.

Quando existe caixa aberto e o usuário não tem CAIXA_FECHAR, o modal orienta solicitar conferência a um responsável e permite ir para Caixa. Não tenta executar uma operação sem permissão. Perfis sem CAIXA_VISUALIZAR seguem o logout comum, pois não podem consultar a sessão por este endpoint. Mudanças de permissão que deixem uma sessão aberta sem acesso exigem tratamento operacional pelo responsável.

O frontend não cancela pedidos, não resolve pagamentos pendentes e não aprova divergências para conseguir sair. Esses estados continuam controlados pelo servidor.

## Falhas e concorrência

Erros de consulta mantêm o usuário conectado e oferecem tentar novamente. Erros conhecidos de fechamento ficam no modal, sem executar logout. O dinheiro esperado exibido é uma referência; o servidor recalcula os valores ao confirmar e pode exigir justificativa se ocorrer uma movimentação concorrente.

Em resposta de envio ausente, erro de rede ou erro 5xx, o formulário bloqueia novo envio e oferece Conferir fechamento. A consulta GET /caixa/sessoes/{id} verifica o resultado: FECHADA permite sair, EM_FECHAMENTO mostra a pendência, ABERTA libera nova tentativa explícita após revisão. Nenhum POST é repetido automaticamente. Resposta incompatível com a sessão esperada também exige conferência. Cliques repetidos são bloqueados por referência de operação e estado de carregamento.

## Escopo técnico

useCashLogout em features/sales/cash-session/ui concentra consulta, modal, envio e conferência. PanelLayout usa o fluxo somente na saída manual da barra lateral. O logout original do aplicativo permanece como conclusão da operação.

Fechar aba/navegador, perda de conexão, expiração/revogação de token e saída técnica após alteração de senha não realizam uma conferência de caixa automática. Isso não pode ser garantido pelo frontend; o endpoint atual de autenticação apenas revoga acesso e não encerra sessões de caixa. Nenhum backend foi alterado.

## Validação

Quatro testes de navegador com APIs simuladas passaram: logout sem caixa, fechamento antes da revogação com payload correto, justificativa/pagamento pendente/divergência e conferência após erro sem repetir POST. Lint e build de produção concluídos. Nenhum caixa ou conta real foi modificado pelos testes.
