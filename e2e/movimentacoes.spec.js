import { test, expect, login } from './fixtures.js'

const API = 'http://localhost:8080'
const id = Date.now().toString().slice(-6)
const GIN = `Gin Mov ${id}`
const TONICA = `Tônica Mov ${id}`
const DRINK = `Gin Tônica Mov ${id}`
const toast = (page, text) => expect(page.getByRole('status').filter({ hasText: text }).first()).toBeVisible()

test.describe.configure({ mode: 'serial' })

async function apiCtx(page) {
  const headers = {
    Origin: 'http://localhost:5173',
    'X-XSRF-TOKEN': (await page.context().cookies(API)).find(c => c.name === 'XSRF-TOKEN')?.value ?? '',
  }
  const call = async (method, path, data) => {
    const r = await page.request[method](`${API}${path}`, { data, headers })
    expect(r.ok(), `${method.toUpperCase()} ${path} → ${r.status()}`).toBeTruthy()
    return r.status() === 204 ? null : r.json()
  }
  return { get: (p) => call('get', p), post: (p, d) => call('post', p, d), put: (p, d) => call('put', p, d) }
}
const produto = async (api, nome) => (await api.get(`/produtos?busca=${encodeURIComponent(nome)}`)).itens.find(p => p.nome === nome)
const saldo = async (api, nome) => Number((await produto(api, nome)).quantidadeEstoque)
const movs = async (api, nome) => (await api.get(`/movimentacoes-estoque?produtoId=${(await produto(api, nome)).id}&tamanho=100`)).itens

async function entrar(page) {
  await login(page)
  await expect(page.getByRole('button', { name: 'Sair' })).toBeVisible()
}

async function selecionar(select, nome) {
  const value = await select.locator('option', { hasText: nome }).getAttribute('value')
  await select.selectOption(value)
}

test('prepara catalogo pela API', async ({ page }) => {
  await entrar(page)
  const api = await apiCtx(page)
  const cat = await api.post('/categorias', { nome: `Mov ${id}` })
  const gin = await api.post('/produtos', { nome: GIN, categoriaId: cat.id, unidadeMedida: 'garrafa', precoVenda: 120, precoCusto: 80, tipo: 'PADRAO', fracionado: true, volumeEmbalagemMl: 750, quantidadeInicial: 1500 })
  const tonica = await api.post('/produtos', { nome: TONICA, categoriaId: cat.id, unidadeMedida: 'un', precoVenda: 6, precoCusto: 3, tipo: 'PADRAO', fracionado: false, volumeEmbalagemMl: 350, quantidadeInicial: 6 })
  const drink = await api.post('/produtos', { nome: DRINK, categoriaId: cat.id, unidadeMedida: 'copo', precoVenda: 35, tipo: 'DRINK' })
  await api.put(`/drinks/${drink.id}/receita`, { ingredientes: [
    { produtoId: gin.id, quantidade: 60, unidadeConsumo: 'ML' },
    { produtoId: tonica.id, quantidade: 1, unidadeConsumo: 'UN' },
  ] })
})

test('entrada com lote e NF vai para o back (em ml)', async ({ page, shot }) => {
  await entrar(page)
  await page.goto('/#/movimentacoes')
  await page.getByRole('button', { name: /Registrar movimentação/ }).click()
  await page.getByRole('radio', { name: 'Entrada' }).click()
  await selecionar(page.locator('select').filter({ hasText: 'Selecione o produto' }), GIN)
  await page.getByPlaceholder('0', { exact: true }).fill('1')
  await page.getByPlaceholder('000.000').fill(`NF${id}`)
  await page.getByPlaceholder('Ex.: L2610A (vazio = SEM-LOTE)').fill(`L${id}`)
  await shot('formulario')
  await page.getByRole('button', { name: 'Confirmar entrada' }).click()
  await toast(page, 'Movimentação registrada')
  await expect(page.getByRole('row').filter({ hasText: GIN }).filter({ hasText: `NF NF${id}` })).toBeVisible()
  await shot('historico')

  const api = await apiCtx(page)
  expect(await saldo(api, GIN), '1500 + 1 garrafa de 750 ml').toBe(2250)
  const m = (await movs(api, GIN))[0]
  expect(m).toMatchObject({ tipo: 'ENTRADA', lote: `L${id}`, numeroNotaFiscal: `NF${id}`, usuarioNome: 'Administrador Inicial' })
  expect(Number(m.quantidade)).toBe(750)
})

