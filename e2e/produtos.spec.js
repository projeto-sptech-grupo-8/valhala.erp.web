import { test, expect, login } from './fixtures.js'

const API = 'http://localhost:8080'
const id = Date.now().toString().slice(-6)
const CAT = `Bebidas E2E ${id}`
const VODKA = `Vodka E2E ${id}`
const ENERGY = `Energético E2E ${id}`
const DRINK = `Vodka Energy E2E ${id}`
const LEITOR = { email: `leitorprod${id}@valhalla.local`, senha: 'Senha@1234' }
const toast = (page, text) => expect(page.getByRole('status').filter({ hasText: text }).first()).toBeVisible()

test.describe.configure({ mode: 'serial' })

const csrf = async (page) => ({
  Origin: 'http://localhost:5173',
  'X-XSRF-TOKEN': (await page.context().cookies(API)).find(c => c.name === 'XSRF-TOKEN')?.value ?? '',
})
const produtoApi = async (page, nome) =>
  (await (await page.request.get(`${API}/produtos?busca=${encodeURIComponent(nome)}`)).json()).itens.find(p => p.nome === nome)

// o rótulo da opção traz o saldo (“Vodka … (5 un · 3750ml)”); seleciona pelo value da opção com o nome
async function selecionarInsumo(page, linha, nome) {
  const sel = page.getByLabel(`Insumo da linha ${linha}`)
  const value = await sel.locator('option', { hasText: nome }).getAttribute('value')
  await sel.selectOption(value)
}

async function entrar(page, credenciais) {
  await login(page, credenciais)
  await expect(page.getByRole('button', { name: 'Sair' })).toBeVisible()
}

async function novoPadrao(page, { nome, custo, preco, minimo, qtd, volume, dose }) {
  await page.goto('/#/novo')
  await page.getByRole('button', { name: /Produto padrão/ }).click()
  await page.getByLabel('Nome do produto').fill(nome)
  await page.getByLabel('Categoria').selectOption({ label: CAT })
  await page.getByLabel('Preço de custo (R$)').fill(String(custo))
  await page.getByLabel('Preço de venda (R$)').fill(String(preco))
  await page.getByLabel('Estoque mínimo').fill(String(minimo))
  await page.getByLabel('Quantidade inicial').fill(String(qtd))
  await page.getByLabel('Volume da embalagem (ml)').fill(String(volume))
  if (dose) {
    await page.getByLabel('Venda por dose?').selectOption('Sim')
    await page.getByLabel('Volume por dose (ml)').fill(String(dose))
  }
}

test('cria produto fracionado (saldo em ml no back)', async ({ page, shot }) => {
  await entrar(page)
  const res = await page.request.post(`${API}/categorias`, { data: { nome: CAT }, headers: await csrf(page) })
  expect(res.status()).toBe(201)

  await novoPadrao(page, { nome: VODKA, custo: 58, preco: 84, minimo: 2, qtd: 5, volume: 750, dose: 50 })
  await expect(page.getByLabel('Código / SKU')).toHaveValue('')
  await shot('formulario')
  await page.getByRole('button', { name: 'Salvar produto' }).first().click()
  await toast(page, 'Produto criado')
  await page.getByLabel('Buscar produto').fill(VODKA)
  await expect(page.getByRole('row').filter({ hasText: VODKA })).toContainText('PRD-')
  await shot('lista')

  const p = await produtoApi(page, VODKA)
  expect(p.fracionado).toBe(true)
  expect(Number(p.quantidadeEstoque), '5 garrafas × 750 ml').toBe(3750)
  expect(Number(p.estoqueMinimo), 'mínimo 2 garrafas × 750 ml').toBe(1500)
})

test('cria produto nao fracionado', async ({ page }) => {
  await entrar(page)
  await novoPadrao(page, { nome: ENERGY, custo: 8, preco: 12.9, minimo: 12, qtd: 24, volume: 250 })
  await page.getByRole('button', { name: 'Salvar produto' }).first().click()
  await toast(page, 'Produto criado')
  const p = await produtoApi(page, ENERGY)
  expect(p.fracionado).toBe(false)
  expect(Number(p.quantidadeEstoque)).toBe(24)
})

