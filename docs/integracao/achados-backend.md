# Achados no backend (valhala.core.stock.app)

| # | Severidade | Achado | Status |
|---|---|---|---|
| 1 | Média | **CSRF não barra nada**: `POST /categorias`, `/auth/refresh` e `/auth/logout` passam sem `X-XSRF-TOKEN` e sem `Origin`. O teste `AuthenticationIntegrationTest.naoDeveAceitarCookieCsrfDeOrigemDiferenteSemHeader` já falha no `main`. Risco prático reduzido porque os cookies são `SameSite=Strict`. Causa não confirmada (suspeita: `CsrfTokenValidationFilter` é `@Component` e também é registrado como filtro do servlet). | Aberto |
| 2 | Baixa | 3 testes unitários falham no `main` (`ProdutoServiceTest` ×2, `ReceitaDrinkServiceTest`): `businessEventLogger` nulo — provavelmente o mock não foi adicionado no commit de logs. | Aberto |
| 3 | Alta | CORS não permitia `X-XSRF-TOKEN` → preflight bloqueado em toda mutação com o header. | Corrigido (branch `feat/integracao-api`) |
| 4 | Alta | `PUT /autorizacoes/usuarios/{id}/sobrescritas-permissao` → 500 (`A collection with orphan deletion was no longer referenced`). | Corrigido (branch `feat/integracao-api`) |
