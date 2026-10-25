# Módulo: usuários, perfis e permissões — ✅ aprovado (2026-10-20)

## Divergências de contrato encontradas e resolvidas no front (`src/lib/api.js`)
| Divergência | Solução |
|---|---|
| Permissões do usuário: o back devolve `{ permissoesPerfil, sobrescritas, permissoesEfetivas }`, o front esperava lista → a tela ficaria vazia | `toPermissoesUsuario` converte em `[{ codigo, concedida, origem }]` |
| O back vincula o perfil por **nome** (`nomePerfil`); a UI envia `profileId` → troca de perfil seria ignorada | `comNomePerfil` resolve o nome a partir do id |
| Erros de campo vêm como `nome/telefone/senha/nomePerfil`; o formulário usa `name/phone/password/profileId` | `camposDoUsuario` renomeia `fieldErrors` |
| `USUARIOS_INATIVAR` não existe no back (inativar exige `USUARIOS_EDITAR`) | front passa a usar `USUARIOS_EDITAR` |
| Mock com códigos que não existem no back (`PRODUTOS_GERENCIAR`, `USUARIOS_INATIVAR`) | mock alinhado (`GERENCIAR_ESTOQUE`) |

## Correção no back (commit separado)
- `PUT /autorizacoes/usuarios/{id}/sobrescritas-permissao` dava **500** (Hibernate: coleção com `orphanRemoval` substituída). Agora limpa e repõe a mesma coleção, com flush entre a remoção e a inserção. Teste unitário ajustado (usava `Set.of`, imutável).

## Gate
| Etapa | Resultado |
|---|---|
| smoke API (`scripts/smoke/acesso.ps1`) | ✅ 25 verificações (CRUD de perfil/usuário, 409 de duplicidade, 400 com fieldErrors, GRANT/REVOKE, 403 para usuário limitado, inativo não loga, perfil em uso não exclui) |
| E2E (`e2e/acesso.spec.js`) | ✅ 8/8 — cria perfil · duplicado · cria usuário · e-mail duplicado · lista · ajuste GRANT · inativa/reativa · login limitado |
| regressão (auth + acesso) | ✅ 11/11 E2E |
| `mvnw test` | só as 4 falhas pré-existentes (achados #1 e #2) |

Evidências: `e2e/evidencias/acesso/` (14 prints).

## Observação (fora do escopo deste módulo)
- Usuário sem permissões de financeiro ainda vê **Financeiro** e **Catálogo** no menu: essas páginas não têm código de funcionalidade no back e seguem no mock. Revisar quando os módulos correspondentes forem integrados.