test('cria drink com receita em ml e em unidade', async ({ page, shot }) => {
  await entrar(page)
  await page.goto('/#/novo')
  await page.getByRole('button', { name: /Drink/ }).click()
  await page.getByLabel('Nome do produto').fill(DRINK)
  await page.getByLabel('Categoria').selectOption({ label: CAT })
  await page.getByLabel('Preço de venda (R$)').fill('32')
  await page.getByRole('button', { name: /Adicionar ingrediente/ }).click()
  await selecionarInsumo(page, 1, VODKA)
  await page.getByLabel('Dose em ml da linha 1').fill('50')
  await page.getByRole('button', { name: /Adicionar ingrediente/ }).click()
  await selecionarInsumo(page, 2, ENERGY)
  await expect(page.getByLabel('Dose em unidades da linha 2')).toHaveValue('1')
  await shot('receita')
  await page.getByRole('button', { name: 'Salvar produto' }).first().click()
  await toast(page, 'Produto criado')

  const d = await produtoApi(page, DRINK)
  expect(d.tipo).toBe('DRINK')
  const receita = await (await page.request.get(`${API}/drinks/${d.id}/receita`)).json()
  const porNome = Object.fromEntries(receita.map(i => [i.produtoNome, i]))
  expect(porNome[VODKA]).toMatchObject({ unidadeConsumo: 'ML' })
  expect(Number(porNome[VODKA].quantidade)).toBe(50)
  expect(porNome[ENERGY]).toMatchObject({ unidadeConsumo: 'UN' })
  expect(Number(porNome[ENERGY].quantidade)).toBe(1)
})

test('edita preco; volume fica bloqueado', async ({ page, shot }) => {
  await entrar(page)
  const p = await produtoApi(page, VODKA)
  await page.goto(`/#/editar?id=${p.id}`)
  await expect(page.getByLabel('Volume da embalagem (ml)')).toBeDisabled()
  await expect(page.getByLabel('Código / SKU')).toHaveValue(p.sku)
  await page.getByLabel('Preço de venda (R$)').fill('89.9')
  await shot('edicao')
  await page.getByRole('button', { name: 'Salvar alterações' }).first().click()
  await toast(page, 'Alterações salvas')
  expect(Number((await produtoApi(page, VODKA)).precoVenda)).toBe(89.9)
})

test('catalogo vem da API mesmo sem cache local', async ({ page, shot }) => {
  await entrar(page)
  await page.evaluate(() => localStorage.clear())
  await page.goto('/#/produtos')
  await page.reload()
  await page.getByLabel('Buscar produto').fill(`E2E ${id}`)
  await expect(page.getByRole('row').filter({ hasText: VODKA })).toBeVisible()
  await expect(page.getByRole('row').filter({ hasText: ENERGY })).toBeVisible()
  await expect(page.getByRole('row').filter({ hasText: DRINK })).toBeVisible()
  await shot('sem-cache')
})

test('usuario so leitura nao cria nem edita', async ({ page, shot }) => {
  await entrar(page)
  const res = await page.request.post(`${API}/usuario`, {
    data: { nome: 'Leitor Produtos', email: LEITOR.email, senha: LEITOR.senha, nomePerfil: 'Atendente' },
    headers: await csrf(page),
  })
  expect(res.status()).toBe(201)
  await page.goto('about:blank') // desmonta o app antes de trocar de sessão (sem requisições em voo)
  await page.context().clearCookies()

  await entrar(page, LEITOR)
  await page.goto('/#/produtos')
  await page.getByLabel('Buscar produto').fill(VODKA)
  await expect(page.getByRole('row').filter({ hasText: VODKA })).toBeVisible()
  await expect(page.getByRole('button', { name: /Novo produto/ })).toHaveCount(0)
  await expect(page.getByRole('button', { name: `Editar ${VODKA}` })).toHaveCount(0)
  await shot('somente-leitura')
  await page.goto('/#/novo')
  await expect(page.getByText('Acesso restrito')).toBeVisible()
  await shot('novo-bloqueado')
})
