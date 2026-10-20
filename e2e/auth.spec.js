import { test, expect, login, ADMIN } from './fixtures.js'

test('login com senha errada mostra erro', async ({ page, shot }) => {
  page.allowStatus(401, '/auth/login')
  page.allowStatus(401, '/usuario/me') // restauração de sessão ao abrir /#/...
  page.allowStatus(401, '/auth/refresh') // ...que tenta renovar e não tem sessão
  await login(page, { ...ADMIN, senha: 'errada' })
  await expect(page.getByText('E-mail ou senha incorretos.')).toBeVisible()
  await shot('erro')
})

test('login, F5 mantem sessao, logout encerra', async ({ page, shot, context }) => {
  page.allowStatus(401, '/usuario/me')
  page.allowStatus(401, '/auth/refresh')
  await login(page)
  await expect(page.getByRole('button', { name: 'Sair' })).toBeVisible()
  await expect(page.getByText('Administrador Inicial').first()).toBeVisible()
  await shot('logado')

  const cookies = (await context.cookies('http://localhost:8080')).map(c => c.name)
  expect(cookies).toEqual(expect.arrayContaining(['accessToken', 'XSRF-TOKEN']))

  await page.reload()
  await expect(page.getByRole('button', { name: 'Sair' })).toBeVisible()
  await shot('apos-f5')

  const logout = page.waitForResponse(r => r.url().endsWith('/auth/logout'))
  await page.getByRole('button', { name: 'Sair' }).click()
  const res = await logout
  expect(res.status()).toBe(204)
  expect(res.request().headers()['x-xsrf-token'], 'logout envia header CSRF').toBeTruthy()
  await shot('deslogado')

  await page.goto('/#/dashboard')
  await page.reload() // troca só de hash não recarrega o App
  await expect(page.getByPlaceholder('seu@empresa.com')).toBeVisible()
  await shot('rota-protegida-pede-login')
})

test('access token expirado e renovado via refresh com CSRF', async ({ page, shot, context }) => {
  page.allowStatus(401, '/usuario/me')
  page.allowStatus(401, '/auth/refresh') // só o da abertura, antes do login; o refresh pós-expiração é verificado abaixo
  await login(page)
  await expect(page.getByRole('button', { name: 'Sair' })).toBeVisible()
  // simula expiração do access token: o próximo /usuario/me dá 401 e o front deve renovar
  await context.clearCookies({ name: 'accessToken' })
  const refresh = page.waitForResponse(r => r.url().endsWith('/auth/refresh'))
  await page.reload()
  const res = await refresh
  expect(res.status()).toBe(200)
  expect(res.request().headers()['x-xsrf-token'], 'refresh envia header CSRF').toBeTruthy()
  await expect(page.getByRole('button', { name: 'Sair' })).toBeVisible()
  await shot('sessao-renovada')
})
