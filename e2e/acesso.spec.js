import { test, expect, login } from './fixtures.js'

const API = 'http://localhost:8080'
const id = Date.now().toString().slice(-6)
const PERFIL = `E2E Caixa ${id}`
const USER = { nome: `Teste E2E ${id}`, email: `e2e${id}@valhalla.local`, senha: 'Senha@1234' }
const toast = (page, text) => expect(page.getByRole('status').filter({ hasText: text }).first()).toBeVisible()

// Um fluxo encadeado: cada passo depende do anterior (perfil → usuário → ajustes → login limitado)
test.describe.configure({ mode: 'serial' })

test('cria perfil com funcionalidades', async ({ page, shot }) => {
  await login(page)
  await page.goto('/#/novoperfil')
  await page.locator('#pf-nome').fill(PERFIL)
  await page.locator('#pf-desc').fill('Criado pelo teste E2E')
  await page.locator('#new-VISUALIZAR_ESTOQUE').check()
  await shot('formulario')
  await page.getByRole('button', { name: 'Criar perfil' }).click()
  await toast(page, 'Perfil criado')
  await shot('criado')

  const perfis = await (await page.request.get(`${API}/autorizacoes/perfis`)).json()
  const p = perfis.find(x => x.nome === PERFIL)
  expect(p, 'perfil persistido no banco').toBeTruthy()
  expect(p.codigosFuncionalidades).toEqual(['VISUALIZAR_ESTOQUE'])
})

test('nome de perfil duplicado mostra erro', async ({ page, shot }) => {
  page.allowStatus(409, '/autorizacoes/perfis')
  await login(page)
  await page.goto('/#/novoperfil')
  await page.locator('#pf-nome').fill(PERFIL.toUpperCase())
  await page.getByRole('button', { name: 'Criar perfil' }).click()
  await expect(page.getByText('Já existe um perfil com este nome.')).toBeVisible()
  await shot('erro-duplicado')
})

test('cria usuario vinculado ao perfil', async ({ page, shot }) => {
  await login(page)
  await page.goto('/#/novousuario')
  await page.getByPlaceholder('Ex.: Mariana Costa').fill(USER.nome)
  await page.getByPlaceholder('nome@adega.com.br').fill(USER.email)
  await page.getByPlaceholder('Mínimo 8 caracteres, letras e números').fill(USER.senha)
  await page.getByLabel('Confirmar senha').fill(USER.senha)
  await page.getByRole('combobox').filter({ hasText: 'Selecione um perfil' }).selectOption({ label: PERFIL })
  await shot('formulario')
  await page.getByRole('button', { name: 'Criar usuário' }).click()
  await toast(page, 'Usuário criado')
  await expect(page.getByRole('heading', { name: USER.nome }).first()).toBeVisible()
  await expect(page.getByText(PERFIL).first()).toBeVisible()
  await shot('detalhe')

  const users = await (await page.request.get(`${API}/usuario`)).json()
  const u = users.find(x => x.email === USER.email)
  expect(u?.nomePerfil, 'usuário persistido com o perfil certo').toBe(PERFIL)
})

test('email duplicado mostra erro no formulario', async ({ page, shot }) => {
  page.allowStatus(409, '/usuario')
  await login(page)
  await page.goto('/#/novousuario')
  await page.getByPlaceholder('Ex.: Mariana Costa').fill('Duplicado')
  await page.getByPlaceholder('nome@adega.com.br').fill(USER.email)
  await page.getByPlaceholder('Mínimo 8 caracteres, letras e números').fill(USER.senha)
  await page.getByLabel('Confirmar senha').fill(USER.senha)
  await page.getByRole('combobox').filter({ hasText: 'Selecione um perfil' }).selectOption({ label: PERFIL })
  await page.getByRole('button', { name: 'Criar usuário' }).click()
  await expect(page.getByText(/já (cadastrado|existe|está em uso)/i).first()).toBeVisible()
  await shot('erro-email')
})

test('lista mostra o usuario e abre o detalhe', async ({ page, shot }) => {
  await login(page)
  await page.goto('/#/usuarios')
  await page.getByLabel('Buscar usuário').fill(USER.email)
  await expect(page.getByText(USER.nome).first()).toBeVisible()
  await shot('lista-filtrada')
})

test('ajuste individual de permissao (GRANT) aparece nas efetivas', async ({ page, shot }) => {
  await login(page)
  await expect(page.getByRole('button', { name: 'Sair' })).toBeVisible()
  const users = await (await page.request.get(`${API}/usuario`)).json()
  const u = users.find(x => x.email === USER.email)
  await page.goto(`/#/usuario?id=${u.id}`)
  await page.getByRole('button', { name: 'Ajustar permissões' }).click()
  await page.getByRole('radiogroup', { name: /Visualizar usu/i }).getByLabel('Conceder').check()
  await shot('editor')
  await page.getByRole('button', { name: /Salvar ajustes/ }).click()
  await page.getByRole('dialog').getByRole('button', { name: 'Aplicar e encerrar sessão' }).click()
  await toast(page, 'Permissões atualizadas')
  await expect(page.getByText('Concedida individualmente').first()).toBeVisible()
  await shot('efetivas')

  const perms = await (await page.request.get(`${API}/autorizacoes/usuarios/${u.id}/permissoes`)).json()
  expect(perms.permissoesEfetivas).toEqual(expect.arrayContaining(['VISUALIZAR_ESTOQUE', 'USUARIOS_VISUALIZAR']))
})

test('inativa e reativa o usuario', async ({ page, shot }) => {
  await login(page)
  await expect(page.getByRole('button', { name: 'Sair' })).toBeVisible()
  const users = await (await page.request.get(`${API}/usuario`)).json()
  const u = users.find(x => x.email === USER.email)
  await page.goto(`/#/usuario?id=${u.id}`)
  await page.getByRole('button', { name: 'Mais ações' }).click()
  await page.getByRole('menuitem', { name: 'Inativar acesso' }).or(page.getByRole('button', { name: 'Inativar acesso' })).first().click()
  await page.getByRole('dialog').getByRole('button', { name: 'Inativar acesso' }).click()
  await expect(page.getByText('Conta inativa.')).toBeVisible()
  await shot('inativo')
  await page.getByRole('button', { name: 'Reativar' }).click()
  await page.getByRole('dialog').getByRole('button', { name: 'Reativar acesso' }).click()
  await expect(page.getByText('Conta inativa.')).toBeHidden()
  await shot('reativado')
})

test('usuario limitado so ve o que o perfil + ajustes permitem', async ({ page, shot }) => {
  page.allowStatus(401, '/usuario/me')
  page.allowStatus(401, '/auth/refresh')
  await login(page, { email: USER.email, senha: USER.senha })
  await expect(page.getByRole('button', { name: 'Sair' })).toBeVisible()
  await expect(page.getByText(USER.nome).first()).toBeVisible()
  await shot('logado-limitado')

  await page.goto('/#/usuarios')
  await expect(page.getByText('Administrador Inicial').first()).toBeVisible() // GRANT USUARIOS_VISUALIZAR
  await shot('ve-usuarios')

  await page.goto('/#/perfis') // sem PERFIS_GERENCIAR
  await expect(page.getByPlaceholder('Buscar perfil…')).toHaveCount(0)
  await shot('sem-acesso-a-perfis')
})
