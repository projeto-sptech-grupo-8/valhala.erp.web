import { test, expect, login } from './fixtures.js'

/*
 * Teste exploratório pelo front: fluxos sem E2E dedicado (NF-e, validades, inventário) e varredura de
 * interações em todas as telas (filtros, abas, modais, exportações), com admin, usuário limitado e celular.
 * O fixture reprova qualquer erro de console/JS ou resposta 4xx/5xx não declarada.
 */
const API = 'http://localhost:8080'
const id = Date.now().toString().slice(-6)
const N = {
  heineken: `Heineken Exp ${id}`, stella: `Stella Exp ${id}`, redbull: `Red Bull Exp ${id}`,
  gin: `Gin Exp ${id}`, drink: `Gin Tônica Exp ${id}`,
}
const LIMITADO = { email: `atendente${id}@valhalla.local`, senha: 'Senha@1234' }
const toast = (page, text) => expect(page.getByRole('status').filter({ hasText: text }).first()).toBeVisible()

test.describe.configure({ mode: 'serial' })

async function apiCtx(page) {
  const headers = {
    Origin: 'http://localhost:5173',
    'X-XSRF-TOKEN': (await page.context().cookies(API)).find(c => c.name === 'XSRF-TOKEN')?.value ?? '',
  }
  const call = async (method, path, data) => {
    const r = await page.request[method](`${API}${path}`, { data, headers })
    expect(r.ok(), `${method.toUpperCase()} ${path} → ${r.status()} ${await r.text()}`).toBeTruthy()
    return r.status() === 204 ? null : r.json()
  }
  return { get: (p) => call('get', p), post: (p, d) => call('post', p, d), put: (p, d) => call('put', p, d) }
}
const produto = async (api, nome) => (await api.get(`/produtos?busca=${encodeURIComponent(nome)}`)).itens.find(p => p.nome === nome)
const movs = async (api, nome) => (await api.get(`/movimentacoes-estoque?produtoId=${(await produto(api, nome)).id}&tamanho=100`)).itens

async function entrar(page, cred) {
  // espera a sincronização inicial (catálogo + histórico) para não interromper requisições em voo
  const sync = page.waitForResponse(r => r.url().includes('/movimentacoes-estoque') && r.request().method() === 'GET')
  await login(page, cred)
  await expect(page.getByRole('button', { name: 'Sair' })).toBeVisible()
  await sync
}
async function ir(page, rota) {
  await page.goto(`/#/${rota}`)
  await expect(page.locator('main')).toBeVisible()
}
async function selecionar(select, nome) {
  await select.selectOption(await select.locator('option', { hasText: nome }).first().getAttribute('value'))
}

test('setup: catalogo com EAN da NF de exemplo e usuario limitado', async ({ page }) => {
  await entrar(page)
  const api = await apiCtx(page)
  const cat = await api.post('/categorias', { nome: `Exploratório ${id}` })
  const base = { categoriaId: cat.id, tipo: 'PADRAO', precoCusto: 5 }
  await api.post('/produtos', { ...base, nome: N.heineken, unidadeMedida: 'un', precoVenda: 14.9, codigoBarras: '7891000000014', volumeEmbalagemMl: 600, estoqueMinimo: 24, quantidadeInicial: 30 })
  await api.post('/produtos', { ...base, nome: N.stella, unidadeMedida: 'un', precoVenda: 9.9, codigoBarras: '7891000000021', volumeEmbalagemMl: 350, estoqueMinimo: 24, quantidadeInicial: 10 })
  await api.post('/produtos', { ...base, nome: N.redbull, unidadeMedida: 'un', precoVenda: 12.9, codigoBarras: '7891000000120', volumeEmbalagemMl: 250, estoqueMinimo: 12, quantidadeInicial: 20 })
  const gin = await api.post('/produtos', { ...base, nome: N.gin, unidadeMedida: 'garrafa', precoVenda: 120, fracionado: true, volumeEmbalagemMl: 750, estoqueMinimo: 750, quantidadeInicial: 3000 })
  const rb = await produto(api, N.redbull)
  const drink = await api.post('/produtos', { categoriaId: cat.id, tipo: 'DRINK', nome: N.drink, unidadeMedida: 'copo', precoVenda: 35 })
  await api.put(`/drinks/${drink.id}/receita`, { ingredientes: [
    { produtoId: gin.id, quantidade: 60, unidadeConsumo: 'ML' }, { produtoId: rb.id, quantidade: 1, unidadeConsumo: 'UN' },
  ] })
  await api.post('/usuario', { nome: 'Atendente Exp', email: LIMITADO.email, senha: LIMITADO.senha, nomePerfil: 'Atendente' })
})

