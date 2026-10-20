# Módulo: categorias — ✅ aprovado (2026-10-20)

## O que mudou no front
- A tela **Categorias** (`src/pages/dash/Cards.jsx`) era estática: os botões de criar/editar só mostravam "disponível após a integração". Agora tem CRUD real — criar, editar nome/descrição, inativar/reativar e excluir (com confirmação).
- `api.categorias` (`listar` percorre todas as páginas de `RespostaPaginadaDto`; o normalizador `list()` passou a entender `itens`).
- Permissões alinhadas ao back: ver exige `VISUALIZAR_ESTOQUE` (a página ganhou `perm`), editar exige `GERENCIAR_ESTOQUE`.
- Mock de categorias com as mesmas regras (nome único sem diferenciar maiúsculas).

## Gate
| Etapa | Resultado |
|---|---|
| smoke API (`scripts/smoke/categorias.ps1`) | ✅ 14 verificações (CRUD, 409 duplicado, 400 nome vazio/patch vazio/tamanho > 100, paginação, filtro `ativo`, 403 para Atendente) |
| E2E (`e2e/categorias.spec.js`) | ✅ 5/5 — cria · duplicado bloqueado · edita e inativa · só leitura sem ações · exclui |
| regressão completa | ✅ 16/16 E2E |

Evidências: `e2e/evidencias/categorias/`.

## Pendências para o próximo módulo
- A contagem "N produtos" e a barra de saúde de cada categoria ainda vêm dos produtos do store (mock). Passam a ser reais na integração de **produtos**.
- O banco real começa **sem categorias e sem produtos** (o seed só cria admin e perfis).
- Exclusão de categoria com produtos (409) só será testável depois de produtos.
