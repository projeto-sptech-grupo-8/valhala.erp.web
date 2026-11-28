import { test, expect } from '@playwright/test'

const strawberry = { id: '11111111-1111-4111-8111-111111111111', nome: 'Morango', sku: 'MOR', tipo: 'PADRAO', categoriaId: 1, categoriaNome: 'Insumos', unidadeMedida: 'un', precoVenda: 2, precoCusto: 1, fracionado: false, volumeEmbalagemMl: null, ativo: true, quantidadeEstoque: 30, estoqueMinimo: 3 }
const vodka = { ...strawberry, id: '22222222-2222-4222-8222-222222222222', nome: 'Vodka', sku: 'VOD', fracionado: true, volumeEmbalagemMl: 1000, quantidadeEstoque: 2000, precoCusto: 50 }
const drinkId = '33333333-3333-4333-8333-333333333333'
const category = { id: 1, nome: 'Insumos', ativo: true, descricao: 'Ingredientes' }
const envelope = (itens, pagina = 0, tamanho = 20, totalItens = itens.length) => ({ itens, pagina, tamanho, totalItens, totalPaginas: Math.ceil(totalItens / tamanho), primeira: pagina === 0, ultima: (pagina + 1) * tamanho >= totalItens })

async function setup(page, { recipeFailure = false, readOnly = false } = {}) {
  const calls = []
  let failedRecipe = false
  await page.route('http://localhost:8080/**', async route => {
    const request = route.request(), url = new URL(request.url()), path = url.pathname
    if (request.method() === 'OPTIONS') return route.fulfill({ status: 204, headers: { 'Access-Control-Allow-Origin': 'http://127.0.0.1:5184', 'Access-Control-Allow-Credentials': 'true', 'Access-Control-Allow-Headers': 'Content-Type,X-XSRF-TOKEN', 'Access-Control-Allow-Methods': 'GET,POST,PATCH,PUT,DELETE' } })
    calls.push({ path, query: Object.fromEntries(url.searchParams), method: request.method(), body: request.postDataJSON() })
    const respond = (body, status = 200) => route.fulfill({ status, json: body, headers: { 'Access-Control-Allow-Origin': 'http://127.0.0.1:5184', 'Access-Control-Allow-Credentials': 'true' } })
    if (path === '/usuario') return respond([{ id: 'user-test', name: 'Teste' }])
    if (path === '/usuario/me') return respond({ id: 'user-test', name: 'Teste', profileName: readOnly ? 'Somente leitura' : 'Gerente', permissoes: ['VISUALIZAR_ESTOQUE'] })
    if (path === '/auth/csrf') return respond({ token: 'test-csrf' })
    if (path === '/categorias' || path === '/categorias/venda') return respond(envelope([category]))
    if (path === '/categorias/1') return respond(category)
    if (path === '/produtos' && request.method() === 'POST') {
      const body = request.postDataJSON()
      if ('codigoBarras' in body || 'descricao' in body) return respond({ message: 'Campos removidos do contrato de produtos.' }, 400)
      return respond({ ...body, quantidadeEstoque: body.tipo === 'DRINK' ? null : body.quantidadeInicial, id: drinkId, sku: 'DRK', ativo: true })
    }
    if (path === '/produtos/' + strawberry.id && request.method() === 'PATCH') return respond({ ...strawberry, ...request.postDataJSON() })
    if (path === '/produtos' || path === '/produtos/venda') {
      const pageNumber = Number(url.searchParams.get('pagina') || 0)
      const items = url.searchParams.get('busca')?.toLowerCase().includes('mor') ? [strawberry] : pageNumber ? [{ ...strawberry, nome: 'Produto da segunda página' }] : [strawberry, vodka]
      return respond(envelope(items, pageNumber, Number(url.searchParams.get('tamanho') || 20), 45))
    }
    if (path === '/produtos/' + strawberry.id) return respond(strawberry)
    if (path === '/produtos/' + vodka.id) return respond(vodka)
    if (path === '/produtos/' + drinkId && request.method() === 'PATCH') return respond({ ...request.postDataJSON(), id: drinkId, tipo: 'DRINK', sku: 'DRK', nome: 'Drink de morango', categoriaId: 1, unidadeMedida: 'copo', precoVenda: 20, ativo: true })
    if (path.endsWith('/receita') && request.method() === 'PUT') {
      if (recipeFailure && !failedRecipe) { failedRecipe = true; return respond({ message: 'Falha de receita simulada' }, 400) }
      return respond(request.postDataJSON().ingredientes)
    }
    if (path === '/movimentacoes-estoque' && request.method() === 'POST') return respond({ ...request.postDataJSON(), id: 999, saldoPosterior: 2050, unidadeEstoque: 'ML' }, 201)
    if (path === '/movimentacoes-estoque') {
      const p = Number(url.searchParams.get('pagina') || 0)
      return respond(envelope([{ id: p * 20 + 1, produtoId: strawberry.id, produtoNome: 'Morango', tipo: 'PERDA', quantidade: 3, unidadeEstoque: 'UN', saldoAnterior: 30, saldoPosterior: 27, motivo: 'Controle', usuarioNome: 'Teste', ocorridoEm: '2026-11-13T10:00:00' }], p, 20, 500))
    }
    if (path === '/lotes/resumo') return respond({ referencia: '2026-11-15', lotesComSaldo: 3, vencidos: 1, vencemEm7Dias: 1, vencemEm30Dias: 0, semValidade: 1, valorVencido: 5, valorEmRisco: 15 })
    if (path === '/lotes') {
      const lots = [
        { id: 41, produtoId: strawberry.id, produtoNome: 'Morango', produtoSku: 'MOR', codigo: 'L-01', unidadeEstoque: 'un', validade: '2026-11-17', diasParaVencer: 2, situacao: 'VENCE_EM_7_DIAS', quantidadeAtual: 10, custoUnitario: 1, valorCusto: 10 },
        { id: 42, produtoId: strawberry.id, produtoNome: 'Morango', produtoSku: 'MOR', codigo: 'SEM-LOTE', unidadeEstoque: 'un', validade: null, diasParaVencer: null, situacao: 'SEM_VALIDADE', quantidadeAtual: 20, custoUnitario: 1, valorCusto: 20 },
        { id: 43, produtoId: vodka.id, produtoNome: 'Vodka', produtoSku: 'VOD', codigo: 'VENCIDO-ML', unidadeEstoque: 'ML', validade: '2026-11-10', diasParaVencer: -5, situacao: 'VENCIDO', quantidadeAtual: 100, custoUnitario: 0.05, valorCusto: 5 },
      ].filter(l => (!url.searchParams.get('produtoId') || l.produtoId === url.searchParams.get('produtoId')) && (!url.searchParams.get('situacao') || l.situacao === url.searchParams.get('situacao')) && (!url.searchParams.has('venceEmDias') || (l.diasParaVencer != null && l.diasParaVencer <= Number(url.searchParams.get('venceEmDias')))))
      return respond(envelope(lots, Number(url.searchParams.get('pagina') || 0), Number(url.searchParams.get('tamanho') || 20)))
    }
    if (path === '/dashboard/reposicao') return respond({ itens: [{ produtoId: strawberry.id, nome: 'Morango', categoria: 'Insumos', status: 'CRITICO', quantidadeAtual: 2, estoqueMinimo: 10, unidadeMedida: 'un' }], totalItens: 1 })
    if (path === '/dashboard/resumo') return respond({ estoque: { criticos: 1, zerados: 0, produtosSemMinimoDefinido: 0, alertas: [{ produtoId: strawberry.id, nome: 'Morango', categoria: 'Insumos', status: 'CRITICO' }] } })
    return respond({ message: 'Não encontrado no teste' }, 404)
  })
  return calls
}

test('catálogo consulta uma página, filtra e ordena no servidor sem baixar receitas', async ({ page }) => {
  const calls = await setup(page)
  await page.addInitScript(() => localStorage.setItem('valhalla:store:v2', '{"legacyMarker":"preservar"}'))
  await page.goto('/#/produtos')
  await expect(page.getByRole('button', { name: 'Morango', exact: true })).toBeVisible()
  await page.getByRole('button', { name: 'Ações de Morango', exact: true }).click()
  await expect(page.getByRole('menuitem', { name: 'Ver detalhes', exact: true })).toBeVisible()
  await expect(page.getByRole('menuitem', { name: 'Editar produto', exact: true })).toBeVisible()
  await page.keyboard.press('Escape')
  await expect(page.getByRole('button', { name: 'Ações de Morango', exact: true })).toBeFocused()
  await page.screenshot({ path: 'test-results/catalog-design-desktop.png', fullPage: true })
  expect(calls.filter(c => c.path === '/produtos')).toHaveLength(1)
  expect(calls.some(c => c.path.includes('/receita') || c.path === '/movimentacoes-estoque')).toBe(false)
  expect(await page.evaluate(() => localStorage.getItem('valhalla:store:v2'))).toBe('{"legacyMarker":"preservar"}')
  await page.getByRole('button', { name: 'Próxima página' }).click()
  await expect(page.getByRole('button', { name: 'Produto da segunda página', exact: true })).toBeVisible()
  expect(calls.filter(c => c.path === '/produtos').at(-1).query.pagina).toBe('1')
  await page.getByRole('searchbox', { name: 'Buscar nome' }).fill('mor')
  await expect.poll(() => calls.filter(c => c.path === '/produtos').at(-1).query.busca).toBe('mor')
  expect(calls.filter(c => c.path === '/produtos').at(-1).query.pagina).toBe('0')
  await page.getByRole('button', { name: 'Preço', exact: true }).click()
  await expect.poll(() => calls.filter(c => c.path === '/produtos').at(-1).query.ordenarPor).toBe('precoVenda')
  await expect(page.getByRole('button', { name: 'Exportar', exact: true })).toBeVisible()
})

test('histórico acessa páginas além de 300 e mantém filtros e unidade da API', async ({ page }) => {
  const calls = await setup(page)
  await page.goto('/#/movimentacoes?pagina=16&tipo=PERDA&dataInicial=2026-01-01&dataFinal=2026-11-13')
  await expect(page.getByRole('cell', { name: '−3 UN', exact: true })).toBeVisible()
  const request = calls.find(c => c.path === '/movimentacoes-estoque')
  expect(request.query).toMatchObject({ pagina: '16', tipo: 'PERDA', dataInicial: '2026-01-01', dataFinal: '2026-11-13' })
  expect(calls.some(c => c.path === '/produtos' && !c.query.tamanho)).toBe(false)
  await page.getByRole('button', { name: 'Ver detalhes' }).click()
  await expect(page.getByRole('dialog')).toContainText('Saldo anterior: 30 UN')
})

test('drink com morango sem volume: payload ML/UN, custo e retomada sem duplicar POST', async ({ page }) => {
  const calls = await setup(page, { recipeFailure: true })
  await page.goto('/#/novo')
  await page.getByRole('button', { name: /Drink \/ Copo artesanal/ }).click()
  await page.getByLabel('Ajuda sobre Identificação', { exact: true }).hover()
  await expect(page.getByRole('tooltip')).toBeVisible()
  await page.getByLabel('Nome do produto').fill('Drink de morango')
  await page.getByRole('combobox', { name: 'Categoria', exact: true }).fill('Insumos')
  await page.getByRole('option', { name: 'Insumos', exact: true }).click()
  await page.getByRole('textbox', { name: 'Preço de venda (R$)', exact: true }).fill('20')
  await page.getByRole('button', { name: 'Adicionar ingrediente' }).click()
  await page.getByRole('combobox', { name: 'Ingrediente 1', exact: true }).fill('Vodka')
  await page.getByRole('option', { name: 'Vodka', exact: true }).click()
  await page.getByRole('button', { name: 'Adicionar ingrediente' }).click()
  await page.getByRole('combobox', { name: 'Ingrediente 2', exact: true }).fill('Morango')
  await page.getByRole('option', { name: 'Morango', exact: true }).click()
  await page.getByLabel('Dose em unidades da linha 2').fill('3')
  await expect(page.getByText('Resumo da receita', { exact: true }).locator('..')).toContainText('5,50')
  await expect(page.getByText('Resumo da receita', { exact: true }).locator('..')).toContainText('10 copo(s)')
  await page.screenshot({ path: 'test-results/catalog-recipe.png', fullPage: true })
  await page.getByRole('button', { name: 'Salvar produto', exact: true }).click()
  await expect(page.getByRole('alert')).toContainText('Os dados do produto foram salvos')
  await page.getByRole('button', { name: 'Salvar produto', exact: true }).click()
  await expect(page).toHaveURL(/produtos/)
  expect(calls.filter(c => c.path === '/produtos' && c.method === 'POST')).toHaveLength(1)
  expect(calls.filter(c => c.path.endsWith('/receita') && c.method === 'PUT').at(-1).body.ingredientes).toEqual([
    { produtoId: vodka.id, quantidade: 50, unidadeConsumo: 'ML' }, { produtoId: strawberry.id, quantidade: 3, unidadeConsumo: 'UN' },
  ])
})

