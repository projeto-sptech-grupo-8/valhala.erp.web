# Caixas e maquininhas: interface e exclusão

## Escopo

Melhorias no frontend da subaba Caixas e maquininhas de Ajustes do caixa. Os contratos existentes do backend foram consultados, mas nenhum arquivo do backend foi alterado. Políticas e taxas mantêm suas regras e operações.

## Organização visual

Cada caixa tem um card com nome, indicação Ativo/Inativo, aviso de turno aberto quando `emUso` é verdadeiro e explicação da disponibilidade. As maquininhas ficam agrupadas no respectivo caixa, com quantidade de vínculos, nome, status e identificador real do dispositivo no Mercado Pago. O identificador interno do vínculo não é mostrado.

O menu do caixa oferece Editar caixa e Excluir caixa, com a exclusão em vermelho. Cada maquininha oferece Editar maquininha e Modo de operação. Há estados vazios, paginação do servidor com 4 caixas por página e layout adaptado para celular. As ações de configuração dependem de CAIXA_CONFIGURAR; quem tem somente visualização continua podendo consultar os registros.

Se o vínculo da maquininha estiver ativo em um caixa inativo, a tela explica essa diferença: um vínculo ativo não torna o caixa disponível para novos turnos nem satisfaz sozinho a disponibilidade da Point.

## Novo caixa em pop-up

O botão Novo caixa abre um modal com nome, exemplos de nomes e os botões Cancelar e Cadastrar caixa. Esse formato substitui o card de cadastro na página, conforme a solicitação mais recente. O atalho + Caixa na abertura leva à subaba de ajustes com esse modal aberto.

O cadastro continua em POST /caixa/caixas, enviando somente o nome. Nome vazio ou maior que 100 caracteres é impedido. Nome duplicado retornado pelo servidor mantém o formulário aberto. A confirmação atualiza a lista; cadastrar um caixa não abre uma sessão. Erro de rede com resultado incerto bloqueia nova confirmação e permite consultar a lista antes de repetir.

## Regras reais de exclusão

O DELETE /caixa/caixas/{id} exige CAIXA_CONFIGURAR e valida o estabelecimento. No servidor:

1. O caixa não pode ter nenhuma sessão vinculada, inclusive sessões encerradas.
2. O caixa não pode ter pagamentos vinculados.
3. A remoção também exclui os vínculos de terminais daquele caixa. Não remove os dispositivos da conta do Mercado Pago.
4. Se a Point estiver habilitada, deve continuar existindo ao menos um terminal ativo em um caixa ativo do estabelecimento.

O serviço é transacional. Um bloqueio impede a conclusão da exclusão. A tela não conclui que um caixa sem turno aberto é excluível: o indicador `emUso` não informa a existência de todo o histórico.

## Confirmação, bloqueios e alternativa

Excluir caixa abre um pop-up com nome do caixa, consequências, regras e alternativa de inativação. Cancelar não envia requisição. Confirmar envia um único DELETE protegido contra clique duplicado. A listagem só remove o registro após sucesso confirmado pelo servidor.

Se a lista já informa turno aberto, o pop-up explica o bloqueio e impede a confirmação. Sem esse bloqueio conhecido, o backend decide pelas regras atuais, incluindo alterações concorrentes. Um erro mantém o modal aberto com a mensagem retornada. Quando o motivo é histórico de sessões/pagamentos e não existe turno aberto conhecido, o botão Editar para inativar abre o formulário de edição.

Inativar preserva o histórico. O backend impede inativação com turno aberto ou quando a Point perderia o último terminal ativo disponível. Por isso, a alternativa de inativação não é oferecida como solução para o bloqueio específico da última maquininha.

Resposta incerta de exclusão bloqueia uma segunda tentativa e oferece Conferir exclusão. A consulta individual confirma ausência com 404 ou recarrega o cadastro existente; outras falhas mantêm o bloqueio. Não há remoção otimista nem repetição automática do DELETE. Se o último caixa da página for removido, a navegação retorna à página anterior.

## Maquininhas

O backend consultado não oferece DELETE individual de terminal. A interface usa PATCH para alterar nome ou status do vínculo e explica que trocar o identificador do dispositivo exige inativar o vínculo anterior e adicionar outro. Não foi criado um botão de exclusão sem suporte real.

Os modos são apresentados como Integrada ao caixa (PDV) e Uso independente (Standalone). A alteração usa o endpoint existente que sincroniza o dispositivo com o Mercado Pago; o frontend não supõe um modo atual que não foi devolvido pela listagem.

Os formulários de edição de caixa e maquininha enviam somente nome e ativo. IDs, listas de terminais e indicadores de uso não são incluídos no PATCH.

## Organização de código e validação

- `src/features/sales/cash-settings/ui/CashEquipmentPanel.jsx`: cards, vínculos, estados, paginação e confirmação de exclusão.
- `src/features/sales/cash-settings/ui/CashEquipmentPanel.module.css`: estilos locais e adaptação para celular.
- `src/pages/sales/remote/CashBoxRegistration.jsx`: formulário de cadastro em modal.
- `src/pages/sales/remote/SalesRemote.jsx`: composição da subaba, operações existentes, atualização da consulta e permissões.

Testes de navegador com API simulada cobrem cancelamento sem DELETE, bloqueio por histórico, inativação com payload correto, turno aberto, bloqueio da última maquininha, exclusão confirmada, resposta incerta seguida de consulta, permissões de visualização e cadastro em pop-up. Layouts de desktop e celular foram conferidos. Lint e build foram executados. Esses testes não executam exclusões reais nem homologam a integração externa da Point.
