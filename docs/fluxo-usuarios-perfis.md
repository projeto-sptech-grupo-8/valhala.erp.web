# Fluxo de Usuários, Perfis e Permissões — Valhalla ERP

Documento de design do módulo **Configurações › Usuários e Perfis de acesso**.
Base: doc da API de autorizações (`/autorizacoes/*`) + contrato atual de usuário (`/usuario/me`).

---

## 1. Conceitos (modelo mental do usuário)

| Conceito | O que é | Exemplo |
|---|---|---|
| **Funcionalidade** | Uma ação do sistema, identificada por código | `MOVIMENTAR_ESTOQUE` |
| **Perfil** | Conjunto nomeado de funcionalidades. Cada usuário tem **um** perfil | Caixa = estoque (ver) + caixa + pedidos |
| **Sobrescrita** | Exceção individual sobre o perfil: **Conceder** (`GRANT`) ou **Revogar** (`REVOKE`) | Roberto é Caixa, mas pode movimentar estoque |
| **Permissão efetiva** | Resultado final = perfil + concessões − revogações | O que a pessoa realmente pode fazer |

Regra de ouro na interface: **sempre mostrar a origem** de cada permissão (Perfil / Concedida individualmente / Revogada), para ninguém precisar adivinhar por que alguém pode ou não fazer algo.

---

## 2. Mapa de telas

```
Configurações
├── Usuários                     #/usuarios            (lista)
│   ├── Novo usuário             #/novousuario         (formulário)
│   ├── Detalhe do usuário       #/usuario?id=…        (object page)
│   └── Editar usuário           #/editarusuario?id=…  (formulário)
└── Perfis de acesso             #/perfis              (lista)
    ├── Novo perfil              #/novoperfil          (formulário)
    └── Detalhe do perfil        #/perfil?id=…         (object page)
```

As duas listas compartilham abas (**Usuários | Perfis de acesso**). Todo registro tem URL própria, então dá para compartilhar o link ou recarregar a página sem perder o contexto.

---

## 3. Fluxos

### 3.1 Criar usuário e anexar perfil
1. Usuários › **Novo usuário**.
2. **Dados da conta:** nome, e-mail e telefone. O telefone é opcional e tem máscara.
3. **Acesso:** escolher o perfil. Ao lado aparece a **prévia das funcionalidades** do perfil escolhido, agrupada por módulo.
4. **Senha inicial:** senha e confirmação, com indicador de força.
5. Salvar. A validação inline mostra os erros, com foco no primeiro campo inválido. Os erros do servidor (e-mail duplicado, por exemplo) aparecem no próprio campo.
6. Sucesso → toast e redirecionamento para o **detalhe do usuário**.

### 3.2 Ver detalhe do usuário
Cabeçalho com avatar, nome, e-mail, status e perfil, e as ações **Editar**, **Mudar perfil** e o menu (Inativar/Reativar, Excluir). As seções:
- **Perfil de acesso:** nome, descrição e nº de funcionalidades, com link para o perfil.
- **Permissões efetivas:** contadores (do perfil / concedidas / revogadas) e a lista agrupada por módulo, com a origem de cada uma.
- **Ajustes individuais:** editor de sobrescritas.
- **Registro:** criado em, atualizado em e ID.

### 3.3 Editar usuário
Mesmo formulário da criação, pré-preenchido. Só os campos alterados são enviados (PATCH). O perfil não é editado aqui: o formulário mostra o perfil atual e um atalho para **Mudar perfil**, porque essa troca tem impacto de permissão e merece confirmação própria.

### 3.4 Mudar perfil
Modal com a lista de perfis em cartões e a **diferença de permissões**: o que a pessoa **passa a ter** (+) e o que **deixa de ter** (−). Avisa que as sobrescritas individuais continuam valendo. Se for o próprio usuário, alerta sobre a perda de acesso.

