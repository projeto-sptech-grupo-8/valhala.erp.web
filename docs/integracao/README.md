# Integração front ↔ valhala.core.stock.app

Integração **módulo a módulo**. Um módulo só é dado como integrado quando o gate passa inteiro,
e o próximo só começa depois disso.

## O loop (por módulo)

1. **Contrato** — ler `docs/openapi.yaml` e os DTOs do back; listar telas/ações do front que usam o módulo.
2. **Implementar** — chamadas em `src/lib/api.js`; remover a lógica equivalente do `store.jsx`.
3. **Smoke de API** — `scripts/smoke/<modulo>.ps1`: contrato direto na API (status, campos, erros 400/403/409).
4. **E2E no navegador** — `e2e/<modulo>.spec.js` com Playwright no Chrome instalado. Prints de cada passo em
   `e2e/evidencias/<modulo>/`. O teste falha sozinho se houver erro de console ou resposta 4xx/5xx não declarada.
5. **Gate** — `npm run gate -- -Modulo <modulo>`; antes do commit, `npm run gate` (regressão de todos os módulos).
6. **Aprovado** → um commit por módulo + relatório `docs/integracao/<modulo>.md`.
   **Reprovado** → até 3 tentativas de correção; persistindo, o loop para e o problema é reportado.

Bugs do backend encontrados no caminho vão para [achados-backend.md](achados-backend.md); correções no back
entram em commit separado no repositório do back.

## Ambiente local

- API em `:8080` (`DB_PASSWORD`, `JWT_SECRET`, `FRONTEND_URL=http://localhost:5173`)
- Front: sem mock — tudo vem da API. Para dados de demonstração, suba o back com `SPRING_PROFILES_ACTIVE=dev` (Flyway aplica `db/demo/R__dados_demonstracao.sql`; usuários `*@meraki.com`, senha `Senha@123`)
- `RESET_DB=<script>` faz o gate restaurar o banco ao estado inicial (schema + seed) antes de cada bateria
- Login de teste: `admin@valhalla.local` / `Senha@123` (seed)

## Status

| Ordem | Módulo | Status |
|---|---|---|
| 0 | Base (CSRF, refresh, mock por módulo) | ✅ |
| 1 | auth | ✅ [relatório](auth.md) |
| 2 | usuários / perfis / permissões | ✅ [relatório](acesso.md) |
| 3 | categorias | ✅ [relatório](categorias.md) |
| 4 | produtos | ✅ [relatório](produtos.md) |
| 5 | receitas de drink | ✅ junto com produtos |
| 6 | movimentações | ✅ [relatório](movimentacoes.md) |
| 7 | dashboard | ✅ [relatório](dashboard.md) |

Fora do loop (sem endpoint no back, seguem no mock): caixa, pedidos/mesas, NF-e, lotes/validade, financeiro, relatórios.

Removidos por decisão de negócio: orçamentos, inventário, fornecedor e local de estoque — ver [remocoes.md](remocoes.md).
