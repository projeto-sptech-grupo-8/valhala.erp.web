# Edição das políticas do caixa

## Escopo e comportamento

O botão **Editar políticas** usa um formulário específico do frontend, substituindo a lista de campos do modal genérico. As demais operações de caixa mantêm seus formulários existentes. A leitura e a atualização continuam em `GET /caixa/configuracao` e `PUT /caixa/configuracao`, com autenticação e autorização existentes. O backend não foi alterado.

O modal tem quatro seções: Formas de pagamento; Maquininha e comprovante; Parcelamento e juros; Descontos sem autorização. Cada título possui ícone e ajuda por hover ou foco. O conteúdo rola, enquanto o cabeçalho e os botões Cancelar e Salvar políticas permanecem acessíveis. O layout usa duas colunas no desktop e uma em telas menores.

## Prazo da cobrança

Por solicitação do usuário, o frontend aceita somente números inteiros entre **60 e 600 segundos**, equivalentes a 1–10 minutos. O limite existente do backend continua sendo 900 segundos; este trabalho não modifica essa regra no servidor nem impede outros clientes de usar o limite original.

Se o servidor devolver uma configuração antiga acima de 600, o formulário preserva e mostra o valor com um aviso. Para salvar alterações por esta tela, é necessário ajustá-lo explicitamente. Não há redução silenciosa para 600. O campo permanece visível mesmo com Point desativada, pois continua obrigatório no contrato de atualização.

## Formas de pagamento e Point

Dinheiro, Pix, débito e crédito usam interruptores. Pelo menos uma forma deve permanecer habilitada. A Point exige uma maquininha ativa: a tela explica o requisito e apresenta o erro do servidor junto à opção quando esse requisito falha. Não se baixa a lista de equipamentos apenas para reproduzir a verificação do backend.

Impressão de comprovante e pagamento manual têm explicações próprias. A impressão refere-se ao comprovante do equipamento, não à emissão de documento fiscal. O pagamento manual continua sujeito ao fluxo de conferência existente.

## Parcelamento

Ativar parcelamento exige crédito. Seus campos aparecem quando ele está habilitado; ao desativá-lo, os valores são mantidos e enviados ao servidor, pois mínimo, máximo e política de juros continuam obrigatórios no contrato.

- Mínimo e máximo: inteiros de 1 a 12; máximo igual ou superior ao mínimo.
- Valor mínimo por parcela: opcional, maior que zero quando preenchido, com duas casas decimais. Em branco envia `null`.
- Política de juros: opções legíveis para encargos absorvidos pela loja ou repassados ao cliente, mantendo os códigos originais da API.
- Se houver valores inválidos ocultos ao desativar o parcelamento, a validação os revela para correção, sem sobrescrever os limites automaticamente.

## Descontos

O limite percentual aceita de 0 a 100, com até duas casas decimais, inclusive vírgula decimal. O limite em reais usa a máscara monetária existente do projeto e pode ser zero. A ajuda explica que se aplica o menor resultado entre percentual do pedido e limite absoluto, com um exemplo.

## Validação, salvamento e falhas

O formulário valida os campos ao sair deles e novamente antes do envio, preserva zero durante a edição e marca os campos obrigatórios. Não envia dados inválidos; mantém a mensagem junto ao campo e direciona o foco ao primeiro campo inválido disponível. Só envia os 15 atributos editáveis do contrato, sem metadados da resposta.

Salvar fica desabilitado quando não há alterações, durante uma operação ou quando uma resposta de gravação está incerta. O envio é protegido contra duplicação. Em caso de erro, os dados digitados permanecem no modal. Em caso de resposta de rede não confirmada, **Conferir políticas salvas** lê o servidor e compara os atributos: quando correspondem ao formulário, conclui o fluxo; quando diferem, mantém o rascunho e pede revisão antes de novo salvamento.

Após sucesso, o modal fecha, a consulta é atualizada e a tela informa que as políticas foram salvas. As permissões existentes para configurar o caixa foram mantidas.

## Organização e verificação

- `src/features/sales/cash-settings/model/cashPolicyRules.js`: preparação do rascunho, limites, validação e payload.
- `src/features/sales/cash-settings/ui/CashPolicyModal.jsx`: seções, campos, integração e tratamento de resposta incerta.
- `src/features/sales/cash-settings/ui/CashPolicyModal.module.css`: estilos restritos ao formulário e largura responsiva.
- `src/pages/sales/remote/SalesRemote.jsx`: abertura do modal e atualização da consulta após salvar.

Testes de regras cobrem prazos nas bordas e fora do limite, dependências de pagamento, parcelas, valores monetários, preservação de campos ocultos e exclusão de metadados. Testes de navegador com API simulada cobrem bloqueio de 601 segundos e 13 parcelas, gravação de 600, máscaras, valores ocultos, retorno de erro de maquininha e rodapé visível no celular. Lint e build foram executados. A verificação simulada não equivale a homologação com a Point real.