test('NF-e: XML de exemplo da entrada no back com NF, lote e conversao de caixa', async ({ page, shot }) => {
  await entrar(page)
  await ir(page, 'entradanf')
  await page.getByRole('button', { name: 'Usar XML de exemplo' }).click()
  // itens sem produto correspondente no catálogo real ficam de fora
  for (const item of ['BUDWEISER', 'EISENBAHN']) {
    await page.getByRole('article', { name: new RegExp(item) }).getByLabel(/Ignorar item/).check()
  }
  await shot('conferencia')
  const confirmar = page.getByRole('button', { name: /Confirmar entrada/ })
  await expect(confirmar).toBeEnabled()
  await confirmar.click()
  await toast(page, 'importada')
  await shot('concluida')

  const api = await apiCtx(page)
  const hk = await produto(api, N.heineken)
  expect(Number(hk.quantidadeEstoque), '30 + 4 caixas × 12').toBe(78)
  const m = (await movs(api, N.heineken))[0]
  expect(m).toMatchObject({ tipo: 'ENTRADA', lote: 'HK2610X' })
  expect(Number(m.numeroNotaFiscal), 'nNF do XML').toBe(413)
  expect(Number((await produto(api, N.redbull)).quantidadeEstoque), '20 + 8 fardos × 6').toBe(68)
})

test('validades: lote vencido baixado como PERDA', async ({ page, shot }) => {
  await entrar(page)
  await ir(page, 'movimentacoes')
  await page.getByRole('button', { name: /Registrar movimentação/ }).click()
  await page.getByRole('radio', { name: 'Entrada' }).click()
  await selecionar(page.locator('select').filter({ hasText: 'Selecione o produto' }), N.gin)
  await page.getByPlaceholder('0', { exact: true }).fill('1')
  await page.getByPlaceholder('Ex.: L2610A (vazio = SEM-LOTE)').fill(`VENC${id}`)
  const ontem = new Date(Date.now() - 86400000).toISOString().slice(0, 10)
  await page.locator('input[type="date"]').first().fill(ontem)
  await page.getByRole('button', { name: 'Confirmar entrada' }).click()
  await toast(page, 'Movimentação registrada')

  await ir(page, 'validades')
  const linha = page.getByRole('row').filter({ hasText: `VENC${id}` })
  await expect(linha).toBeVisible()
  await shot('lote-vencido')
  await linha.getByRole('button', { name: /Registrar perda/ }).click()
  await page.getByRole('dialog').getByRole('button', { name: 'Registrar perda' }).click()
  await toast(page, 'Perda registrada')

  const api = await apiCtx(page)
  const ultima = (await movs(api, N.gin))[0]
  expect(ultima.tipo).toBe('PERDA')
  expect(Number(ultima.quantidade), '1 garrafa = 750 ml').toBe(750)
})

test('inventario: contagem cega aprovada vira AJUSTE no back', async ({ page, shot }) => {
  await entrar(page)
  const api = await apiCtx(page)
  const hk = await produto(api, N.heineken)
  // setor (localização) é um dado local do produto
  await ir(page, `editar?id=${hk.id}`)
  await page.getByLabel('Localização').selectOption('Câmara Fria A')
  await page.getByRole('button', { name: 'Salvar alterações' }).first().click()
  await toast(page, 'Alterações salvas')

  await ir(page, 'inventario')
  await page.getByRole('button', { name: /Novo inventário/ }).click()
  await selecionar(page.getByRole('dialog').locator('select'), 'Câmara Fria A')
  await page.getByRole('dialog').getByRole('button', { name: /Abrir contagem/ }).click()
  const item = page.getByRole('listitem').filter({ hasText: N.heineken })
  await expect(item).toContainText(hk.sku) // SKU, não UUID
  await item.getByPlaceholder('Contado').fill(String(Number(hk.quantidadeEstoque) - 2))
  for (const outro of await page.getByRole('listitem').filter({ hasNotText: N.heineken }).filter({ has: page.getByPlaceholder('Contado') }).all()) {
    await outro.getByRole('button', { name: /Não achei/ }).click()
  }
  await shot('contagem')
  await page.getByRole('button', { name: /Finalizar contagem/ }).click()
  await page.getByRole('button', { name: /Aprovar ajustes/ }).click()
  const dialog = page.getByRole('dialog')
  const motivo = dialog.locator('select')
  if (await motivo.count()) await motivo.selectOption({ index: 1 }).catch(() => {})
  await dialog.getByRole('button', { name: /Aprovar e ajustar estoque/ }).click()
  await toast(page, 'concluído')
  await shot('aprovado')

  const ultima = (await movs(api, N.heineken))[0]
  expect(ultima.tipo).toBe('AJUSTE_NEGATIVO')
  expect(Number(ultima.quantidade)).toBe(2)
})

