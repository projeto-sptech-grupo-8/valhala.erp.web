import { test as base, expect } from '@playwright/test'
import fs from 'node:fs'
import path from 'node:path'

export const ADMIN = { email: 'admin@valhalla.local', senha: 'Senha@123' }

/*
 * page: falha o teste se houver erro no console ou resposta 5xx da API.
 * Respostas 4xx esperadas devem ser declaradas com allowStatus(status, trecho-da-url).
 * shot(nome): print numerado em e2e/evidencias/<arquivo-do-teste>/.
 */
export const test = base.extend({
  page: async ({ page }, use, info) => {
    const problems = []
    const allowed = []
    page.allowStatus = (status, urlPart) => allowed.push({ status, urlPart })
    page.on('console', msg => {
      if (msg.type() === 'error' && !/Failed to load resource/.test(msg.text())) problems.push(`console: ${msg.text()}`)
    })
    page.on('pageerror', err => problems.push(`pageerror: ${err.message}`))
    page.on('response', res => {
      const url = res.url()
      if (!url.includes(':8080')) return
      const st = res.status()
      if (st < 400) return
      if (allowed.some(a => a.status === st && url.includes(a.urlPart))) return
      problems.push(`http ${st} ${res.request().method()} ${url}`)
    })
    await use(page)
    expect(problems, 'erros de console/rede durante o teste').toEqual([])
  },
  shot: async ({ page }, use, info) => {
    const dir = path.join('e2e', 'evidencias', path.basename(info.file, '.spec.js'))
    fs.mkdirSync(dir, { recursive: true })
    let n = 0
    await use(async (name) => {
      n += 1
      const slug = `${info.title}-${name}`.toLowerCase().normalize('NFD').replace(/[^\w]+/g, '-').replace(/^-|-$/g, '')
      await page.screenshot({ path: path.join(dir, `${String(n).padStart(2, '0')}-${slug}.png`), fullPage: true })
    })
  },
})

export async function login(page, { email, senha } = ADMIN) {
  // ao abrir /#/... sem sessão o App tenta restaurar (me → refresh) e recebe 401: esperado
  page.allowStatus?.(401, '/usuario/me')
  page.allowStatus?.(401, '/auth/refresh')
  await page.goto('/#/dashboard')
  await page.reload() // garante estado limpo mesmo se a página já estava aberta
  await page.getByPlaceholder('seu@empresa.com').fill(email)
  await page.getByPlaceholder('••••••••').fill(senha)
  const res = page.waitForResponse(r => r.url().endsWith('/auth/login'))
  await page.getByRole('button', { name: /entrar/i }).click()
  return res
}

export { expect }
