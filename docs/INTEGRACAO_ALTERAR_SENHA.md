# Integração de Alterar senha

## Contrato existente

A aba Configurações gerais → Segurança usa `PATCH /usuario/{id}` para alterar a senha da própria conta conectada. O backend autoriza a atualização do próprio usuário sem exigir a permissão de editar outros usuários. O frontend obtém o ID da sessão carregada; não oferece escolha de usuário.

O corpo contém somente `{ senha: novaSenha }`. Não são enviados confirmação, e-mail, perfil ou status. A requisição usa o cliente autenticado existente, com cookies, proteção CSRF e tratamento padrão de sessão expirada. O frontend não faz login adicional para simular uma conferência de senha atual.

O contrato consultado não recebe nem valida senha atual. Por isso, esse campo foi removido: mantê-lo sugeriria uma validação que o servidor não executa. O servidor continua responsável pela autorização e pela criptografia da nova senha. Nenhum arquivo do backend foi alterado.

## Validação e interface

- Nova senha de 8 a 72 caracteres, conforme o DTO de atualização.
- Bloqueio de senha composta somente de espaços: o serviço não aplica uma senha sem texto.
- Confirmação idêntica, validada apenas no frontend.
- O texto da senha não é aparado nem normalizado: espaços fazem parte dela.
- Limite adicional de 72 bytes em UTF-8, compatível com o BCrypt usado no backend. Acentos e emojis podem atingir esse limite com menos caracteres.
- Não são inventadas exigências de maiúsculas, números ou símbolos que o contrato não impõe.

O formulário tem campos alinhados, asteriscos vermelhos, mensagens por campo, botões para mostrar/ocultar a senha e preenchimento compatível com gerenciadores de senhas. Cancelar limpa os campos e os erros. O layout usa duas colunas no desktop e uma no celular.

## Fluxo de sucesso

1. Validar os campos sem enviar dados inválidos.
2. Bloquear o formulário e cliques duplicados durante a atualização.
3. Enviar o PATCH da conta conectada.
4. Após confirmação, limpar as senhas do estado do formulário e mostrar sucesso.
5. Encerrar a sessão local pelo fluxo existente e levar ao login.

O servidor chama `revokeAll` quando a senha muda; portanto, uma leitura adicional do perfil após o PATCH não é usada para determinar sucesso. O usuário deve autenticar novamente com a nova senha.

## Falhas e confidencialidade

Erros de validação da API aparecem junto ao campo quando fornecidos. Falhas conhecidas mantêm os dados para correção; o cancelamento os apaga. Sessão expirada bloqueia a edição e oferece retorno ao login.

Falha de rede ou erro de servidor com resultado possivelmente incerto limpa os campos, bloqueia reenvio e orienta conferir a credencial ao entrar novamente. Senha não pode ser conferida com GET; não há tentativa automática de login com as credenciais nem repetição automática do PATCH após resposta incerta.

As senhas não são gravadas em localStorage, sessionStorage, URLs, notificações ou logs do frontend. O corpo da requisição é transmitido pelo cliente HTTP existente; HTTPS continua dependendo da configuração do ambiente de implantação.

## Organização e validação

- `src/features/account/change-password/api/changePassword.js`: chamada autenticada e payload mínimo.
- `src/features/account/change-password/model/passwordRules.js`: validação de comprimento, confirmação e limite UTF-8.
- `src/features/account/change-password/ui/ChangePasswordForm.jsx`: formulário, carregamento, erros e encerramento de sessão.
- `src/features/account/change-password/ui/ChangePasswordForm.module.css`: layout e estilos locais.
- `src/pages/settings/ui/SettingsPage.jsx`: composição na subaba Segurança.

Testes de regras verificam limites, espaços, confirmação e Unicode. Testes de navegador com API simulada verificam o PATCH da própria conta sem permissão de editar outros usuários, cabeçalho CSRF, payload somente com a senha, erro de confirmação sem requisição, erro de campo do servidor, cancelamento, resposta incerta sem reenvio, sessão expirada e retorno ao login. O layout móvel foi conferido. Não foi alterada nenhuma senha de conta real durante a validação. A seção Últimos acessos não foi integrada por este trabalho.