test('caixa: abre, vende produto e drink, sangria, fecha', async ({ page, shot }) => {
  await entrar(page)
  await ir(page, 'caixa')
  const fundo = page.getByPlaceholder('0,00').first()
  if (await fundo.isVisible().catch(() => false)) {
    await fundo.fill('150')
    await page.getByRole('button', { name: /Abrir caixa/ }).click()
  }
  const busca = page.getByPlaceholder('Buscar ou ler código de barras (F2)')
  await busca.fill('7891000000021') // leitura de EAN + Enter
  await busca.press('Enter')
  await busca.fill(`Exp ${id}`)
  await page.getByRole('button', { name: new RegExp(`^Adicionar ${N.drink}`) }).click()
  await page.getByRole('button', { name: `Aumentar ${N.drink}` }).click()
  await shot('pedido')
  await page.getByRole('button', { name: /^Pagar/ }).click()
  const pag = page.getByRole('dialog')
  await pag.getByRole('radio', { name: /Pix/ }).click()
  await pag.getByRole('button', { name: /Adicionar/ }).click()
  await pag.getByRole('button', { name: /Finalizar venda/ }).click()
  await toast(page, 'finalizada')

  const api = await apiCtx(page)
  const tiposStella = (await movs(api, N.stella)).map(m => m.tipo)
  expect(tiposStella[0], 'EAN lido no caixa baixa a Stella').toBe('SAIDA')
  const ginMovs = (await movs(api, N.gin)).filter(m => m.tipo === 'SAIDA_DRINK')
  expect(Number(ginMovs[0].quantidade), '2 drinks × 60 ml').toBe(120)

  await page.locator('main').getByRole('button', { name: /Sangria/ }).click()
  await page.getByRole('dialog').getByPlaceholder('0,00').fill('20')
  await page.getByRole('dialog').getByPlaceholder('Ex.: depósito bancário').fill('depósito E2E')
  await shot('sangria')
  await page.getByRole('dialog').getByRole('button', { name: /Confirmar|Registrar/ }).last().click()
  await page.locator('main').getByRole('button', { name: /^Vendas/ }).click()
  await shot('vendas-do-dia')
  await page.keyboard.press('Escape')
  await page.locator('main').getByRole('button', { name: /Fechar caixa/ }).click()
  await page.getByRole('dialog').getByPlaceholder('0,00').first().fill('130')
  await page.getByRole('dialog').getByRole('button', { name: /Confirmar fechamento/ }).click()
  await shot('caixa-fechado')
})

/* ─── varredura de interações: tudo que não grava dados ─── */
async function varrer(page, shot, prefixo) {
  const rotas = [
    'dashboard', 'produtos', 'categorias', 'movimentacoes', 'reposicao', 'caixa', 'orcamento', 'notafiscal',
    'entradanf', 'inventario', 'validades', 'auditoria', 'relatorios', 'financeiro', 'novo',
    'usuarios', 'novousuario', 'perfis', 'novoperfil', 'seguranca', 'notificacoes', 'geral',
  ]
  for (const rota of rotas) {
    await ir(page, rota)
    await page.waitForTimeout(250)
    // abas e segmentos (radio/tab) — só trocam a visão
    for (const sel of ['main [role="tab"]', 'main [role="radiogroup"]:not([aria-label*="pagamento"]) [role="radio"]']) {
      for (const el of (await page.locator(sel).all()).slice(0, 8)) {
        if (await el.isVisible() && await el.isEnabled()) await el.click().catch(() => {})
      }
    }
    // filtros <select> da barra (cada opção)
    for (const s of (await page.locator('main select[aria-label^="Filtrar"]').all()).slice(0, 4)) {
      const n = await s.locator('option').count()
      for (let i = 0; i < Math.min(n, 6); i++) await s.selectOption({ index: i }).catch(() => {})
    }
    // botões de visão: colunas extras, detalhes, etiquetas, exportar (download)
    for (const nome of [/Mostrar custo/, /Mostrar giro/, /^Ver detalhes/, /Etiquetas/, /^Exportar/]) {
      const b = page.locator('main').getByRole('button', { name: nome }).first()
      if (await b.isVisible().catch(() => false) && await b.isEnabled()) {
        await b.click().catch(() => {})
        await page.waitForTimeout(150)
        await page.keyboard.press('Escape')
      }
    }
    await expect(page.locator('main')).toBeVisible()
    await shot(`${prefixo}-${rota}`)
  }
}

test('varredura de todas as telas (admin)', async ({ page, shot }) => {
  test.setTimeout(240_000)
  await entrar(page)
  await varrer(page, shot, 'admin')
})

test('varredura de todas as telas (usuario Atendente)', async ({ page, shot }) => {
  test.setTimeout(240_000)
  page.allowStatus(403, '/autorizacoes/') // telas de acesso: o back nega e a tela mostra "Acesso restrito"
  await entrar(page, LIMITADO)
  await varrer(page, shot, 'atendente')
})

test('varredura de todas as telas (celular 390×844)', async ({ page, shot }) => {
  test.setTimeout(240_000)
  await page.setViewportSize({ width: 390, height: 844 })
  await entrar(page)
  await varrer(page, shot, 'mobile')
})
