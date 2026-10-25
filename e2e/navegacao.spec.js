import { test, expect, login } from './fixtures.js'

/*
 * Regressão de navegação: com o catálogo vindo da API, todas as telas do painel (inclusive as que ainda
 * rodam só no front: caixa, NF-e, relatórios…) precisam abrir sem erro de console/JS.
 * Páginas que exigem um id (editar, usuario, perfil…) ficam de fora.
 */
const PAGINAS = [
  'dashboard', 'produtos', 'categorias', 'movimentacoes', 'reposicao', 'caixa', 'notafiscal',
  'entradanf', 'validades', 'auditoria', 'relatorios', 'financeiro', 'novo',
  'usuarios', 'novousuario', 'perfis', 'novoperfil', 'seguranca', 'notificacoes', 'geral',
]

const API = 'http://localhost:8080'

// catálogo mínimo pela API: categoria, insumo fracionado, insumo em unidade e um drink com receita
async function criarCatalogo(page) {
  const headers = {
    Origin: 'http://localhost:5173',
    'X-XSRF-TOKEN': (await page.context().cookies(API)).find(c => c.name === 'XSRF-TOKEN')?.value ?? '',
  }
  const post = async (path, data, method = 'post') => {
    const r = await page.request[method](`${API}${path}`, { data, headers })
    expect(r.ok(), `${method.toUpperCase()} ${path} → ${r.status()}`).toBeTruthy()
    return r.json()
  }
  const id = Date.now().toString().slice(-6)
  const cat = await post('/categorias', { nome: `Nav ${id}` })
  const gin = await post('/produtos', { nome: `Gin Nav ${id}`, categoriaId: cat.id, unidadeMedida: 'garrafa', precoVenda: 120, precoCusto: 80, tipo: 'PADRAO', fracionado: true, volumeEmbalagemMl: 750, estoqueMinimo: 750, quantidadeInicial: 2250 })
  const tonica = await post('/produtos', { nome: `Tônica Nav ${id}`, categoriaId: cat.id, unidadeMedida: 'un', precoVenda: 6, precoCusto: 3, tipo: 'PADRAO', fracionado: false, volumeEmbalagemMl: 350, estoqueMinimo: 24, quantidadeInicial: 4 })
  const drink = await post('/produtos', { nome: `Gin Tônica Nav ${id}`, categoriaId: cat.id, unidadeMedida: 'copo', precoVenda: 35, tipo: 'DRINK' })
  await post(`/drinks/${drink.id}/receita`, { ingredientes: [
    { produtoId: gin.id, quantidade: 60, unidadeConsumo: 'ML' },
    { produtoId: tonica.id, quantidade: 1, unidadeConsumo: 'UN' },
  ] }, 'put')
}

test('todas as paginas abrem sem erro com dados reais', async ({ page, shot }) => {
  test.setTimeout(120_000)
  await login(page)
  await expect(page.getByRole('button', { name: 'Sair' })).toBeVisible()
  await criarCatalogo(page)
  await page.reload() // recarrega o catálogo com os itens criados
  await expect(page.getByRole('button', { name: 'Sair' })).toBeVisible()
  for (const p of PAGINAS) {
    await page.goto(`/#/${p}`)
    await expect(page.locator('main, [role="main"]').first()).toBeVisible()
    await page.waitForTimeout(300) // deixa efeitos/carregamentos rodarem
    await expect(page.getByText('Algo deu errado'), `página ${p}`).toHaveCount(0)
    await shot(p)
  }
})

test('paginas removidas (orcamento, inventario) mostram "nao encontrada" sem quebrar', async ({ page, shot }) => {
  await login(page)
  await expect(page.getByRole('button', { name: 'Sair' })).toBeVisible()
  for (const p of ['orcamento', 'inventario']) {
    await page.goto(`/#/${p}`)
    await expect(page.getByText('Página não encontrada')).toBeVisible()
    await shot(`removida-${p}`)
  }
  // e não aparecem mais no menu
  await expect(page.getByRole('navigation').getByText(/Orçamentos|Inventário/)).toHaveCount(0)
})