test('movimentação envia unidade-base e tipo exato sem inferir perda pelo motivo', async ({ page }) => {
  const calls = await setup(page)
  await page.goto('/#/movimentacoes?novo=1&produto=' + vodka.id)
  await expect(page).toHaveURL(/novamovimentacao/)
  await expect(page.getByRole('heading', { name: 'Nova movimentação', exact: true })).toBeVisible()
  await expect(page.getByText('Saldo atual', { exact: false })).toContainText('2.000 ml')
  await page.getByRole('spinbutton', { name: 'Quantidade', exact: true }).fill('50')
  await page.getByLabel('Justificativa').fill('Reposição após perda anterior')
  await page.getByRole('button', { name: 'Salvar movimentação' }).click()
  await expect.poll(() => calls.filter(c => c.path === '/movimentacoes-estoque' && c.method === 'POST').length).toBe(1)
  await expect(page).toHaveURL(/#\/movimentacoes$/)
  expect(calls.find(c => c.path === '/movimentacoes-estoque' && c.method === 'POST').body).toMatchObject({ produtoId: vodka.id, tipo: 'ENTRADA', quantidade: 50 })
})

test('categorias navegam pelo ID e consulta preserva paginação', async ({ page }) => {
  const calls = await setup(page)
  await page.goto('/#/categorias')
  const pageSize = page.getByRole('combobox', { name: 'Itens por página', exact: true })
  const filter = page.getByRole('region', { name: 'Filtros de categorias', exact: true })
  await expect(pageSize).toBeVisible()
  await expect(filter.getByRole('combobox', { name: 'Itens por página' })).toHaveCount(0)
  await pageSize.selectOption('50')
  await expect.poll(() => calls.filter(c => c.path === '/categorias').at(-1)?.query.tamanho).toBe('50')
  await page.getByRole('button', { name: 'Ver Produto', exact: true }).click()
  await expect(page).toHaveURL(/categoriaId=1/)
  await expect.poll(() => calls.filter(c => c.path === '/produtos').at(-1)?.query.categoriaId).toBe('1')
})

test('categorias tratam exclusão vinculada e permitem inativar e reativar sem alterar produtos', async ({ page }) => {
  await setup(page)
  let current = { ...category }
  const writes = []
  await page.route('http://localhost:8080/categorias**', async route => {
    const request = route.request(), url = new URL(request.url())
    if (request.method() === 'DELETE') {
      writes.push({ method: 'DELETE' })
      return route.fulfill({ status: 409, headers: feedbackHeaders, json: { message: 'Categoria não pode ser excluída porque possui produtos vinculados' } })
    }
    if (request.method() === 'PATCH') {
      const body = request.postDataJSON(); writes.push({ method: 'PATCH', body }); current = { ...current, ...body }
      return route.fulfill({ headers: feedbackHeaders, json: current })
    }
    return route.fulfill({ headers: feedbackHeaders, json: url.pathname === '/categorias' ? envelope([current]) : current })
  })
  await page.goto('/#/categorias')
  await expect(page.getByRole('table').getByRole('columnheader')).toHaveCount(3)
  await expect(page.getByRole('table')).toContainText('Ingredientes')
  await page.getByRole('button', { name: 'Gerenciar categoria Insumos', exact: true }).click()
  await page.getByRole('menuitem', { name: 'Excluir categoria', exact: true }).click()
  let dialog = page.getByRole('dialog')
  await dialog.getByRole('button', { name: 'Excluir categoria', exact: true }).click()
  await expect(dialog.getByRole('alert')).toContainText('possui produtos vinculados')
  await expect(dialog.getByRole('button', { name: 'Excluir categoria', exact: true })).toBeDisabled()
  await expect(dialog.getByRole('button', { name: 'Ver produtos vinculados', exact: true })).toBeVisible()
  await dialog.getByRole('button', { name: 'Inativar categoria', exact: true }).click()
  dialog = page.getByRole('dialog')
  await expect(dialog).toContainText('Os produtos continuam vinculados e mantêm seu próprio status')
  await dialog.getByRole('button', { name: 'Inativar categoria', exact: true }).click()
  await expect(page.getByRole('table')).toContainText('Inativa')
  await page.getByRole('button', { name: 'Gerenciar categoria Insumos', exact: true }).click()
  await page.getByRole('menuitem', { name: 'Reativar categoria', exact: true }).click()
  await page.getByRole('dialog').getByRole('button', { name: 'Reativar categoria', exact: true }).click()
  await expect(page.getByRole('table')).toContainText('Ativa')
  expect(writes).toEqual([{ method: 'DELETE' }, { method: 'PATCH', body: { ativo: false } }, { method: 'PATCH', body: { ativo: true } }])
  await page.screenshot({ path: 'test-results/categories-compact-desktop.png', fullPage: true })
  await page.setViewportSize({ width: 390, height: 844 })
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
  await page.reload()
  await expect(page.getByRole('table')).toContainText('Ingredientes')
  await page.screenshot({ path: 'test-results/categories-compact-mobile.png', fullPage: true, animations: 'disabled' })
})

test('categorias diferenciam ausência de cadastro e busca sem resultados', async ({ page }) => {
  await setup(page, { readOnly: true })
  await page.route('http://localhost:8080/categorias?*', route => route.fulfill({ headers: feedbackHeaders, json: envelope([]) }))
  await page.goto('/#/categorias')
  await expect(page.getByRole('table')).toContainText('Nenhuma categoria cadastrada')
  await expect(page.getByRole('button', { name: 'Criar primeira categoria', exact: true })).toHaveCount(0)
  await page.getByRole('searchbox', { name: 'Buscar categoria', exact: true }).fill('Não existe')
  await expect(page.getByRole('table')).toContainText('Nenhuma categoria encontrada nesta busca')
})

test('criação rápida de categoria preserva os dados do produto e seleciona o cadastro confirmado', async ({ page }) => {
  const calls = await setup(page)
  let created = null
  await page.route('http://localhost:8080/categorias**', async route => {
    const request = route.request(), url = new URL(request.url())
    if (request.method() === 'POST') { created = { id: 9, ...request.postDataJSON(), ativo: true }; return route.fulfill({ status: 201, headers: feedbackHeaders, json: created }) }
    return route.fulfill({ headers: feedbackHeaders, json: url.pathname === '/categorias/9' ? created : envelope([category, ...(created ? [created] : [])]) })
  })
  await page.goto('/#/novo')
  await page.getByRole('button', { name: /Produto padrão/ }).click()
  await page.getByLabel('Nome do produto').fill('Produto preservado')
  await page.getByRole('button', { name: 'Nova categoria', exact: true }).click()
  const dialog = page.getByRole('dialog')
  await dialog.getByPlaceholder('Ex.: Cervejas especiais').fill('Categoria rápida')
  await dialog.getByRole('button', { name: 'Criar categoria', exact: true }).click()
  await expect(dialog).toHaveCount(0)
  await expect(page.getByLabel('Nome do produto')).toHaveValue('Produto preservado')
  await expect(page.getByRole('combobox', { name: 'Categoria', exact: true })).toHaveValue('Categoria rápida')
  expect(created.nome).toBe('Categoria rápida')
  expect(calls.some(c => c.path === '/produtos' && c.method === 'POST')).toBe(false)
})

test('permissões e tela pequena não oferecem ações de gravação', async ({ page }) => {
  await setup(page, { readOnly: true })
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto('/#/produtos')
  await expect(page.getByRole('button', { name: 'Morango', exact: true })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Novo produto' })).toHaveCount(0)
  await expect(page.getByRole('button', { name: 'Editar Morango' })).toHaveCount(0)
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true)
  await page.screenshot({ path: 'test-results/catalog-mobile.png', fullPage: true })
})

test('etiquetas filtram lotes pelas faixas de cor no servidor e mantêm cinco por página e a seleção', async ({ page }) => {
  await setup(page)
  const queries = []
  await page.route('http://localhost:8080/lotes?*', route => {
    const query = Object.fromEntries(new URL(route.request().url()).searchParams); queries.push(query)
    return route.fulfill({ headers: feedbackHeaders, json: envelope([{ id: Number(query.pagina) + 41, produtoId: strawberry.id, codigo: 'L-' + query.pagina, validade: '2026-11-17', quantidadeAtual: 10, unidadeEstoque: 'UN' }], Number(query.pagina), 5, 11) })
  })
  await page.goto('/#/produtos')
  await page.getByRole('button', { name: 'Etiqueta', exact: true }).click()
  const dialog = page.getByRole('dialog')
  await dialog.getByRole('button', { name: 'Configurar etiqueta', exact: true }).click()
  await dialog.getByRole('combobox', { name: 'Identificação por cor', exact: true }).selectOption('validade')
  await dialog.getByRole('button', { name: 'Aplicar configurações', exact: true }).click()
  await dialog.getByRole('checkbox', { name: 'Selecionar Morango', exact: true }).check()
  await dialog.getByRole('checkbox', { name: 'Selecionar lote Morango / L-0', exact: true }).check()
  await dialog.getByRole('button', { name: 'Próximos lotes de Morango', exact: true }).click()
  await expect.poll(() => queries.at(-1)?.pagina).toBe('1')
  const range = dialog.getByRole('combobox', { name: 'Faixa de validade de Morango', exact: true })
  await range.selectOption('VENCE_EM_7_DIAS')
  await expect.poll(() => queries.at(-1)?.situacao).toBe('VENCE_EM_7_DIAS')
  expect(queries.at(-1).pagina).toBe('0')
  await expect(dialog.getByRole('checkbox', { name: 'Selecionar lote Morango / L-0', exact: true })).toBeChecked()
  expect(queries.every(query => query.tamanho === '5' && query.produtoId === strawberry.id)).toBe(true)
  for (const state of ['VENCIDO', 'VENCE_EM_30_DIAS', 'VALIDO', 'SEM_VALIDADE']) {
    await range.selectOption(state)
    await expect.poll(() => queries.at(-1)?.situacao).toBe(state)
  }
  await dialog.getByRole('button', { name: 'Limpar filtro', exact: true }).click()
  await expect(range).toHaveValue('')
  await expect.poll(() => queries.at(-1)?.situacao || '').toBe('')
})

test('aviso de etiquetas permanece recolhido ao abrir e ao retirar o mouse', async ({ page }) => {
  await setup(page)
  await page.goto('/#/produtos')
  await page.getByRole('button', { name: 'Etiqueta', exact: true }).click()
  const dialog = page.getByRole('dialog')
  const text = dialog.getByText('O catálogo atual não fornece código de barras.', { exact: false })
  await expect(text).toBeHidden()
  await dialog.getByRole('button', { name: 'Ajuda: Informações sobre as etiquetas', exact: true }).hover()
  await expect(text).toBeVisible()
  await dialog.getByRole('button', { name: 'Configurar etiqueta', exact: true }).hover()
  await expect(text).toBeHidden()
})

test('validade usa consulta remota sem hidratar catálogo local', async ({ page }) => {
  const calls = await setup(page)
  await page.goto('/#/validades')
  await expect(page.getByRole('table')).toContainText('VENCIDO-ML')
  const help = page.getByRole('button', { name: 'Sobre os indicadores de validade e lotes', exact: true })
  const tooltip = page.getByRole('tooltip')
  await expect(tooltip).toBeHidden()
  await help.hover()
  await expect(tooltip).toContainText('referência 15/11/2026 · 1 lote(s) sem validade')
  await expect(tooltip).toContainText('Nas saídas, o sistema usa primeiro os lotes de validade mais próxima')
  await page.mouse.move(0, 0)
  await expect(tooltip).toBeHidden()
  expect(calls.some(c => c.path === '/lotes/resumo')).toBe(true)
  expect(calls.find(c => c.path === '/lotes').query).toMatchObject({ venceEmDias: '30', incluirZerados: 'false', tamanho: '20' })
  expect(calls.some(c => c.path === '/produtos')).toBe(false)
  await expect(page.getByRole('button', { name: 'Carregar catálogo e continuar' })).toHaveCount(0)
  await page.screenshot({ path: 'test-results/expiry-remote.png', fullPage: true })
  await page.getByRole('radio', { name: 'Sem validade', exact: true }).click()
  await expect(page.getByRole('radio', { name: 'Sem validade', exact: true })).toHaveAttribute('aria-checked', 'true')
  await expect(page.getByRole('table')).toContainText('SEM-LOTE')
  await expect(page.getByRole('table')).not.toContainText('VENCIDO-ML')
  await page.getByRole('button', { name: 'Filtros de validade', exact: true }).click()
  await expect(page.getByRole('combobox', { name: 'Buscar produto', exact: true })).toBeVisible()
})

test('erro ao carregar receita bloqueia edição em vez de fabricar receita vazia', async ({ page }) => {
  const calls = await setup(page)
  await page.route('http://localhost:8080/produtos/' + drinkId, route => route.fulfill({ json: { ...strawberry, id: drinkId, nome: 'Drink', tipo: 'DRINK' } }))
  await page.route('http://localhost:8080/drinks/' + drinkId + '/receita', route => route.fulfill({ status: 500, json: { message: 'Receita temporariamente indisponível' } }))
  await page.goto('/#/editar?id=' + drinkId)
  await expect(page.getByRole('alert')).toContainText('Receita temporariamente indisponível')
  await expect(page.getByRole('button', { name: 'Tentar novamente' })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Salvar alterações' })).toHaveCount(0)
  expect(calls.some(c => c.method === 'POST')).toBe(false)
})

test('intervalo inválido não consulta o histórico', async ({ page }) => {
  const calls = await setup(page)
  await page.goto('/#/movimentacoes?dataInicial=2026-12-01&dataFinal=2026-01-01')
  await expect(page.getByRole('alert')).toContainText('A data inicial deve ser anterior')
  expect(calls.some(c => c.path === '/movimentacoes-estoque')).toBe(false)
})

test('edição direta permite inativar e não carrega catálogo completo', async ({ page }) => {
  const calls = await setup(page)
  let patch
  await page.route('http://localhost:8080/produtos/' + strawberry.id, async route => {
    if (route.request().method() === 'PATCH') {
      patch = route.request().postDataJSON()
      return route.fulfill({ json: { ...strawberry, ...patch } })
    }
    return route.fallback()
  })
  await page.goto('/#/editar?id=' + strawberry.id)
  await expect(page.getByLabel('Nome do produto')).toHaveValue('Morango')
  expect(calls.some(c => c.path === '/produtos')).toBe(false)
  await page.getByRole('combobox', { name: 'Situação cadastral' }).selectOption('false')
  await page.getByRole('button', { name: 'Salvar alterações', exact: true }).click()
  await expect(page).toHaveURL(/produtos/)
  expect(patch).toEqual({ ativo: false })
})

test('detalhe da saída mostra a receita histórica com unidades e totais', async ({ page }) => {
  await setup(page)
  await page.route('http://localhost:8080/movimentacoes-estoque?*', route => route.fulfill({ json: envelope([{
    id: 1, produtoNome: 'Morango', tipo: 'SAIDA_DRINK', quantidade: 6, unidadeEstoque: 'UN', saldoAnterior: 30, saldoPosterior: 24,
    ocorridoEm: '2026-11-13T10:00:00', origemDrinkId: drinkId,
    receitaAplicada: { drinkNome: 'Drink de morango', quantidadeDrinks: 2, ingredientes: [{ produtoNome: 'Morango', quantidadePorDrink: 3, quantidadeConsumida: 6, unidadeConsumo: 'UN' }] },
  }]) }))
  await page.goto('/#/movimentacoes')
  await page.getByRole('button', { name: 'Ver detalhes' }).click()
  await expect(page.getByRole('dialog')).toContainText('3 UN por drink · 6 UN consumidos')
})

test('nova movimentação abre em página própria e cancelar retorna aos filtros', async ({ page }) => {
  await setup(page)
  await page.goto('/#/movimentacoes?tipo=PERDA')
  await page.getByRole('button', { name: 'Nova movimentação', exact: true }).click()
  await expect(page).toHaveURL(/novamovimentacao/)
  await expect(page.getByRole('table')).toHaveCount(0)
  await page.getByRole('button', { name: 'Cancelar', exact: true }).click()
  await expect(page).toHaveURL(/movimentacoes.*tipo=PERDA/)
})

test('reposição aplica filtros no servidor e mostra falta na unidade correta', async ({ page }) => {
  const calls = await setup(page)
  let summaryCalls = 0
  const alerts = [
    { produtoId: strawberry.id, nome: 'Zerado', categoria: 'Insumos', status: 'ZERADO', quantidadeAtual: 0, estoqueMinimo: 10 },
    { produtoId: vodka.id, nome: 'Vodka', categoria: 'Bebidas', unidadeMedida: 'ml', status: 'CRITICO', quantidadeAtual: 300, estoqueMinimo: 1000 },
    { produtoId: 'extra', nome: 'Água', categoria: 'Bebidas', status: 'CRITICO', quantidadeAtual: 60, estoqueMinimo: 100 },
  ]
  await page.route('http://localhost:8080/dashboard/resumo?*', route => {
    summaryCalls++
    return route.fulfill({ headers: feedbackHeaders, json: { estoque: { totalProdutos: 200, criticos: 50, zerados: 20, produtosSemMinimoDefinido: 4, saudePercentual: 80, alertas: alerts } } })
  })
  await page.route('http://localhost:8080/dashboard/reposicao?*', route => {
    const query = new URL(route.request().url()).searchParams
    const items = alerts.filter(item => {
      const percentage = item.quantidadeAtual / item.estoqueMinimo * 100
      return (!query.get('situacao') || item.status === query.get('situacao')) && (query.get('faixa') !== '50' || percentage > 25 && percentage <= 50)
    })
    if (query.get('ordem') === 'name') items.sort((left, right) => left.nome.localeCompare(right.nome, 'pt-BR'))
    return route.fulfill({ headers: feedbackHeaders, json: { itens: items, totalItens: items.length } })
  })
  await page.goto('/#/reposicao')
  const table = page.getByRole('table')
  await expect(table.getByRole('columnheader', { name: 'Falta para o mínimo', exact: true })).toBeVisible()
  await expect(table.getByRole('row').filter({ hasText: 'Vodka' })).toContainText('700 ml')
  await expect(page.getByText('1–3 de 3', { exact: true })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Zerados', exact: true })).toBeVisible()
  await page.getByRole('button', { name: 'Zerados', exact: true }).click()
  await expect(table.getByRole('row')).toHaveCount(2)
  await expect(page.getByText('1–1 de 1', { exact: true })).toBeVisible()
  await page.getByRole('button', { name: 'Todos', exact: true }).click()
  await expect(page.getByText('1–3 de 3', { exact: true })).toBeVisible()
  await page.getByLabel('Mínimo disponível', { exact: true }).selectOption('50')
  await expect(table.getByRole('row')).toHaveCount(2)
  await expect(table).toContainText('Vodka')
  await page.getByLabel('Mínimo disponível', { exact: true }).selectOption('')
  await expect(page.getByText('1–3 de 3', { exact: true })).toBeVisible()
  await page.getByLabel('Ordenar por', { exact: true }).selectOption('name')
  await expect(table.locator('tbody tr').first()).toContainText('Água')
  await page.getByLabel('Ordenar por', { exact: true }).selectOption('percentage')
  await expect(table.locator('tbody tr').first()).toContainText('Zerado')
  await page.getByRole('button', { name: 'Como é calculado o mínimo disponível', exact: true }).hover()
  await expect(page.getByRole('tooltip')).toContainText('Saldo atual ÷ estoque mínimo × 100')
  expect(summaryCalls).toBe(1)
  await page.getByRole('button', { name: 'Limpar filtros', exact: true }).click()
  await expect(page.getByLabel('Ordenar por', { exact: true })).toHaveValue('priority')
  await expect(table.locator('tbody tr').first()).toContainText('Zerado')
  await expect(page.getByRole('region', { name: 'Indicadores de reposição' })).toContainText('50')
  expect(calls.filter(c => c.path === '/produtos')).toHaveLength(0)
  await page.screenshot({ path: 'test-results/restock-filters-desktop.png', fullPage: true, animations: 'disabled' })
})

test('reposição mostra indicadores do servidor e menu de ações', async ({ page }) => {
  await setup(page)
  await page.goto('/#/reposicao')
  await expect(page.getByRole('region', { name: 'Indicadores de reposição' })).toBeVisible()
  const critical = page.getByRole('article').filter({ hasText: 'Estoque crítico' })
  await expect(critical.locator('strong')).toHaveText('1')
  await page.getByRole('button', { name: 'Ações de Morango', exact: true }).click()
  await expect(page.getByRole('menuitem', { name: 'Registrar entrada', exact: true })).toBeVisible()
  await page.getByRole('menuitem', { name: 'Ver histórico', exact: true }).click()
  await expect(page).toHaveURL(/movimentacoes.*produtoId=/)
})

test('cores dos KPIs respeitam limites e filtros podem recolher', async ({ page }) => {
  await setup(page)
  let health = 24
  await page.route('http://localhost:8080/dashboard/resumo?*', route => route.fulfill({ json: { estoque: { zerados: 0, criticos: 2, produtosSemMinimoDefinido: 0, saudePercentual: health, alertas: [] } } }))
  await page.goto('/#/reposicao')
  const kpi = label => page.getByRole('article').filter({ hasText: label })
  await expect(kpi('Produtos zerados')).toHaveAttribute('data-tone', 'info')
  await expect(kpi('Estoque crítico')).toHaveAttribute('data-tone', 'bad')
  await expect(kpi('Sem mínimo definido')).toHaveAttribute('data-tone', 'warn')
  await expect(kpi('Saúde do estoque')).toHaveAttribute('data-tone', 'bad')
  for (const [value, tone] of [[25, 'warn'], [75, 'ok']]) {
    health = value
    await page.getByRole('button', { name: 'Atualizar alertas' }).click()
    await expect(kpi('Saúde do estoque')).toHaveAttribute('data-tone', tone)
  }
  const toggle = page.getByRole('button', { name: 'Filtros de reposição' })
  await toggle.click()
  await expect(page.getByRole('searchbox', { name: 'Buscar nome' })).toBeVisible()
  await expect(page.getByRole('combobox', { name: 'Buscar categoria', exact: true })).toBeHidden()
  await toggle.click()
  await expect(page.getByRole('searchbox', { name: 'Buscar nome' })).toBeVisible()
})

test('detalhe do catálogo organiza preço estoque e ações', async ({ page }) => {
  await setup(page)
  await page.goto('/#/produtos')
  await page.getByRole('button', { name: 'Morango', exact: true }).click()
  const panel = page.getByRole('dialog')
  await expect(panel.getByRole('heading', { name: 'Morango', exact: true })).toBeVisible()
  await expect(panel.getByRole('heading', { name: 'Estoque', exact: true })).toBeVisible()
  await expect(panel.getByText('Saldo físico', { exact: true })).toBeVisible()
  await expect(panel.getByRole('button', { name: 'Ver histórico completo' })).toBeVisible()
  await panel.getByRole('button', { name: 'Registrar entrada' }).click()
  await expect(page).toHaveURL(/novamovimentacao.*produto=/)
})

test('buscas e ações permanecem visíveis ao recolher filtros de produtos', async ({ page }) => {
  const calls = await setup(page)
  await page.goto('/#/produtos')
  const toggle = page.getByRole('button', { name: 'Filtro de produtos', exact: true })
  await toggle.click()
  await expect(page.getByRole('group', { name: 'Status', exact: true })).toBeHidden()
  await expect(page.getByRole('searchbox', { name: 'Buscar nome', exact: true })).toBeVisible()
  await page.getByRole('combobox', { name: 'Buscar categoria', exact: true }).fill('Insumos')
  await page.getByRole('option', { name: 'Insumos', exact: true }).click()
  await expect.poll(() => calls.filter(c => c.path === '/produtos').at(-1)?.query.categoriaId).toBe('1')
  await expect(page.getByRole('button', { name: 'Importar produtos', exact: true })).toHaveCount(0)
  const header = page.locator('[data-filter-header]').filter({ has: toggle })
  await expect(header.getByRole('button', { name: 'Exportar', exact: true })).toBeVisible()
  await expect(header.getByRole('button', { name: 'Etiqueta', exact: true })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Giro', exact: true })).toBeVisible()

  const pageSize = page.getByRole('combobox', { name: 'Itens por página', exact: true })
  await expect(page.getByRole('region', { name: 'Filtro de produtos', exact: true }).getByRole('combobox', { name: 'Itens por página', exact: true })).toHaveCount(0)
  await pageSize.selectOption('10')
  await expect.poll(() => calls.filter(c => c.path === '/produtos').at(-1)?.query.tamanho).toBe('10')

  await toggle.click()
  const type = page.getByRole('group', { name: 'Tipo', exact: true })
  const status = page.getByRole('group', { name: 'Status', exact: true })
  const search = await page.getByRole('searchbox', { name: 'Buscar nome', exact: true }).boundingBox()
  const typeBounds = await type.boundingBox()
  expect(search.y).toBeGreaterThan(typeBounds.y + typeBounds.height)

  await type.getByRole('button', { name: 'Drinks' }).click()
  await status.getByRole('button', { name: 'Inativos' }).click()
  await expect(type.getByRole('button', { name: 'Drinks' })).toHaveAttribute('aria-pressed', 'true')
  await expect(status.getByRole('button', { name: 'Inativos' })).toHaveAttribute('aria-pressed', 'true')
  await expect.poll(() => calls.filter(c => c.path === '/produtos').at(-1)?.query).toMatchObject({ tipo: 'DRINK', ativo: 'false' })

  await page.setViewportSize({ width: 390, height: 844 })
  const label = page.locator('label').filter({ has: pageSize })
  const footerLabel = await label.boundingBox()
  const footerSelect = await pageSize.boundingBox()
  expect(footerLabel.height).toBeLessThanOrEqual(footerSelect.height + 1)
  expect(footerSelect.width).toBeLessThan(80)
})

test('importação XML abre modal, valida arquivo e confirma descarte sem gravar', async ({ page }) => {
  const calls = await setup(page)
  await page.goto('/#/entradanf')
  await expect(page.getByRole('heading', { name: 'Importar produtos', exact: true })).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Arraste o XML da NF-e', exact: true })).toBeVisible()
  await page.getByLabel('Arquivo XML da NF-e').setInputFiles({ name: 'invalido.txt', mimeType: 'text/plain', buffer: Buffer.from('teste') })
  await expect(page.getByRole('alert')).toContainText('Envie o arquivo .xml')
  await page.getByRole('button', { name: 'Usar XML de exemplo', exact: true }).click()
  await expect(page.getByRole('button', { name: /Confirmar entrada/ })).toBeVisible()
  await page.getByRole('button', { name: 'Fechar', exact: true }).click()
  await expect(page.getByRole('heading', { name: 'Descartar a conferência?', exact: true })).toBeVisible()
  await page.getByRole('button', { name: 'Descartar e fechar', exact: true }).click()
  await expect(page.getByRole('dialog')).toHaveCount(0)
  expect(calls.some(c => c.method === 'POST')).toBe(false)
})

test('drink consulta receita no menu sem saldo próprio inventado', async ({ page }) => {
  await setup(page)
  await page.route('http://localhost:8080/produtos?*', route => route.fulfill({ json: envelope([{ ...strawberry, id: drinkId, nome: 'Caipirinha', tipo: 'DRINK' }]) }))
  await page.goto('/#/produtos')
  await page.route('http://localhost:8080/produtos/' + drinkId, route => route.fulfill({ headers: feedbackHeaders, json: { ...strawberry, id: drinkId, tipo: 'DRINK', nome: 'Caipirinha', unidadeMedida: 'copo' } }))
  await page.route('http://localhost:8080/drinks/' + drinkId + '/receita', route => route.fulfill({ headers: feedbackHeaders, json: [] }))
  await page.getByRole('button', { name: 'Por receita · consultar ingredientes de Caipirinha' }).click()
  await expect(page.getByRole('heading', { name: 'Receita por copo' })).toBeVisible()
  await page.getByRole('button', { name: 'Fechar', exact: true }).click()
  await expect(page.getByRole('button', { name: 'Consultar receita', exact: true })).toHaveCount(0)
  await page.getByRole('button', { name: 'Ações de Caipirinha', exact: true }).click()
  await expect(page.getByRole('menuitem', { name: 'Consultar receita', exact: true })).toBeVisible()
})

test('etiquetas selecionadas respeitam quantidades filtros e cor manual sem EAN no contrato', async ({ page }) => {
  await setup(page)
  await page.addInitScript(() => { window.__valhallaNoPrint = true })
  await page.route('http://localhost:8080/produtos?*', route => route.fulfill({ json: envelope([strawberry, { ...vodka, codigoBarras: '4006381333931' }]) }))
  await page.goto('/#/produtos')
  await page.getByRole('button', { name: 'Etiqueta', exact: true }).click()
  const modal = page.getByRole('dialog')
  await expect(modal.locator('td [aria-label="Sem quantidade definida"]')).toHaveCount(2)
  await expect(modal.getByRole('button', { name: 'Imprimir selecionados' })).toBeDisabled()
  await modal.getByRole('checkbox', { name: 'Selecionar Morango', exact: true }).check()
  await modal.getByRole('spinbutton', { name: 'Etiquetas a imprimir de Morango', exact: true }).fill('3')
  await modal.getByRole('button', { name: 'Ajuda: Informações sobre as etiquetas', exact: true }).hover()
  await expect(modal.getByText('O catálogo atual não fornece código de barras.', { exact: false })).toBeVisible()
  await modal.getByRole('combobox', { name: 'Quantidade', exact: true }).selectOption('sem')
  await expect(modal.getByRole('checkbox', { name: 'Selecionar Morango', exact: true })).toHaveCount(0)
  await expect(modal.getByText('Há produtos selecionados fora da página ou dos filtros atuais.', { exact: false })).toBeVisible()
  await modal.getByRole('combobox', { name: 'Quantidade', exact: true }).selectOption('')
  await modal.getByRole('button', { name: 'Configurar etiqueta', exact: true }).click()
  await modal.getByRole('combobox', { name: 'Identificação por cor', exact: true }).selectOption('manual')
  await modal.getByLabel('Cor da faixa', { exact: true }).fill('#dc2626')
  await modal.getByRole('button', { name: 'Aplicar configurações', exact: true }).click()
  await modal.getByRole('button', { name: 'Imprimir selecionados' }).click()
  await expect(page.locator('.print-root [data-produto]')).toHaveCount(3)
  await expect(page.locator('.print-root [data-produto="' + vodka.id + '"]')).toHaveCount(0)
  await expect(page.locator('.print-root svg[data-ean]')).toHaveCount(0)
  await expect(page.locator('.print-root [data-produto] > div:first-child').first()).toHaveCSS('background-color', 'rgb(220, 38, 38)')
  await page.emulateMedia({ media: 'print' })
  await page.screenshot({ path: 'test-results/labels-print-manual.png', fullPage: true })
})

test('etiqueta por validade usa lote escolhido e ajuda explica a métrica', async ({ page }) => {
  await setup(page)
  await page.addInitScript(({ id }) => {
    const date = new Date(); date.setDate(date.getDate() + 2)
    const expiry = date.getFullYear() + '-' + String(date.getMonth() + 1).padStart(2, '0') + '-' + String(date.getDate()).padStart(2, '0')
    localStorage.setItem('valhalla:store:v2', JSON.stringify({ products: [{ id, lotes: [{ id: 'lote-teste', lote: 'L-01', validade: expiry, qty: 10 }] }] }))
    window.__valhallaNoPrint = true
  }, { id: strawberry.id })
  await page.goto('/#/produtos')
  await page.getByRole('button', { name: 'Etiqueta', exact: true }).click()
  const modal = page.getByRole('dialog')
  await modal.getByRole('button', { name: 'Configurar etiqueta', exact: true }).click()
  await modal.getByRole('combobox', { name: 'Identificação por cor', exact: true }).selectOption('validade')
  await modal.getByRole('button', { name: 'Ajuda: Métrica de validade', exact: true }).hover()
  await expect(modal.getByRole('tooltip')).toContainText('entre 8 e 30 dias')
  await modal.getByRole('button', { name: 'Aplicar configurações', exact: true }).click()
  await modal.getByRole('checkbox', { name: 'Selecionar Morango', exact: true }).check()
  await modal.getByRole('checkbox', { name: 'Selecionar lote Morango / L-01', exact: true }).check()
  await modal.getByRole('button', { name: 'Prévia do lote Morango / L-01', exact: true }).click()
  await expect(modal.getByRole('complementary', { name: 'Prévia da etiqueta' })).toContainText('Vence em até 7 dias')
  await page.screenshot({ path: 'test-results/labels-expiry-desktop.png', fullPage: true })
  await modal.getByRole('button', { name: 'Imprimir selecionados' }).click()
  await expect(page.locator('.print-root')).toContainText('Lote: L-01')
  await expect(page.locator('.print-root')).toContainText('Vence em até 7 dias')
  await expect(page.locator('.print-root [data-produto] > div:first-child')).toHaveCSS('background-color', 'rgb(249, 115, 22)')
})

test('etiquetas sem data não inventam validade e configuração persiste por usuário', async ({ page }) => {
  await setup(page)
  await page.goto('/#/produtos')
  await page.getByRole('button', { name: 'Etiqueta', exact: true }).click()
  let modal = page.getByRole('dialog')
  await modal.getByRole('button', { name: 'Configurar etiqueta', exact: true }).click()
  await modal.getByRole('combobox', { name: 'Identificação por cor', exact: true }).selectOption('validade')
  await modal.getByRole('combobox', { name: 'Formato da folha', exact: true }).selectOption('grande')
  await modal.getByRole('button', { name: 'Aplicar configurações', exact: true }).click()
  await expect(modal.getByRole('region', { name: 'Prévia da configuração', exact: true })).toHaveCount(0)
  await modal.getByRole('button', { name: 'Prévia de Morango', exact: true }).click()
  await expect(modal.getByRole('complementary', { name: 'Prévia da etiqueta' })).toContainText('Validade não informada')
  await modal.getByRole('button', { name: 'Cancelar', exact: true }).click()
  await page.getByRole('button', { name: 'Etiqueta', exact: true }).click()
  modal = page.getByRole('dialog')
  await modal.getByRole('button', { name: 'Configurar etiqueta', exact: true }).click()
  await expect(modal.getByRole('combobox', { name: 'Identificação por cor', exact: true })).toHaveValue('validade')
  await expect(modal.getByRole('combobox', { name: 'Formato da folha', exact: true })).toHaveValue('grande')
  await modal.getByRole('button', { name: 'Cancelar configuração', exact: true }).click()
  await page.setViewportSize({ width: 390, height: 844 })
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true)
  const bounds = await modal.boundingBox()
  expect(bounds.x + bounds.width).toBeLessThanOrEqual(390)
  await page.screenshot({ path: 'test-results/labels-mobile.png', fullPage: true })
})

test('seleção em lote e quantidade inválida preservam SKU sem inventar código de barras', async ({ page }) => {
  await setup(page)
  await page.addInitScript(() => { window.__valhallaNoPrint = true })
  await page.route('http://localhost:8080/produtos?*', route => route.fulfill({ json: envelope([strawberry, { ...vodka, codigoBarras: '4006381333931' }]) }))
  await page.goto('/#/produtos')
  await page.getByRole('button', { name: 'Etiqueta', exact: true }).click()
  const modal = page.getByRole('dialog')
  await modal.getByRole('button', { name: 'Selecionar produtos exibidos', exact: true }).click()
  await modal.getByRole('combobox', { name: 'Quantidade', exact: true }).selectOption('com')
  await expect(modal.getByRole('spinbutton')).toHaveCount(2)
  await modal.getByRole('checkbox', { name: 'Selecionar Morango', exact: true }).click()
  await modal.getByRole('combobox', { name: 'Quantidade', exact: true }).selectOption('sem')
  await expect(modal.getByRole('checkbox', { name: 'Selecionar Morango', exact: true })).toBeVisible()
  await expect(modal.getByRole('checkbox', { name: 'Selecionar Vodka', exact: true })).toHaveCount(0)
  await modal.getByRole('combobox', { name: 'Quantidade', exact: true }).selectOption('')
  const copies = modal.getByRole('spinbutton', { name: 'Etiquetas a imprimir de Vodka', exact: true })
  await copies.fill('0')
  await expect(modal.getByRole('button', { name: 'Imprimir selecionados' })).toBeDisabled()
  await copies.fill('2')
  await modal.getByRole('button', { name: 'Imprimir selecionados' }).click()
  await expect(page.locator('.print-root [data-produto]')).toHaveCount(2)
  await expect(page.locator('.print-root svg[data-ean]')).toHaveCount(0)
  await expect(page.locator('.print-root')).toContainText('VOD')
  await page.emulateMedia({ media: 'print' })
  await page.screenshot({ path: 'test-results/labels-print-barcode.png', fullPage: true })
})

test('etiquetas paginam em 10 20 30 e prévia fica aberta durante configuração', async ({ page }) => {
  await setup(page)
  const items = Array.from({ length: 35 }, (_, i) => ({ ...strawberry, id: '11111111-1111-4111-8111-' + String(i + 1).padStart(12, '0'), nome: 'Produto ' + (i + 1) }))
  await page.route('http://localhost:8080/produtos?*', route => route.fulfill({ json: envelope(items, 0, 50, 35) }))
  await page.goto('/#/produtos?tamanho=50')
  await page.getByRole('button', { name: 'Etiqueta', exact: true }).click()
  const modal = page.getByRole('dialog')
  await expect(modal.getByRole('combobox', { name: 'Código de barras', exact: true })).toHaveCount(0)
  const size = modal.getByRole('combobox', { name: 'Itens por página', exact: true })
  await expect(size.locator('option')).toHaveText(['10', '20', '30'])
  await expect(modal.locator('tbody tr')).toHaveCount(10)
  await expect(modal.locator('#label-preview-content')).toBeHidden()
  await modal.getByRole('button', { name: 'Prévia de Produto 1', exact: true }).click()
  await expect(modal.locator('#label-preview-content')).toBeVisible()
  await modal.getByRole('button', { name: 'Prévia de Produto 1', exact: true }).click()
  await modal.getByRole('button', { name: 'Configurar etiqueta', exact: true }).click()
  await expect(modal.getByRole('region', { name: 'Prévia da configuração', exact: true })).toBeVisible()
  await expect(modal.locator('#label-preview-content')).toBeHidden()
  await modal.getByRole('button', { name: 'Cancelar configuração', exact: true }).click()
  await modal.getByRole('checkbox', { name: 'Selecionar Produto 1', exact: true }).check()
  await modal.getByRole('button', { name: 'Próxima página de etiquetas' }).click()
  await expect(modal.getByRole('checkbox', { name: 'Selecionar Produto 11', exact: true })).toBeVisible()
  await size.selectOption('20')
  await expect(modal.locator('tbody tr')).toHaveCount(20)
  await expect(modal.getByRole('checkbox', { name: 'Selecionar Produto 1', exact: true })).toBeChecked()
  await size.selectOption('30')
  await expect(modal.locator('tbody tr')).toHaveCount(30)
})

test('etiquetas imprimem múltiplos lotes por produto com validade e quantidade independentes', async ({ page }) => {
  const calls = await setup(page)
  await page.addInitScript(() => { window.__valhallaNoPrint = true })
  await page.goto('/#/produtos')
  await page.getByRole('button', { name: 'Etiqueta', exact: true }).click()
  const modal = page.getByRole('dialog')
  await modal.getByRole('button', { name: 'Configurar etiqueta', exact: true }).click()
  await modal.getByRole('combobox', { name: 'Identificação por cor', exact: true }).selectOption('validade')
  await expect(modal.getByRole('region', { name: 'Prévia da configuração', exact: true })).toBeVisible()
  expect(calls.filter(c => c.path === '/lotes')).toHaveLength(0)
  await modal.getByRole('button', { name: 'Aplicar configurações', exact: true }).click()
  await expect(modal.getByRole('region', { name: 'Prévia da configuração', exact: true })).toHaveCount(0)
  await modal.getByRole('checkbox', { name: 'Selecionar Morango', exact: true }).check()
  await expect(modal.getByRole('button', { name: 'Imprimir selecionados' })).toBeDisabled()
  await modal.getByRole('checkbox', { name: 'Selecionar lote Morango / L-01', exact: true }).check()
  await modal.getByRole('spinbutton', { name: 'Etiquetas do lote Morango / L-01', exact: true }).fill('5')
  await modal.getByRole('checkbox', { name: 'Selecionar lote Morango / SEM-LOTE', exact: true }).check()
  const copies = modal.getByRole('spinbutton', { name: 'Etiquetas do lote Morango / SEM-LOTE', exact: true })
  await copies.fill('')
  await expect(modal.getByRole('button', { name: 'Imprimir selecionados' })).toBeDisabled()
  await copies.fill('8')
  const eye = modal.getByRole('button', { name: 'Prévia do lote Morango / L-01', exact: true })
  await eye.click()
  await expect(eye).toHaveAttribute('aria-pressed', 'true')
  await expect(modal.getByRole('complementary')).toContainText('17/11/2026')
  await eye.click()
  await expect(eye).toHaveAttribute('aria-pressed', 'false')
  await expect(modal.getByRole('complementary')).toHaveCount(0)
  await modal.getByRole('button', { name: 'Prévia do lote Morango / SEM-LOTE', exact: true }).click()
  await expect(modal.getByRole('complementary')).toContainText('Validade não informada')
  await page.setViewportSize({ width: 390, height: 844 })
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
  await page.screenshot({ path: 'test-results/labels-multiple-lots-mobile.png', fullPage: true })
  await modal.getByRole('button', { name: 'Imprimir selecionados' }).click()
  await expect(page.locator('.print-root [data-produto]')).toHaveCount(13)
  await expect(page.locator('.print-root [data-produto]').filter({ hasText: 'Lote: L-01' })).toHaveCount(5)
  await expect(page.locator('.print-root [data-produto]').filter({ hasText: 'Lote: SEM-LOTE' })).toHaveCount(8)
  await expect(page.locator('.print-root [data-produto]').filter({ hasText: 'Lote: L-01' }).first()).toContainText('17/11/2026')
  await expect(page.locator('.print-root [data-produto]').filter({ hasText: 'Lote: SEM-LOTE' }).first()).not.toContainText('17/11/2026')
  expect(calls.filter(c => c.path === '/lotes').every(c => c.query.produtoId === strawberry.id && c.query.tamanho === '5' && c.query.incluirZerados === 'false')).toBe(true)
  expect(calls.some(c => c.method !== 'GET' && c.path !== '/auth/csrf')).toBe(false)
})

test('etiquetas mantêm seleção entre páginas de lotes e permitem remover sem carregar tudo', async ({ page }) => {
  await setup(page)
  let fail = true
  const queries = []
  await page.route('http://localhost:8080/lotes?*', async route => {
    const query = Object.fromEntries(new URL(route.request().url()).searchParams)
    queries.push(query)
    if (fail) { fail = false; return route.fulfill({ status: 500, json: { message: 'Falha simulada' } }) }
    const index = Number(query.pagina)
    await route.fulfill({ json: envelope([{ id: index + 100, produtoId: strawberry.id, codigo: 'P-' + index, validade: '2026-12-01', quantidadeAtual: 20, unidadeEstoque: 'UN' }], index, 10, 11) })
  })
  await page.goto('/#/produtos')
  await page.getByRole('button', { name: 'Etiqueta', exact: true }).click()
  const modal = page.getByRole('dialog')
  await modal.getByRole('button', { name: 'Configurar etiqueta', exact: true }).click()
  await modal.getByRole('combobox', { name: 'Identificação por cor', exact: true }).selectOption('validade')
  await modal.getByRole('button', { name: 'Aplicar configurações', exact: true }).click()
  await modal.getByRole('checkbox', { name: 'Selecionar Morango', exact: true }).check()
  await expect(modal.getByRole('alert')).toContainText('Não foi possível consultar os lotes')
  await modal.getByRole('button', { name: 'Tentar novamente', exact: true }).click()
  await modal.getByRole('checkbox', { name: 'Selecionar lote Morango / P-0', exact: true }).check()
  await modal.getByRole('button', { name: 'Próximos lotes de Morango', exact: true }).click()
  await modal.getByRole('checkbox', { name: 'Selecionar lote Morango / P-1', exact: true }).check()
  await expect(modal.getByRole('button', { name: 'Remover lote Morango / P-0', exact: true })).toBeVisible()
  await expect(modal.getByText('1 produto(s) selecionado(s) · 2 etiqueta(s)', { exact: false })).toBeVisible()
  await modal.getByRole('button', { name: 'Remover lote Morango / P-0', exact: true }).click()
  await modal.getByRole('button', { name: 'Lotes anteriores de Morango', exact: true }).click()
  await expect(modal.getByRole('checkbox', { name: 'Selecionar lote Morango / P-0', exact: true })).not.toBeChecked()
  expect(queries.map(q => q.pagina)).toEqual(['0', '0', '1', '0'])
})

test('margem acompanha preço e custo e avisa preço abaixo do custo', async ({ page }) => {
  await setup(page)
  await page.goto('/#/novo')
  await page.getByRole('button', { name: /Produto padrão/ }).click()
  const price = page.getByRole('textbox', { name: 'Preço de venda (R$)', exact: true })
  const cost = page.getByRole('textbox', { name: 'Preço de custo por unidade/embalagem (R$)', exact: true })
  await cost.fill('11111')
  await price.fill('1111')
  await expect(page.locator('#price-margin')).toContainText('-900,09%')
  await expect(page.locator('#price-margin')).toContainText('preço abaixo do custo!')
  await cost.fill('10')
  await price.fill('20')
  await expect(page.locator('#price-margin')).toContainText('50,00%')
  await cost.fill('20')
  await expect(page.locator('#price-margin')).toContainText('preço igual ao custo')
  await price.fill('')
  await expect(page.locator('#price-margin')).not.toContainText('NaN')
  await expect(page.locator('#price-margin')).not.toContainText('Infinity')
})

test('fardo inicia desativado valida unidades e persiste configuração na API', async ({ page }) => {
  const calls = await setup(page)
  await page.goto('/#/novo')
  await page.getByRole('button', { name: /Produto padrão/ }).click()
  const bundle = page.getByRole('combobox', { name: 'Venda por fardo', exact: true })
  await expect(bundle).toHaveValue('false')
  await expect(page.getByRole('spinbutton', { name: /Unidades por fardo/ })).toHaveCount(0)
  await expect(page.getByRole('combobox', { name: 'Venda por dose', exact: true })).toBeVisible()
  await page.getByLabel('Nome do produto').fill('Água em fardo')
  await page.getByRole('combobox', { name: 'Categoria', exact: true }).fill('Insumos')
  await page.getByRole('option', { name: 'Insumos', exact: true }).click()
  await page.getByRole('textbox', { name: 'Preço de venda (R$)', exact: true }).fill('10')
  await page.getByPlaceholder('Ex.: 24', { exact: true }).fill('12')
  await page.getByLabel('Data de validade', { exact: true }).fill('2027-03-31')
  await bundle.selectOption('true')
  await page.getByRole('spinbutton', { name: /Unidades por fardo/ }).fill('1')
  await page.getByRole('button', { name: 'Salvar produto', exact: true }).click()
  await expect(page.getByText('Informe um número inteiro de pelo menos 2 unidades.', { exact: true })).toBeVisible()
  expect(calls.some(c => c.path === '/produtos' && c.method === 'POST')).toBe(false)
  await page.getByRole('spinbutton', { name: /Unidades por fardo/ }).fill('12')
  await page.getByRole('button', { name: 'Salvar produto', exact: true }).click()
  await expect(page).toHaveURL(/#\/produtos$/)
  const body = calls.find(c => c.path === '/produtos' && c.method === 'POST').body
  expect(body.vendaFardo).toBeUndefined()
  expect(body.unidadesFardo).toBeUndefined()
  expect(body.fardo).toBe(true)
  expect(body.unidadesPorFardo).toBe(12)
  expect(body.unidadeMedida).toBe('un')
})

test('cadastro mostra exemplos moeda brasileira e voltar protege alterações', async ({ page }) => {
  await setup(page)
  await page.goto('/#/novo')
  await page.getByRole('button', { name: /Produto padrão/ }).click()
  await expect(page.getByRole('button', { name: 'Voltar', exact: true })).toBeVisible()
  const price = page.getByRole('textbox', { name: 'Preço de venda (R$)', exact: true })
  const cost = page.getByRole('textbox', { name: 'Preço de custo por unidade/embalagem (R$)', exact: true })
  await expect(cost).toHaveValue('')
  await expect(cost).toHaveAttribute('placeholder', 'Ex.: 12,50')
  await expect(page.getByPlaceholder('Ex.: 24')).toHaveValue('')
  await expect(page.getByPlaceholder('Ex.: 5', { exact: true })).toHaveValue('')
  await expect(price).toHaveAttribute('required', '')
  await price.fill('1.234,56')
  await cost.click()
  await expect(price).toHaveValue('1.234,56')
  await price.fill('')
  await cost.click()
  await expect(price).toHaveValue('')
  await page.getByRole('button', { name: 'Voltar', exact: true }).click()
  await expect(page.getByRole('heading', { name: 'Descartar alterações?' })).toBeVisible()
  await page.getByRole('button', { name: 'Descartar', exact: true }).click()
  await expect(page).toHaveURL(/#\/produtos$/)
})

test('permissões efetivas controlam o menu e o acesso direto', async ({ page }) => {
  const calls = await setup(page)
  await page.route('http://localhost:8080/usuario/me', route => route.fulfill({
    headers: feedbackHeaders,
    json: { id: 'delegated', name: 'Responsável', profileName: 'Administrador', permissoes: ['PERFIS_GERENCIAR'] },
  }))
  await page.route('http://localhost:8080/autorizacoes/perfis', route => route.fulfill({
    headers: feedbackHeaders, json: [{ id: 1, nome: 'Delegado', codigosFuncionalidades: [] }],
  }))
  await page.route('http://localhost:8080/autorizacoes/funcionalidades', route => route.fulfill({ headers: feedbackHeaders, json: [] }))
  await page.goto('/#/dashboard')
  await page.getByRole('link', { name: 'Controle de acesso', exact: true }).click()
  await expect(page.getByRole('heading', { name: 'Perfis de acesso', exact: true })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Novo perfil', exact: true })).toBeVisible()
  for (const route of [
    'produtos', 'categorias', 'novo', 'editar', 'movimentacoes', 'novamovimentacao', 'reposicao', 'validades', 'entradanf',
    'usuarios', 'novousuario', 'usuario', 'editarusuario', 'financeiro', 'relatorios',
    'caixa', 'pedidos', 'sessoescaixa', 'ajustescaixa', 'auditoria', 'notafiscal',
  ]) {
    await page.goto('/#/' + route)
    await expect(page.getByText(/não tem permissão para/)).toBeVisible()
  }
  expect(calls.some(call => call.path === '/usuario' || call.path === '/produtos')).toBe(false)
  await page.goto('/#/seguranca')
  await expect(page.getByRole('heading', { name: 'Últimos acessos', exact: true })).toBeVisible()
})

test('cadastro delegado usa perfis atribuíveis e confirma sem abrir lista bloqueada', async ({ page }) => {
  let payload
  await setup(page)
  await page.route('http://localhost:8080/usuario/me', route => route.fulfill({
    headers: feedbackHeaders,
    json: { id: 'creator', name: 'Cadastro', profileName: 'Cadastro', permissoes: ['USUARIOS_CRIAR'] },
  }))
  await page.route('http://localhost:8080/autorizacoes/perfis/atribuiveis', route => route.fulfill({
    headers: feedbackHeaders, json: [{ id: 1, nome: 'Delegado', codigosFuncionalidades: [] }],
  }))
  await page.route('http://localhost:8080/usuario', async route => {
    if (route.request().method() === 'OPTIONS') return route.fallback()
    expect(route.request().method()).toBe('POST')
    payload = route.request().postDataJSON()
    return route.fulfill({ headers: feedbackHeaders, status: 201, json: { id: 'new-user', nome: payload.name, email: payload.email } })
  })
  await page.goto('/#/novousuario')
  await page.getByLabel('Nome completo').fill('Novo Operador')
  await page.getByLabel('E-mail de acesso').fill('novo@valhalla.local')
  await page.getByPlaceholder('Mínimo 8 caracteres, letras e números').fill('Senha@2026')
  await page.getByLabel('Confirmar senha').fill('Senha@2026')
  await page.getByRole('combobox', { name: /^Perfil/ }).selectOption({ label: 'Delegado' })
  await page.getByRole('button', { name: 'Criar usuário', exact: true }).click()
  await expect(page.getByText('Usuário criado', { exact: true })).toBeVisible()
  await expect(page).toHaveURL(/#\/novousuario$/)
  expect(payload.nomePerfil).toBe('Delegado')
})

test('ajuste individual aparece somente para quem pode gerenciar permissões', async ({ page }) => {
  const target = { id: 'target', nome: 'Operador teste', nomePerfil: 'Caixa', idPerfil: 1, ativo: true }
  const actor = { id: 'actor', nome: 'Acessos', nomePerfil: 'Delegado', permissoes: ['USUARIOS_VISUALIZAR', 'PERMISSOES_GERENCIAR', 'VISUALIZAR_ESTOQUE'] }
  let overrides = []
  await setup(page)
  const respond = (route, json) => route.fulfill({ headers: feedbackHeaders, json })
  await page.route('http://localhost:8080/usuario/me', route => respond(route, actor))
  await page.route('http://localhost:8080/usuario', route => respond(route, [target]))
  await page.route('http://localhost:8080/usuario/target', route => respond(route, target))
  await page.route('http://localhost:8080/autorizacoes/funcionalidades', route => respond(route, [
    { codigo: 'VISUALIZAR_ESTOQUE', nome: 'Visualizar estoque' },
    { codigo: 'CAIXA_CONFIGURAR', nome: 'Configurar caixa' },
  ]))
  await page.route('http://localhost:8080/autorizacoes/usuarios/target/permissoes', route => respond(route, {
    sobrescritas: overrides, permissoesEfetivas: overrides.map(item => item.codigoFuncionalidade),
  }))
  await page.route('http://localhost:8080/autorizacoes/usuarios/target/sobrescritas-permissao', route => {
    if (route.request().method() === 'OPTIONS') return route.fallback()
    overrides = route.request().postDataJSON().sobrescritas
    return route.fulfill({ headers: feedbackHeaders, status: 204 })
  })
  await page.goto('/#/usuarios?detalhe=target')
  await page.getByRole('button', { name: 'Ajustar permissões', exact: true }).click()
  await expect(page.getByRole('radiogroup', { name: 'Configurar caixa' })).toHaveCount(0)
  await page.getByRole('radiogroup', { name: 'Visualizar estoque' }).getByLabel('Conceder').check()
  await page.getByRole('button', { name: 'Salvar ajustes', exact: true }).click()
  await page.getByRole('button', { name: 'Aplicar e encerrar sessão', exact: true }).click()
  await expect(page.getByText('Concedida individualmente', { exact: true }).first()).toBeVisible()
  expect(overrides).toEqual([{ codigoFuncionalidade: 'VISUALIZAR_ESTOQUE', efeito: 'GRANT' }])
})

test('perfil delegado edita apenas funcionalidades que pode conceder', async ({ page }) => {
  let codigos = []
  await setup(page)
  const respond = (route, json) => route.fulfill({ headers: feedbackHeaders, json })
  await page.route('http://localhost:8080/usuario/me', route => respond(route, {
    id: 'editor', nome: 'Editor de perfis', nomePerfil: 'Delegado', permissoes: ['PERFIS_GERENCIAR', 'VISUALIZAR_ESTOQUE'],
  }))
  await page.route('http://localhost:8080/autorizacoes/perfis', route => respond(route, [
    { id: 1, nome: 'Consulta', codigosFuncionalidades: codigos },
    { id: 2, nome: 'Gerente', codigosFuncionalidades: [] },
  ]))
  await page.route('http://localhost:8080/autorizacoes/funcionalidades', route => respond(route, [
    { codigo: 'VISUALIZAR_ESTOQUE', nome: 'Visualizar estoque' },
    { codigo: 'CAIXA_CONFIGURAR', nome: 'Configurar caixa' },
  ]))
  await page.route('http://localhost:8080/autorizacoes/perfis/1/funcionalidades/codigos', route => {
    if (route.request().method() === 'OPTIONS') return route.fallback()
    codigos = route.request().postDataJSON()
    return route.fulfill({ headers: feedbackHeaders, status: 204 })
  })
  await page.goto('/#/perfis')
  await page.getByRole('button', { name: 'Ações do perfil Gerente' }).click()
  await expect(page.getByRole('menuitem', { name: /Editar|Excluir/ })).toHaveCount(0)
  await page.keyboard.press('Escape')
  await page.getByRole('button', { name: 'Ações do perfil Consulta' }).click()
  await page.getByRole('menuitem', { name: 'Editar funcionalidades' }).click()
  const modal = page.getByRole('dialog', { name: 'Editar funcionalidades' })
  await expect(modal.getByText('Configurar caixa')).toHaveCount(0)
  await modal.getByRole('checkbox', { name: /Visualizar estoque/ }).check()
  await modal.getByRole('button', { name: 'Salvar permissões' }).click()
  await expect(page.getByText('Permissões atualizadas', { exact: true })).toBeVisible()
  expect(codigos).toEqual(['VISUALIZAR_ESTOQUE'])
})

test('caixa sem estoque consulta catálogo de venda e bloqueia itens esgotados', async ({ page }) => {
  const calls = await setup(page)
  await page.route('http://localhost:8080/usuario/me', route => route.fulfill({
    headers: feedbackHeaders,
    json: { id: 'cashier', nome: 'Caixa', nomePerfil: 'Caixa', permissoes: ['CAIXA_VISUALIZAR', 'CAIXA_OPERAR'] },
  }))
  await page.route('http://localhost:8080/caixa/**', route => {
    const path = new URL(route.request().url()).pathname
    const session = { id: 'open', caixaNome: 'Caixa principal', resumoAtual: {} }
    return route.fulfill({ headers: feedbackHeaders, json: path === '/caixa/sessoes/atual' ? session : envelope([]) })
  })
  await page.route('http://localhost:8080/produtos/venda**', route => route.fulfill({
    headers: feedbackHeaders,
    json: envelope([{ id: 'sold-out', nome: 'Cerveja', tipo: 'PADRAO', precoVenda: 9, estoqueEsgotado: true }]),
  }))
  await page.goto('/#/caixa')
  await expect(page.getByRole('button', { name: 'Cerveja · Estoque esgotado' })).toBeDisabled()
  await expect(page.getByRole('button', { name: 'Fechar caixa', exact: true })).toHaveCount(0)
  expect(calls.some(call => call.path === '/produtos')).toBe(false)
})

test('detalhes do usuário abrem na lateral sem ações do card antigo', async ({ page }) => {
  await setup(page)
  const u = { id: 'user-drawer', name: 'Mariana Costa', email: 'mariana@adega.com.br', phone: '11999998888', active: true, profileName: 'Caixa' }
  const headers = { 'Access-Control-Allow-Origin': 'http://127.0.0.1:5184', 'Access-Control-Allow-Credentials': 'true' }
  await page.route('http://localhost:8080/usuario/me', route => route.fulfill({ headers, json: { id: 'admin', name: 'Admin', profileName: 'Gerente' } }))
  await page.route('http://localhost:8080/usuario', route => route.fulfill({ headers, json: [u] }))
  await page.route('http://localhost:8080/usuario/user-drawer', route => route.fulfill({ headers, json: u }))
  await page.goto('/#/usuarios')
  await page.getByRole('button', { name: 'Ações de Mariana Costa', exact: true }).click()
  await page.getByRole('menuitem', { name: 'Ver detalhes', exact: true }).click()
  const drawer = page.getByRole('dialog', { name: 'Detalhes do usuário', exact: true })
  await expect(drawer.getByRole('heading', { name: 'Mariana Costa' })).toBeVisible()
  await expect(drawer.getByText('mariana@adega.com.br', { exact: true })).toBeVisible()
  await expect(drawer.getByText('Status do acesso')).toBeVisible()
  await expect(drawer.getByRole('button', { name: 'Editar', exact: true })).toHaveCount(0)
  await expect(drawer.getByRole('button', { name: 'Mudar perfil', exact: true })).toHaveCount(0)
  await expect(page).toHaveURL(/#\/usuarios$/)
  await drawer.getByRole('button', { name: 'Fechar', exact: true }).click()
  await expect(drawer).toHaveCount(0)
  await expect(page.getByRole('button', { name: 'Mariana Costa', exact: true })).toHaveCount(0)
  await expect(page.getByRole('link', { name: 'Mariana Costa', exact: true })).toHaveCount(0)
})

test('editar usuário usa pop-up salva na lista e links antigos redirecionam', async ({ page }) => {
  await setup(page)
  let u = { id: 'edit-user', name: 'Administrador Inicial', email: 'admin@adega.com.br', phone: '', active: true, profileName: 'Caixa' }
  const headers = { 'Access-Control-Allow-Origin': 'http://127.0.0.1:5184', 'Access-Control-Allow-Credentials': 'true' }
  await page.route('http://localhost:8080/usuario/me', route => route.fulfill({ headers, json: { id: 'admin', name: 'Admin', profileName: 'Gerente' } }))
  await page.route('http://localhost:8080/usuario', route => route.fulfill({ headers, json: [u] }))
  await page.route('http://localhost:8080/usuario/edit-user', route => {
    if (route.request().method() === 'PATCH') u = { ...u, ...route.request().postDataJSON() }
    return route.fulfill({ headers, json: u })
  })
  await page.goto('/#/usuarios')
  await page.getByRole('button', { name: 'Ações de Administrador Inicial', exact: true }).click()
  await page.getByRole('menuitem', { name: 'Editar dados', exact: true }).click()
  const modal = page.getByRole('dialog', { name: 'Editar usuário', exact: true })
  await expect(modal).toBeVisible()
  await expect(page).toHaveURL(/#\/usuarios$/)
  await modal.getByLabel('Nome completo').fill('Administrador Atualizado')
  await modal.getByRole('button', { name: 'Salvar alterações', exact: true }).click()
  await expect(modal).toHaveCount(0)
  await expect(page.getByText('Administrador Atualizado', { exact: true })).toBeVisible()
  await page.goto('/#/editarusuario?id=edit-user')
  await expect(modal).toBeVisible()
  await expect(page).toHaveURL(/#\/usuarios\?editar=edit-user$/)
  await modal.getByRole('button', { name: 'Cancelar', exact: true }).click()
  await expect(modal).toHaveCount(0)
})

test('perfis filtram intervalos de funcionalidades e usuários e limpam consulta', async ({ page }) => {
  await setup(page)
  const headers = { 'Access-Control-Allow-Origin': 'http://127.0.0.1:5184', 'Access-Control-Allow-Credentials': 'true' }
  await page.route('http://localhost:8080/autorizacoes/perfis', route => route.fulfill({ headers, json: [{ id: 'p1', nome: 'Caixa', descricao: '', codigosFuncionalidades: ['A'] }, { id: 'p2', nome: 'Gerente', descricao: '', codigosFuncionalidades: ['A', 'B', 'C'] }] }))
  await page.route('http://localhost:8080/usuario', route => route.fulfill({ headers, json: [{ id: 'u1', name: 'Teste', email: 'teste@adega.com', profileId: 'p1', active: true }] }))
  await page.goto('/#/perfis')
  const func = page.getByRole('group', { name: 'Quantidade de funcionalidades', exact: true })
  const users = page.getByRole('group', { name: 'Quantidade de usuários', exact: true })
  await expect(page.locator('tbody tr')).toHaveCount(2)
  await func.getByLabel('No mínimo', { exact: true }).fill('2')
  await expect(page.locator('tbody')).toContainText('Gerente')
  await expect(page.locator('tbody')).not.toContainText('Caixa')
  await page.getByRole('button', { name: 'Limpar filtros', exact: true }).click()
  await expect(users.getByLabel('No mínimo', { exact: true })).toBeEnabled()
  await users.getByLabel('No mínimo', { exact: true }).fill('0')
  await users.getByLabel('No máximo', { exact: true }).fill('0')
  await expect(page.locator('tbody')).toContainText('Gerente')
  await expect(page.locator('tbody')).not.toContainText('Caixa')
  await users.getByLabel('No mínimo', { exact: true }).fill('2')
  await expect(page.getByRole('alert')).toContainText('O mínimo deve ser menor')
  await page.getByRole('button', { name: 'Limpar filtros', exact: true }).click()
  await expect(page.locator('tbody tr')).toHaveCount(2)
})

test('detalhe de perfil abre na lateral sem editar e substitui rota antiga', async ({ page }) => {
  await setup(page)
  const headers = { 'Access-Control-Allow-Origin': 'http://127.0.0.1:5184', 'Access-Control-Allow-Credentials': 'true' }
  const p = { id: 'p-drawer', nome: 'Operação de estoque', descricao: 'Controle do estoque da loja', codigosFuncionalidades: ['VISUALIZAR_ESTOQUE'] }
  await page.route('http://localhost:8080/autorizacoes/perfis', route => route.fulfill({ headers, json: [p] }))
  await page.route('http://localhost:8080/autorizacoes/perfis/p-drawer', route => route.fulfill({ headers, json: p }))
  await page.route('http://localhost:8080/autorizacoes/funcionalidades', route => route.fulfill({ headers, json: [{ codigo: 'VISUALIZAR_ESTOQUE', nome: 'Consultar estoque', descricao: 'Consulta de saldos', modulo: 'ESTOQUE' }] }))
  await page.route('http://localhost:8080/usuario', route => route.fulfill({ headers, json: [{ id: 'u1', name: 'Mariana', email: 'mariana@adega.com.br', profileId: p.id, active: true }] }))
  await page.goto('/#/perfis')
  await page.getByRole('button', { name: 'Ações do perfil Operação de estoque', exact: true }).click()
  await page.getByRole('menuitem', { name: 'Ver detalhes', exact: true }).click()
  const drawer = page.getByRole('dialog', { name: 'Detalhes do perfil', exact: true })
  await expect(drawer.getByRole('heading', { name: p.nome, exact: true })).toBeVisible()
  await expect(drawer.getByText('Consultar estoque', { exact: true })).toBeVisible()
  await expect(drawer.getByText('Mariana', { exact: true })).toBeVisible()
  await expect(drawer.getByRole('button', { name: /Editar/ })).toHaveCount(0)
  await expect(page).toHaveURL(/#\/perfis$/)
  await drawer.getByRole('button', { name: 'Fechar', exact: true }).click()
  await expect(drawer).toHaveCount(0)
  await page.goto('/#/perfil?id=p-drawer')
  await expect(drawer).toBeVisible()
  await expect(page).toHaveURL(/#\/perfis\?detalhe=p-drawer$/)
})

test('configurações ficam no menu lateral e conta contém apenas aparência', async ({ page }) => {
  await setup(page)
  await page.goto('/#/produtos')
  const nav = page.getByRole('navigation', { name: 'Menu principal', exact: true })
  await nav.getByRole('link', { name: 'Configurações gerais', exact: true }).click()
  await expect(page.getByRole('heading', { name: 'Configurações gerais', exact: true })).toBeVisible()
  const sections = page.getByRole('navigation', { name: 'Seções de configurações', exact: true })
  await expect(sections.getByRole('link')).toHaveText(['Geral', 'Segurança'])
  const theme=page.getByRole('radiogroup',{name:'Tema do painel',exact:true})
  await theme.getByRole('radio',{name:'Claro',exact:true}).check()
  await expect(page.locator('html')).toHaveAttribute('data-theme','light')
  await expect(theme.locator('input:checked')).toHaveCount(1)
  await theme.getByRole('radio',{name:'Claro',exact:true}).focus()
  await theme.getByRole('radio',{name:'Claro',exact:true}).press('ArrowLeft')
  await expect(theme.getByRole('radio',{name:'Escuro',exact:true})).toBeChecked()
  await expect(page.locator('html')).not.toHaveAttribute('data-theme','light')
  await page.screenshot({path:'test-results/settings-theme-desktop.png',fullPage:true,animations:'disabled'})
  await expect(page.getByRole('button', { name: 'Voltar', exact: true })).toHaveCount(0)
  await sections.getByRole('link', { name: 'Segurança', exact: true }).click()
  await expect(page.getByRole('heading', { name: 'Alterar senha', exact: true })).toBeVisible()
  await expect(page.getByRole('heading',{name:'Sessões ativas',exact:true})).toHaveCount(0)
  await expect(page.getByRole('button',{name:'Baixar relatório de acessos',exact:true})).toHaveCount(0)
  await page.goto('/#/notificacoes')
  await expect(page).toHaveURL(/#\/geral$/)
  await expect(sections.getByRole('link', { name: 'Notificações', exact: true })).toHaveCount(0)
  await page.getByRole('button', { name: 'Teste — aparência', exact: true }).click()
  const appearance = page.getByRole('region', { name: 'Opções de Aparência', exact: true })
  await expect(appearance).toBeVisible()
  await expect(appearance.getByRole('link')).toHaveCount(0)
  await expect(appearance.getByRole('radio').first()).toBeVisible()
  await page.keyboard.press('Escape')
  await page.goto('/#/seguranca')
  await expect(page).toHaveURL(/#\/geral\?aba=seguranca$/)
  await expect(page.getByRole('heading', { name: 'Alterar senha', exact: true })).toBeVisible()
})

test('configurações preservam acesso restrito e exibem o tema sem corte no celular', async ({ page }) => {
  await setup(page, { readOnly: true })
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto('/#/geral')
  const sections = page.getByRole('navigation', { name: 'Seções de configurações', exact: true })
  await expect(sections.getByRole('link', { name: 'Segurança', exact: true })).toBeVisible()
  await expect(sections.getByRole('link', { name: 'Geral', exact: true })).toBeVisible()
  const appearance = page.getByRole('article').filter({ has: page.getByRole('heading', { name: 'Aparência', exact: true }) })
  const theme = appearance.getByRole('radiogroup', { name: 'Tema do painel' })
  await expect(theme.getByRole('radio')).toHaveCount(2)
  await expect(theme).toBeVisible()
  expect(await appearance.evaluate(card => card.scrollWidth <= card.clientWidth)).toBe(true)
  await expect(page.getByRole('heading', { name: 'Regras do caixa', exact: true })).toHaveCount(0)
})

test('catálogo destaca saldo zerado e explica as cores na ajuda', async ({ page }) => {
  await setup(page)
  const rows = [
    { ...strawberry, quantidadeEstoque: 0 },
    vodka,
    { ...strawberry, id: 'unreported', nome: 'Produto sem saldo informado', quantidadeEstoque: null },
    { ...strawberry, id: drinkId, nome: 'Gin tônica', tipo: 'DRINK', quantidadeEstoque: null },
  ]
  await page.route('http://localhost:8080/produtos?*', route => route.fulfill({ headers: feedbackHeaders, json: envelope(rows) }))
  await page.goto('/#/produtos')
  const row = name => page.getByRole('row').filter({ has: page.getByRole('button', { name, exact: true }) })
  await expect(row('Morango')).toHaveClass(/zeroRow/)
  await expect(row('Morango').getByText('Zerado', { exact: true })).toBeVisible()
  await expect(row('Vodka')).not.toHaveClass(/zeroRow/)
  await expect(row('Produto sem saldo informado')).not.toHaveClass(/zeroRow/)
  await expect(row('Produto sem saldo informado').getByText('Zerado', { exact: true })).toHaveCount(0)
  await expect(row('Gin tônica')).toHaveClass(/drinkRow/)
  const help = page.getByRole('button', { name: 'Sobre os tipos e indicadores de produtos e drinks' })
  await help.focus()
  await expect(page.getByRole('tooltip')).toContainText('Zerado · linha vermelha')
  await expect(page.getByRole('tooltip')).toContainText('Clique em Por receita ou Na receita')
})

test('ajuda financeira acompanha a seção aberta', async ({ page }) => {
  await setup(page)
  const help = page.getByRole('button', { name: 'Sobre os indicadores financeiros', exact: true })
  await page.goto('/#/financeiro')
  await help.focus()
  await expect(page.getByRole('tooltip')).toContainText('Cobertura das contas a pagar em 30 dias')
  await page.getByRole('link', { name: 'Resultado e vendas', exact: true }).press('Enter')
  await help.focus()
  await expect(page.getByRole('tooltip')).toContainText('O lucro líquido também desconta as despesas do período')
  await expect(page.getByRole('tooltip')).not.toContainText('Cobertura das contas a pagar')
})

test('catálogo alterna margem e giro com cores e consulta histórico só quando solicitado', async ({ page }) => {
  const calls = await setup(page)
  let histories = 0
  await page.route('http://localhost:8080/movimentacoes-estoque?*', route => {
    histories++
    const url = new URL(route.request().url()), produtoId = url.searchParams.get('produtoId')
    const isStrawberry = produtoId === strawberry.id
    return route.fulfill({ headers: { 'Access-Control-Allow-Origin': 'http://127.0.0.1:5184', 'Access-Control-Allow-Credentials': 'true' }, json: envelope([{ id: 1, produtoId, tipo: 'SAIDA', quantidade: isStrawberry ? 60 : 100, unidadeEstoque: isStrawberry ? 'UN' : 'ML', ocorridoEm: url.searchParams.get('dataFinal') + 'T12:00:00' }]) })
  })
  await page.goto('/#/produtos')
  await expect(page.getByRole('columnheader', { name: 'Margem bruta', exact: true })).toHaveCount(0)
  await expect(page.getByRole('columnheader', { name: 'Giro (30 dias)', exact: true })).toHaveCount(0)
  expect(histories).toBe(0)
  await page.getByRole('button', { name: 'Margem', exact: true }).click()
  const row = page.locator('tbody tr').filter({ has: page.getByRole('button', { name: 'Morango', exact: true }) })
  await expect(row).toContainText('50%')
  await expect(row.locator('[data-tone="green"]')).toContainText('Alta')
  expect(histories).toBe(0)
  await page.getByRole('button', { name: 'Giro', exact: true }).focus()
  await expect(page.getByRole('tooltip')).toContainText('Exclui entradas, perdas e ajustes')
  await page.getByRole('button', { name: 'Giro', exact: true }).click()
  await expect(row).toContainText('60 un')
  await expect(row).toContainText('15 dias')
  await expect(row.locator('[data-tone="yellow"]').last()).toContainText('Acompanhar')
  expect(histories).toBe(2)
  await page.getByRole('button', { name: 'Filtro de produtos', exact: true }).click()
  await expect(page.getByRole('button', { name: 'Giro', exact: true })).toBeVisible()
  await page.getByRole('button', { name: 'Giro', exact: true }).click()
  await expect(page.getByRole('columnheader', { name: 'Giro (30 dias)', exact: true })).toHaveCount(0)
  expect(calls.some(c => c.path.includes('/receita'))).toBe(false)
})

test('perda de validade envia lote e saldo exatos e atualiza resumo', async ({ page }) => {
  const calls = await setup(page)
  await page.goto('/#/validades')
  await page.getByRole('button', { name: 'Registrar perda', exact: true }).click()
  const modal = page.getByRole('dialog')
  await expect(modal).toContainText('VENCIDO-ML')
  await modal.getByRole('button', { name: 'Registrar perda', exact: true }).click()
  await expect(modal).toHaveCount(0)
  const request = calls.find(c => c.path === '/movimentacoes-estoque' && c.method === 'POST')
  expect(request.body).toMatchObject({ produtoId: vodka.id, tipo: 'PERDA', loteId: 43, quantidade: 100 })
  await expect.poll(() => calls.filter(c => c.path === '/lotes/resumo').length).toBeGreaterThan(1)
  expect(calls.some(c => c.path === '/produtos')).toBe(false)
})

test('perda sem resposta bloqueia repetição e não gera estorno automático', async ({ page }) => {
  await setup(page)
  let sends = 0
  await page.route('http://localhost:8080/movimentacoes-estoque', route => { sends++; return route.abort('failed') })
  await page.goto('/#/validades')
  await page.getByRole('button', { name: 'Registrar perda', exact: true }).click()
  const modal = page.getByRole('dialog')
  await modal.getByRole('button', { name: 'Registrar perda', exact: true }).click()
  await expect(modal.getByText('A resposta não foi confirmada.', { exact: false })).toBeVisible()
  await expect(modal.getByRole('button', { name: 'Registrar perda', exact: true })).toBeDisabled()
  expect(sends).toBe(1)
})

test('entrada envia validade e consumo por lote mantém o identificador escolhido', async ({ page }) => {
  const calls = await setup(page)
  await page.goto('/#/novamovimentacao?produto=' + strawberry.id)
  await page.getByRole('spinbutton', { name: 'Quantidade', exact: true }).fill('8')
  await page.getByLabel('Lote (referência)', { exact: true }).fill('NOVO-LOTE')
  await page.getByLabel('Validade do lote', { exact: true }).fill('2027-03-31')
  await page.getByRole('button', { name: 'Salvar movimentação', exact: true }).click()
  await expect(page).toHaveURL(/#\/movimentacoes$/)
  expect(calls.find(c => c.path === '/movimentacoes-estoque' && c.method === 'POST').body).toMatchObject({ tipo: 'ENTRADA', quantidade: 8, lote: 'NOVO-LOTE', validade: '2027-03-31' })
  await page.goto('/#/novamovimentacao')
  await page.getByLabel('Operação', { exact: true }).selectOption('SAIDA')
  await page.getByRole('combobox', { name: 'Produto da movimentação', exact: true }).fill('Morango')
  await page.getByRole('option', { name: 'Morango', exact: true }).click()
  await page.getByLabel('Lote de origem', { exact: true }).selectOption('41')
  await page.getByRole('spinbutton', { name: 'Quantidade', exact: true }).fill('2')
  await page.getByRole('button', { name: 'Salvar movimentação', exact: true }).click()
  await expect(page).toHaveURL(/#\/movimentacoes$/)
  expect(calls.filter(c => c.path === '/movimentacoes-estoque' && c.method === 'POST').at(-1).body).toMatchObject({ tipo: 'SAIDA', loteId: 41, quantidade: 2 })
})

test('reposição exibe saldo e mínimo usando unidade-base correta do fracionado', async ({ page }) => {
  await setup(page)
  await page.route('http://localhost:8080/dashboard/resumo?*', route => route.fulfill({ json: { estoque: { zerados: 0, criticos: 1, produtosSemMinimoDefinido: 0, saudePercentual: 80, alertas: [{ produtoId: vodka.id, nome: 'Vodka', categoria: 'Insumos', unidadeMedida: 'garrafa', quantidadeAtual: 200, estoqueMinimo: 500, status: 'CRITICO' }] } } }))
  await page.route('http://localhost:8080/dashboard/reposicao?*', route => route.fulfill({
    headers: feedbackHeaders,
    json: envelope([{ produtoId: vodka.id, nome: 'Vodka', categoria: 'Insumos', unidadeMedida: 'ml', quantidadeAtual: 200, estoqueMinimo: 500, status: 'CRITICO' }]),
  }))
  await page.goto('/#/reposicao')
  await expect(page.getByRole('table')).toContainText('200 ml')
  await expect(page.getByRole('table')).toContainText('500 ml')
  await expect(page.getByRole('table')).not.toContainText('200 garrafa')
  await expect(page.getByText(/Consulte até 5 alertas/)).toHaveCount(0)
})

test('baixa de vários lotes não reenvia os já concluídos após falha parcial', async ({ page }) => {
  await setup(page)
  const headers = { 'Access-Control-Allow-Origin': 'http://127.0.0.1:5184', 'Access-Control-Allow-Credentials': 'true' }
  const lots = [43, 44].map(id => ({ id, produtoId: vodka.id, produtoNome: 'Vodka', codigo: 'VENCIDO-' + id, unidadeEstoque: 'ML', validade: '2026-11-10', diasParaVencer: -5, situacao: 'VENCIDO', quantidadeAtual: 100, valorCusto: 5 }))
  await page.route('http://localhost:8080/lotes?*', route => route.fulfill({ headers, json: envelope(lots) }))
  const sent = []
  let failed = false
  await page.route('http://localhost:8080/movimentacoes-estoque', route => {
    const body = route.request().postDataJSON()
    sent.push(body.loteId)
    if (body.loteId === 44 && !failed) { failed = true; return route.fulfill({ headers, status: 400, json: { message: 'Confira a contagem deste lote.' } }) }
    return route.fulfill({ headers, status: 201, json: { id: sent.length, ...body } })
  })
  await page.goto('/#/validades')
  await page.getByRole('button', { name: 'Registrar perdas de 2 lotes desta página', exact: true }).click()
  const modal = page.getByRole('dialog')
  await modal.getByRole('button', { name: 'Registrar perda', exact: true }).click()
  await expect(modal.getByRole('alert')).toContainText('1 lote(s) já foram baixados')
  await expect(modal).not.toContainText('VENCIDO-43')
  await modal.getByRole('button', { name: 'Registrar perda', exact: true }).click()
  await expect(modal).toHaveCount(0)
  expect(sent).toEqual([43, 44, 44])
})

test('movimentação em fardos deixa a conversão do payload para o servidor', async ({ page }) => {
  const calls = await setup(page)
  await page.route('http://localhost:8080/produtos/' + strawberry.id, route => route.fulfill({ json: { ...strawberry, fardo: true, unidadesPorFardo: 12 } }))
  await page.goto('/#/novamovimentacao?produto=' + strawberry.id)
  await page.getByLabel('Quantidade informada em', { exact: true }).selectOption('true')
  await page.getByRole('spinbutton', { name: 'Quantidade', exact: true }).fill('2')
  await expect(page.getByText('Saldo previsto', { exact: false })).toContainText('54 un')
  await page.getByRole('button', { name: 'Salvar movimentação', exact: true }).click()
  await expect(page).toHaveURL(/#\/movimentacoes$/)
  expect(calls.find(c => c.path === '/movimentacoes-estoque' && c.method === 'POST').body).toMatchObject({ quantidade: 2, emFardo: true })
})

for (const fractional of [false, true]) {
  test('cadastro atômico com validade e saldo ' + (fractional ? 'em ml' : 'unitário'), async ({ page }) => {
    const calls = await setup(page)
    await page.goto('/#/novo')
    await page.getByRole('button', { name: /Produto padrão/ }).click()
    await expect(page.getByLabel('Código de barras (opcional)', { exact: true })).toHaveCount(0)
    await expect(page.getByLabel('Descrição (opcional)', { exact: true })).toHaveCount(0)
    await page.getByLabel('Nome do produto').fill('Produto com validade')
    await page.getByRole('combobox', { name: 'Categoria', exact: true }).fill('Insumos')
    await page.getByRole('option', { name: 'Insumos', exact: true }).click()
    await page.getByRole('textbox', { name: 'Preço de venda (R$)', exact: true }).fill('10')
    await page.getByPlaceholder('Ex.: 24', { exact: true }).fill(fractional ? '2' : '80')
    if (fractional) {
      await page.getByLabel('Venda por dose', { exact: true }).selectOption('true')
      await page.getByRole('spinbutton', { name: /Volume da embalagem/ }).fill('750')
    }
    await page.getByRole('button', { name: 'Salvar produto', exact: true }).click()
    await expect(page.getByRole('alert')).toContainText('Informe a data de validade do lote inicial.')
    expect(calls.filter(c => c.path === '/produtos' && c.method === 'POST')).toHaveLength(0)
    await page.getByLabel('Data de validade', { exact: true }).fill('2027-03-31')
    await page.getByRole('button', { name: 'Salvar produto', exact: true }).click()
    await expect(page).toHaveURL(/#\/produtos$/)
    const created = calls.filter(c => c.path === '/produtos' && c.method === 'POST')
    expect(created).toHaveLength(1)
    expect(created[0].body).toMatchObject({ quantidadeInicial: fractional ? 1500 : 80, validade: '2027-03-31', tipo: 'PADRAO' })
    expect(created[0].body).not.toHaveProperty('codigoBarras')
    expect(created[0].body).not.toHaveProperty('descricao')
    expect(calls.filter(c => c.path === '/movimentacoes-estoque' && c.method === 'POST')).toHaveLength(0)
  })
}

test('cadastro com validade permite lote inicial zerado e edição envia só campos suportados', async ({ page }) => {
  const calls = await setup(page)
  await page.goto('/#/novo')
  await page.getByRole('button', { name: /Produto padrão/ }).click()
  await page.getByLabel('Nome do produto').fill('Produto sem saldo inicial')
  await page.getByRole('combobox', { name: 'Categoria', exact: true }).fill('Insumos')
  await page.getByRole('option', { name: 'Insumos', exact: true }).click()
  await page.getByRole('textbox', { name: 'Preço de venda (R$)', exact: true }).fill('10')
  await page.getByLabel('Data de validade', { exact: true }).fill('2027-03-31')
  await page.getByRole('button', { name: 'Salvar produto', exact: true }).click()
  await expect(page).toHaveURL(/#\/produtos$/)
  expect(calls.find(c => c.path === '/produtos' && c.method === 'POST').body).toMatchObject({ quantidadeInicial: 0, validade: '2027-03-31' })
  expect(calls.filter(c => c.path === '/movimentacoes-estoque' && c.method === 'POST')).toHaveLength(0)
  await page.goto('/#/editar?id=' + strawberry.id)
  await expect(page.getByLabel('Código de barras (opcional)', { exact: true })).toHaveCount(0)
  await expect(page.getByLabel('Descrição (opcional)', { exact: true })).toHaveCount(0)
  await page.getByRole('textbox', { name: 'Preço de venda (R$)', exact: true }).fill('12,50')
  await page.getByRole('button', { name: 'Salvar alterações', exact: true }).click()
  await expect(page).toHaveURL(/#\/produtos$/)
  expect(calls.find(c => c.path === '/produtos/' + strawberry.id && c.method === 'PATCH').body).toEqual({ precoVenda: 12.5 })
})

 test('movimentações filtra operador no servidor e exporta a consulta em Excel', async ({ page }) => {
  const calls = await setup(page)
  let exportedQuery
  await page.route('http://localhost:8080/movimentacoes-estoque/exportar?*', route => { exportedQuery = Object.fromEntries(new URL(route.request().url()).searchParams); return route.fulfill({ headers: { 'access-control-allow-origin': 'http://127.0.0.1:5184', 'access-control-allow-credentials': 'true', 'content-type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }, body: 'excel-test' }) })
  await page.goto('/#/movimentacoes?tipo=PERDA')
  await page.getByLabel('Filtrar por operador').selectOption('user-test')
  await expect.poll(() => calls.some(c => c.path === '/movimentacoes-estoque' && c.query.usuarioId === 'user-test')).toBe(true)
  const downloadPromise = page.waitForEvent('download')
  await page.getByRole('button', { name: 'Exportar', exact: true }).click()
  const download = await downloadPromise
  expect(download.suggestedFilename()).toMatch(/^movimentacoes-.*\.xlsx$/)
  expect(exportedQuery).toMatchObject({ usuarioId: 'user-test', tipo: 'PERDA', ordenarPor: 'ocorridoEm', direcao: 'DESC' })
  expect(exportedQuery).not.toHaveProperty('pagina')
  expect(exportedQuery).not.toHaveProperty('tamanho')
})


test('falha na exportação mantém os filtros e permite tentar novamente', async ({ page }) => {
  await setup(page)
  await page.route('http://localhost:8080/movimentacoes-estoque/exportar?*', route => route.fulfill({ status: 403, headers: { 'Access-Control-Allow-Origin': 'http://127.0.0.1:5184', 'Access-Control-Allow-Credentials': 'true' }, json: { message: 'Exportação não autorizada' } }))
  await page.goto('/#/movimentacoes?tipo=PERDA')
  const button = page.getByRole('button', { name: 'Exportar', exact: true })
  await expect(button).toBeEnabled()
  await button.click()
  await expect(page.getByRole('alert')).toContainText('Exportação não autorizada')
  await expect(button).toBeEnabled()
  await expect(page.getByLabel('Filtrar por tipo')).toHaveValue('PERDA')
})

const feedbackHeaders = { 'Access-Control-Allow-Origin': 'http://127.0.0.1:5184', 'Access-Control-Allow-Credentials': 'true' }
test('erro de consulta não mostra dados antigos e permite recuperar com os mesmos filtros', async ({ page }) => {
  await setup(page)
  let failing = false
  await page.route('http://localhost:8080/produtos?*', route => route.fulfill({ headers: feedbackHeaders, status: failing ? 500 : 200, json: failing ? { message: 'Estoque temporariamente indisponível' } : envelope([strawberry]) }))
  await page.goto('/#/produtos')
  await expect(page.locator('tbody')).toContainText('Morango')
  failing = true
  await page.getByRole('button', { name: 'Atualizar', exact: true }).click()
  await expect(page.getByRole('alert')).toContainText('Estoque temporariamente indisponível')
  await expect(page.locator('tbody')).not.toContainText('Morango')
  failing = false
  await page.getByRole('button', { name: 'Tentar novamente', exact: true }).click()
  await expect(page.locator('tbody')).toContainText('Morango')
  await expect(page.getByRole('alert')).toHaveCount(0)
})
test('categoria mantém erro no modal e bloqueia fechamento durante envio', async ({ page }) => {
  await setup(page)
  let release
  const gate = new Promise(resolve => { release = resolve })
  await page.route('http://localhost:8080/categorias', async route => {
    if (route.request().method() !== 'POST') return route.fallback()
    await gate
    return route.fulfill({ status: 409, headers: feedbackHeaders, json: { message: 'Categoria já cadastrada' } })
  })
  await page.goto('/#/categorias')
  await page.getByRole('button', { name: 'Nova categoria', exact: true }).click()
  const dialog = page.getByRole('dialog')
  await dialog.getByPlaceholder('Ex.: Cervejas especiais').fill('Teste de categoria')
  await dialog.getByRole('button', { name: 'Criar categoria', exact: true }).click()
  await expect(dialog.getByRole('button', { name: 'Fechar', exact: true })).toBeDisabled()
  await expect(dialog.getByRole('button', { name: 'Cancelar', exact: true })).toBeDisabled()
  await page.keyboard.press('Escape')
  await expect(dialog).toBeVisible()
  release()
  await expect(dialog.getByRole('alert').first()).toContainText('Categoria já cadastrada')
  await expect(dialog.getByPlaceholder('Ex.: Cervejas especiais')).toHaveValue('Teste de categoria')
  await expect(dialog.getByRole('button', { name: 'Cancelar', exact: true })).toBeEnabled()
})
test('carregamento de produtos é identificado e não oferece ações sobre a página anterior', async ({ page }) => {
  await setup(page)
  let release
  const gate = new Promise(resolve => { release = resolve })
  await page.route('http://localhost:8080/produtos?*', async route => { await gate; return route.fulfill({ headers: feedbackHeaders, json: envelope([strawberry]) }) })
  await page.goto('/#/produtos')
  await expect(page.getByRole('status').filter({ hasText: 'Atualizando dados…' })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Etiqueta', exact: true })).toBeDisabled()
  release()
  await expect(page.locator('tbody')).toContainText('Morango')
})
test('exclusão de perfil mantém conflito visível no próprio diálogo', async ({ page }) => {
  await setup(page)
  await page.route('http://localhost:8080/autorizacoes/perfis', route => route.fulfill({ headers: feedbackHeaders, json: [{ id: 'p-delete', nome: 'Temporário', descricao: '', codigosFuncionalidades: [] }] }))
  await page.route('http://localhost:8080/autorizacoes/perfis/p-delete', route => route.fulfill({ status: 409, headers: feedbackHeaders, json: { message: 'O perfil recebeu um usuário vinculado' } }))
  await page.goto('/#/perfis')
  await page.getByRole('button', { name: 'Ações do perfil Temporário', exact: true }).click()
  await page.getByRole('menuitem', { name: 'Excluir perfil', exact: true }).click()
  const dialog = page.getByRole('dialog')
  await dialog.getByRole('textbox').fill('Temporário')
  await dialog.getByRole('button', { name: 'Excluir perfil', exact: true }).click()
  await expect(dialog.getByRole('alert')).toContainText('O perfil recebeu um usuário vinculado')
  await expect(dialog.getByRole('button', { name: 'Cancelar', exact: true })).toBeEnabled()
})

test('ação parcial de usuários retira os concluídos antes de tentar novamente', async ({ page }) => {
  await setup(page)
  const users = ['u1', 'u2'].map((id, i) => ({ id, name: 'Operador ' + (i + 1), email: id + '@adega.com', active: true }))
  const counts = { u1: 0, u2: 0 }
  await page.route('http://localhost:8080/usuario', route => route.fulfill({ headers: feedbackHeaders, json: users }))
  await page.route(/http:\/\/localhost:8080\/usuario\/u[12]$/, route => {
    const id = route.request().url().split('/').pop()
    counts[id]++
    return route.fulfill({ headers: feedbackHeaders, status: id === 'u2' && counts.u2 === 1 ? 409 : 200, json: id === 'u2' && counts.u2 === 1 ? { message: 'Conflito temporário' } : { ...users.find(u => u.id === id), active: false } })
  })
  await page.goto('/#/usuarios')
  const checks = page.getByRole('checkbox', { name: 'Selecionar linha', exact: true })
  await expect(checks).toHaveCount(2)
  await checks.nth(0).check()
  await checks.nth(1).check()
  await page.getByRole('button', { name: 'Inativar', exact: true }).click()
  const dialog = page.getByRole('dialog')
  await dialog.getByRole('button', { name: 'Inativar todos', exact: true }).click()
  await expect(dialog.getByRole('alert')).toContainText('Os concluídos foram retirados')
  await expect(dialog.getByRole('heading')).toContainText('1 usuário')
  await dialog.getByRole('button', { name: 'Inativar todos', exact: true }).click()
  await expect(dialog).toHaveCount(0)
  expect(counts).toEqual({ u1: 1, u2: 2 })
})
test('novo perfil separa operação e supervisão do caixa na lista de funcionalidades', async ({ page }) => {
  await setup(page)
  await page.route('http://localhost:8080/autorizacoes/perfis', route => route.fulfill({ headers: feedbackHeaders, json: [] }))
  await page.route('http://localhost:8080/autorizacoes/funcionalidades', route => route.fulfill({ headers: feedbackHeaders, json: [
    { codigo: 'CAIXA_OPERAR', nome: 'Operar caixa' },
    { codigo: 'CAIXA_ESTORNAR', nome: 'Estornar pagamento' },
    { codigo: 'CAIXA_CONFIGURAR', nome: 'Configurar caixa' },
    { codigo: 'VISUALIZAR_ESTOQUE', nome: 'Visualizar estoque' },
  ] }))
  await page.goto('/#/novoperfil')
  const operation = page.getByRole('group', { name: /Vendas e caixa/ })
  const supervision = page.getByRole('group', { name: /Supervisão do caixa/ })
  await operation.getByRole('checkbox', { name: /Selecionar todo o módulo/ }).check()
  await expect(supervision.getByRole('checkbox', { name: /Estornar pagamento/ })).not.toBeChecked()
  await supervision.getByRole('checkbox', { name: /Estornar pagamento/ }).check()
  await expect(page.getByText('2 de 4 selecionadas')).toBeVisible()
  await page.getByRole('searchbox', { name: 'Filtrar funcionalidades' }).fill('ESTORNAR')
  await expect(operation).toHaveCount(0)
  await expect(supervision.getByRole('checkbox', { name: /Estornar pagamento/ })).toBeChecked()
  await page.setViewportSize({ width: 390, height: 844 })
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
})

test('erro ao criar perfil preserva formulário e o padrão dos cards', async ({ page }) => {
  await setup(page)
  await page.route('http://localhost:8080/autorizacoes/perfis', route => route.fulfill({ headers: feedbackHeaders, status: route.request().method() === 'POST' ? 500 : 200, json: route.request().method() === 'POST' ? { message: 'Não foi possível gravar o perfil' } : [] }))
  await page.route('http://localhost:8080/autorizacoes/funcionalidades', route => route.fulfill({ headers: feedbackHeaders, json: [{ codigo: 'VISUALIZAR_ESTOQUE', nome: 'Consultar estoque' }] }))
  await page.goto('/#/novoperfil')
  await page.getByLabel('Nome do perfil').fill('Operação')
  await page.getByRole('button', { name: 'Criar perfil', exact: true }).click()
  await expect(page.getByRole('alert')).toContainText('Não foi possível gravar o perfil')
  await expect(page.getByLabel('Nome do perfil')).toHaveValue('Operação')
  await page.screenshot({ path: 'test-results/feedback-profile.png', fullPage: true })
})
test('cadastro de categoria sem resposta bloqueia repetição e orienta consultar lista', async ({ page }) => {
  await setup(page)
  let posts = 0
  await page.route('http://localhost:8080/categorias', route => {
    if (route.request().method() !== 'POST') return route.fallback()
    posts++
    return route.abort('failed')
  })
  await page.goto('/#/categorias')
  await page.getByRole('button', { name: 'Nova categoria', exact: true }).click()
  const dialog = page.getByRole('dialog')
  await dialog.getByPlaceholder('Ex.: Cervejas especiais').fill('Nova categoria incerta')
  await dialog.getByRole('button', { name: 'Criar categoria', exact: true }).click()
  await expect(dialog.getByText('Cadastro sem confirmação', { exact: true })).toBeVisible()
  await expect(dialog.getByRole('button', { name: 'Criar categoria', exact: true })).toBeDisabled()
  await expect(dialog.getByRole('button', { name: 'Cancelar', exact: true })).toBeEnabled()
  expect(posts).toBe(1)
})
test('vendas usa sessão e pedidos remotos sem baixa manual de estoque', async ({ page }) => {
 const calls=await setup(page)
 let session=null, order=null
 await page.route('http://localhost:8080/caixa/**', route=>{
 const u=new URL(route.request().url()), p=u.pathname, method=route.request().method(), body=method==='POST'||method==='PUT'?route.request().postDataJSON():null
 const ok=json=>route.fulfill({headers:feedbackHeaders,json})
 if(p==='/caixa/configuracao')return ok({dinheiroHabilitado:true,permitirPagamentoManual:true})
 if(p==='/caixa/caixas')return ok(envelope([{id:'box',nome:'Principal',ativo:true,emUso:false}]))
 if(p==='/caixa/caixas/box')return ok({id:'box',terminais:[]})
 if(p==='/caixa/sessoes/atual')return session?ok(session):route.fulfill({status:204,headers:feedbackHeaders})
 if(p==='/caixa/sessoes'&&method==='POST'){session={id:'session',caixaId:'box',caixaNome:'Principal',operadorNome:'Teste',resumoAtual:{totalVendas:0,dinheiroEsperado:100}};return ok(session)}
 if(p==='/caixa/sessoes/session')return ok(session)
 if(p==='/caixa/pedidos'&&method==='POST'){order={id:'order',numero:1,status:'EM_ATENDIMENTO',sessaoCaixaId:'session',total:0,totalPago:0,saldoRestante:0,itens:[],pagamentos:[]};return ok(order)}
 if(p==='/caixa/pedidos/order'&&method==='PUT'){order={...order,itens:body.itens.map((i,index)=>({...i,id:index+1,descricaoProduto:'Morango',subtotal:2})),total:2,saldoRestante:2};return ok(order)}
 if(p==='/caixa/pedidos/order/pagamentos'&&method==='POST'){expect(body.chaveIdempotencia).toBeTruthy();order={...order,totalPago:2,saldoRestante:0,status:'CONCLUIDO',pagamentos:[{id:'payment',forma:'DINHEIRO',status:'APROVADO',valor:2,chaveIdempotencia:body.chaveIdempotencia}]};return ok(order)}
 if(p==='/caixa/pedidos/order')return ok(order)
 return ok(envelope([]))
 })
 await page.goto('/#/caixa')
 await page.getByLabel('Caixa disponível').selectOption('box')
 await page.getByLabel('Fundo de troco',{exact:true}).fill('100')
 await page.getByRole('button',{name:'Abrir turno',exact:true}).click()
 let dialog
 await page.getByRole('button',{name:'Pedido 1, livre',exact:true}).click()
 await page.getByRole('button',{name:'Iniciar pedido',exact:true}).click()
 await page.getByRole('searchbox',{name:'Buscar produto ou SKU',exact:true}).fill('Morango')
 await page.getByRole('button',{name:'Adicionar Morango',exact:true}).click()
 await page.getByRole('button',{name:'Receber pagamento',exact:true}).click()
 dialog=page.getByRole('dialog')
 await dialog.getByLabel('Valor entregue em dinheiro').fill('2')
 await page.screenshot({path:'test-results/sales-payment-desktop.png',fullPage:true})
 await dialog.getByRole('button',{name:'Confirmar',exact:true}).click()
 await expect(page.getByText('Concluído', {exact:true})).toBeVisible()
 await expect(page.getByRole('button',{name:'Receber pagamento',exact:true})).toHaveCount(0)
 expect(calls.some(c=>c.path==='/movimentacoes-estoque'&&c.method==='POST')).toBe(false)
 await page.setViewportSize({width:390,height:844})
 await page.keyboard.press('Escape')
 await page.screenshot({path:'test-results/sales-mobile.png',fullPage:true})
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth)).toBe(true)
})
test('vendas mantém filtros recolhíveis e navegação visual dos ajustes', async ({ page }) => {
 await setup(page)
 await page.route('http://localhost:8080/caixa/**', route=>{
  const path=new URL(route.request().url()).pathname
  if(path==='/caixa/configuracao')return route.fulfill({headers:feedbackHeaders,json:{dinheiroHabilitado:true,pixHabilitado:true,creditoHabilitado:true,debitoHabilitado:true,limiteDescontoPercentual:10,limiteDescontoValor:50}})
  return route.fulfill({headers:feedbackHeaders,json:envelope([{id:'record',numero:123,identificadorAtendimento:'Mesa 04',canal:'MESA',total:150,saldoRestante:50,status:'PAGAMENTO_PARCIAL'}])})
 })
 await page.goto('/#/pedidos')
 await expect(page.getByRole('table').getByText('Pagamento parcial',{exact:true})).toBeVisible()
 await page.getByRole('button',{name:'Filtros de pedidos',exact:true}).click()
 await expect(page.getByLabel('Data inicial',{exact:true})).toHaveCount(0)
 await expect(page.getByRole('button',{name:'Limpar filtros',exact:true})).toBeVisible()
 await page.screenshot({path:'test-results/sales-orders-desktop.png',fullPage:true})
 await page.goto('/#/ajustescaixa')
 await expect(page.getByRole('link',{name:'Políticas e pagamentos',exact:true})).toHaveAttribute('aria-current','page')
 await expect(page.getByRole('heading',{name:'Ajustes do caixa',level:2,exact:true})).toHaveCount(0)
 await expect(page.getByText('Prepare as formas de recebimento, os equipamentos e as regras da operação.',{exact:true})).toHaveCount(0)
 await expect(page.getByRole('button',{name:'Atualizar',exact:true})).toHaveCount(0)
 await page.getByRole('link',{name:'Caixas e maquininhas',exact:true}).click()
 await expect(page.getByRole('link',{name:'Caixas e maquininhas',exact:true})).toHaveAttribute('aria-current','page')
 await page.getByRole('link',{name:'Taxas e repasse',exact:true}).click()
 await expect(page.getByRole('link',{name:'Taxas e repasse',exact:true})).toHaveAttribute('aria-current','page')
 await page.getByRole('link',{name:'Políticas e pagamentos',exact:true}).click()
 await page.setViewportSize({width:390,height:844})
 await page.keyboard.press('Escape')
 await expect(page.getByText('Habilitado',{exact:true}).first()).toBeVisible()
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth)).toBe(true)
 await page.screenshot({path:'test-results/sales-settings-mobile.png',fullPage:true})
})
test('caixa exibe abertura na página e sessões anteriores com detalhes reais', async ({ page }) => {
 await setup(page)
 const requests=[]
 const old={id:'old-session',caixaNome:'Caixa principal',operadorNome:'Operador anterior',status:'FECHADA',abertaEm:'2026-11-14T18:00:00',fechadaEm:'2026-11-15T01:00:00',fundoTroco:150,dinheiroEsperado:350,dinheiroContado:340,diferenca:-10}
 await page.route('http://localhost:8080/caixa/**', route=>{
  const request=route.request(),url=new URL(request.url())
  requests.push({path:url.pathname,query:Object.fromEntries(url.searchParams),body:request.method()==='POST'?request.postDataJSON():null})
  if(url.pathname==='/caixa/sessoes/atual')return route.fulfill({status:204,headers:feedbackHeaders})
  if(url.pathname==='/caixa/caixas')return route.fulfill({headers:feedbackHeaders,json:envelope([{id:'box',nome:'Caixa principal',emUso:false,ativo:true}])})
  if(url.pathname==='/caixa/sessoes/old-session')return route.fulfill({headers:feedbackHeaders,json:{...old,dinheiroEsperado:8123.45,resumoFechamento:{totalVendas:14325.67},justificativaDivergencia:'Diferença conferida pela gerência',movimentacoes:[]}})
  if(request.method()==='POST')return route.fulfill({status:409,headers:feedbackHeaders,json:{message:'Caixa ocupado por outro operador'}})
  return route.fulfill({headers:feedbackHeaders,json:envelope([old],0,5,6)})
 })
 await page.goto('/#/caixa')
 const title=page.getByRole('heading',{name:'Caixa',exact:true})
 await expect(title.locator('svg')).toHaveCount(1)
 await expect(page.getByRole('dialog')).toHaveCount(0)
 await expect(page.getByLabel('Operador',{exact:true})).toHaveCount(0)
 await expect(page.getByLabel('Caixa disponível')).toHaveValue('box')
 await page.getByLabel('Fundo de troco',{exact:true}).fill('150,50')
 await page.getByLabel('Observação',{exact:false}).fill('Turno da noite')
 await page.getByRole('button',{name:'Abrir turno',exact:true}).click()
 await expect(page.getByRole('alert')).toContainText('Caixa ocupado por outro operador')
 expect(requests.find(r=>r.body)?.body).toEqual({caixaId:'box',fundoTroco:150.5,observacao:'Turno da noite'})
 await expect(page.getByLabel('Fundo de troco',{exact:true})).toHaveValue('150,50')
 expect(requests.find(r=>r.path==='/caixa/sessoes'&&!r.body)?.query).toMatchObject({status:'FECHADA',tamanho:'5',pagina:'0'})
 await page.getByRole('button',{name:'Ver detalhes',exact:true}).click()
 await expect(page.getByRole('dialog')).toContainText('Diferença conferida pela gerência')
 await expect(page.getByRole('dialog')).toContainText('Operador anterior')
 await page.keyboard.press('Escape')
 await page.screenshot({path:'test-results/cash-opening-desktop.png',fullPage:true,animations:'disabled'})
 await page.setViewportSize({width:390,height:844})
 await page.keyboard.press('Escape')
 await page.screenshot({path:'test-results/cash-opening-mobile.png',fullPage:true,animations:'disabled'})
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth)).toBe(true)
 await page.getByRole('button',{name:'Ver detalhes',exact:true}).click()
 const details = page.getByRole('dialog')
 for (const [label, amount] of [['Recebido aprovado', 'R$ 14.325,67'], ['Esperado na gaveta', 'R$ 8.123,45']]) {
   const value = details.getByText(label, { exact: true }).locator('..').locator('dd')
   await expect(value).toHaveText(amount)
   expect(await value.evaluate(element => getComputedStyle(element).whiteSpace === 'nowrap' && element.scrollWidth <= element.clientWidth)).toBe(true)
 }
})
test('caixa vazio leva ao cadastro em pop-up nos ajustes sem abrir turno automaticamente', async ({ page }) => {
 await setup(page)
 let boxes=[],attempts=0
 const posts=[]
 await page.route('http://localhost:8080/caixa/**', route=>{
  const r=route.request(),p=new URL(r.url()).pathname
  if(p==='/caixa/sessoes/atual')return route.fulfill({status:204,headers:feedbackHeaders})
  if(r.method()==='POST'){
   posts.push({path:p,body:r.postDataJSON()})
   if(p==='/caixa/caixas'){
    attempts++
    if(attempts===1)return route.fulfill({status:409,headers:feedbackHeaders,json:{message:'Já existe um caixa com este nome no estabelecimento'}})
    const box={id:'new-box',nome:r.postDataJSON().nome,ativo:true,emUso:false};boxes=[box]
    return route.fulfill({status:201,headers:feedbackHeaders,json:box})
   }
  }
  return route.fulfill({headers:feedbackHeaders,json:envelope(p==='/caixa/caixas'?boxes:[])})
 })
 await page.goto('/#/caixa')
 await expect(page.getByRole('button',{name:'Cadastrar novo caixa',exact:true})).toHaveCount(1)
 await expect(page.getByRole('button',{name:'Abrir turno',exact:true})).toBeDisabled()
 expect(posts).toHaveLength(0)
 await page.getByRole('button',{name:'Cadastrar novo caixa',exact:true}).click()
 const form=page.getByRole('dialog',{name:'Cadastrar caixa físico',exact:true})
 await expect(form).toBeVisible()
 await expect(form.getByLabel('Nome do caixa',{exact:true})).toHaveValue('')
 await form.getByLabel('Nome do caixa',{exact:true}).fill('Caixa Principal')
 await form.getByRole('button',{name:'Cadastrar caixa',exact:true}).click()
 await expect(form.getByRole('alert')).toContainText('Já existe um caixa')
 await form.getByRole('button',{name:'Caixa Delivery',exact:true}).click()
 await form.getByRole('button',{name:'Cadastrar caixa',exact:true}).click()
 await expect(form).toHaveCount(0)
 await expect(page.getByRole('dialog')).toHaveCount(0)
 await page.getByRole('button',{name:'Ir para abertura do caixa',exact:true}).click()
 await expect(page.getByLabel('Caixa disponível')).toHaveValue('new-box')
 await expect(page.getByRole('button',{name:'Abrir turno',exact:true})).toBeEnabled()
 expect(posts).toEqual([{path:'/caixa/caixas',body:{nome:'Caixa Principal'}},{path:'/caixa/caixas',body:{nome:'Caixa Delivery'}}])
 await page.goto('/#/ajustescaixa?aba=caixas')
 await page.getByRole('button',{name:'Novo caixa',exact:true}).click()
 const popup=page.getByRole('dialog',{name:'Cadastrar caixa físico',exact:true})
 await expect(popup).toBeVisible()
 await expect(popup.getByLabel('Nome do caixa',{exact:true})).toHaveValue('')
 await page.setViewportSize({width:390,height:844})
 await expect(popup.getByRole('button',{name:'Cadastrar caixa',exact:true})).toBeInViewport()
 await page.screenshot({path:'test-results/cash-register-popup-mobile.png',fullPage:true,animations:'disabled'})
 await popup.getByRole('button',{name:'Cancelar',exact:true}).click()
 expect(posts).toHaveLength(2)
})
test('operador sem permissão de configurar não cadastra caixas na abertura', async ({ page }) => {
 await setup(page)
 await page.route('http://localhost:8080/usuario/me', route=>route.fulfill({headers:feedbackHeaders,json:{id:'operator',name:'Operador',profileName:'Operador',permissoes:['CAIXA_VISUALIZAR','CAIXA_OPERAR']}}))
 await page.route('http://localhost:8080/caixa/**', route=>route.fulfill(new URL(route.request().url()).pathname==='/caixa/sessoes/atual'?{status:204,headers:feedbackHeaders}:{headers:feedbackHeaders,json:envelope([])}))
 await page.goto('/#/caixa')
 await expect(page.getByText('Solicite a um responsável o cadastro ou a ativação de um caixa.')).toBeVisible()
 await expect(page.getByRole('option',{name:'+ Cadastrar novo caixa',exact:true})).toHaveCount(0)
 await expect(page.getByRole('button',{name:'Abrir turno',exact:true})).toBeDisabled()
})
test('caixa aberto volta ao catálogo visual e atualiza quantidades pelo servidor', async ({ page }) => {
 const calls=await setup(page)
 const session={id:'turn',caixaId:'box',caixaNome:'Principal',operadorNome:'Teste',abertaEm:'2026-11-15T18:00:00',resumoAtual:{totalVendas:0,dinheiroEsperado:100}}
 let order=null
 const writes=[]
 await page.route('http://localhost:8080/caixa/**',route=>{
  const r=route.request(),p=new URL(r.url()).pathname
  const ok=json=>route.fulfill({headers:feedbackHeaders,json})
  if(p==='/caixa/sessoes/atual'||p==='/caixa/sessoes/turn')return ok(session)
  if(p==='/caixa/configuracao')return ok({dinheiroHabilitado:true})
  if(p==='/caixa/caixas/box')return ok({id:'box',terminais:[]})
  if((p==='/caixa/pedidos'&&r.method()==='POST')||(p==='/caixa/pedidos/current'&&r.method()==='PUT')){
   const body=r.postDataJSON();writes.push(body)
   order={id:'current',numero:7,sessaoCaixaId:'turn',status:'EM_ATENDIMENTO',statusDesconto:'SEM_DESCONTO',pagamentos:[],itens:(body.itens||[]).map((i,index)=>({...i,id:index+1,descricaoProduto:'Morango',subtotal:i.quantidade*2})),total:(body.itens||[]).reduce((a,i)=>a+i.quantidade*2,0),totalPago:0,saldoRestante:(body.itens||[]).reduce((a,i)=>a+i.quantidade*2,0)}
   return ok(order)
  }
  if(p==='/caixa/pedidos/current')return ok(order)
  return ok(envelope(p==='/caixa/pedidos'&&order?[order]:[]))
 })
 await page.goto('/#/caixa')
 await expect(page.getByRole('heading',{name:'Selecione os itens',exact:true})).toBeVisible()
 await page.getByRole('button',{name:'Pedido 1, livre',exact:true}).click()
 await page.getByRole('button',{name:'Iniciar pedido',exact:true}).click()
 await page.getByRole('button',{name:'Adicionar Morango',exact:true}).click()
 await expect(page.getByRole('button',{name:'Aumentar Morango',exact:true})).toBeEnabled()
 await page.getByRole('button',{name:'Aumentar Morango',exact:true}).click()
 await expect.poll(()=>writes.at(-1)?.itens[0].quantidade).toBe(2)
 await expect(page.getByRole('button',{name:'Diminuir Morango',exact:true})).toBeEnabled()
 await page.getByRole('button',{name:'Diminuir Morango',exact:true}).click()
 await expect.poll(()=>writes.at(-1)?.itens[0].quantidade).toBe(1)
 await page.getByRole('searchbox',{name:'Buscar produto ou SKU',exact:true}).fill('Morango')
 await expect.poll(()=>calls.some(c=>c.path==='/produtos'&&c.query.busca==='Morango'&&c.query.tamanho==='9')).toBe(true)
 await page.locator('article').filter({has:page.getByRole('heading',{name:'Selecione os itens',exact:true})}).getByRole('button',{name:'Próxima',exact:true}).click()
 await expect.poll(()=>calls.some(c=>c.path==='/produtos'&&c.query.busca==='Morango'&&c.query.tamanho==='9'&&c.query.pagina==='1')).toBe(true)
 await page.getByLabel('Itens por página do catálogo do caixa',{exact:true}).selectOption('12')
 await expect.poll(()=>calls.some(c=>c.path==='/produtos'&&c.query.busca==='Morango'&&c.query.tamanho==='12'&&c.query.pagina==='0')).toBe(true)
 await page.getByLabel('Itens por página do catálogo do caixa',{exact:true}).selectOption('18')
 await expect.poll(()=>calls.some(c=>c.path==='/produtos'&&c.query.busca==='Morango'&&c.query.tamanho==='18'&&c.query.pagina==='0')).toBe(true)
 await page.screenshot({path:'test-results/cash-workspace-desktop.png',fullPage:true,animations:'disabled'})
 await page.setViewportSize({width:390,height:844})
 await page.keyboard.press('Escape')
 await page.getByRole('button',{name:'Exibir atendimento',exact:true}).click()
 await expect(page.getByRole('button',{name:'Receber pagamento',exact:true})).toBeVisible()
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true)
 await page.screenshot({path:'test-results/cash-workspace-mobile.png',fullPage:true,animations:'disabled'})
 expect(calls.some(c=>c.path==='/movimentacoes-estoque'&&c.method==='POST')).toBe(false)
})
test('caixa aberto oculta sessões anteriores e abre histórico paginado com produtos vendidos', async ({ page }) => {
 await setup(page)
 const calls=[]
 const session={id:'active-turn',caixaId:'box',caixaNome:'Caixa Principal',operadorNome:'Teste',abertaEm:'2026-11-15T18:00:00',fundoTroco:100,resumoAtual:{totalVendas:40,dinheiroEsperado:120,sangrias:0,reforcos:0,porForma:{DINHEIRO:20,PIX:20}}}
 await page.route('http://localhost:8080/caixa/**',route=>{
  const url=new URL(route.request().url()),path=url.pathname
  calls.push({path,query:Object.fromEntries(url.searchParams)})
  const ok=json=>route.fulfill({headers:feedbackHeaders,json})
  if(path==='/caixa/sessoes/atual'||path==='/caixa/sessoes/active-turn')return ok(session)
  if(path==='/caixa/pedidos'&&url.searchParams.get('status')==='CONCLUIDO'){
   const pageNo=Number(url.searchParams.get('pagina'))
   return ok(envelope([{id:'sale-'+pageNo,numero:20+pageNo,status:'CONCLUIDO',total:20,concluidoEm:'2026-11-15T19:00:00'}],pageNo,10,11))
  }
  if(path.startsWith('/caixa/pedidos/sale-'))return ok({id:path.split('/').pop(),numero:20,status:'CONCLUIDO',subtotal:20,desconto:0,total:20,totalPago:20,saldoRestante:0,itens:[{id:1,descricaoProduto:'Morango vendido',categoriaNome:'Insumos',quantidade:10,precoUnitario:2,subtotal:20}]})
  return ok(envelope([]))
 })
 await page.goto('/#/caixa')
 await expect(page.getByRole('button',{name:'Histórico caixa',exact:true})).toBeVisible()
 await expect(page.getByRole('heading',{name:'Sessões anteriores',exact:true})).toHaveCount(0)
 expect(calls.some(c=>c.query.status==='CONCLUIDO')).toBe(false)
 await page.getByRole('button',{name:'Histórico caixa',exact:true}).click()
 const drawer=page.getByRole('dialog',{name:'Histórico caixa',exact:true})
 await expect(drawer.getByText('Morango vendido',{exact:true})).toBeVisible()
 await expect(drawer.getByText('Recebido por forma de pagamento',{exact:true})).toBeVisible()
 await expect(drawer.getByText('Pix',{exact:true})).toBeVisible()
 expect(calls.find(c=>c.query.status==='CONCLUIDO')?.query).toMatchObject({sessaoCaixaId:'active-turn',status:'CONCLUIDO',pagina:'0',tamanho:'10',ordenarPor:'numero',direcao:'DESC'})
 await drawer.getByRole('button',{name:'Próxima',exact:true}).click()
 await expect(drawer.getByRole('button',{name:/Pedido #21/})).toBeVisible()
 expect(calls.some(c=>c.query.status==='CONCLUIDO'&&c.query.pagina==='1')).toBe(true)
 await drawer.getByLabel('Situação dos pedidos').selectOption('PAGAMENTO_PARCIAL')
 await expect(drawer.getByText('Nenhum pedido nesta situação',{exact:true})).toBeVisible()
 expect(calls.some(c=>c.query.status==='PAGAMENTO_PARCIAL'&&c.query.pagina==='0')).toBe(true)
 await drawer.getByLabel('Situação dos pedidos').selectOption('CONCLUIDO')
 await expect(drawer.getByText('Morango vendido',{exact:true})).toBeVisible()
 await page.screenshot({path:'test-results/cash-history-desktop.png',fullPage:true,animations:'disabled'})
 await page.setViewportSize({width:390,height:844})
 await page.screenshot({path:'test-results/cash-history-mobile.png',fullPage:true,animations:'disabled'})
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true)
})
test('novo pedido aparece imediatamente e limita cinco atendimentos abertos por turno', async ({ page }) => {
 await setup(page)
 let created=0
 const counts={EM_ATENDIMENTO:2,AGUARDANDO_MAQUINA:1,AGUARDANDO_PAGAMENTO:0,PAGAMENTO_PARCIAL:1}
 const newOrder={id:'new-order',numero:5,status:'EM_ATENDIMENTO',sessaoCaixaId:'limited-turn',total:0,totalPago:0,saldoRestante:0,itens:[],pagamentos:[]}
 const session={id:'limited-turn',caixaId:'box',caixaNome:'Principal',operadorNome:'Teste',resumoAtual:{totalVendas:0,dinheiroEsperado:100}}
 await page.route('http://localhost:8080/caixa/**',route=>{
  const r=route.request(),url=new URL(r.url()),path=url.pathname
  const ok=json=>route.fulfill({headers:feedbackHeaders,json})
  if(path==='/caixa/sessoes/atual'||path==='/caixa/sessoes/limited-turn')return ok(session)
  if(path==='/caixa/configuracao')return ok({dinheiroHabilitado:true})
  if(path==='/caixa/caixas/box')return ok({id:'box',terminais:[]})
  if(path==='/caixa/pedidos'&&r.method()==='POST'){created++;counts.EM_ATENDIMENTO++;return ok(newOrder)}
  if(path==='/caixa/pedidos/new-order')return ok(newOrder)
  if(path==='/caixa/pedidos'){
   const state=url.searchParams.get('status'),size=Number(url.searchParams.get('tamanho')||10)
   const existing={EM_ATENDIMENTO:[{id:'old-a',numero:1,status:state},{id:'old-b',numero:2,status:state}],AGUARDANDO_MAQUINA:[{id:'old-c',numero:3,status:state}],PAGAMENTO_PARCIAL:[{id:'old-d',numero:4,status:state}]}
   const records=[...(existing[state]||[]),...(state==='EM_ATENDIMENTO'&&created?[newOrder]:[])]
   return ok(envelope(records.slice(0,size),0,size,counts[state]||0))
  }
  return ok(envelope([]))
 })
 await page.goto('/#/caixa')
 await expect(page.getByText('4 de 5 pedidos abertos',{exact:true})).toBeVisible()
 await page.getByRole('button',{name:'Pedido 5, livre',exact:true}).click()
 await page.getByRole('button',{name:'Iniciar pedido',exact:true}).click()
 await expect(page.getByRole('button',{name:'Pedido 5',exact:true})).toContainText('Em atendimento')
 await expect(page.getByRole('heading',{name:'Pedido 5',exact:true})).toBeVisible()
 await expect(page.getByText('5 de 5 pedidos abertos',{exact:true})).toBeVisible()
 await expect(page.getByRole('button',{name:'Novo pedido',exact:true})).toHaveCount(0)
 await expect(page.getByRole('button',{name:/Pedido \d, livre/})).toHaveCount(0)
 expect(created).toBe(1)
 await page.reload()
 await expect(page.getByRole('button',{name:'Novo pedido',exact:true})).toHaveCount(0)
 await expect(page.getByRole('button',{name:/Pedido \d, livre/})).toHaveCount(0)
 await expect(page.getByRole('button',{name:'Adicionar Morango',exact:true})).toBeDisabled()
 expect(created).toBe(1)
})
test('posições 1 a 5 são reutilizadas sem renumerar os demais pedidos ou o histórico', async ({page})=>{
 await setup(page)
 const session={id:'slot-turn',caixaId:'box',caixaNome:'Principal',operadorNome:'Teste',resumoAtual:{totalVendas:0,dinheiroEsperado:100}}
 const make=(id,numero)=>({id,numero,status:'EM_ATENDIMENTO',sessaoCaixaId:'slot-turn',total:1,totalPago:0,saldoRestante:1,itens:[{id:numero,produtoId:id,descricaoProduto:'Produto '+numero,quantidade:1,precoUnitario:1,subtotal:1}],pagamentos:[]})
 const orders={a:make('a',501),b:make('b',502)}
 await page.route('http://localhost:8080/caixa/**',route=>{
  const r=route.request(),url=new URL(r.url()),path=url.pathname
  const ok=json=>route.fulfill({headers:feedbackHeaders,json})
  if(path==='/caixa/sessoes/atual'||path==='/caixa/sessoes/slot-turn')return ok(session)
  if(path==='/caixa/configuracao')return ok({dinheiroHabilitado:true})
  if(path==='/caixa/caixas/box')return ok({id:'box',terminais:[]})
  if(path==='/caixa/pedidos'&&r.method()==='POST'){orders.c=make('c',503);return ok(orders.c)}
  if(path==='/caixa/pedidos/a/pagamentos'){orders.a={...orders.a,status:'CONCLUIDO',totalPago:1,saldoRestante:0,pagamentos:[{id:'pay',forma:'DINHEIRO',status:'APROVADO',valor:1}]};return ok(orders.a)}
  if(path==='/caixa/pedidos'){
   const rows=Object.values(orders).filter(o=>o.status===url.searchParams.get('status'))
   return ok(envelope(rows.slice(0,Number(url.searchParams.get('tamanho')||10)),0,Number(url.searchParams.get('tamanho')||10),rows.length))
  }
  if(path.startsWith('/caixa/pedidos/'))return ok(orders[path.split('/')[3]])
  return ok(envelope([]))
 })
 await page.goto('/#/caixa?pedidoId=a')
 await expect(page.getByRole('heading',{name:'Pedido 1',exact:true})).toBeVisible()
 await expect(page.getByRole('button',{name:'Pedido 2',exact:true})).toBeEnabled()
 await page.getByRole('button',{name:'Receber pagamento',exact:true}).click()
 await page.getByRole('dialog').getByLabel('Valor entregue em dinheiro').fill('1')
 await page.getByRole('dialog').getByRole('button',{name:'Confirmar',exact:true}).click()
 await expect(page.getByRole('heading',{name:'Pedido 1',exact:true})).toBeVisible()
 await expect(page.getByText('Concluído',{exact:true}).first()).toBeVisible()
 await expect(page.getByRole('button',{name:'Receber pagamento',exact:true})).toHaveCount(0)
 await expect(page.getByRole('button',{name:'Aumentar Produto 501',exact:true})).toHaveCount(0)
 await expect(page.getByRole('button',{name:'Adicionar Morango',exact:true})).toBeDisabled()
 await page.getByRole('button',{name:'Pedido 2',exact:true}).click()
 await expect(page.getByRole('button',{name:'Pedido 1, livre',exact:true})).toBeEnabled()
 await expect(page.getByRole('heading',{name:'Pedido 2',exact:true})).toBeVisible()
 await page.getByRole('button',{name:'Pedido 1, livre',exact:true}).click()
 await page.getByRole('button',{name:'Iniciar pedido',exact:true}).click()
 await expect(page.getByRole('heading',{name:'Pedido 1',exact:true})).toBeVisible()
 await expect(page.getByText('Produto 503',{exact:true})).toBeVisible()
 await page.getByRole('button',{name:'Pedido 2',exact:true}).click()
 await expect(page.getByRole('heading',{name:'Pedido 2',exact:true})).toBeVisible()
 await expect(page.getByText('Produto 502',{exact:true})).toBeVisible()
 await page.reload()
 await expect(page.getByRole('button',{name:'Pedido 2',exact:true})).toBeEnabled()
 await page.getByRole('button',{name:'Histórico caixa',exact:true}).click()
 await expect(page.getByRole('dialog').getByRole('button',{name:/Pedido #501/})).toBeVisible()
 expect(Object.values(orders).map(o=>o.numero)).toEqual([501,502,503])
})
test('duas formas preservam o primeiro pagamento quando o segundo falha e retomam após F5', async ({page})=>{
 await setup(page)
 const session={id:'split-turn',caixaId:'box',caixaNome:'Principal',operadorNome:'Teste',resumoAtual:{totalVendas:0,dinheiroEsperado:100}}
 let order={id:'split-order',numero:700,sessaoCaixaId:'split-turn',status:'EM_ATENDIMENTO',total:100,totalPago:0,saldoRestante:100,desconto:0,itens:[{id:1,produtoId:strawberry.id,descricaoProduto:'Venda dividida',quantidade:1,precoUnitario:100,subtotal:100}],pagamentos:[]}
 const attempts=[]
 await page.route('http://localhost:8080/caixa/**',route=>{
  const r=route.request(),u=new URL(r.url()),p=u.pathname,ok=json=>route.fulfill({headers:feedbackHeaders,json})
  if(p==='/caixa/sessoes/atual'||p==='/caixa/sessoes/split-turn')return ok(session)
  if(p==='/caixa/configuracao')return ok({dinheiroHabilitado:true,creditoHabilitado:true,pixHabilitado:true,pointHabilitado:true,permitirPagamentoManual:true,parcelamentoHabilitado:true,parcelasMinimas:2,parcelasMaximas:12,valorMinimoParcela:20})
  if(p==='/caixa/caixas/box')return ok({id:'box',terminais:[{id:'terminal',nome:'Point balcão',ativo:true}]})
  if(p==='/caixa/pedidos/split-order/pagamentos'){
   const body=r.postDataJSON();attempts.push(body)
   if(attempts.length===2)return route.fulfill({status:409,headers:feedbackHeaders,json:{message:'Maquininha ocupada'}})
   const payment={...body,id:'payment-'+attempts.length,status:'APROVADO',valorCobrado:body.valor}
   order={...order,pagamentos:[...order.pagamentos,payment],totalPago:order.totalPago+body.valor,saldoRestante:order.saldoRestante-body.valor,status:attempts.length===1?'PAGAMENTO_PARCIAL':'CONCLUIDO'}
   return ok(order)
  }
  if(p==='/caixa/pedidos/split-order')return ok(order)
  if(p==='/caixa/pedidos')return ok(envelope(u.searchParams.get('status')===order.status?[order]:[]))
  return ok(envelope([]))
 })
 await page.goto('/#/caixa?pedidoId=split-order')
 await page.getByRole('button',{name:'Receber pagamento',exact:true}).click()
 let dialog=page.getByRole('dialog')
 await dialog.getByRole('button',{name:'Sim',exact:true}).click()
 await dialog.getByLabel('Valor do primeiro pagamento',{exact:true}).fill('40,00')
 await expect(dialog.getByLabel('Valor do segundo pagamento',{exact:true})).toHaveValue('60,00')
 await dialog.getByLabel('Forma do segundo pagamento',{exact:true}).selectOption('CREDITO')
 await dialog.getByLabel('Parcelas do segundo pagamento',{exact:true}).selectOption('3')
 await dialog.getByLabel('Dinheiro entregue na primeira parte',{exact:true}).fill('50,00')
 await dialog.getByRole('button',{name:'Receber primeiro pagamento',exact:true}).click()
 await expect(dialog.getByRole('button',{name:'Receber segundo pagamento',exact:true})).toBeEnabled()
 await expect(dialog.getByLabel('Valor do primeiro pagamento',{exact:true})).toBeDisabled()
 expect(attempts).toHaveLength(1)
 expect(attempts[0]).toMatchObject({forma:'DINHEIRO',valor:40,valorRecebido:50,parcelas:1,terminalCaixaId:null})
 await dialog.getByRole('button',{name:'Receber segundo pagamento',exact:true}).click()
 await expect(dialog.getByRole('alert')).toContainText('Maquininha ocupada')
 expect(order.totalPago).toBe(40)
 await page.reload()
 await page.getByRole('button',{name:'Receber pagamento',exact:true}).click()
 dialog=page.getByRole('dialog')
 await expect(dialog.getByLabel('Valor do primeiro pagamento',{exact:true})).toBeDisabled()
 await expect(dialog.getByLabel('Parcelas do segundo pagamento',{exact:true})).toHaveValue('3')
 await page.screenshot({path:'test-results/split-payment-desktop.png',fullPage:true,animations:'disabled'})
 await dialog.getByRole('button',{name:'Receber segundo pagamento',exact:true}).click()
 await expect(dialog.getByRole('heading',{name:'Pagamento aprovado'})).toBeVisible()
 await expect(dialog).toContainText('pedido está concluído')
 await expect(dialog).toContainText('Cartão de crédito')
 await expect(dialog).toContainText('3×')
 await dialog.getByRole('button',{name:'Continuar no caixa'}).click()
 await expect(dialog).toHaveCount(0)
 expect(attempts).toHaveLength(3)
 expect(attempts.filter(p=>p.forma==='DINHEIRO')).toHaveLength(1)
 expect(attempts[2]).toMatchObject({forma:'CREDITO',valor:60,parcelas:3,terminalCaixaId:'terminal',valorRecebido:null})
 expect(attempts[0].chaveIdempotencia).not.toBe(attempts[2].chaveIdempotencia)
 expect(order.status).toBe('CONCLUIDO')
 expect(order.totalPago).toBe(100)
})
test('primeira cobrança pendente bloqueia a segunda até a confirmação', async ({page})=>{
 await setup(page)
 const session={id:'wait-turn',caixaId:'box',caixaNome:'Principal',operadorNome:'Teste',resumoAtual:{totalVendas:0,dinheiroEsperado:100}}
 let confirm=false
 let order={id:'wait-order',numero:710,sessaoCaixaId:'wait-turn',status:'EM_ATENDIMENTO',total:100,totalPago:0,saldoRestante:100,itens:[{id:1,produtoId:strawberry.id,descricaoProduto:'Venda em duas partes',quantidade:1,subtotal:100}],pagamentos:[]}
 const posts=[]
 await page.route('http://localhost:8080/caixa/**',route=>{
  const r=route.request(),u=new URL(r.url()),p=u.pathname,ok=json=>route.fulfill({headers:feedbackHeaders,json})
  if(p==='/caixa/sessoes/atual'||p==='/caixa/sessoes/wait-turn')return ok(session)
  if(p==='/caixa/configuracao')return ok({dinheiroHabilitado:true,pixHabilitado:true,pointHabilitado:true,permitirPagamentoManual:true})
  if(p==='/caixa/caixas/box')return ok({id:'box',terminais:[{id:'terminal',nome:'Point',ativo:true}]})
  if(p==='/caixa/pedidos/wait-order/pagamentos'){
   const body=r.postDataJSON();posts.push(body)
   const payment={...body,id:'p'+posts.length,status:posts.length===1?'EM_TERMINAL':'APROVADO'}
   order={...order,pagamentos:[...order.pagamentos,payment],status:posts.length===1?'AGUARDANDO_MAQUINA':'CONCLUIDO',totalPago:posts.length===1?0:100,saldoRestante:posts.length===1?100:0}
   return ok(order)
  }
  if(p==='/caixa/pedidos/wait-order'){
   if(confirm&&order.pagamentos.length===1)order={...order,status:'PAGAMENTO_PARCIAL',totalPago:50,saldoRestante:50,pagamentos:order.pagamentos.map(p=>({...p,status:'APROVADO'}))}
   return ok(order)
  }
  if(p==='/caixa/pedidos')return ok(envelope(u.searchParams.get('status')===order.status?[order]:[]))
  return ok(envelope([]))
 })
 await page.goto('/#/caixa?pedidoId=wait-order')
 await page.getByRole('button',{name:'Receber pagamento',exact:true}).click()
 const dialog=page.getByRole('dialog')
 await dialog.getByRole('button',{name:'Sim',exact:true}).click()
 await dialog.getByLabel('Forma do primeiro pagamento',{exact:true}).selectOption('PIX')
 await dialog.getByLabel('Forma do segundo pagamento',{exact:true}).selectOption('DINHEIRO')
 await dialog.getByRole('button',{name:'Receber primeiro pagamento',exact:true}).click()
 await expect(dialog.getByText('Aguardando confirmação do pagamento',{exact:true})).toBeVisible()
 await expect(dialog.getByRole('button',{name:'Receber segundo pagamento',exact:true})).toHaveCount(0)
 expect(posts).toHaveLength(1)
 confirm=true
 await dialog.getByRole('button',{name:'Atualizar pagamento',exact:true}).click()
 await expect(dialog.getByRole('button',{name:'Receber segundo pagamento',exact:true})).toBeEnabled()
 await dialog.getByLabel('Dinheiro entregue na segunda parte',{exact:true}).fill('50,00')
 await dialog.getByRole('button',{name:'Receber segundo pagamento',exact:true}).click()
 await expect(dialog).toHaveCount(0)
 expect(posts).toHaveLength(2)
 expect(posts[0]).toMatchObject({forma:'PIX',valor:50,parcelas:1})
 expect(posts[1]).toMatchObject({forma:'DINHEIRO',valor:50,parcelas:1})
})
test('débito mostra andamento na maquininha e mantém confirmação após aprovação', async ({page}) => {
 await setup(page)
 const session = { id:'debit-turn', caixaId:'box', caixaNome:'Principal', resumoAtual:{} }
 let order = { id:'debit-order', numero:711, sessaoCaixaId:session.id, status:'EM_ATENDIMENTO', total:100,
   totalPago:0, saldoRestante:100, itens:[{id:1,produtoId:strawberry.id,descricaoProduto:'Venda no débito',quantidade:1,subtotal:100}], pagamentos:[] }
 let charges = 0
 let approved = false
 let issued = 0
 await page.route('http://localhost:8080/caixa/**', route => {
  const url = new URL(route.request().url())
  const ok = json => route.fulfill({headers:feedbackHeaders,json})
  if (url.pathname.startsWith('/caixa/sessoes/')) return ok(session)
  if (url.pathname === '/caixa/configuracao') return ok({debitoHabilitado:true,pointHabilitado:true})
  if (url.pathname === '/caixa/caixas/box') return ok({terminais:[{id:'terminal',nome:'Point',ativo:true}]})
  if (url.pathname === '/caixa/notas-fiscais/emitir') {
   expect(order.status).toBe('CONCLUIDO')
   expect(route.request().postDataJSON()).toEqual({pedidoId:order.id})
   issued++
   return ok({id:'nota-debito',numero:'13',status:'AUTORIZADA',ambiente:'HOMOLOGACAO'})
  }
  if (url.pathname === '/caixa/pedidos/debit-order/pagamentos') {
   charges++
   const body = route.request().postDataJSON()
   order = {...order,status:'AGUARDANDO_MAQUINA',pagamentos:[{...body,id:'debit-payment',status:'EM_TERMINAL',valorCobrado:102}]}
   return ok(order)
  }
  if (url.pathname === '/caixa/pedidos/debit-order') {
   if (approved && order.pagamentos.length) order = {...order,status:'CONCLUIDO',totalPago:100,saldoRestante:0,pagamentos:[{...order.pagamentos[0],status:'APROVADO'}]}
   return ok(order)
  }
  if (url.pathname === '/caixa/pedidos') return ok(envelope(url.searchParams.get('status')===order.status?[order]:[]))
  return ok(envelope([]))
 })
 await page.goto('/#/caixa?pedidoId=debit-order')
 await page.getByRole('button',{name:'Receber pagamento',exact:true}).click()
 const dialog = page.getByRole('dialog')
 await dialog.getByRole('button',{name:'Confirmar',exact:true}).click()
 await expect(dialog.getByRole('heading',{name:'Pagamento em andamento'})).toBeVisible()
 await expect(dialog).toContainText('Cartão de débito')
 await expect(dialog).toContainText('102,00')
 await expect(dialog.getByRole('button',{name:'Confirmar',exact:true})).toHaveCount(0)
 await page.setViewportSize({width:390,height:844})
 const bounds = await dialog.boundingBox()
 expect(bounds.x).toBeGreaterThanOrEqual(0)
 expect(bounds.x + bounds.width).toBeLessThanOrEqual(390)
 expect(issued).toBe(0)
 approved = true
 await dialog.getByRole('button',{name:'Atualizar pagamento'}).click()
 await expect(dialog.getByRole('heading',{name:'Pagamento aprovado'})).toBeVisible()
 await expect(dialog).toContainText('pedido está concluído')
 await expect(dialog.getByRole('button',{name:'Baixar',exact:true})).toBeVisible()
 await dialog.getByRole('button',{name:'Continuar no caixa'}).click()
 await expect(dialog).toHaveCount(0)
 expect(issued).toBe(1)
 expect(charges).toBe(1)
})
test('resposta incerta retoma somente a mesma parte com chave e payload iguais', async ({page})=>{
 await setup(page)
 const session={id:'retry-turn',caixaId:'box',caixaNome:'Principal',operadorNome:'Teste',resumoAtual:{}}
 let order={id:'retry-order',numero:720,sessaoCaixaId:'retry-turn',status:'EM_ATENDIMENTO',total:20,totalPago:0,saldoRestante:20,itens:[{id:1,produtoId:strawberry.id,descricaoProduto:'Recebimento seguro',quantidade:1,subtotal:20}],pagamentos:[]}
 const posts=[]
 await page.route('http://localhost:8080/caixa/**',route=>{
  const r=route.request(),u=new URL(r.url()),p=u.pathname,ok=json=>route.fulfill({headers:feedbackHeaders,json})
  if(p==='/caixa/sessoes/atual')return ok(session)
  if(p==='/caixa/configuracao')return ok({dinheiroHabilitado:true})
  if(p==='/caixa/pedidos/retry-order/pagamentos'){
   const body=r.postDataJSON();posts.push(body)
   if(posts.length===1)return route.abort('failed')
   order={...order,status:'CONCLUIDO',totalPago:20,saldoRestante:0,pagamentos:[{...body,id:'confirmed',status:'APROVADO'}]}
   return ok(order)
  }
  if(p==='/caixa/pedidos/retry-order')return ok(order)
  return ok(envelope([]))
 })
 await page.goto('/#/caixa?pedidoId=retry-order')
 await page.getByRole('button',{name:'Receber pagamento',exact:true}).click()
 const dialog=page.getByRole('dialog')
 await dialog.getByLabel('Valor entregue em dinheiro',{exact:true}).fill('20,00')
 await dialog.getByRole('button',{name:'Confirmar',exact:true}).click()
 await expect(dialog.getByRole('alert')).toBeVisible()
 await expect(dialog.getByLabel('Valor aplicado ao pedido',{exact:true})).toBeDisabled()
 await dialog.getByRole('button',{name:'Reenviar mesma tentativa',exact:true}).click()
 await expect(dialog).toHaveCount(0)
 expect(posts).toHaveLength(2)
 expect(posts[0]).toEqual(posts[1])
})
test('divisão em quatro partes fica ao lado de Sim e preserva os recebimentos após F5', async ({page})=>{
 await setup(page)
 const session={id:'four-turn',caixaId:'box',caixaNome:'Principal',operadorNome:'Teste',resumoAtual:{}}
 let order={id:'four-order',numero:730,sessaoCaixaId:'four-turn',status:'EM_ATENDIMENTO',total:100.01,totalPago:0,saldoRestante:100.01,itens:[{id:1,produtoId:strawberry.id,descricaoProduto:'Divisão em quatro',quantidade:1,subtotal:100.01}],pagamentos:[]}
 const posts=[]
 await page.route('http://localhost:8080/caixa/**',route=>{
  const r=route.request(),u=new URL(r.url()),p=u.pathname,ok=json=>route.fulfill({headers:feedbackHeaders,json})
  if(p==='/caixa/sessoes/atual'||p==='/caixa/sessoes/four-turn')return ok(session)
  if(p==='/caixa/configuracao')return ok({dinheiroHabilitado:true,pixHabilitado:true,debitoHabilitado:true,creditoHabilitado:true,pointHabilitado:true,permitirPagamentoManual:true,parcelamentoHabilitado:true,parcelasMinimas:2,parcelasMaximas:12,valorMinimoParcela:10})
  if(p==='/caixa/caixas/box')return ok({id:'box',terminais:[{id:'terminal',nome:'Point',ativo:true}]})
  if(p==='/caixa/pedidos/four-order/pagamentos'){
   const body=r.postDataJSON();posts.push(body)
   const totalPago=Math.round((order.totalPago+body.valor)*100)/100
   order={...order,status:posts.length===4?'CONCLUIDO':'PAGAMENTO_PARCIAL',totalPago,saldoRestante:Math.round((100.01-totalPago)*100)/100,pagamentos:[...order.pagamentos,{...body,id:'p'+posts.length,status:'APROVADO'}]}
   return ok(order)
  }
  if(p==='/caixa/pedidos/four-order')return ok(order)
  if(p==='/caixa/pedidos')return ok(envelope(u.searchParams.get('status')===order.status?[order]:[]))
  return ok(envelope([]))
 })
 await page.goto('/#/caixa?pedidoId=four-order')
 await page.getByRole('button',{name:'Receber pagamento',exact:true}).click()
 let dialog=page.getByRole('dialog')
 await expect(dialog.getByLabel('Quantidade de partes do pagamento')).toHaveCount(0)
 await dialog.getByRole('button',{name:'Sim',exact:true}).click()
 await dialog.getByLabel('Quantidade de partes do pagamento').selectOption('4')
 const sim=await dialog.getByRole('button',{name:'Sim',exact:true}).boundingBox()
 const quantity=await dialog.getByLabel('Quantidade de partes do pagamento').boundingBox()
 expect(sim.x+sim.width).toBeLessThanOrEqual(quantity.x)
 expect(Math.abs(sim.y+sim.height-quantity.y-quantity.height)).toBeLessThan(5)
 for(const [label,value] of [['primeiro','25,00'],['segundo','25,00'],['terceiro','25,00'],['quarto','25,01']])await expect(dialog.getByLabel('Valor do '+label+' pagamento',{exact:true})).toHaveValue(value)
 await dialog.getByLabel('Dinheiro entregue na primeira parte',{exact:true}).fill('25,00')
 await dialog.getByLabel('Parcelas do quarto pagamento',{exact:true}).selectOption('2')
 for(const step of ['primeiro','segundo','terceiro'])await dialog.getByRole('button',{name:'Receber '+step+' pagamento',exact:true}).click()
 await expect(dialog.getByRole('button',{name:'Receber quarto pagamento',exact:true})).toBeEnabled()
 expect(posts).toHaveLength(3)
 await page.reload()
 await page.getByRole('button',{name:'Receber pagamento',exact:true}).click()
 dialog=page.getByRole('dialog')
 await expect(dialog.getByLabel('Quantidade de partes do pagamento')).toHaveValue('4')
 await expect(dialog.getByLabel('Quantidade de partes do pagamento')).toBeDisabled()
 await expect(dialog.getByLabel('Valor do primeiro pagamento',{exact:true})).toBeDisabled()
 await dialog.getByRole('button',{name:'Receber quarto pagamento',exact:true}).click()
 await expect(dialog.getByRole('heading',{name:'Pagamento aprovado'})).toBeVisible()
 await dialog.getByRole('button',{name:'Continuar no caixa'}).click()
 await expect(dialog).toHaveCount(0)
 expect(posts.map(p=>p.valor)).toEqual([25,25,25,25.01])
 expect(posts.map(p=>p.forma)).toEqual(['DINHEIRO','PIX','DEBITO','CREDITO'])
 expect(posts[3].parcelas).toBe(2)
 expect(new Set(posts.map(p=>p.chaveIdempotencia)).size).toBe(4)
 expect(order.totalPago).toBe(100.01)
})


test('novo turno não mantém pedido concluído da sessão anterior', async ({page})=>{
 await setup(page)
 let turn='old-turn'
 let finalized=false
 const order=()=>({id:'old-order',numero:90,sessaoCaixaId:'old-turn',status:finalized?'CONCLUIDO':'EM_ATENDIMENTO',total:1,totalPago:finalized?1:0,saldoRestante:finalized?0:1,itens:[{id:1,produtoId:'old-product',descricaoProduto:'Produto do turno anterior',quantidade:1,subtotal:1}],pagamentos:[]})
 await page.route('http://localhost:8080/caixa/**',route=>{
  const url=new URL(route.request().url()),path=url.pathname
  const ok=json=>route.fulfill({headers:feedbackHeaders,json})
  if(path==='/caixa/sessoes/atual')return ok({id:turn,caixaNome:'Principal',operadorNome:'Teste',resumoAtual:{totalVendas:0,dinheiroEsperado:0}})
  if(path==='/caixa/configuracao')return ok({dinheiroHabilitado:true})
  if(path==='/caixa/pedidos/old-order')return ok(order())
  if(path==='/caixa/pedidos')return ok(envelope(turn==='old-turn'&&url.searchParams.get('status')===order().status?[order()]:[]))
  return ok(envelope([]))
 })
 await page.goto('/#/caixa?pedidoId=old-order')
 await expect(page.getByText('Produto do turno anterior',{exact:true})).toBeVisible()
 finalized=true
 await page.getByRole('button',{name:'Atualizar caixa',exact:true}).click()
 await expect(page.getByText('Concluído',{exact:true}).first()).toBeVisible()
 turn='new-turn'
 await page.getByRole('button',{name:'Atualizar caixa',exact:true}).click()
 await expect(page.getByRole('heading',{name:'Sua próxima venda começa aqui',exact:true})).toBeVisible()
 await expect(page.getByText('Produto do turno anterior',{exact:true})).toHaveCount(0)
 await expect(page.getByText('Concluído',{exact:true})).toHaveCount(0)
 await expect(page.getByRole('button',{name:'Pedido 1, livre',exact:true})).toBeEnabled()
 await page.reload()
 await expect(page.getByRole('heading',{name:'Sua próxima venda começa aqui',exact:true})).toBeVisible()
 await expect(page.getByText('Produto do turno anterior',{exact:true})).toHaveCount(0)
})


for(const finalStatus of ['CONCLUIDO','CANCELADO'])test('pedido '+finalStatus+' libera atendimento após cinco segundos e próximo produto cria nova venda', async ({page})=>{
 await setup(page)
 let created=null
 const old={id:'done-order',numero:91,sessaoCaixaId:'auto-turn',status:finalStatus,total:2,totalPago:2,saldoRestante:0,itens:[{id:1,produtoId:'old',descricaoProduto:'Venda anterior',quantidade:1,subtotal:2}],pagamentos:[]}
 const writes=[]
 await page.addInitScript(()=>sessionStorage.setItem('cash-visual-slots:auto-turn',JSON.stringify(['done-order',null,null,null,null])))
 await page.route('http://localhost:8080/caixa/**',route=>{
  const r=route.request(),url=new URL(r.url()),p=url.pathname
  const ok=json=>route.fulfill({headers:feedbackHeaders,json})
  if(p==='/caixa/sessoes/atual')return ok({id:'auto-turn',caixaNome:'Principal',operadorNome:'Teste',resumoAtual:{totalVendas:2,dinheiroEsperado:2}})
  if(p==='/caixa/configuracao')return ok({dinheiroHabilitado:true})
  if(p==='/caixa/pedidos/done-order')return ok(old)
  if(p==='/caixa/pedidos'&&r.method()==='POST'){
   writes.push(r.postDataJSON())
   created={id:'next-order',numero:92,sessaoCaixaId:'auto-turn',status:'EM_ATENDIMENTO',total:2,totalPago:0,saldoRestante:2,itens:[{id:2,produtoId:'next',descricaoProduto:'Nova venda',quantidade:1,subtotal:2}],pagamentos:[]}
   return ok(created)
  }
  if(p==='/caixa/pedidos/next-order')return ok(created)
  return ok(envelope(p==='/caixa/pedidos'&&created&&url.searchParams.get('status')==='EM_ATENDIMENTO'?[created]:[]))
 })
 await page.goto('/#/caixa?pedidoId=done-order')
 await expect(page.getByText('Venda anterior',{exact:true})).toBeVisible()
 await expect(page.getByRole('button',{name:'Pedido 1',exact:true})).toContainText(finalStatus==='CANCELADO'?'Cancelado':'Concluído')
 if(finalStatus==='CANCELADO'){
  await expect(page.getByRole('button',{name:'Pedido 1',exact:true})).toHaveAttribute('data-canceled','true')
  const badge=page.locator('[data-tone="danger"]');
  await expect(badge.locator('svg')).toHaveCSS('color','rgb(231, 121, 128)')
 }
 await expect(page.getByRole('button',{name:'Adicionar Morango',exact:true})).toBeDisabled()
 await expect(page.getByRole('heading',{name:'Sua próxima venda começa aqui',exact:true})).toBeVisible({timeout:8000})
 expect(writes).toHaveLength(0)
 await expect(page.getByRole('button',{name:'Pedido 1, livre',exact:true})).toBeEnabled()
 await expect(page.getByRole('button',{name:'Novo pedido',exact:true})).toHaveCount(0)
 await page.getByRole('button',{name:'Pedido 4, livre',exact:true}).click()
 await expect(page.getByRole('heading',{name:'Iniciar pedido na posição 4',exact:true})).toBeVisible()
 await page.getByLabel('Canal',{exact:true}).selectOption('MESA')
 await expect(page.getByLabel('Identificação do atendimento')).toHaveAttribute('required','')
 await page.getByLabel('Identificação do atendimento').fill('Mesa 8')
 await page.getByRole('button',{name:'Iniciar pedido',exact:true}).click()
 await expect(page.getByText('Nova venda',{exact:true})).toBeVisible()
 await expect(page.getByRole('heading',{name:'Pedido 4',exact:true})).toBeVisible()
 expect(writes).toHaveLength(1)
 expect(writes[0]).toMatchObject({sessaoCaixaId:'auto-turn',canal:'MESA',identificadorAtendimento:'Mesa 8'})
})


test('pedidos organiza identificação e pagamento com ordenação remota por data', async ({page})=>{
 await setup(page)
 const records=[
  {id:'paid',numero:101,canal:'BALCAO',status:'CONCLUIDO',total:50,totalPago:50,saldoRestante:0},
  {id:'partial',numero:102,canal:'MESA',identificadorAtendimento:'Mesa 8',status:'PAGAMENTO_PARCIAL',total:100,totalPago:40,saldoRestante:60},
  {id:'pending',numero:103,canal:'DELIVERY',identificadorAtendimento:'Ana',status:'EM_ATENDIMENTO',total:30,totalPago:0,saldoRestante:30},
  {id:'canceled',numero:104,canal:'RETIRADA',status:'CANCELADO',total:20,totalPago:0,saldoRestante:20},
  {id:'missing',numero:105,canal:'BALCAO',status:'EM_ATENDIMENTO',total:10,totalPago:null,saldoRestante:null}
 ].map(record=>({...record,criadoEm:'2026-11-15T14:30:00',itens:[],pagamentos:[]}))
 const requests=[]
 await page.route('http://localhost:8080/caixa/**',route=>{
  const url=new URL(route.request().url()),ok=json=>route.fulfill({headers:feedbackHeaders,json})
  if(url.pathname==='/caixa/pedidos'){requests.push(Object.fromEntries(url.searchParams));return ok(envelope(records))}
  if(url.pathname==='/caixa/configuracao')return ok({})
  return ok(records.find(r=>url.pathname==='/caixa/pedidos/'+r.id)||envelope([]))
 })
 await page.goto('/#/pedidos')
 const table=page.getByRole('table')
 await expect(table.getByRole('columnheader')).toHaveCount(7)
 for(const header of ['Pedido','Data e hora','Canal / Identificação','Total','Pagamento','Situação','Ações'])await expect(table.getByRole('columnheader',{name:header,exact:false})).toBeVisible()
 const row=n=>table.getByRole('row').filter({has:page.getByText('#'+n,{exact:true})})
 await expect(row(101).getByText('Pago',{exact:true})).toBeVisible()
 await expect(row(102)).toContainText('Mesa 8')
 await expect(row(102).getByText('Parcial',{exact:true})).toBeVisible()
 await expect(row(102)).toContainText('60,00')
 await expect(row(103).getByText('Pendente',{exact:true})).toBeVisible()
 await expect(row(104).getByText('Pendente',{exact:true})).toHaveCount(0)
 await expect(row(105)).toContainText('Não informado')
 await expect(row(101)).toContainText('15/11')
 await expect(page.getByRole('button',{name:'Ações do registro',exact:true})).toHaveCount(0)
 await table.getByRole('columnheader',{name:'Data e hora',exact:false}).click()
 await expect.poll(()=>requests.at(-1)?.ordenarPor).toBe('criadoEm')
 await row(102).getByRole('button',{name:'Ver detalhes',exact:true}).click()
 await expect(page.getByRole('dialog').getByRole('heading',{name:'Detalhes do pedido',exact:true})).toBeVisible()
 await expect(page.getByRole('menuitem',{name:'Abrir no caixa',exact:true})).toHaveCount(0)
})


test('auditoria usa eventos legíveis e filtros remotos com detalhes sem dados técnicos', async ({page})=>{
 await setup(page)
 let userReads=0
 await page.route('http://localhost:8080/usuario',route=>{userReads++;return route.fulfill({headers:feedbackHeaders,json:[{id:'audit-user',name:'Ana'},{id:'joao',name:'João',ativo:false}]})})
 const entries=[
  {id:1,tipoEvento:'PEDIDO_CANCELADO',entidade:'PEDIDO',pedidoId:'private-order',pedidoIdentificador:'Pedido #81',usuarioId:'audit-user',usuarioNome:'Ana',descricao:'Cancelamento solicitado pelo cliente',valor:35,motivo:'Cliente desistiu',autorizadoPorNome:'Gerente',ocorridoEm:'2026-11-15T14:00:00',dadosAnteriores:{status:'EM_ATENDIMENTO',total:35,usuarioId:'private-user'},dadosNovos:{status:'CANCELADO',total:35,usuarioId:'private-user'}},
  {id:2,tipoEvento:'DIVERGENCIA_CAIXA_RESOLVIDA',entidade:'SESSAO_CAIXA',usuarioNome:null,valor:0,ocorridoEm:'2026-11-15T15:00:00'},
  {id:3,tipoEvento:'CAIXA_CRIADO',entidade:'CAIXA',usuarioNome:'Ana',valor:null,ocorridoEm:'2026-11-15T15:10:00'}
 ]
 const requests=[]
 await page.route('http://localhost:8080/caixa/auditoria**',route=>{
  const url=new URL(route.request().url()),q=Object.fromEntries(url.searchParams);requests.push(q)
  return route.fulfill({headers:feedbackHeaders,json:envelope(entries,Number(q.pagina||0),Number(q.tamanho||20),41)})
 })
 await page.goto('/#/auditoria')
 const table=page.getByRole('table')
 await expect(table.getByRole('columnheader')).toHaveCount(7)
 await expect(page.getByRole('heading',{name:/Auditoria do caixa/}).locator('svg')).toHaveCount(2)
 const legendButton=page.getByRole('button',{name:'Legenda das cores dos eventos de auditoria',exact:true})
 const legend=page.getByRole('tooltip')
 await expect(legend).toBeHidden()
 await legendButton.hover()
 await expect(legend).toBeVisible()
 for(const color of ['Verde-água','Roxo','Laranja','Amarelo','Verde','Vermelho','Azul','Neutro'])await expect(legend.getByText(color,{exact:true})).toBeAttached()
 await expect(legend).toContainText('Pagamento estornado')
 await page.getByRole('heading',{name:/Auditoria do caixa/}).hover({position:{x:5,y:5}})
 await expect(legend).toBeHidden()
 await legendButton.focus()
 await expect(legend).toBeVisible()
 await page.getByLabel('Evento',{exact:true}).focus()
 await expect(legend).toBeHidden()
 await expect(table.getByText('Pedido cancelado',{exact:true})).toBeVisible()
 await expect(table.getByText('PEDIDO_CANCELADO',{exact:true})).toHaveCount(0)
 await expect(table.getByText('Pedido #81',{exact:true})).toBeVisible()
 await expect(table.getByText(/0,00/)).toBeVisible()
 await expect(page.getByRole('button',{name:'Ações do registro',exact:true})).toHaveCount(0)
 const filters=page.locator('section').filter({has:page.getByRole('button',{name:'Filtros de auditoria'})}).first()
 await expect(filters.getByText('Ações',{exact:true})).toHaveCount(0)
 await page.getByLabel('Evento',{exact:true}).selectOption('PEDIDO_CANCELADO')
 await expect.poll(()=>requests.at(-1)?.tipoEvento).toBe('PEDIDO_CANCELADO')
 expect(userReads).toBe(0)
 const search=page.getByRole('combobox',{name:'Buscar responsável',exact:true})
 const countBeforeTyping=requests.length
 await search.fill('aná')
 await expect(page.getByRole('option',{name:'Ana',exact:true})).toBeVisible()
 expect(requests).toHaveLength(countBeforeTyping)
 await search.press('ArrowDown')
 await search.press('Enter')
 await expect.poll(()=>requests.at(-1)?.usuarioId).toBe('audit-user')
 await expect(page.getByRole('button',{name:'Filtrar eventos de Ana',exact:true})).toHaveCount(0)
 await expect(page.getByRole('button',{name:'Minhas ações',exact:true})).toHaveCount(0)
 await page.getByRole('button',{name:'Remover filtro de responsável',exact:true}).click()
 await expect.poll(()=>requests.at(-1)?.usuarioId||'').toBe('')
 await search.click()
 await search.fill('joao')
 await expect(page.getByRole('option',{name:/João/})).toBeVisible()
 await expect(page.getByRole('option',{name:'Ana',exact:true})).toHaveCount(0)
 await page.getByRole('option',{name:/João/}).click()
 await expect.poll(()=>requests.at(-1)?.usuarioId).toBe('joao')
 expect(userReads).toBe(1)
 await page.getByRole('button',{name:'Limpar filtros',exact:true}).click()
 await expect.poll(()=>requests.at(-1)?.tipoEvento||'').toBe('')
 await expect.poll(()=>requests.at(-1)?.usuarioId||'').toBe('')
 await table.getByRole('columnheader',{name:'Valor',exact:false}).click()
 await expect.poll(()=>requests.at(-1)?.ordenarPor).toBe('valor')
 await page.getByRole('button',{name:'Próxima página',exact:true}).click()
 await expect.poll(()=>requests.at(-1)?.pagina).toBe('1')
 await expect.poll(()=>requests.at(-1)?.tamanho).toBe('20')
 await page.screenshot({path:'test-results/cash-audit-list-desktop.png',fullPage:true,animations:'disabled'})
 await table.getByRole('row').filter({has:page.getByText('Pedido #81',{exact:true})}).getByRole('button',{name:'Ver detalhes',exact:true}).click()
 const drawer=page.getByRole('dialog')
 await expect(drawer.getByRole('heading',{name:'Detalhes do evento',exact:true})).toBeVisible()
 await expect(drawer.getByText('Cliente desistiu',{exact:true})).toBeVisible()
 await expect(drawer.getByText('Gerente',{exact:true})).toBeVisible()
 await expect(drawer.getByRole('table')).toContainText('Em atendimento')
 await expect(drawer.getByRole('table')).toContainText('Cancelado')
 await expect(drawer.getByText('private-user',{exact:true})).toHaveCount(0)
 await expect(drawer.getByText('private-order',{exact:true})).toHaveCount(0)
 await page.screenshot({path:'test-results/cash-audit-desktop.png',fullPage:true,animations:'disabled'})
 await page.setViewportSize({width:390,height:844})
 await page.screenshot({path:'test-results/cash-audit-mobile.png',fullPage:true,animations:'disabled'})
 await drawer.getByRole('table').scrollIntoViewIfNeeded()
 await expect(drawer.getByRole('table')).toBeVisible()
 expect(userReads).toBe(1)
})


test('políticas do caixa organiza seções e limita prazo a 600 preservando campos ocultos', async ({page})=>{
 await setup(page)
 let config={pointHabilitado:false,dinheiroHabilitado:true,debitoHabilitado:true,creditoHabilitado:true,pixHabilitado:true,parcelamentoHabilitado:true,imprimirComprovante:true,permitirPagamentoManual:false,parcelasMinimas:1,parcelasMaximas:6,valorMinimoParcela:10,politicaJuros:'ABSORVIDA_PELA_LOJA',validadeCobrancaSegundos:900,limiteDescontoPercentual:10,limiteDescontoValor:20}
 const writes=[]
 await page.route('http://localhost:8080/caixa/configuracao**',route=>{
  if(route.request().method()==='PUT'){const payload=route.request().postDataJSON();writes.push(payload);config={...payload};return route.fulfill({headers:feedbackHeaders,json:config})}
  return route.fulfill({headers:feedbackHeaders,json:config})
 })
 await page.goto('/#/ajustescaixa')
 await page.getByRole('button',{name:'Editar políticas',exact:true}).click()
 const modal=page.getByRole('dialog')
 await expect(modal.getByRole('heading',{name:'Editar políticas do caixa',exact:true})).toBeVisible()
 for(const name of ['Formas de pagamento','Maquininha e comprovante','Parcelamento e juros','Descontos sem autorização'])await expect(modal.getByRole('heading',{name,exact:true})).toBeAttached()
 const deadline=modal.getByLabel('Prazo da cobrança (segundos)',{exact:true})
 await expect(deadline).toHaveValue('900')
 await expect(deadline).toHaveAttribute('max','600')
 await expect(modal.getByText(/O prazo atual ultrapassa 600/)).toBeVisible()
 await deadline.fill('601')
 await modal.getByRole('button',{name:'Salvar políticas',exact:true}).click()
 await expect(deadline).toHaveAttribute('aria-invalid','true')
 expect(writes).toHaveLength(0)
 await deadline.fill('600')
 await modal.getByLabel('Máximo de parcelas',{exact:true}).fill('13')
 await modal.getByRole('button',{name:'Salvar políticas',exact:true}).click()
 await expect(modal.getByLabel('Máximo de parcelas',{exact:true})).toHaveAttribute('aria-invalid','true')
 expect(writes).toHaveLength(0)
 await modal.getByLabel('Máximo de parcelas',{exact:true}).fill('12')
 await modal.getByLabel('Valor mínimo da parcela (R$)',{exact:true}).fill('12,50')
 await modal.getByLabel('Limite em reais (R$)',{exact:true}).fill('25,50')
 await page.screenshot({path:'test-results/cash-policy-desktop.png',fullPage:true,animations:'disabled'})
 await modal.getByRole('switch',{name:'Permitir parcelamento',exact:true}).click()
 await expect(modal.getByLabel('Máximo de parcelas',{exact:true})).toHaveCount(0)
 await modal.getByRole('switch',{name:'Crédito',exact:true}).click()
 await expect(modal.getByRole('switch',{name:'Permitir parcelamento',exact:true})).toBeDisabled()
 await page.setViewportSize({width:390,height:844})
 await modal.getByLabel('Limite em reais (R$)',{exact:true}).scrollIntoViewIfNeeded()
 await page.screenshot({path:'test-results/cash-policy-mobile.png',fullPage:true,animations:'disabled'})
 await expect(modal.getByRole('button',{name:'Salvar políticas',exact:true})).toBeInViewport()
 await modal.getByRole('button',{name:'Salvar políticas',exact:true}).click()
 await expect(modal).toHaveCount(0)
 expect(writes).toHaveLength(1)
 expect(writes[0]).toMatchObject({validadeCobrancaSegundos:600,parcelasMinimas:1,parcelasMaximas:12,valorMinimoParcela:12.5,limiteDescontoValor:25.5,parcelamentoHabilitado:false,creditoHabilitado:false,politicaJuros:'ABSORVIDA_PELA_LOJA'})
 await expect(page.getByText('Políticas atualizadas',{exact:true})).toBeVisible()
})

test('políticas mantém formulário e destaca erro de maquininha ativa retornado pelo servidor', async ({page})=>{
 await setup(page)
 const config={pointHabilitado:false,dinheiroHabilitado:true,debitoHabilitado:true,creditoHabilitado:true,pixHabilitado:true,parcelamentoHabilitado:false,imprimirComprovante:true,permitirPagamentoManual:false,parcelasMinimas:1,parcelasMaximas:6,valorMinimoParcela:null,politicaJuros:'ABSORVIDA_PELA_LOJA',validadeCobrancaSegundos:300,limiteDescontoPercentual:10,limiteDescontoValor:20}
 let writes=0
 await page.route('http://localhost:8080/caixa/configuracao**',route=>{
  if(route.request().method()==='PUT'){writes++;return route.fulfill({status:400,headers:feedbackHeaders,json:{message:'Cadastre ao menos um terminal ativo para habilitar a Point'}})}
  return route.fulfill({headers:feedbackHeaders,json:config})
 })
 await page.goto('/#/ajustescaixa')
 await page.getByRole('button',{name:'Editar políticas',exact:true}).click()
 const modal=page.getByRole('dialog')
 await modal.getByRole('switch',{name:'Integração Point',exact:true}).click()
 await modal.getByRole('button',{name:'Salvar políticas',exact:true}).click()
 await expect(modal).toBeVisible()
 await expect(modal.getByRole('switch',{name:'Integração Point',exact:true})).toHaveAttribute('aria-checked','true')
 await expect(modal.getByText('Cadastre ao menos um terminal ativo para habilitar a Point',{exact:true}).last()).toBeVisible()
 await expect(modal.getByLabel('Prazo da cobrança (segundos)',{exact:true})).toHaveValue('300')
 expect(writes).toBe(1)
})


test('caixas e maquininhas organiza vínculos e informa bloqueio de exclusão por histórico', async ({page})=>{
 await setup(page)
 let box={id:'equipment-box',nome:'Caixa Principal',ativo:true,emUso:false,terminais:[{id:'terminal',nome:'Point do balcão',terminalId:'PAX_TEST_123',ativo:true}]}
 const writes=[]
 await page.route('http://localhost:8080/caixa/**',route=>{
  const r=route.request(),path=new URL(r.url()).pathname,ok=json=>route.fulfill({headers:feedbackHeaders,json})
  if(r.method()==='DELETE'){writes.push({method:r.method(),path});return route.fulfill({status:409,headers:feedbackHeaders,json:{message:'Não é possível excluir um caixa que possui sessões vinculadas'}})}
  if(r.method()==='PATCH'){writes.push({method:r.method(),path,body:r.postDataJSON()});box={...box,...r.postDataJSON()};return ok(box)}
  if(path==='/caixa/caixas')return ok(envelope([box]))
  return ok(box)
 })
 await page.goto('/#/ajustescaixa?aba=caixas')
 const card=page.getByRole('article',{name:'Caixa Caixa Principal',exact:true})
 await expect(card.getByRole('heading',{name:'Caixa Principal',exact:true})).toBeVisible()
 await expect(card.getByText('Point do balcão',{exact:true})).toBeVisible()
 await expect(card.getByText('Dispositivo Mercado Pago: PAX_TEST_123',{exact:true})).toBeVisible()
 await page.screenshot({path:'test-results/cash-equipment-desktop.png',fullPage:true,animations:'disabled'})
 await card.getByRole('button',{name:'Ações do caixa Caixa Principal',exact:true}).click()
 await page.getByRole('menuitem',{name:'Excluir caixa',exact:true}).click()
 const modal=page.getByRole('dialog')
 await expect(modal.getByRole('heading',{name:'Excluir caixa?',exact:true})).toBeVisible()
 await expect(modal).toContainText('mesmo encerradas')
 await expect(modal).toContainText('não exclui os dispositivos')
 expect(writes).toHaveLength(0)
 await page.setViewportSize({width:390,height:844})
 await expect(modal.getByRole('button',{name:'Excluir caixa',exact:true})).toBeInViewport()
 await page.screenshot({path:'test-results/cash-equipment-delete-mobile.png',fullPage:true,animations:'disabled'})
 await page.setViewportSize({width:1280,height:900})
 await modal.getByRole('button',{name:'Cancelar',exact:true}).click()
 expect(writes).toHaveLength(0)
 await card.getByRole('button',{name:'Ações do caixa Caixa Principal',exact:true}).click()
 await page.getByRole('menuitem',{name:'Excluir caixa',exact:true}).click()
 await modal.getByRole('button',{name:'Excluir caixa',exact:true}).click()
 await expect(modal.getByRole('alert')).toContainText('possui sessões vinculadas')
 await expect(card).toBeVisible()
 await modal.getByRole('button',{name:'Editar para inativar',exact:true}).click()
 await expect(modal.getByRole('heading',{name:'Editar caixa',exact:true})).toBeVisible()
 await modal.getByLabel('Caixa ativo',{exact:true}).uncheck()
 await modal.getByRole('button',{name:'Salvar caixa',exact:true}).click()
 await expect(modal).toHaveCount(0)
 await expect(card.getByText('Inativo',{exact:true})).toBeVisible()
 expect(writes).toEqual([{method:'DELETE',path:'/caixa/caixas/equipment-box'},{method:'PATCH',path:'/caixa/caixas/equipment-box',body:{nome:'Caixa Principal',ativo:false}}])
 await page.setViewportSize({width:390,height:844})
 await page.keyboard.press('Escape')
 await page.screenshot({path:'test-results/cash-equipment-mobile.png',fullPage:true,animations:'disabled'})
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth)).toBe(true)
})

test('exclusão respeita turno aberto e regra da última maquininha antes de remover cadastro', async ({page})=>{
 await setup(page)
 let blocksPoint=true,deleted=false,attempts=0
 const open={id:'open-box',nome:'Caixa aberto',ativo:true,emUso:true,terminais:[]}
 const free={id:'free-box',nome:'Caixa de eventos',ativo:true,emUso:false,terminais:[{id:'point',nome:'Point Eventos',terminalId:'PAX_EVENTS',ativo:true}]}
 await page.route('http://localhost:8080/caixa/**',route=>{
  const r=route.request(),path=new URL(r.url()).pathname,ok=json=>route.fulfill({headers:feedbackHeaders,json})
  if(r.method()==='DELETE'){
   attempts++
   if(blocksPoint)return route.fulfill({status:409,headers:feedbackHeaders,json:{message:'A Point está habilitada: mantenha ao menos um terminal ativo ou desabilite a Point antes'}})
   deleted=true;return route.fulfill({status:204,headers:feedbackHeaders})
  }
  if(path==='/caixa/caixas')return ok(envelope(deleted?[open]:[open,free]))
  return ok(open)
 })
 await page.goto('/#/ajustescaixa?aba=caixas')
 await page.getByRole('button',{name:'Ações do caixa Caixa aberto',exact:true}).click()
 await page.getByRole('menuitem',{name:'Excluir caixa',exact:true}).click()
 const modal=page.getByRole('dialog')
 await expect(modal.getByRole('button',{name:'Excluir caixa',exact:true})).toBeDisabled()
 await expect(modal.getByRole('alert')).toContainText('turno aberto')
 expect(attempts).toBe(0)
 await modal.getByRole('button',{name:'Cancelar',exact:true}).click()
 await page.getByRole('button',{name:'Ações do caixa Caixa de eventos',exact:true}).click()
 await page.getByRole('menuitem',{name:'Excluir caixa',exact:true}).click()
 await modal.getByRole('button',{name:'Excluir caixa',exact:true}).click()
 await expect(modal.getByRole('alert')).toContainText('A Point está habilitada')
 await expect(page.getByRole('article',{name:'Caixa Caixa de eventos',exact:true})).toBeVisible()
 blocksPoint=false
 await modal.getByRole('button',{name:'Excluir caixa',exact:true}).click()
 await expect(modal).toHaveCount(0)
 await expect(page.getByRole('article',{name:'Caixa Caixa de eventos',exact:true})).toHaveCount(0)
 await expect(page.getByText('O caixa Caixa de eventos foi excluído.',{exact:true})).toBeVisible()
 expect(attempts).toBe(2)
})

test('exclusão com resposta incerta consulta cadastro antes de permitir nova tentativa', async ({page})=>{
 await setup(page)
 let deleted=false,attempts=0
 const box={id:'uncertain-box',nome:'Caixa temporário',ativo:true,emUso:false,terminais:[]}
 await page.route('http://localhost:8080/caixa/**',route=>{
  const r=route.request(),path=new URL(r.url()).pathname
  if(r.method()==='DELETE'){attempts++;deleted=true;return route.abort('failed')}
  if(path==='/caixa/caixas/uncertain-box')return route.fulfill({status:404,headers:feedbackHeaders,json:{message:'Caixa não encontrado'}})
  return route.fulfill({headers:feedbackHeaders,json:envelope(deleted?[]:[box])})
 })
 await page.goto('/#/ajustescaixa?aba=caixas')
 await page.getByRole('button',{name:'Ações do caixa Caixa temporário',exact:true}).click()
 await page.getByRole('menuitem',{name:'Excluir caixa',exact:true}).click()
 const modal=page.getByRole('dialog')
 await modal.getByRole('button',{name:'Excluir caixa',exact:true}).click()
 await expect(modal.getByRole('button',{name:'Conferir exclusão',exact:true})).toBeVisible()
 await expect(modal.getByRole('button',{name:'Excluir caixa',exact:true})).toBeDisabled()
 await modal.getByRole('button',{name:'Conferir exclusão',exact:true}).click()
 await expect(modal).toHaveCount(0)
 await expect(page.getByText('Nenhum caixa cadastrado nesta página',{exact:true})).toBeVisible()
 expect(attempts).toBe(1)
})


test('consulta de equipamentos não oferece ações sem permissão de configurar', async ({page})=>{
 await setup(page)
 await page.route('http://localhost:8080/usuario/me',route=>route.fulfill({headers:feedbackHeaders,json:{id:'viewer',name:'Consulta',profileName:'Consulta',permissoes:['CAIXA_VISUALIZAR']}}))
 const box={id:'view-box',nome:'Caixa consulta',ativo:true,emUso:false,terminais:[{id:'view-terminal',nome:'Point Consulta',terminalId:'PAX_VIEW',ativo:true}]}
 await page.route('http://localhost:8080/caixa/caixas**',route=>route.fulfill({headers:feedbackHeaders,json:envelope([box])}))
 await page.goto('/#/ajustescaixa?aba=caixas')
 await expect(page.getByText('Point Consulta',{exact:true})).toBeVisible()
 await expect(page.getByRole('button',{name:'Novo caixa',exact:true})).toHaveCount(0)
 await expect(page.getByRole('button',{name:'Adicionar maquininha',exact:true})).toHaveCount(0)
 await expect(page.getByRole('button',{name:'Ações do caixa Caixa consulta',exact:true})).toHaveCount(0)
 await expect(page.getByRole('button',{name:'Ações da maquininha Point Consulta',exact:true})).toHaveCount(0)
})


test('taxas e repasse usa filtros remotos e edição preserva regra própria sem alterar identificação', async ({page})=>{
 await setup(page)
 let rows=[{id:'fee-credit',forma:'CREDITO',parcelas:3,taxaPercentual:3.5,taxaFixa:0.5,repassarAoCliente:null,repasseEfetivo:true,ativo:true},{id:'fee-pix',forma:'PIX',parcelas:1,taxaPercentual:0,taxaFixa:0,repassarAoCliente:false,repasseEfetivo:false,ativo:false}]
 const requests=[],writes=[]
 await page.route('http://localhost:8080/caixa/**',route=>{
  const r=route.request(),url=new URL(r.url()),ok=json=>route.fulfill({headers:feedbackHeaders,json})
  if(url.pathname==='/caixa/configuracao')return ok({politicaJuros:'REPASSADA_AO_CLIENTE'})
  if(r.method()==='PUT'){const body=r.postDataJSON();writes.push(body);rows=rows.map(row=>row.id==='fee-credit'?{...row,...body,repasseEfetivo:body.repassarAoCliente??true}:row);return ok(rows[0])}
  requests.push(Object.fromEntries(url.searchParams));return ok(envelope(rows,Number(url.searchParams.get('pagina')||0),Number(url.searchParams.get('tamanho')||10),21))
 })
 await page.goto('/#/ajustescaixa?aba=taxas')
 const table=page.getByRole('table')
 await expect(table.getByText('Crédito',{exact:true})).toBeVisible()
 await expect(table.getByText('Cliente paga',{exact:true})).toBeVisible()
 await expect(table.getByText('Segue a política geral',{exact:true})).toBeVisible()
 await expect(table.getByText('Loja absorve',{exact:true})).toBeVisible()
 await page.getByLabel('Filtrar taxas por forma',{exact:true}).selectOption('CREDITO')
 await expect.poll(()=>requests.at(-1)?.forma).toBe('CREDITO')
 await page.getByLabel('Status das taxas',{exact:true}).selectOption('false')
 await expect.poll(()=>requests.at(-1)?.ativo).toBe('false')
 await page.getByLabel('Taxas por página',{exact:true}).selectOption('5')
 await expect.poll(()=>requests.at(-1)?.tamanho).toBe('5')
 await page.getByRole('button',{name:'Próxima página',exact:true}).click()
 await expect.poll(()=>requests.at(-1)?.pagina).toBe('1')
 await table.getByRole('columnheader',{name:'Taxa (%)',exact:false}).click()
 await expect.poll(()=>requests.at(-1)?.ordenarPor).toBe('taxaPercentual')
 await expect.poll(()=>requests.at(-1)?.pagina).toBe('0')
 await page.getByRole('button',{name:'Limpar filtros de taxas',exact:true}).click()
 await expect.poll(()=>requests.at(-1)?.ativo||'').toBe('')
 await page.screenshot({path:'test-results/cash-rates-desktop.png',fullPage:true,animations:'disabled'})
 await table.getByRole('row').filter({has:page.getByText('Crédito',{exact:true})}).getByRole('button',{name:'Editar taxa',exact:true}).click()
 const modal=page.getByRole('dialog')
 await expect(modal.getByLabel('Forma de pagamento da taxa',{exact:true})).toBeDisabled()
 await expect(modal.getByLabel('Parcelas da taxa',{exact:true})).toBeDisabled()
 await expect(modal.getByLabel('Quem absorve a taxa',{exact:true})).toHaveValue('GLOBAL')
 await expect(modal.getByText('Política geral atual: o cliente paga os encargos.',{exact:true})).toBeVisible()
 await modal.getByLabel('Quem absorve a taxa',{exact:true}).selectOption('LOJA')
 await modal.getByLabel('Taxa percentual (%)',{exact:true}).fill('1,2345')
 await modal.getByLabel('Taxa fixa (R$)',{exact:true}).fill('0')
 await modal.getByLabel('Taxa ativa',{exact:true}).uncheck()
 await modal.getByRole('button',{name:'Salvar taxa',exact:true}).click()
 await expect(modal).toHaveCount(0)
 expect(writes).toEqual([{taxaPercentual:1.2345,taxaFixa:0,repassarAoCliente:false,ativo:false}])
})

test('nova taxa valida repasse e parcelas e explica duplicidade sem perder o formulário', async ({page})=>{
 await setup(page)
 const writes=[]
 await page.route('http://localhost:8080/caixa/**',route=>{
  const r=route.request(),path=new URL(r.url()).pathname,ok=json=>route.fulfill({headers:feedbackHeaders,json})
  if(path==='/caixa/configuracao')return ok({politicaJuros:'ABSORVIDA_PELA_LOJA'})
  if(r.method()==='POST'){
   writes.push(r.postDataJSON())
   if(writes.length===1)return route.fulfill({status:409,headers:feedbackHeaders,json:{message:'Já existe uma taxa cadastrada para esta forma e número de parcelas'}})
   return ok({id:'new-fee',...r.postDataJSON(),repasseEfetivo:true})
  }
  return ok(envelope([]))
 })
 await page.goto('/#/ajustescaixa?aba=taxas')
 await page.getByRole('button',{name:'Nova taxa',exact:true}).click()
 const modal=page.getByRole('dialog')
 await modal.getByLabel('Forma de pagamento da taxa',{exact:true}).selectOption('PIX')
 await expect(modal.getByLabel('Parcelas da taxa',{exact:true})).toBeDisabled()
 await expect(modal.getByLabel('Parcelas da taxa',{exact:true})).toHaveValue('1')
 await modal.getByLabel('Forma de pagamento da taxa',{exact:true}).selectOption('CREDITO')
 await modal.getByLabel('Parcelas da taxa',{exact:true}).selectOption('3')
 await modal.getByLabel('Quem absorve a taxa',{exact:true}).selectOption('LOJA')
 await modal.getByLabel('Taxa percentual (%)',{exact:true}).fill('100')
 await modal.getByLabel('Taxa fixa (R$)',{exact:true}).fill('0,50')
 await modal.getByRole('button',{name:'Salvar taxa',exact:true}).click()
 await expect(modal.getByLabel('Taxa percentual (%)',{exact:true})).toHaveAttribute('aria-invalid','true')
 await modal.getByLabel('Quem absorve a taxa',{exact:true}).selectOption('CLIENTE')
 await modal.getByRole('button',{name:'Salvar taxa',exact:true}).click()
 await expect(modal.getByLabel('Taxa percentual (%)',{exact:true})).toHaveAttribute('aria-invalid','true')
 expect(writes).toHaveLength(0)
 await modal.getByLabel('Taxa percentual (%)',{exact:true}).fill('3,5000')
 await expect(modal.getByRole('complementary',{name:'Exemplo de cobrança'})).toContainText('104,15')
 await modal.getByRole('button',{name:'Salvar taxa',exact:true}).click()
 await expect(modal.getByRole('alert')).toContainText('Já existe uma taxa')
 await expect(modal.getByLabel('Taxa fixa (R$)',{exact:true})).toHaveValue('0,50')
 await expect(modal).toContainText('mesmo para taxas inativas')
 await modal.getByLabel('Parcelas da taxa',{exact:true}).selectOption('4')
 await page.setViewportSize({width:390,height:844})
 await modal.getByLabel('Taxa ativa',{exact:true}).scrollIntoViewIfNeeded()
 await expect(modal.getByRole('button',{name:'Salvar taxa',exact:true})).toBeInViewport()
 await page.screenshot({path:'test-results/cash-rate-modal-mobile.png',fullPage:true,animations:'disabled'})
 await modal.getByRole('button',{name:'Salvar taxa',exact:true}).click()
 await expect(modal).toHaveCount(0)
 expect(writes[1]).toEqual({forma:'CREDITO',parcelas:4,taxaPercentual:3.5,taxaFixa:0.5,repassarAoCliente:true,ativo:true})
 await expect(page.getByText('Taxa salva',{exact:true})).toBeVisible()
})


test('taxa com resposta incerta confirma o cadastro sem repetir a criação', async ({page})=>{
 await setup(page)
 let saved=null,posts=0
 await page.route('http://localhost:8080/caixa/**',route=>{
  const r=route.request(),url=new URL(r.url()),ok=json=>route.fulfill({headers:feedbackHeaders,json})
  if(url.pathname==='/caixa/configuracao')return ok({politicaJuros:'ABSORVIDA_PELA_LOJA'})
  if(r.method()==='POST'){posts++;saved={id:'confirmed-fee',...r.postDataJSON(),repasseEfetivo:false};return route.abort('failed')}
  return ok(envelope(saved?[saved]:[],0,Number(url.searchParams.get('tamanho')||10)))
 })
 await page.goto('/#/ajustescaixa?aba=taxas')
 await page.getByRole('button',{name:'Nova taxa',exact:true}).click()
 const modal=page.getByRole('dialog')
 await modal.getByLabel('Forma de pagamento da taxa',{exact:true}).selectOption('PIX')
 await modal.getByLabel('Taxa percentual (%)',{exact:true}).fill('0')
 await modal.getByLabel('Taxa fixa (R$)',{exact:true}).fill('0')
 await modal.getByLabel('Quem absorve a taxa',{exact:true}).selectOption('LOJA')
 await modal.getByRole('button',{name:'Salvar taxa',exact:true}).click()
 await expect(modal.getByRole('button',{name:'Salvar taxa',exact:true})).toBeDisabled()
 await modal.getByRole('button',{name:'Conferir taxa salva',exact:true}).click()
 await expect(modal).toHaveCount(0)
 await expect(page.getByRole('table').getByText('Pix',{exact:true})).toBeVisible()
 expect(posts).toBe(1)
})

test('taxas permite consulta sem exibir edição para usuário sem permissão de configurar', async ({page})=>{
 await setup(page)
 await page.route('http://localhost:8080/usuario/me',route=>route.fulfill({headers:feedbackHeaders,json:{id:'fee-viewer',name:'Consulta',profileName:'Consulta',permissoes:['CAIXA_VISUALIZAR']}}))
 await page.route('http://localhost:8080/caixa/taxas**',route=>route.fulfill({headers:feedbackHeaders,json:envelope([{id:'readonly-fee',forma:'PIX',parcelas:1,taxaPercentual:0,taxaFixa:0,repassarAoCliente:false,repasseEfetivo:false,ativo:true}])}))
 await page.goto('/#/ajustescaixa?aba=taxas')
 await expect(page.getByRole('table').getByText('Pix',{exact:true})).toBeVisible()
 await expect(page.getByRole('button',{name:'Nova taxa',exact:true})).toHaveCount(0)
 await expect(page.getByRole('button',{name:'Editar taxa',exact:true})).toHaveCount(0)
 await expect(page.getByLabel('Filtrar taxas por forma',{exact:true})).toBeVisible()
})


test('alterar senha valida confirmação e envia senha atual e nova da própria conta antes de voltar ao login', async ({page})=>{
 const calls=await setup(page,{readOnly:true})
 const writes=[]
 await page.route('http://localhost:8080/usuario/user-test',route=>{
  if(route.request().method()==='PATCH'){
   writes.push({body:route.request().postDataJSON(),csrf:route.request().headers()['x-xsrf-token']})
   return route.fulfill({headers:feedbackHeaders,json:{id:'user-test',name:'Teste'}})
  }
  return route.fulfill({headers:feedbackHeaders,json:{id:'user-test',name:'Teste'}})
 })
 await page.route('http://localhost:8080/auth/logout',route=>route.fulfill({status:204,headers:feedbackHeaders}))
 await page.goto('/#/geral?aba=seguranca')
 const card=page.getByRole('article').filter({has:page.getByRole('heading',{name:'Alterar senha',exact:true})})
 await expect(card.getByLabel('Senha atual',{exact:true})).toBeVisible()
 await card.getByLabel('Nova senha',{exact:true}).fill('abcdefgh')
 await card.getByLabel('Confirmar nova senha',{exact:true}).fill('abcdefgh')
 await card.getByRole('button',{name:'Atualizar senha',exact:true}).click()
 await expect(card.getByLabel('Senha atual',{exact:true})).toHaveAttribute('aria-invalid','true')
 expect(writes).toHaveLength(0)
 await card.getByLabel('Senha atual',{exact:true}).fill('SenhaAtual1')
 await card.getByLabel('Confirmar nova senha',{exact:true}).fill('abcdefgi')
 await card.getByRole('button',{name:'Atualizar senha',exact:true}).click()
 await expect(card.getByLabel('Confirmar nova senha',{exact:true})).toHaveAttribute('aria-invalid','true')
 expect(writes).toHaveLength(0)
 await card.getByLabel('Confirmar nova senha',{exact:true}).fill('abcdefgh')
 await card.getByRole('button',{name:'Mostrar nova senha',exact:true}).click()
 await expect(card.getByLabel('Nova senha',{exact:true})).toHaveAttribute('type','text')
 await card.getByRole('button',{name:'Ocultar nova senha',exact:true}).click()
 await card.getByRole('button',{name:'Atualizar senha',exact:true}).click()
 await expect(page).toHaveURL(/#\/login$/)
 expect(writes).toEqual([{body:{senhaAtual:'SenhaAtual1',senha:'abcdefgh'},csrf:'test-csrf'}])
 await expect(page.getByText('Senha atualizada',{exact:true})).toBeVisible()
 expect(calls.some(c=>c.path==='/auth/login')).toBe(false)
 expect(await page.evaluate(()=>Object.values(localStorage).some(value=>value.includes('abcdefgh')||value.includes('SenhaAtual1')))).toBe(false)
})

test('alterar senha preserva erros de campo do servidor e cancelar limpa as credenciais', async ({page})=>{
 await setup(page)
 let writes=0
 await page.route('http://localhost:8080/usuario/user-test',route=>{writes++;return route.fulfill({status:400,headers:feedbackHeaders,json:{message:'Senha inválida',fieldErrors:{senha:'A senha deve ter entre 8 e 72 caracteres'}}})})
 await page.goto('/#/geral?aba=seguranca')
 await page.getByLabel('Senha atual',{exact:true}).fill('SenhaAtual1')
 await page.getByLabel('Nova senha',{exact:true}).fill('TesteSenha123')
 await page.getByLabel('Confirmar nova senha',{exact:true}).fill('TesteSenha123')
 await page.getByRole('button',{name:'Atualizar senha',exact:true}).click()
 await expect(page.getByLabel('Nova senha',{exact:true})).toHaveAttribute('aria-invalid','true')
 await expect(page.getByText('A senha deve ter entre 8 e 72 caracteres',{exact:true})).toBeVisible()
 expect(writes).toBe(1)
 await page.getByRole('button',{name:'Cancelar',exact:true}).click()
 await expect(page.getByLabel('Senha atual',{exact:true})).toHaveValue('')
 await expect(page.getByLabel('Nova senha',{exact:true})).toHaveValue('')
 await expect(page.getByLabel('Confirmar nova senha',{exact:true})).toHaveValue('')
 await expect(page.getByRole('button',{name:'Atualizar senha',exact:true})).toBeDisabled()
 await page.setViewportSize({width:390,height:844})
 await page.keyboard.press('Escape')
 await page.screenshot({path:'test-results/change-password-mobile.png',fullPage:true,animations:'disabled'})
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth)).toBe(true)
})

test('alterar senha bloqueia reenvio após resposta incerta e orienta novo login', async ({page})=>{
 await setup(page)
 let writes=0
 await page.route('http://localhost:8080/usuario/user-test',route=>{writes++;return route.abort('failed')})
 await page.route('http://localhost:8080/auth/logout',route=>route.fulfill({status:204,headers:feedbackHeaders}))
 await page.goto('/#/geral?aba=seguranca')
 await page.getByLabel('Senha atual',{exact:true}).fill('SenhaAtual1')
 await page.getByLabel('Nova senha',{exact:true}).fill('TesteSenha123')
 await page.getByLabel('Confirmar nova senha',{exact:true}).fill('TesteSenha123')
 await page.getByRole('button',{name:'Atualizar senha',exact:true}).click()
 await expect(page.getByText('Confira sua senha antes de repetir',{exact:true})).toBeVisible()
 await expect(page.getByLabel('Senha atual',{exact:true})).toHaveValue('')
 await expect(page.getByLabel('Senha atual',{exact:true})).toBeDisabled()
 await expect(page.getByLabel('Nova senha',{exact:true})).toHaveValue('')
 await expect(page.getByLabel('Nova senha',{exact:true})).toBeDisabled()
 await expect(page.getByRole('button',{name:'Atualizar senha',exact:true})).toBeDisabled()
 expect(writes).toBe(1)
 await page.getByRole('button',{name:'Ir para o login',exact:true}).click()
 await expect(page).toHaveURL(/#\/login$/)
 expect(writes).toBe(1)
})


test('alterar senha com sessão expirada exige novo login sem reenviar a atualização', async ({page})=>{
 await setup(page)
 let writes=0
 await page.route('http://localhost:8080/usuario/user-test',route=>{writes++;return route.fulfill({status:401,headers:feedbackHeaders,json:{message:'Sessão expirada'}})})
 await page.route('http://localhost:8080/auth/refresh',route=>route.fulfill({status:401,headers:feedbackHeaders,json:{message:'Refresh expirado'}}))
 await page.route('http://localhost:8080/auth/logout',route=>route.fulfill({status:204,headers:feedbackHeaders}))
 await page.goto('/#/geral?aba=seguranca')
 await page.getByLabel('Senha atual',{exact:true}).fill('SenhaAtual1')
 await page.getByLabel('Nova senha',{exact:true}).fill('TesteSenha123')
 await page.getByLabel('Confirmar nova senha',{exact:true}).fill('TesteSenha123')
 await page.getByRole('button',{name:'Atualizar senha',exact:true}).click()
 await expect(page.getByRole('article',{name:'Alterar senha'}).getByRole('alert')).toContainText('Sua sessão expirou')
 await expect(page.getByLabel('Senha atual',{exact:true})).toBeDisabled()
 await expect(page.getByLabel('Nova senha',{exact:true})).toBeDisabled()
 await expect(page.getByRole('button',{name:'Cancelar',exact:true})).toHaveCount(0)
 await page.getByRole('button',{name:'Ir para o login',exact:true}).click()
 await expect(page).toHaveURL(/#\/login$/)
 expect(writes).toBe(1)
})


const dashboardContract=()=>({referencia:{geradoEm:'2026-11-16T10:00:00',inicioPeriodoMovimentacoes:'2026-06-01',fimPeriodoMovimentacoes:'2026-11-16',fusoHorario:'America/Sao_Paulo'},estoque:{totalProdutos:130,produtosComMinimoDefinido:100,produtosSemMinimoDefinido:30,criticos:17,zerados:3,saudaveis:63,saudePercentual:63,alertas:[{produtoId:vodka.id,nome:'Vodka',categoria:'Insumos',unidadeMedida:'garrafa',quantidadeAtual:200,estoqueMinimo:500,status:'CRITICO'}]},movimentacoes:{serieMensal:[{mes:'2026-11',entradas:11,saidas:4}],ultimas:[{id:900,produtoId:strawberry.id,produtoNome:'Morango',unidadeMedida:'un',direcao:'ENTRADA',tipo:'ENTRADA',quantidade:2,operador:'Teste',ocorridoEm:'2026-11-16T09:30:00'},{id:901,produtoId:vodka.id,produtoNome:'Vodka',unidadeMedida:'garrafa',direcao:'SAIDA',tipo:'PERDA',quantidade:50,operador:'Teste',ocorridoEm:'2026-11-16T09:00:00'}]},financeiro:{status:'INDISPONIVEL'},caixa:{status:'INDISPONIVEL'}})
const dashboardTurn=()=>({id:'dashboard-turn',status:'ABERTA',caixaNome:'Caixa Principal',operadorNome:'Teste',abertaEm:'2026-11-15T20:00:00',resumoAtual:{qtdVendas:2,totalVendas:300,dinheiroEsperado:175,fundoTroco:100,reforcos:25,sangrias:25,porForma:{DINHEIRO:75,PIX:125,DEBITO:0,CREDITO:100}}})

test('início apresenta tentativas de pagamento por pedido do turno sem antecipar consultas', async ({page}) => {
  await setup(page)
  const reads = []
  await page.route('http://localhost:8080/caixa/sessoes/atual**', route => route.fulfill({headers: feedbackHeaders, json: dashboardTurn()}))
  await page.route('http://localhost:8080/caixa/pedidos**', route => {
    const url = new URL(route.request().url())
    reads.push(url)
    const responses = {
      '/caixa/pedidos': envelope([{id:'a', numero:11, status:'CONCLUIDO'}, {id:'b', numero:10, status:'CANCELADO'}]),
      '/caixa/pedidos/a/pagamentos': [
        {id:'p1', forma:'PIX', status:'CANCELADO', valor:25, criadoEm:'2026-11-17T10:00:00'},
        {id:'p2', forma:'DINHEIRO', status:'APROVADO', valor:25, criadoEm:'2026-11-17T10:05:00'},
      ],
      '/caixa/pedidos/b/pagamentos': [],
    }
    return route.fulfill({headers:feedbackHeaders,json:responses[url.pathname]})
  })
  await page.goto('/#/dashboard?aba=caixa')
  const history = page.getByRole('article',{name:'Histórico de pagamentos'})
  const attempts = history.getByRole('list',{name:'Tentativas de pagamento'})
  await expect(attempts.getByText('Aprovado')).toHaveAttribute('data-tone','success')
  await expect(attempts.getByText('Cancelado')).toHaveAttribute('data-tone','danger')
  expect(reads[0].searchParams.get('sessaoCaixaId')).toBe('dashboard-turn')
  expect(reads[0].searchParams.get('tamanho')).toBe('5')
  expect(reads.some(url=>url.pathname.includes('/b/'))).toBe(false)
  await history.getByRole('button',{name:/Pedido #10/}).click()
  await expect(history).toContainText('Nenhum pagamento registrado neste pedido.')
  await expect(attempts).toHaveCount(0)
  await history.getByRole('combobox').selectOption('ESTORNADO')
  await expect.poll(()=>reads.some(url=>url.searchParams.get('status')==='ESTORNADO')).toBe(true)
  await page.setViewportSize({width:390,height:844})
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true)
})

test('início recupera resumo de validade isoladamente e abre lotes filtrados', async ({page})=>{
 await setup(page)
 let fail=true,reads=0
 await page.route('http://localhost:8080/dashboard/resumo?*',route=>route.fulfill({headers:feedbackHeaders,json:dashboardContract()}))
 await page.route('http://localhost:8080/caixa/sessoes/atual**',route=>route.fulfill({status:204,headers:feedbackHeaders}))
 await page.route('http://localhost:8080/lotes/resumo',route=>{reads++;return fail?route.fulfill({status:500,headers:feedbackHeaders,json:{message:'Falha somente em validades'}}):route.fulfill({headers:feedbackHeaders,json:{referencia:'2026-11-16',lotesComSaldo:11,vencidos:3,vencemEm7Dias:2,vencemEm30Dias:1,semValidade:1,valorVencido:5.25,valorEmRisco:15.5}})})
 await page.goto('/#/dashboard')
 const expiry=page.getByRole('article',{name:'Resumo de validades',exact:true})
 await expect(expiry).toContainText('Falha somente em validades')
 const restock = page.getByRole('article',{name:'Alertas prioritários de estoque',exact:true})
 await expect(restock.getByText('Falta para o mínimo',{exact:true}).locator('..')).toContainText('300 ml')
 fail=false
 await expiry.getByRole('button',{name:'Tentar novamente',exact:true}).click()
 await expect(expiry).toContainText('16/11/2026')
 await expect(expiry.locator('[data-tone="expired"]')).toContainText('5,25')
 await expect(expiry.locator('[data-tone="upcoming"]')).toContainText('10,25')
 await expect(expiry.getByRole('button', {name:'Lotes vencidos 3'})).toBeVisible()
 await expect(expiry.getByRole('button', {name:'Vencem em até 7 dias 2'})).toBeVisible()
 await expect(expiry.getByRole('button',{name:'Validade acima de 30 dias 4',exact:true})).toBeVisible()
 await expect(expiry).toContainText('11 lotes com saldo de produtos ativos')
 const distribution = expiry.getByRole('term').filter({hasText:'Exigem atenção'}).locator('..')
 await expect(distribution).toBeHidden()
 await expiry.getByText('Ver distribuição',{exact:true}).click()
 await expect(distribution).toContainText('54,5%')
 expect(reads).toBe(2)
 await page.getByRole('button',{name:'Sobre Saúde do estoque',exact:true}).hover()
 await expect(page.getByRole('tooltip')).toContainText('1,5 vez o mínimo')
 await page.getByLabel('Período do gráfico',{exact:true}).selectOption('3')
 await expect(page.getByRole('heading',{name:'Movimentação de estoque · 3 meses',exact:true})).toBeVisible()
 expect(reads).toBe(2)
 await expiry.getByRole('button',{name:'Lotes vencidos 3'}).click()
 await expect(page).toHaveURL(/validades.*situacao=VENCIDO/)
})

test('início usa indicadores globais, movimentos limitados e caixa real sem carregar catálogo inteiro', async ({page})=>{
 const calls=await setup(page)
 await page.addInitScript(()=>localStorage.setItem('valhalla:store:v2',JSON.stringify({version:2,products:[],drinks:[],movements:[],sales:[{em:new Date().toISOString(),total:999999,pagamentos:[],troco:0}],caixa:{valorInicial:888888}})))
 const requests=[]
 let cashReads=0,stockFails=false
 await page.route('http://localhost:8080/dashboard/resumo?*',route=>{requests.push(Object.fromEntries(new URL(route.request().url()).searchParams));return stockFails?route.fulfill({status:500,headers:feedbackHeaders,json:{message:'Falha na atualização do estoque'}}):route.fulfill({headers:feedbackHeaders,json:dashboardContract()})})
 await page.route('http://localhost:8080/caixa/sessoes/atual**',route=>{cashReads++;return route.fulfill({headers:feedbackHeaders,json:dashboardTurn()})})
 await page.goto('/#/dashboard')
 const indicators=page.getByRole('region',{name:'Indicadores da operação',exact:true})
 const indicator=name=>indicators.getByRole('article').filter({has:page.getByText(name,{exact:true})})
 await expect(indicator('Estoque crítico').locator('b').first()).toHaveText('17')
 await expect(indicator('Saúde do estoque').locator('b').first()).toHaveText('63%')
 await expect(indicator('Produtos zerados').locator('b').first()).toHaveText('3')
 await expect(indicator('Lotes vencidos').locator('b').first()).toHaveText('1')
 expect(cashReads).toBe(0)
 await expect(page.getByText('Faturamento hoje',{exact:true})).toHaveCount(0)
 await expect(page.getByText(/999.999/)).toHaveCount(0)
 const alerts=page.getByRole('article',{name:'Alertas prioritários de estoque',exact:true})
 await expect(alerts).toContainText('200 ml')
 await expect(alerts).toContainText('Mostrando o mais crítico de um total de 17 produtos abaixo do mínimo.')
 await expect(alerts.getByRole('meter',{name:'Produtos com mínimo definido'})).toBeHidden()
 await alerts.getByText('Cobertura do estoque mínimo',{exact:true}).click()
 await expect(alerts.getByRole('meter',{name:'Produtos com mínimo definido'})).toHaveAttribute('aria-valuenow','77')
 await expect(alerts.getByRole('region',{name:'Cobertura do estoque mínimo'})).toContainText('30 sem mínimo')
 await expect(alerts.locator('[data-tone="near"] dd:first-of-type')).toHaveText('20')
 const chart = page.getByRole('article',{name:'Série de movimentações'})
 await expect(chart).toContainText('Mês com mais saídas')
 await expect(chart).toContainText('novembro de 2026')
 await expect(chart).toContainText('4 lançamentos')
 const movements=page.getByRole('article',{name:'Últimas movimentações',exact:true})
 await expect(movements).toContainText('+2 un')
 await expect(movements).toContainText('−50 ml')
 await expect(page.getByRole('article',{name:'Pagamentos aprovados no turno',exact:true})).toHaveCount(0)
 expect(calls.filter(call=>call.path==='/produtos')).toHaveLength(0)
 expect(calls.filter(call=>call.path==='/movimentacoes-estoque')).toHaveLength(0)
 expect(calls.filter(call=>call.path.endsWith('/receita'))).toHaveLength(0)
 expect(new Set(calls.filter(call=>call.path.startsWith('/produtos/')).map(call=>call.path)).size).toBe(2)
 await page.getByLabel('Período do gráfico',{exact:true}).selectOption('9')
 await expect.poll(()=>requests.at(-1)?.meses).toBe('9')
 await expect(page.getByRole('heading',{name:'Movimentação de estoque · 9 meses',exact:true})).toBeVisible()
 expect(cashReads).toBe(0)
 const downloadEvent=page.waitForEvent('download')
 await page.getByRole('button',{name:'Exportar',exact:true}).click()
 const download=await downloadEvent
 const {readFile}=await import('node:fs/promises')
 const csv=await readFile(await download.path(),'utf8')
 expect(csv).toContain('Entradas (lançamentos)')
 expect(csv).toContain('2026-11;11;4')
 await page.screenshot({path:'test-results/dashboard-remote-desktop.png',fullPage:true,animations:'disabled'})
 await page.setViewportSize({width:390,height:844})
 await page.keyboard.press('Escape')
 await page.screenshot({path:'test-results/dashboard-remote-mobile.png',fullPage:true,animations:'disabled'})
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth)).toBe(true)
 stockFails=true
 await page.getByRole('button',{name:'Atualizar início',exact:true}).click()
 await expect(page.getByRole('alert')).toContainText('Falha na atualização do estoque')
 await expect(indicator('Estoque crítico').locator('b').first()).toHaveText('—')
 await expect(page.getByRole('button',{name:'Exportar',exact:true})).toBeDisabled()
 const stockReads=requests.length
 await page.getByRole('navigation',{name:'Módulos da visão geral'}).getByRole('link',{name:'Caixa',exact:true}).click()
 await expect(indicator('Recebido no turno')).toContainText('300,00')
 await expect(indicator('Pedidos com pagamento').locator('b').first()).toHaveText('2')
 await expect(indicator('Média recebida por pedido')).toContainText('150,00')
 await expect(indicator('Dinheiro esperado')).toContainText('175,00')
 const drawer=page.getByRole('article',{name:'Composição da gaveta'})
 await expect(drawer).toContainText('Sangrias')
 await expect(drawer).toContainText('− R$')
 await expect(page.getByRole('article',{name:'Pagamentos aprovados no turno'})).toContainText('Pix')
 await page.getByRole('button',{name:'Atualizar início',exact:true}).click()
 await expect.poll(()=>cashReads).toBe(2)
 expect(requests.length).toBe(stockReads)
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth)).toBe(true)
})

test('início separa falhas de estoque e caixa e não apresenta falta de dados como zero ou caixa fechado', async ({page})=>{
 await setup(page)
 let stockFails=true,cashFails=true
 await page.route('http://localhost:8080/dashboard/resumo?*',route=>{
  if(stockFails)return route.fulfill({status:500,headers:feedbackHeaders,json:{message:'Falha no resumo de estoque'}})
  const data=dashboardContract();data.estoque={totalProdutos:0,produtosComMinimoDefinido:0,produtosSemMinimoDefinido:0,criticos:0,zerados:0,saudaveis:0,saudePercentual:100,alertas:[]};data.movimentacoes={serieMensal:[],ultimas:[]}
  return route.fulfill({headers:feedbackHeaders,json:data})
 })
 await page.route('http://localhost:8080/caixa/sessoes/atual**',route=>cashFails?route.fulfill({status:503,headers:feedbackHeaders,json:{message:'Falha ao consultar caixa'}}):route.fulfill({status:204,headers:feedbackHeaders}))
 await page.goto('/#/dashboard')
 const indicators=page.getByRole('region',{name:'Indicadores da operação',exact:true}),stat=name=>indicators.getByRole('article').filter({has:page.getByText(name,{exact:true})})
 await expect(stat('Estoque crítico').locator('b').first()).toHaveText('—')
 await expect(stat('Recebido no turno')).toHaveCount(0)
 await expect(page.getByText('Sem turno aberto',{exact:true})).toHaveCount(0)
 stockFails=false
 await page.getByRole('alert').filter({hasText:'Falha no resumo de estoque'}).getByRole('button',{name:'Tentar novamente',exact:true}).click()
 await expect(stat('Estoque crítico').locator('b').first()).toHaveText('0')
 await expect(stat('Saúde do estoque').locator('b').first()).toHaveText('—')
 await expect(stat('Saúde do estoque')).toContainText('Nenhum produto com mínimo definido')
 await page.getByRole('navigation',{name:'Módulos da visão geral'}).getByRole('link',{name:'Caixa',exact:true}).click()
 await expect(page.getByRole('alert')).toContainText('Falha ao consultar caixa')
 await expect(page.getByText('Sem turno aberto',{exact:true})).toHaveCount(0)
 cashFails=false
 await page.getByRole('alert').getByRole('button',{name:'Tentar novamente',exact:true}).click()
 await expect(page.getByText('Sem turno aberto',{exact:true})).toBeVisible()
 await expect(stat('Recebido no turno')).toHaveCount(0)
})

for(const access of ['stock','cash'])test('início respeita acesso parcial de '+access+' sem consultar módulos proibidos', async ({page})=>{
 const calls=await setup(page,{readOnly:true})
 await page.route('http://localhost:8080/usuario/me',route=>route.fulfill({headers:feedbackHeaders,json:{id:'partial-dashboard',name:'Consulta',profileName:access==='cash'?'Caixa':'Somente leitura',permissoes:[access==='stock'?'VISUALIZAR_ESTOQUE':'CAIXA_VISUALIZAR']}}))
 let stockCalls=0,cashCalls=0
 await page.route('http://localhost:8080/dashboard/resumo?*',route=>{stockCalls++;return route.fulfill({headers:feedbackHeaders,json:dashboardContract()})})
 await page.route('http://localhost:8080/caixa/sessoes/atual**',route=>{cashCalls++;return route.fulfill({headers:feedbackHeaders,json:dashboardTurn()})})
 await page.goto('/#/dashboard')
 const nav=page.getByRole('navigation',{name:'Módulos da visão geral'})
 await expect(nav.getByRole('link')).toHaveCount(1)
 if(access==='stock'){
  await expect(page.getByRole('heading',{name:'Últimas movimentações',exact:true})).toBeVisible()
  await expect(page.getByRole('article',{name:'Pagamentos aprovados no turno',exact:true})).toHaveCount(0)
  expect(cashCalls).toBe(0)
 }else{
  await expect(page.getByRole('article',{name:'Pagamentos aprovados no turno',exact:true})).toBeVisible()
  await expect(page.getByRole('heading',{name:'Últimas movimentações',exact:true})).toHaveCount(0)
  expect(stockCalls).toBe(0)
  expect(calls.filter(call=>call.path==='/lotes/resumo')).toHaveLength(0)
 }
 expect(calls.filter(call=>call.path==='/produtos')).toHaveLength(0)
})


test('início mantém unidade-base explícita quando não consegue confirmar fracionamento', async ({page})=>{
 await setup(page,{readOnly:true})
 await page.route('http://localhost:8080/dashboard/resumo?*',route=>route.fulfill({headers:feedbackHeaders,json:dashboardContract()}))
 await page.route('http://localhost:8080/produtos/'+vodka.id,route=>route.fulfill({status:503,headers:feedbackHeaders,json:{message:'Produto indisponível'}}))
 await page.goto('/#/dashboard')
 const alerts=page.getByRole('article',{name:'Alertas prioritários de estoque',exact:true})
 await expect(alerts).toContainText('200 (unidade-base)')
 await expect(alerts).toContainText('As quantidades sem unidade confirmada estão em unidade-base.')
 await expect(alerts.getByText(/200 garrafa/)).toHaveCount(0)
 await expect(page.getByText('63%',{exact:true})).toBeVisible()
})

test('sair sem caixa aberto encerra acesso sem tentar fechamento', async ({page})=>{
 await setup(page)
 let logout=0,closing=0
 await page.route('http://localhost:8080/caixa/**',route=>{if(route.request().method()==='POST')closing++;return route.fulfill({status:204,headers:feedbackHeaders})})
 await page.route('http://localhost:8080/auth/logout',route=>{logout++;return route.fulfill({status:204,headers:feedbackHeaders})})
 await page.goto('/#/categorias')
 await page.getByRole('button',{name:'Sair',exact:true}).click()
 await expect.poll(()=>logout).toBe(1)
 expect(closing).toBe(0)
 await expect(page.getByRole('button',{name:'Sair',exact:true})).toHaveCount(0)
})

test('sair com caixa aberto exige contagem e fecha antes de revogar acesso', async ({page})=>{
 await setup(page)
 const events=[],bodies=[]
 await page.route('http://localhost:8080/caixa/**',route=>{
  if(route.request().method()==='POST'){events.push('fechar');bodies.push(route.request().postDataJSON());return route.fulfill({headers:feedbackHeaders,json:{id:'logout-turn',status:'FECHADA'}})}
  return route.fulfill({headers:feedbackHeaders,json:{id:'logout-turn',caixaNome:'Caixa Principal',status:'ABERTA',resumoAtual:{dinheiroEsperado:100}}})
 })
 await page.route('http://localhost:8080/auth/logout',route=>{events.push('logout');return route.fulfill({status:204,headers:feedbackHeaders})})
 await page.goto('/#/categorias')
 await page.getByRole('button',{name:'Sair',exact:true}).click()
 const dialog=page.getByRole('dialog')
 await dialog.getByRole('button',{name:'Fechar caixa e sair',exact:true}).click()
 await expect(dialog.getByRole('alert')).toContainText('Informe o dinheiro contado')
 expect(events).toEqual([])
 await dialog.getByLabel('Dinheiro contado (R$)',{exact:true}).fill('100')
 await dialog.getByRole('button',{name:'Fechar caixa e sair',exact:true}).click()
 await expect.poll(()=>events).toEqual(['fechar','logout'])
 expect(bodies).toEqual([{dinheiroContado:100,justificativaDivergencia:null,observacao:null}])
})

test('sair respeita pagamentos pendentes e informa fechamento com divergência', async ({page})=>{
 await setup(page)
 let posts=0,logout=0
 await page.route('http://localhost:8080/caixa/**',route=>{
  if(route.request().method()==='POST'){posts++;return posts===1?route.fulfill({status:409,headers:feedbackHeaders,json:{message:'Não é possível fechar o caixa enquanto houver pagamentos pendentes'}}):route.fulfill({headers:feedbackHeaders,json:{id:'logout-turn',status:'EM_FECHAMENTO'}})}
  return route.fulfill({headers:feedbackHeaders,json:{id:'logout-turn',status:'ABERTA',resumoAtual:{dinheiroEsperado:100}}})
 })
 await page.route('http://localhost:8080/auth/logout',route=>{logout++;return route.fulfill({status:204,headers:feedbackHeaders})})
 await page.goto('/#/categorias')
 await page.getByRole('button',{name:'Sair',exact:true}).click()
 let dialog=page.getByRole('dialog')
 await dialog.getByLabel('Dinheiro contado (R$)',{exact:true}).fill('80')
 await dialog.getByRole('button',{name:'Fechar caixa e sair',exact:true}).click()
 await expect(dialog.getByRole('alert')).toContainText('Informe a justificativa')
 expect(posts).toBe(0)
 await dialog.getByRole('textbox',{name:'Justificativa da diferença',exact:false}).fill('Diferença na conferência')
 await dialog.getByRole('button',{name:'Fechar caixa e sair',exact:true}).click()
 await expect(dialog.getByRole('alert')).toContainText('pagamentos pendentes')
 expect(logout).toBe(0)
 await dialog.getByRole('button',{name:'Fechar caixa e sair',exact:true}).click()
 dialog=page.getByRole('dialog')
 await expect(dialog).toContainText('ainda não está definitivamente fechada')
 expect(logout).toBe(0)
 await dialog.getByRole('button',{name:'Sair do sistema',exact:true}).click()
 await expect.poll(()=>logout).toBe(1)
})

test('fechamento no logout sem confirmação é conferido sem repetir a operação', async ({page})=>{
 await setup(page)
 let posts=0,logout=0,checks=0
 await page.route('http://localhost:8080/caixa/**',route=>{
  const path=new URL(route.request().url()).pathname
  if(route.request().method()==='POST'){posts++;return route.fulfill({status:500,headers:feedbackHeaders,json:{message:'Resposta indisponível'}})}
  if(path==='/caixa/sessoes/logout-turn'){checks++;return route.fulfill({headers:feedbackHeaders,json:{id:'logout-turn',status:'FECHADA'}})}
  return route.fulfill({headers:feedbackHeaders,json:{id:'logout-turn',status:'ABERTA',resumoAtual:{dinheiroEsperado:0}}})
 })
 await page.route('http://localhost:8080/auth/logout',route=>{logout++;return route.fulfill({status:204,headers:feedbackHeaders})})
 await page.goto('/#/categorias')
 await page.getByRole('button',{name:'Sair',exact:true}).click()
 const dialog=page.getByRole('dialog')
 await dialog.getByLabel('Dinheiro contado (R$)',{exact:true}).fill('0')
 await dialog.getByRole('button',{name:'Fechar caixa e sair',exact:true}).click()
 await expect(dialog).toContainText('Fechamento sem confirmação')
 expect(logout).toBe(0)
 await dialog.getByRole('button',{name:'Conferir fechamento',exact:true}).click()
 await expect.poll(()=>logout).toBe(1)
 expect(posts).toBe(1);expect(checks).toBe(1)
})

// Verifica a largura útil do painel e dos pop-ups sem bloquear a rolagem interna de tabelas.
async function expectResponsiveBounds(page, screen, widths = [320, 390, 768, 1024, 1440]) {
  for (const width of widths) {
    await page.setViewportSize({ width, height: width === 320 ? 568 : width === 390 ? 720 : 900 })
    const issues = await page.evaluate(() => {
      const visible = element => element.getClientRects().length && getComputedStyle(element).visibility !== 'hidden'
      const spills = element => {
        const rect = element.getBoundingClientRect()
        return rect.left < -1 || rect.right > innerWidth + 1
      }
      const scrollsInside = element => {
        for (let parent = element.parentElement; parent && parent.tagName !== 'MAIN'; parent = parent.parentElement) {
          if (parent.scrollWidth > parent.clientWidth + 1 && ['auto', 'scroll'].includes(getComputedStyle(parent).overflowX)) return true
        }
        return false
      }
      const describe = element => element.getAttribute('aria-label') || element.innerText?.trim().slice(0, 72) || element.tagName
      const results = []
      if (document.documentElement.scrollWidth > innerWidth + 1) results.push('Página: ' + document.documentElement.scrollWidth)
      for (const element of document.querySelectorAll('main, [role="dialog"]')) {
        if (visible(element) && (spills(element) || element.scrollWidth > element.clientWidth + 1)) {
          results.push(describe(element) + ' (' + element.scrollWidth + '/' + element.clientWidth + ')')
        }
      }
      for (const dialog of document.querySelectorAll('[role="dialog"]')) {
        if (!visible(dialog)) continue
        const bounds = dialog.getBoundingClientRect()
        if (bounds.top < -1 || bounds.bottom > innerHeight + 1) results.push('Altura do diálogo: ' + describe(dialog))
        for (const child of dialog.children) {
          if (child.clientWidth && child.scrollWidth > child.clientWidth + 1 && getComputedStyle(child).overflowX === 'auto') {
            results.push('Rolagem horizontal no corpo do diálogo: ' + describe(dialog))
          }
        }
      }
      for (const element of document.querySelectorAll('main button, main input, main select, main textarea, [role="dialog"] button')) {
        if (visible(element) && spills(element) && !scrollsInside(element)) results.push(describe(element))
      }
      for (const option of document.querySelectorAll('main [role="radiogroup"] button')) {
        if (!visible(option)) continue
        const bounds = option.getBoundingClientRect()
        const label = document.createRange()
        label.selectNodeContents(option)
        const textBounds = label.getBoundingClientRect()
        if (textBounds.left < bounds.left - 2 || textBounds.right > bounds.right + 2) results.push('Rótulo cortado: ' + describe(option))
      }
      return [...new Set(results)].slice(0, 16)
    })
    expect.soft(issues, screen + ' a ' + width + ' px').toEqual([])
  }
}

test('painel operacional e formulários mantêm a largura útil de celular a desktop', async ({ page }) => {
  test.setTimeout(100_000)
  await setup(page)
  const user = { id: 'user-test', nome: 'Teste de responsividade', email: 'teste@valhalla.local', status: 'ATIVO', perfilId: 'p1', perfilNome: 'Administrador' }
  const cashBox = { id: 'box-responsive', nome: 'Caixa Principal do estabelecimento', ativo: true, terminais: [] }
  const session = { id: 'session-responsive', caixaId: cashBox.id, caixaNome: cashBox.nome, operadorNome: user.nome, status: 'ABERTA', resumoAtual: dashboardTurn().resumoAtual }
  const order = { id: 'order-responsive', numero: 803, sessaoCaixaId: session.id, status: 'EM_ATENDIMENTO', total: 20,
    saldoRestante: 20, totalPago: 0, pagamentos: [], itens: [{id: 1, produtoId: strawberry.id, descricaoProduto: 'Morango', quantidade: 10, precoUnitario: 2, subtotal: 20}] }
  const policy = { dinheiroHabilitado: true, creditoHabilitado: true, debitoHabilitado: true, pixHabilitado: true, pointHabilitado: false, parcelamentoHabilitado: true, parcelasMinimas: 2, parcelasMaximas: 12, valorMinimoParcela: 10 }
  await page.route('http://localhost:8080/usuario', route => route.fulfill({ headers: feedbackHeaders, json: [user] }))
  await page.route('http://localhost:8080/usuario/user-test', route => route.fulfill({ headers: feedbackHeaders, json: user }))
  await page.route('http://localhost:8080/autorizacoes/**', route => {
    const path = new URL(route.request().url()).pathname
    const profile = { id: 'p1', nome: 'Administrador', descricao: '', codigosFuncionalidades: ['VISUALIZAR_ESTOQUE'] }
    const json = path.endsWith('/funcionalidades') ? [
      { codigo: 'VISUALIZAR_ESTOQUE', nome: 'Consultar estoque', descricao: 'Consulta de produtos e saldos' },
      { codigo: 'CAIXA_CONFIGURAR', nome: 'Configurar caixa e formas de pagamento', descricao: 'Alteração de políticas de pagamento' },
    ] : path.endsWith('/perfis/p1') ? profile
      : path.endsWith('/perfis') ? [profile]
      : { permissoesPerfil: ['VISUALIZAR_ESTOQUE'], sobrescritas: [], permissoesEfetivas: ['VISUALIZAR_ESTOQUE'] }
    return route.fulfill({ headers: feedbackHeaders, json })
  })
  await page.route('http://localhost:8080/dashboard/resumo?*', route => route.fulfill({ headers: feedbackHeaders, json: dashboardContract() }))
  let open = true
  await page.route('http://localhost:8080/caixa/**', route => {
    const path = new URL(route.request().url()).pathname
    const ok = json => route.fulfill({ headers: feedbackHeaders, json })
    if (path === '/caixa/sessoes/atual') return open ? ok(session) : route.fulfill({ status: 204, headers: feedbackHeaders })
    if (path === '/caixa/pedidos/' + order.id) return ok(order)
    if (path === '/caixa/pedidos') return ok(envelope(new URL(route.request().url()).searchParams.get('status') === order.status ? [order] : []))
    if (path === '/caixa/configuracao') return ok(policy)
    if (path === '/caixa/caixas') return ok(envelope([cashBox]))
    if (path === '/caixa/taxas') return ok(envelope([{ id: 'taxa', forma: 'CREDITO', parcelas: 2, taxaPercentual: 3, taxaFixa: 0, ativo: true, repasseEfetivo: false }]))
    return ok(envelope([]))
  })
  const screens = [
    ['dashboard', 'Visão geral', 'Prioridades de reposição'],
    ['dashboard?aba=caixa', 'Visão geral', 'Composição da gaveta'],
    ['produtos', 'Produtos e drinks', 'Filtro de produtos'],
    ['categorias', 'Categorias', 'Filtros de categorias'],
    ['novo', 'Novo produto', 'Produto padrão'],
    ['editar?id=' + strawberry.id, 'Editar produto', 'Identificação'],
    ['movimentacoes', 'Movimentações', 'Ver detalhes'],
    ['novamovimentacao?produto=' + vodka.id, 'Nova movimentação'],
    ['reposicao', 'Reposição', 'Buscar nome'],
    ['validades', 'Validades e lotes', 'Lotes vencidos'],
    ['caixa?pedidoId=' + order.id, 'Caixa', 'Selecione os itens'],
    ['pedidos', 'Pedidos', 'Filtros de pedidos'],
    ['sessoescaixa', 'Sessões de caixa', 'Filtros de sessões de caixa'],
    ['auditoria', 'Auditoria do caixa', 'Filtros de auditoria'],
    ['ajustescaixa?aba=configuracao', 'Ajustes do caixa', 'Editar políticas'],
    ['notafiscal', 'Notas fiscais'],
    ['usuarios', 'Usuários', 'Teste de responsividade'],
    ['novousuario', 'Novo usuário', 'Dados da conta'],
    ['perfis', 'Perfis de acesso', 'Administrador'],
    ['novoperfil', 'Novo perfil', 'Funcionalidades'],
    ['geral', 'Configurações gerais', 'Dados da adega'],
  ]
  for (const [path, title, content] of screens) {
    await page.goto('/#/' + path)
    await expect(page.getByRole('main').getByRole('heading', { level: 1 })).toContainText(title)
    if (content) await expect(page.getByText(content, { exact: true }).first()).toBeVisible()
    if (path.startsWith('novamovimentacao')) await expect(page.getByRole('spinbutton', { name: 'Quantidade', exact: true })).toBeVisible()
    await expectResponsiveBounds(page, path)
    if (path === 'dashboard') {
      const restock = await page.getByRole('article', { name: 'Alertas prioritários de estoque', exact: true }).boundingBox()
      const expiry = await page.getByRole('article', { name: 'Resumo de validades', exact: true }).boundingBox()
      expect(Math.abs(restock.y - expiry.y)).toBeLessThan(1)
      expect(Math.abs(restock.width - expiry.width)).toBeLessThan(1)
      expect(Math.abs(restock.height - expiry.height)).toBeLessThan(1)
    }
    if (path === 'produtos') {
      await page.setViewportSize({ width: 1024, height: 900 })
      const margin = page.getByRole('button', { name: 'Margem', exact: true })
      const search = page.getByRole('searchbox', { name: 'Buscar nome', exact: true })
      const indicatorGroup = margin.locator('../..')
      await expect(indicatorGroup).toBeVisible()
      expect((await indicatorGroup.boundingBox()).width).toBeLessThan((await search.boundingBox()).width)
      expect(await indicatorGroup.evaluate(group => {
        const buttonsWidth = Array.from(group.children).reduce((width, child) => width + child.getBoundingClientRect().width, 0)
        return Math.abs(group.getBoundingClientRect().width - buttonsWidth - 2)
      })).toBeLessThanOrEqual(1)
    }
    if (path === 'produtos' || path === 'categorias' || path === 'movimentacoes') {
      const action = path === 'produtos' ? 'Etiqueta' : path === 'categorias' ? 'Nova categoria' : 'Ver detalhes'
      await page.getByRole('button', { name: action, exact: true }).first().click()
      await expect(page.getByRole('dialog')).toBeVisible()
      await expectResponsiveBounds(page, path + ' / ' + action)
      await page.keyboard.press('Escape')
      await expect(page.getByRole('dialog')).toHaveCount(0)
    }
    if (path === 'novo') {
      await page.getByRole('button', { name: /Produto padrão/ }).click()
      await expect(page.getByRole('heading', { name: 'Fracionamento', exact: true })).toBeVisible()
      await expectResponsiveBounds(page, 'Novo produto padrão')
      await page.goto('/#/produtos')
      await page.goto('/#/novo')
      await page.getByRole('button', { name: /Drink \/ Copo artesanal/ }).click()
      await expect(page.getByRole('heading', { name: 'Receita', exact: true })).toBeVisible()
      await expectResponsiveBounds(page, 'Novo drink')
    }
    if (path.startsWith('caixa?')) {
      await page.setViewportSize({width: 390, height: 900})
      await page.getByRole('button', {name:'Exibir atendimento'}).click()
      const receive = page.getByRole('button', {name: 'Receber pagamento', exact: true})
      await expect(receive).toBeVisible()
      await expectResponsiveBounds(page, 'Atendimento do caixa')
      await receive.click()
      await expect(page.getByRole('dialog')).toBeVisible()
      await expectResponsiveBounds(page, 'Receber pagamento')
      await page.keyboard.press('Escape')
      await expect(page.getByRole('dialog')).toHaveCount(0)
    }
    if (path === 'usuarios' || path === 'perfis') {
      const trigger = path === 'usuarios' ? 'Ações de Teste de responsividade' : 'Ações do perfil Administrador'
      await page.getByRole('button', { name: trigger, exact: true }).click()
      await page.getByRole('menuitem', { name: 'Ver detalhes', exact: true }).click()
      await expect(page.getByRole('dialog')).toBeVisible()
      await expectResponsiveBounds(page, path + ' / detalhes')
      await page.keyboard.press('Escape')
      await expect(page.getByRole('dialog')).toHaveCount(0)
    }
    if (path.startsWith('ajustescaixa')) {
      await page.getByRole('button', { name: 'Editar políticas', exact: true }).click()
      await expect(page.getByRole('dialog')).toBeVisible()
      await expectResponsiveBounds(page, 'Editar políticas do caixa')
      await page.keyboard.press('Escape')
      await expect(page.getByRole('dialog')).toHaveCount(0)
      for (const tab of ['Caixas e maquininhas', 'Taxas e repasse']) {
        await page.getByRole('link', { name: tab, exact: true }).click()
        await expect(page.getByRole('link', { name: tab, exact: true })).toHaveAttribute('aria-current', 'page')
        const action = tab === 'Caixas e maquininhas' ? 'Novo caixa' : 'Nova taxa'
        await expect(page.getByRole('button', { name: action, exact: true })).toBeVisible()
        await expectResponsiveBounds(page, tab)
        await page.getByRole('button', { name: action, exact: true }).click()
        await expect(page.getByRole('dialog')).toBeVisible()
        await expectResponsiveBounds(page, action)
        await page.keyboard.press('Escape')
        await expect(page.getByRole('dialog')).toHaveCount(0)
      }
    }
    if (path === 'geral') {
      for (const tab of ['Segurança', 'Geral']) {
        await page.getByRole('link', { name: tab, exact: true }).click()
        await expect(page.getByRole('region', { name: tab, exact: true })).toBeVisible()
        await expectResponsiveBounds(page, tab)
      }
    }
  }
  open = false
  await page.goto('/#/caixa')
  await expect(page.getByRole('heading', { name: 'Abrir caixa', exact: true })).toBeVisible()
  await expectResponsiveBounds(page, 'Abertura do caixa')
  await page.goto('/#/entradanf')
  await expect(page.getByRole('dialog')).toBeVisible()
  await expectResponsiveBounds(page, 'Importação por XML')
})

test('apresentação, login e recuperação cabem de celular a desktop', async ({ page }) => {
  await setup(page)
  for (const path of ['', 'demo', 'login', 'forgot']) {
    await page.goto('/#/' + path)
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
    await expectResponsiveBounds(page, path || 'Página inicial')
  }
})

test('prévia pública usa indicadores do painel e filtros sobre dados simulados', async ({ page }) => {
  const calls = await setup(page)
  await page.goto('/#/demo')
  const modules = page.getByRole('tablist', { name: 'Módulos da demonstração' })
  const preview = page.getByRole('tabpanel')
  await expect(preview.getByText('Saúde do estoque', { exact: true })).toBeVisible()
  await expect(preview.getByRole('heading', { name: 'Prioridades de reposição' })).toBeVisible()
  await preview.getByRole('button', { name: 'Caixa', exact: true }).click()
  await expect(preview.getByText('Recebido no turno', { exact: true })).toBeVisible()
  await expect(preview.getByText('R$ 805,70', { exact: true })).toBeVisible()

  await modules.getByRole('tab', { name: 'Produtos e drinks' }).click()
  await preview.getByRole('group', { name: 'Tipo', exact: true }).getByRole('button', { name: 'Drinks' }).click()
  await preview.getByRole('group', { name: 'Status', exact: true }).getByRole('button', { name: 'Inativos' }).click()
  await expect(preview.getByRole('rowheader', { name: 'Negroni' })).toBeVisible()
  await expect(preview.getByRole('rowheader', { name: 'Gin tônica' })).toHaveCount(0)
  await preview.getByRole('searchbox', { name: 'Buscar nome' }).fill('DRK-002')
  await expect(preview.getByRole('rowheader', { name: 'Negroni' })).toBeVisible()

  await modules.getByRole('tab', { name: 'Reposição' }).click()
  await expect(preview.getByRole('heading', { name: 'Sem mínimo definido' })).toBeVisible()
  await modules.getByRole('tab', { name: 'Financeiro' }).click()
  await expect(preview.getByRole('heading', { name: 'Saldo financeiro acumulado' })).toBeVisible()
  await expect(preview.getByRole('heading', { name: 'Fluxo de caixa' })).toBeVisible()
  await preview.getByRole('button', { name: 'Resultado e vendas' }).click()
  await expect(preview.getByText('R$ 12.680,00', { exact: true }).first()).toBeVisible()
  await expect(preview.getByText('R$ 25.050,00', { exact: true })).toBeVisible()
  expect(calls).toEqual([])
})

test('exportação da página envia os IDs e filtros ao servidor', async ({page}) => {
  await setup(page)
  let query
  await page.route('http://localhost:8080/produtos/exportar?*', route => {
    query = new URL(route.request().url()).searchParams
    return route.fulfill({headers:feedbackHeaders,contentType:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',body:'planilha'})
  })
  await page.goto('/#/produtos?busca=mor')
  const download = page.waitForEvent('download')
  await page.getByRole('button',{name:'Exportar',exact:true}).click()
  expect((await download).suggestedFilename()).toMatch(/\.xlsx$/)
  expect(query.getAll('ids')).toEqual([strawberry.id])
  expect(query.get('busca')).toBe('mor')
})

test('estorno integral exige confirmação e atualiza o pedido', async ({page}) => {
  await setup(page)
  let order = {id:'pedido-teste',numero:7,status:'CONCLUIDO',total:10,totalPago:10,saldoRestante:0,itens:[],pagamentos:[]}
  const bodies = []
  await page.route('http://localhost:8080/caixa/**', route => {
    const path = new URL(route.request().url()).pathname
    if (path.endsWith('/estorno')) {
      bodies.push(route.request().postDataJSON())
      order = {...order,status:'ESTORNADO'}
    }
    return route.fulfill({headers:feedbackHeaders,json:path==='/caixa/pedidos'?envelope([order]):order})
  })
  await page.goto('/#/pedidos')
  await page.getByRole('button',{name:'Ver detalhes',exact:true}).click()
  await page.getByRole('button',{name:'Estornar pedido',exact:true}).click()
  expect(bodies).toHaveLength(0)
  await page.getByLabel('Motivo').fill('Desistência do cliente')
  await page.getByRole('button',{name:'Confirmar estorno'}).click()
  await expect.poll(()=>bodies).toEqual([{motivo:'Desistência do cliente'}])
  await expect(page.getByRole('button',{name:'Estornar pedido',exact:true})).toHaveCount(0)
})
test('pedido permite emitir NFC-e pendente e recupera nota após resposta incerta', async ({page}) => {
 await setup(page)
 const order={id:'pedido-fiscal',numero:345,status:'CONCLUIDO',concluidoEm:'2026-11-19T10:00:00',total:25}
 const note={id:'nota-345',pedidoId:order.id,pedidoNumero:345,numero:'0004',serie:'1',status:'AUTORIZADA',ambiente:'HOMOLOGACAO',emitidaEm:order.concluidoEm,valorTotal:25,chaveAcesso:'1'.repeat(44),itens:[],pagamentos:[]}
 let posts=0
 await page.route('http://localhost:8080/caixa/**',route=>{
  const path=new URL(route.request().url()).pathname
  const ok=json=>route.fulfill({json,headers:feedbackHeaders})
  if(path==='/caixa/pedidos')return ok(envelope([{...order,notaFiscal:posts?note:null}]))
  if(path.endsWith('/emitir')){posts++;expect(route.request().postDataJSON().pedidoId).toBe(order.id);return route.fulfill({status:503,headers:feedbackHeaders,json:{message:'Sem confirmação'}})}
  if(path.endsWith('/pedidos/'+order.id))return ok({...order,notaFiscal:posts?note:null})
  if(path.endsWith('/cancelamento')){
   expect(route.request().postDataJSON().motivo).toBe('Documento do consumidor incorreto')
   note.status='CANCELADA'
   return ok(note)
  }
  if(path.endsWith('/xml'))return route.fulfill({headers:feedbackHeaders,contentType:'application/xml',body:'<xml/>'})
  if(path.endsWith('/nota-345'))return ok(note)
  return ok(envelope(posts?[note]:[]))
 })
 await page.goto('/#/notafiscal?aba=pendentes')
 await expect(page).toHaveURL(/pedidos.*status=CONCLUIDO/)
 const orderRow=page.getByRole('row').filter({hasText:'#345'})
 await expect(orderRow).toContainText('NFC-e pendente')
 await orderRow.getByRole('button',{name:'Ver detalhes'}).click()
 const orderDrawer=page.getByRole('dialog',{name:'Detalhes',exact:true})
 await orderDrawer.getByRole('button',{name:'Emitir NFC-e',exact:true}).click()
 await page.getByRole('button',{name:'Confirmar emissão'}).click()
 await expect(orderRow.getByText('NFC-e pendente')).toHaveCount(0)
 await orderDrawer.getByRole('link',{name:'Ver NFC-e',exact:true}).click()
 const drawer=page.getByRole('dialog',{name:'Detalhes da NFC-e'})
 await expect(drawer).toContainText('Homologação')
 await page.setViewportSize({width:320,height:568})
 await expect(drawer.getByRole('region',{name:'Resumo da nota'})).toContainText('25,00')
 await expect(drawer.getByRole('button',{name:'Copiar chave'})).toBeHidden()
 await drawer.getByText('Dados fiscais',{exact:true}).click()
 await expect(drawer.getByRole('button',{name:'Copiar chave'})).toBeVisible()
 expect(await drawer.evaluate(el=>el.scrollWidth<=el.clientWidth+1)).toBe(true)
 const download=page.waitForEvent('download')
 await drawer.getByRole('button',{name:'Baixar XML',exact:true}).click()
 expect((await download).suggestedFilename()).toMatch(/\.xml$/)
 await drawer.getByRole('button',{name:'Cancelar NFC-e'}).click()
 await drawer.getByLabel('Justificativa').fill('Documento do consumidor incorreto')
 await drawer.getByRole('button',{name:'Confirmar cancelamento'}).click()
 await expect(drawer).toContainText('Cancelada')
 expect(posts).toBe(1)
})
test('máscara fiscal alterna entre CPF e CNPJ e envia apenas dígitos', async ({page})=>{
 await setup(page)
 let documentFilter
 await page.route('http://localhost:8080/caixa/notas-fiscais?*',route=>{
   documentFilter=new URL(route.request().url()).searchParams.get('documentoCliente')
   return route.fulfill({headers:feedbackHeaders,json:envelope([])})
 })
 await page.goto('/#/notafiscal')
 const input=page.getByLabel('CPF ou CNPJ')
 await input.pressSequentially('12345678909')
 await expect(input).toHaveValue('123.456.789-09')
 await input.pressSequentially('123')
 await expect(input).toHaveValue('12.345.678/9091-23')
 await input.fill('12.345.678/0001-90')
 await expect(page.getByRole('button',{name:'Buscar',exact:true})).toHaveCount(0)
 await expect.poll(()=>documentFilter).toBe('12345678000190')
 await input.press('Home')
 await input.press('ArrowRight')
 await input.press('ArrowRight')
 await input.press('Delete')
 await expect(input).toHaveValue('12.456.780/0019-0')
 await input.fill('')
 await expect(input).toHaveValue('')
})
test('situação das notas emitidas atualiza ao selecionar e remove ao limpar', async ({page})=>{
  await setup(page)
  const statuses=['AUTORIZADA','CANCELADA','REJEITADA']
  const notes=statuses.map((status,i)=>({id:'n'+i,numero:String(i+1),serie:'1',pedidoNumero:i+1,emitidaEm:'2026-11-19T09:00:00',valorTotal:10,status}))
  const requests=[]
  await page.route('http://localhost:8080/caixa/notas-fiscais?*',route=>{
    const status=new URL(route.request().url()).searchParams.get('status')
    requests.push(status)
    return route.fulfill({headers:feedbackHeaders,json:envelope(notes.filter(note=>!status||note.status===status))})
  })
  await page.goto('/#/notafiscal')
  const cells=page.locator('td [data-status]')
  await expect(cells).toHaveCount(3)
  for(const status of statuses){
    await page.getByRole('combobox',{name:/Situação/}).selectOption(status)
    await expect(cells).toHaveCount(1)
    await expect(cells).toHaveAttribute('data-status',status)
    expect(requests.at(-1)).toBe(status)
  }
  await page.getByRole('button',{name:'Limpar filtros'}).click()
  await expect(cells).toHaveCount(3)
  expect(requests.at(-1)).toBeNull()
})


test('financeiro cancela conta pelo contrato da API e exibe o status correto', async ({ page }) => {
  await setup(page)
  let account = {
    id: 'conta-teste', tipo: 'PAGAR', descricao: 'Compra de mercadoria', valor: 80,
    vencimento: '2026-11-27', status: 'ABERTA', centroCusto: 'COMPRAS', categoria: 'MERCADORIA',
  }
  const requests = []
  await page.route('http://localhost:8080/financeiro/**', route => {
    const request = route.request()
    const url = new URL(request.url())
    const json = body => route.fulfill({ headers: feedbackHeaders, json: body })
    if (request.method() === 'OPTIONS') return route.fallback()
    requests.push({ method: request.method(), path: url.pathname, status: url.searchParams.get('status') })
    if (url.pathname === '/financeiro/resumo') {
      return json({ referencia: '2026-11-26', saldoRealizado: 0, fluxoCaixa: [], aPagar30Dias: { valor: 80, vencidas: 0, vencemEmAte7Dias: 1 } })
    }
    if (url.pathname === '/financeiro/contas/conta-teste/inativacao' && request.method() === 'PATCH') {
      account = { ...account, status: 'INATIVA' }
      return json(account)
    }
    if (url.pathname === '/financeiro/contas/conta-teste') return json(account)
    if (url.pathname === '/financeiro/contas') {
      const status = url.searchParams.get('status')
      return json(envelope(!status || status === account.status ? [account] : []))
    }
    return route.fulfill({ status: 404, headers: feedbackHeaders, json: { message: 'Rota não encontrada' } })
  })

  await page.goto('/#/financeiro')
  const actions = page.getByRole('button', { name: 'Ações da conta Compra de mercadoria', exact: true })
  await actions.scrollIntoViewIfNeeded()
  await actions.click()
  await page.getByRole('menuitem', { name: 'Cancelar conta', exact: true }).click()
  await page.getByRole('button', { name: 'Confirmar cancelamento', exact: true }).click()
  const detail = page.getByRole('dialog', { name: 'Detalhes da conta', exact: true })
  await expect(detail).toContainText('Cancelada')
  expect(requests.find(request => request.method === 'PATCH')?.path).toBe('/financeiro/contas/conta-teste/inativacao')
  await page.keyboard.press('Escape')
  await page.getByLabel('Situação', { exact: true }).selectOption('INATIVA')
  await expect(page.getByRole('table', { name: 'Contas a pagar', exact: true })).toContainText('Cancelada')
  await expect.poll(() => requests.some(request => request.status === 'INATIVA')).toBe(true)
  await actions.press('Enter')
  await expect(page.getByRole('menuitem', { name: 'Cancelar conta', exact: true })).toHaveCount(0)
})

test('conciliação manual em ACAO_NECESSARIA exige autorizador ao confirmar e omite ao rejeitar', async ({ page }) => {
  await setup(page)
  const conciliacoes = []
  let order = {
    id: 'ped-conc', numero: 501, sessaoCaixaId: 'sess-conc', status: 'AGUARDANDO_PAGAMENTO',
    total: 50, totalPago: 0, saldoRestante: 50, desconto: 0,
    itens: [{ id: 1, produtoId: strawberry.id, descricaoProduto: 'Morango', quantidade: 25, precoUnitario: 2, subtotal: 50 }],
    pagamentos: [{ id: 'pag-acao', forma: 'PIX', provedor: 'MERCADO_PAGO', orderExternaId: null, status: 'ACAO_NECESSARIA', valor: 50, comprovanteReferencia: 'NSU-01' }],
  }
  await page.route('http://localhost:8080/usuario/me', route => route.fulfill({
    headers: feedbackHeaders,
    json: { id: 'op-1', name: 'Operador', profileName: 'Operador', permissoes: ['CAIXA_VISUALIZAR', 'CAIXA_OPERAR'] },
  }))
  await page.route('http://localhost:8080/caixa/**', route => {
    const req = route.request(), url = new URL(req.url()), ok = json => route.fulfill({ headers: feedbackHeaders, json })
    if (url.pathname === '/caixa/configuracao') return ok({ dinheiroHabilitado: true, pixHabilitado: true })
    if (url.pathname === '/caixa/pedidos/' + order.id + '/pagamentos/pag-acao/conciliacao' && req.method() === 'POST') {
      const body = req.postDataJSON()
      conciliacoes.push(body)
      order = {
        ...order,
        status: body.aprovado ? 'CONCLUIDO' : 'EM_ATENDIMENTO',
        totalPago: body.aprovado ? 50 : 0,
        saldoRestante: body.aprovado ? 0 : 50,
        pagamentos: [{ ...order.pagamentos[0], status: body.aprovado ? 'APROVADO' : 'CANCELADO' }],
      }
      return ok(order)
    }
    if (url.pathname === '/caixa/pedidos/' + order.id) return ok(order)
    if (url.pathname === '/caixa/pedidos') return ok(envelope([order]))
    return ok(envelope([]))
  })

  await page.goto('/#/pedidos')
  await page.getByRole('button', { name: 'Ver detalhes', exact: true }).click()
  await page.getByRole('button', { name: 'Conciliar recebimento', exact: true }).click()
  const dialog = page.getByRole('dialog', { name: 'Conferir recebimento externo' })
  await expect(dialog.getByLabel('E-mail do autorizador', { exact: false })).toHaveCount(0)
  await dialog.getByLabel('Recebimento confirmado', { exact: true }).check()
  await expect(dialog.getByLabel('E-mail do autorizador', { exact: false })).toBeVisible()
  await dialog.getByLabel('E-mail do autorizador', { exact: false }).fill('gerente@adega.com')
  await dialog.getByLabel('Senha do autorizador', { exact: false }).fill('SenhaGerente1')
  await dialog.getByRole('button', { name: 'Confirmar', exact: true }).click()
  await expect.poll(() => conciliacoes).toEqual([{
    aprovado: true,
    comprovanteReferencia: 'NSU-01',
    autorizadorEmail: 'gerente@adega.com',
    autorizadorSenha: 'SenhaGerente1',
  }])
  await expect(page.getByRole('dialog', { name: 'Detalhes', exact: true })).toContainText(/Situação do pedido\s*Concluído/)
})

test('estorno individual reabre pedido parcial para edição e permite retomar estorno em andamento', async ({ page }) => {
  await setup(page)
  const calls = []
  let order = {
    id: 'ped-parcial', numero: 502, sessaoCaixaId: 'sess-parcial', status: 'PAGAMENTO_PARCIAL',
    total: 50, totalPago: 20, saldoRestante: 30, desconto: 0,
    itens: [{ id: 1, produtoId: strawberry.id, descricaoProduto: 'Morango', quantidade: 25, precoUnitario: 2, subtotal: 50 }],
    pagamentos: [
      { id: 'pag-ok', forma: 'DINHEIRO', provedor: 'INTERNO', status: 'APROVADO', valor: 20 },
      { id: 'pag-point-retry', forma: 'CREDITO', provedor: 'MERCADO_PAGO', orderExternaId: 'ord-9', status: 'ESTORNO_EM_ANDAMENTO', valor: 10, motivoEstorno: 'Tentativa anterior' },
    ],
  }
  await page.route('http://localhost:8080/caixa/**', route => {
    const req = route.request(), url = new URL(req.url()), ok = json => route.fulfill({ headers: feedbackHeaders, json })
    if (url.pathname === '/caixa/configuracao') return ok({ dinheiroHabilitado: true, creditoHabilitado: true })
    if (url.pathname === '/caixa/pedidos/' + order.id + '/pagamentos/pag-point-retry/estorno' && req.method() === 'POST') {
      calls.push({ pagamentoId: 'pag-point-retry', body: req.postDataJSON() })
      order = { ...order, pagamentos: [order.pagamentos[0], { ...order.pagamentos[1], status: 'ESTORNADO' }] }
      return ok(order)
    }
    if (url.pathname === '/caixa/pedidos/' + order.id + '/pagamentos/pag-ok/estorno' && req.method() === 'POST') {
      calls.push({ pagamentoId: 'pag-ok', body: req.postDataJSON() })
      order = {
        ...order,
        status: 'EM_ATENDIMENTO',
        totalPago: 0,
        saldoRestante: 50,
        pagamentos: order.pagamentos.map(p => ({ ...p, status: 'ESTORNADO' })),
      }
      return ok(order)
    }
    if (url.pathname === '/caixa/pedidos/' + order.id) return ok(order)
    if (url.pathname === '/caixa/pedidos') return ok(envelope([order]))
    return ok(envelope([]))
  })

  await page.goto('/#/pedidos')
  await page.getByRole('button', { name: 'Ver detalhes', exact: true }).click()
  await expect(page.getByText('Estorno em andamento', { exact: true }).first()).toBeVisible()
  await page.getByRole('button', { name: 'Retomar estorno', exact: true }).click()
  const retryDialog = page.getByRole('dialog', { name: 'Retomar estorno do pagamento?' })
  await expect(retryDialog.getByLabel('Motivo', { exact: false })).toHaveValue('Tentativa anterior')
  await retryDialog.getByRole('button', { name: 'Retomar estorno', exact: true }).click()
  await page.getByRole('button', { name: 'Estornar pagamento', exact: true }).click()
  const refundDialog = page.getByRole('dialog', { name: 'Estornar pagamento aprovado?' })
  await refundDialog.getByLabel('Motivo', { exact: false }).fill('Cliente desistiu')
  await refundDialog.getByRole('button', { name: 'Confirmar estorno', exact: true }).click()
  await expect.poll(() => calls).toEqual([
    { pagamentoId: 'pag-point-retry', body: { motivo: 'Tentativa anterior' } },
    { pagamentoId: 'pag-ok', body: { motivo: 'Cliente desistiu' } },
  ])
  await expect(page.getByRole('dialog', { name: 'Detalhes', exact: true })).toContainText(/Situação do pedido\s*Em atendimento/)
  await expect(page.getByRole('button', { name: 'Remover', exact: true })).toBeVisible()
})