### 3.5 Inativar / reativar
Confirmação que explica as consequências: não consegue entrar, mas os dados e o histórico ficam preservados, e é reversível. Um usuário inativo aparece com banner no detalhe e com filtro próprio na lista. Também existe ação em lote na lista.

### 3.6 Excluir
Ação destrutiva, então a confirmação é forte:
- explica que é irreversível e sugere **"Inativar em vez disso"**;
- exige digitar o e-mail do usuário para habilitar o botão.

### 3.7 Perfis
- **Lista:** nome, descrição, nº de funcionalidades e nº de usuários (com link para a lista filtrada).
- **Criar:** nome (obrigatório, até 100 caracteres, único sem diferenciar maiúsculas/minúsculas, validado também no cliente), descrição e funcionalidades. Dá para **copiar as funcionalidades de um perfil existente**.
- **Detalhe:** editar nome/descrição (PATCH só com o que mudou; o botão fica desabilitado se nada mudou). **Editar funcionalidades** mostra o contador de mudanças (+2 / −1) e avisa quantos usuários são afetados antes do PUT.
- **Excluir:** bloqueado, com o motivo, quando há usuários vinculados (regra da API). Se o servidor recusar mesmo assim, a mensagem dele é exibida.

### 3.8 Ajustes individuais (sobrescritas)
A tabela mostra, para cada funcionalidade, se ela está **no perfil**, o **ajuste** (Herdar / Conceder / Revogar) e o **resultado**.
- **Conceder** só fica disponível quando o perfil **não** tem a funcionalidade, e **Revogar** só quando **tem**. Assim não dá para criar sobrescrita redundante.
- Salvar abre uma confirmação que avisa que **a sessão do usuário será encerrada** (comportamento da API). Se for a própria conta, a pessoa é desconectada depois de salvar.

---

## 4. Regras de proteção

| Regra | Onde |
|---|---|
| Não inativar nem excluir a própria conta | Menu de ações desabilitado, com explicação |
| Ações aparecem só com a permissão correspondente | `USUARIOS_CRIAR`, `USUARIOS_EDITAR`, `USUARIOS_INATIVAR`, `USUARIOS_EXCLUIR`, `PERFIS_GERENCIAR`, `PERMISSOES_GERENCIAR` |
| Gerente sempre tem acesso total | Conforme a doc da API |
| Formulário com alterações não salvas | Confirmação ao sair |
| Botões de envio | Ficam desabilitados com "Salvando…" para evitar envio duplo |
| Respostas 403/409/400 da API | Mensagem do servidor no campo ou em toast |

---

## 5. Contrato de API usado

### Documentado
| Uso | Endpoint |
|---|---|
| Catálogo de funcionalidades | `GET /autorizacoes/funcionalidades` |
| Perfis | `GET/POST /autorizacoes/perfis`, `GET/PATCH/DELETE /autorizacoes/perfis/{id}` |
| Funcionalidades do perfil | `PUT /autorizacoes/perfis/{id}/funcionalidades/codigos` |
| Sobrescritas | `PUT /autorizacoes/usuarios/{id}/sobrescritas-permissao` |
| Permissões efetivas + origens | `GET /autorizacoes/usuarios/{id}/permissoes` |

> Não há GET de sobrescritas. O estado atual é derivado das **origens** retornadas por `GET …/permissoes`.

### ⚠️ A confirmar com o backend (CRUD de usuário)
Ainda não documentado. O front segue o padrão de `/usuario/me`, e tudo está isolado em `src/lib/api.js › usuarios`:

| Uso | Endpoint assumido |
|---|---|
| Listar | `GET /usuario` |
| Consultar | `GET /usuario/{id}` |
| Criar | `POST /usuario` `{ name, email, phone, password, profileId }` |
| Editar / mudar perfil / inativar | `PATCH /usuario/{id}` `{ name?, email?, phone?, profileId?, active? }` |
| Excluir | `DELETE /usuario/{id}` |

Os formatos de resposta são normalizados no `api.js`, que aceita tanto campos em português quanto em inglês.
