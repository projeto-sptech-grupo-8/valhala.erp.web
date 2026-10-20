import { test, expect, login } from './fixtures.js'

const API = 'http://localhost:8080'
const id = Date.now().toString().slice(-6)
const CAT = `Cervejas E2E ${id}`
const LEITOR = { email: `leitor${id}@valhalla.local`, senha: 'Senha@1234' }
const toast = (page, text) => expect(page.getByRole('status').filter({ hasText: text }).first()).toBeVisible()
const card = (page, nome) => page.getByRole('article', { name: `Categoria ${nome}` })
const dialog = (page) => page.getByRole('dialog')

test.describe.configure({ mode: 'serial' })

async function abrir(page, credenciais) {
  await login(page, credenciais)
  await expect(page.getByRole('button', { name: 'Sair' })).toBeVisible()
  await page.goto('/#/categorias')
  await page.reload()
}

test('cria categoria', async ({ page, shot }) => {
  await abrir(page)
  await shot('lista-inicial')
  await page.getByRole('button', { name: 'Nova categoria' }).click()
  await dialog(page).getByPlaceholder('Ex.: Cervejas especiais').fill(CAT)
  await dialog(page).getByPlaceholder('Opcional').fill('Criada pelo E2E')
  await shot('modal')
  await dialog(page).getByRole('button', { name: 'Criar categoria' }).click()
  await toast(page, 'Categoria criada')
  await expect(card(page, CAT)).toBeVisible()
  await expect(card(page, CAT)).toContainText('Criada pelo E2E')
  await shot('criada')

  const r = await (await page.request.get(`${API}/categorias?busca=${encodeURIComponent(CAT)}`)).json()
  expect(r.itens.map(c => c.nome), 'categoria persistida').toEqual([CAT])
})

test('nome duplicado e bloqueado no formulario', async ({ page, shot }) => {
  await abrir(page)
  await page.getByRole('button', { name: 'Nova categoria' }).click()
  await dialog(page).getByPlaceholder('Ex.: Cervejas especiais').fill(CAT.toUpperCase())
  await dialog(page).getByRole('button', { name: 'Criar categoria' }).click()
  await expect(dialog(page).getByRole('alert')).toHaveText('Já existe uma categoria com este nome.')
  await shot('duplicado')
})

test('edita e inativa a categoria', async ({ page, shot }) => {
  await abrir(page)
  await page.getByRole('button', { name: `Editar categoria ${CAT}` }).click()
  await dialog(page).getByPlaceholder('Opcional').fill('Descrição editada')
  await dialog(page).getByLabel('Categoria ativa').uncheck()
  await shot('modal-edicao')
  await dialog(page).getByRole('button', { name: 'Salvar' }).click()
  await toast(page, 'Alterações salvas')
  await expect(card(page, CAT)).toContainText('Inativa')
  await expect(card(page, CAT)).toContainText('Descrição editada')
  await shot('inativa')
})

test('usuario so leitura nao ve acoes de edicao', async ({ page, shot }) => {
  await login(page)
  await expect(page.getByRole('button', { name: 'Sair' })).toBeVisible()
  const res = await page.request.post(`${API}/usuario`, {
    data: { nome: 'Leitor E2E', email: LEITOR.email, senha: LEITOR.senha, nomePerfil: 'Atendente' },
    headers: { Origin: 'http://localhost:5173', 'X-XSRF-TOKEN': (await page.context().cookies(API)).find(c => c.name === 'XSRF-TOKEN')?.value ?? '' },
  })
  expect(res.status()).toBe(201)
  await page.goto('about:blank') // desmonta o app antes de trocar de sessão (sem requisições em voo)
  await page.context().clearCookies()

  await abrir(page, LEITOR)
  await expect(card(page, CAT)).toBeVisible()
  await expect(page.getByRole('button', { name: 'Nova categoria' })).toHaveCount(0)
  await expect(page.getByRole('button', { name: `Editar categoria ${CAT}` })).toHaveCount(0)
  await shot('somente-leitura')
})

test('exclui a categoria', async ({ page, shot }) => {
  await abrir(page)
  await page.getByRole('button', { name: `Editar categoria ${CAT}` }).click()
  await dialog(page).getByRole('button', { name: 'Excluir' }).click()
  await shot('confirmacao')
  await dialog(page).getByRole('button', { name: 'Excluir categoria' }).click()
  await toast(page, 'Categoria excluída')
  await expect(card(page, CAT)).toHaveCount(0)
  await shot('excluida')
})
