import { test, expect, login } from './fixtures.js'

const API = 'http://localhost:8080'
const MESES = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez']

test('dashboard mostra serie mensal, alertas e ultimas movimentacoes do back', async ({ page, shot }) => {
  await login(page)
  await expect(page.getByRole('button', { name: 'Sair' })).toBeVisible()
  const headers = {
    Origin: 'http://localhost:5173',
    'X-XSRF-TOKEN': (await page.context().cookies(API)).find(c => c.name === 'XSRF-TOKEN')?.value ?? '',
  }
  const post = async (path, data) => (await page.request.post(`${API}${path}`, { data, headers })).json()
  const id = Date.now().toString().slice(-6)
  const nome = `Dash E2E ${id}`
  const cat = await post('/categorias', { nome: `Dash ${id}` })
  const p = await post('/produtos', { nome, categoriaId: cat.id, unidadeMedida: 'un', precoVenda: 10, precoCusto: 5, tipo: 'PADRAO', estoqueMinimo: 10, quantidadeInicial: 3 })
  await post('/movimentacoes-estoque', { produtoId: p.id, tipo: 'SAIDA', quantidade: 1, motivo: 'E2E dashboard' })

  await page.goto('/#/dashboard')
  const resumo = page.waitForResponse(r => r.url().includes('/dashboard/resumo'))
  await page.reload()
  const body = await (await resumo).json()

  const mesAtual = MESES[new Date().getMonth()]
  await expect(page.locator('svg text').filter({ hasText: new RegExp(`^${mesAtual}$`) }).first()).toBeVisible()
  expect(body.movimentacoes.serieMensal.at(-1).saidas).toBeGreaterThanOrEqual(1)
  await expect(page.getByText('nº de lançamentos')).toBeVisible()
  await expect(page.getByText(nome).first()).toBeVisible() // estoque crítico e/ou últimas movimentações
  await shot('dashboard')
})
