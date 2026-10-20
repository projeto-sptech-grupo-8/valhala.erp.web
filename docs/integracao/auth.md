# Módulo: auth — ✅ aprovado (2026-10-20)

## Mudanças no front
- `request()` envia `X-XSRF-TOKEN` em POST/PUT/PATCH/DELETE (cookie `XSRF-TOKEN`, ou `GET /auth/csrf` se a API estiver em outro domínio).
- Refresh único e compartilhado: o back rotaciona o refresh token, então 401 paralelos não derrubam mais a sessão.
- Refresh usa só o cookie CSRF (`/auth/csrf` exige o access token, que é o que expirou).
- Login envia `senha` (o back também aceita `password` via `@JsonAlias`); erro de campo `senha` aparece no formulário.
- `toUsuario` mapeia `idPerfil` / `nomePerfil` do back.
- `VITE_MOCK_MODULES`: mock por módulo.

## Mudança no back (commit separado)
- CORS passa a permitir o header `X-XSRF-TOKEN` — antes o navegador bloqueava o preflight de toda mutação que enviasse o header.

## Gate
| Etapa | Resultado |
|---|---|
| build / lint | ✅ |
| smoke API (`scripts/smoke/auth.ps1`) | ✅ 10 verificações · 1 bug conhecido do back (#1) |
| E2E (`e2e/auth.spec.js`) | ✅ 3/3 — senha errada · login + F5 + logout · access token expirado → refresh |
| `mvnw test` (back) | 4 falhas **pré-existentes no main**, iguais com e sem a mudança — ver achados #1 e #2 |

Evidências: `e2e/evidencias/auth/` (6 prints).