test('saida por perda vira PERDA e ajuste negativo vira AJUSTE_NEGATIVO', async ({ page }) => {
  await entrar(page)
  await page.goto('/#/movimentacoes')
  await page.getByRole('button', { name: /Registrar movimentação/ }).click()
  await page.getByRole('radio', { name: 'Saída' }).click()
  await selecionar(page.locator('select').filter({ hasText: 'Selecione o produto' }), TONICA)
  await page.getByPlaceholder('0', { exact: true }).fill('1')
  await page.locator('select').filter({ hasText: 'Perda / quebra' }).selectOption('Perda / quebra')
  await page.getByRole('button', { name: 'Confirmar saída' }).click()
  await toast(page, 'Movimentação registrada')

  await page.getByRole('button', { name: /Registrar movimentação/ }).click()
  await page.getByRole('radio', { name: 'Ajuste' }).click()
  await selecionar(page.locator('select').filter({ hasText: 'Selecione o produto' }), TONICA)
  await page.getByPlaceholder('Ex.: -2').fill('-1')
  await page.getByPlaceholder('Ex.: contagem física de inventário').fill('contagem E2E')
  await page.getByRole('button', { name: 'Confirmar ajuste' }).click()
  await toast(page, 'Movimentação registrada')

  const api = await apiCtx(page)
  expect(await saldo(api, TONICA)).toBe(4)
  const tipos = (await movs(api, TONICA)).map(m => m.tipo)
  expect(tipos.slice(0, 2)).toEqual(['AJUSTE_NEGATIVO', 'PERDA'])
})

test('saida acima do saldo e barrada antes de chamar a API', async ({ page, shot }) => {
  await entrar(page)
  await page.goto('/#/movimentacoes')
  await page.getByRole('button', { name: /Registrar movimentação/ }).click()
  await page.getByRole('radio', { name: 'Saída' }).click()
  await selecionar(page.locator('select').filter({ hasText: 'Selecione o produto' }), TONICA)
  await page.getByPlaceholder('0', { exact: true }).fill('50')
  await page.getByRole('button', { name: 'Confirmar saída' }).click()
  await expect(page.getByText('Saldo atual é 4 un.')).toBeVisible()
  await shot('saldo-insuficiente')
})

async function abrirCaixa(page) {
  await page.goto('/#/caixa')
  const fundo = page.getByPlaceholder('0,00').first()
  if (await fundo.isVisible().catch(() => false)) {
    await fundo.fill('100')
    await page.getByRole('button', { name: /Abrir caixa/ }).click()
  }
  await expect(page.getByPlaceholder('Buscar ou ler código de barras (F2)')).toBeVisible()
}

async function pagarEmDinheiro(page) {
  await page.getByRole('button', { name: /^Pagar/ }).click()
  const dialog = page.getByRole('dialog')
  await dialog.getByRole('radio', { name: /Dinheiro/ }).click()
  await dialog.getByRole('button', { name: /Adicionar/ }).click()
  await dialog.getByRole('button', { name: /Finalizar venda/ }).click()
}

test('venda no caixa: produto vira SAIDA e drink vira SAIDA_DRINK', async ({ page, shot }) => {
  await entrar(page)
  await abrirCaixa(page)
  await page.getByPlaceholder('Buscar ou ler código de barras (F2)').fill(`Mov ${id}`)
  await page.getByRole('button', { name: new RegExp(`^Adicionar ${DRINK}`) }).click()
  await page.getByRole('button', { name: new RegExp(`^Adicionar ${TONICA}`) }).click()
  await shot('pedido')
  await pagarEmDinheiro(page)
  await toast(page, 'finalizada')
  await shot('venda-finalizada')

  const api = await apiCtx(page)
  expect(await saldo(api, GIN), '2250 − 60 ml').toBe(2190)
  expect(await saldo(api, TONICA), '4 − 1 (drink) − 1 (avulsa)').toBe(2)
  const tipos = (await movs(api, TONICA)).slice(0, 2).map(m => m.tipo).sort()
  expect(tipos).toEqual(['SAIDA', 'SAIDA_DRINK'])
})

test('falha no meio da venda estorna o que ja foi gravado', async ({ page, shot }) => {
  page.allowStatus(400, '/movimentacoes-estoque/saida-drink')
  await entrar(page)
  await abrirCaixa(page)
  await page.getByPlaceholder('Buscar ou ler código de barras (F2)').fill(`Mov ${id}`)
  // tônica avulsa primeiro (será gravada), depois o drink (vai falhar no back)
  await page.getByRole('button', { name: new RegExp(`^Adicionar ${TONICA}`) }).click()
  await page.getByRole('button', { name: new RegExp(`^Adicionar ${DRINK}`) }).click()

  // outro terminal zera o gin depois que esta tela carregou o catálogo
  const api = await apiCtx(page)
  const gin = await produto(api, GIN)
  await api.post('/movimentacoes-estoque', { produtoId: gin.id, tipo: 'AJUSTE_NEGATIVO', quantidade: Number(gin.quantidadeEstoque), motivo: 'E2E: outro terminal' })

  await pagarEmDinheiro(page)
  await toast(page, 'Venda não finalizada')
  await shot('venda-recusada')

  expect(await saldo(api, TONICA), 'tônica volta ao saldo anterior').toBe(2)
  const ultimas = (await movs(api, TONICA)).slice(0, 2)
  expect(ultimas.map(m => m.tipo)).toEqual(['AJUSTE_POSITIVO', 'SAIDA'])
  expect(ultimas[0].motivo).toContain('Estorno automático')
})
