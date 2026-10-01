/* Dados mockados do painel — substituir por chamadas à API (src/lib/api.js). */

/* ─── Dados de produtos ─── */
export const allProducts = [
  { id: 'BEB-001', ean: '7891000000014', name: 'Heineken 600ml',              cat: 'Cerveja',    qty: 48, min: 24, unit: 'un',  price: 14.90,  cost: 9.50,   local: 'Câmara Fria A',      tipo: 'padrao', volumeEmbalagem: 600,  saidas30d: 96  },
  { id: 'BEB-002', ean: '7891000000021', name: 'Stella Artois 350ml',         cat: 'Cerveja',    qty: 8,  min: 36, unit: 'un',  price: 9.90,   cost: 6.20,   local: 'Câmara Fria A',      tipo: 'padrao', volumeEmbalagem: 350,  saidas30d: 28  },
  { id: 'BEB-003', ean: '7891000000038', name: 'Budweiser 350ml',             cat: 'Cerveja',    qty: 36, min: 24, unit: 'un',  price: 8.90,   cost: 5.80,   local: 'Câmara Fria A',      tipo: 'padrao', volumeEmbalagem: 350,  saidas30d: 54  },
  { id: 'BEB-004', ean: '7891000000045', name: 'Corona Extra 355ml',          cat: 'Cerveja',    qty: 24, min: 12, unit: 'un',  price: 13.90,  cost: 8.40,   local: 'Câmara Fria B',      tipo: 'padrao', volumeEmbalagem: 355,  saidas30d: 36  },
  { id: 'BEB-005', ean: '7891000000052', name: 'Vinho Tinto Reserva 750ml',   cat: 'Vinho',      qty: 12, min: 6,  unit: 'un',  price: 89.00,  cost: 54.00,  local: 'Câmara Climatizada', tipo: 'padrao', volumeEmbalagem: 750,  saidas30d: 9   },
  { id: 'BEB-006', ean: '7891000000069', name: 'Vinho Branco Seco 750ml',     cat: 'Vinho',      qty: 18, min: 6,  unit: 'un',  price: 72.00,  cost: 44.00,  local: 'Câmara Climatizada', tipo: 'padrao', volumeEmbalagem: 750,  saidas30d: 12  },
  { id: 'BEB-007', ean: '7891000000076', name: 'Espumante Brut 750ml',        cat: 'Vinho',      qty: 4,  min: 6,  unit: 'un',  price: 98.00,  cost: 62.00,  local: 'Câmara Climatizada', tipo: 'padrao', volumeEmbalagem: 750,  saidas30d: 6   },
  { id: 'BEB-008', ean: '7891000000083', name: "Jack Daniel's 1L",            cat: 'Destilados', qty: 3,  min: 6,  unit: 'un',  price: 189.00, cost: 130.00, local: 'Depósito Seco',      tipo: 'padrao', volumeEmbalagem: 1000, saidas30d: 4   },
  { id: 'BEB-009', ean: '7891000000090', name: 'Vodka Absolut 750ml',         cat: 'Destilados', qty: 7,  min: 4,  unit: 'un',  price: 84.00,  cost: 58.00,  local: 'Depósito Seco',      tipo: 'padrao', volumeEmbalagem: 750,  saidas30d: 8   },
  { id: 'BEB-010', ean: '7891000000106', name: 'Gin Amazônico Premium 750ml', cat: 'Gin',        qty: 5,  min: 4,  unit: 'un',  price: 119.00, cost: 78.00,  local: 'Depósito Seco',      tipo: 'padrao', volumeEmbalagem: 750,  saidas30d: 7   },
  { id: 'BEB-011', ean: '7891000000113', name: 'Tanqueray London Dry 750ml',  cat: 'Gin',        qty: 3,  min: 4,  unit: 'un',  price: 134.00, cost: 90.00,  local: 'Depósito Seco',      tipo: 'padrao', volumeEmbalagem: 750,  saidas30d: 3   },
  { id: 'BEB-012', ean: '7891000000120', name: 'Red Bull 250ml',              cat: 'Sem Álcool', qty: 72, min: 48, unit: 'un',  price: 12.90,  cost: 8.00,   local: 'Depósito Seco',      tipo: 'padrao', volumeEmbalagem: 250,  saidas30d: 108 },
  { id: 'BEB-013', ean: '7891000000137', name: 'Água Mineral 500ml',          cat: 'Sem Álcool', qty: 96, min: 48, unit: 'un',  price: 4.50,   cost: 2.10,   local: 'Depósito Seco',      tipo: 'padrao', volumeEmbalagem: 500,  saidas30d: 144 },
  { id: 'BEB-014', ean: '7891000000144', name: 'Combo Cerveja ×6',            cat: 'Combos',     qty: 20, min: 10, unit: 'kit', price: 49.90,  cost: 34.00,  local: 'Câmara Fria A',      tipo: 'padrao', volumeEmbalagem: null, saidas30d: 18  },
]

export const drinkProducts = [
  {
    id: 'DRK-001', name: 'Copo Jack Rocks',    cat: 'Drinks', unit: 'copo', price: 28.00, local: 'Balcão Principal',  tipo: 'drink',
    receita: [{ produtoId: 'BEB-008', quantidade: 50,  livre: false }],
  },
  {
    id: 'DRK-002', name: 'Gin Tônica Premium', cat: 'Drinks', unit: 'copo', price: 32.00, local: 'Balcão Principal',  tipo: 'drink',
    receita: [{ produtoId: 'BEB-010', quantidade: 60,  livre: false }],
  },
  {
    id: 'DRK-003', name: 'Caipirinha de Vodka',cat: 'Drinks', unit: 'copo', price: 24.00, local: 'Balcão Principal',  tipo: 'drink',
    receita: [{ produtoId: 'BEB-009', quantidade: 60,  livre: false }],
  },
  {
    id: 'DRK-004', name: 'Taça Vinho da Casa', cat: 'Drinks', unit: 'taça', price: 22.00, local: 'Câmara Climatizada', tipo: 'drink',
    receita: [{ produtoId: 'BEB-005', quantidade: 150, livre: false }],
  },
]

/* ─── Categorias e locais ─── */
export const cats = [
  ['Cerveja', '4 produtos', 72],
  ['Vinho', '3 produtos', 55],
  ['Destilados', '2 produtos', 38],
  ['Gin & Licores', '2 produtos', 45],
  ['Combos', '1 produto', 60],
  ['Sem Álcool', '2 produtos', 80],
]

export const stores = [
  ['Câmara Fria A', '82% ocupado', 82],
  ['Câmara Fria B', '61% ocupado', 61],
  ['Depósito Seco', '74% ocupado', 74],
  ['Balcão Principal', '91% ocupado', 91],
  ['Área de Expedição', '43% ocupado', 43],
  ['Câmara Climatizada', '67% ocupado', 67],
]

/* ─── Fornecedores ─── */
export const fornecedoresData = [
  { nome: 'Distribuidora Norte' },
  { nome: 'Meraki Imports' },
  { nome: 'Spirits Brasil' },
  { nome: 'Sul Bebidas' },
]

/* ─── Movimentações ─── */
export const movimentacoes = [
  { data: '13/09 · 14:32', dateISO: '2026-09-13', produto: 'Heineken 600ml',       tipo: 'Entrada',       qty: 120, operador: 'Carlos S.',  nf: '000.412', fornecedor: 'Distribuidora Norte' },
  { data: '13/09 · 13:10', dateISO: '2026-09-13', produto: 'Vinho Tinto Reserva',  tipo: 'Saída (venda)', qty: 2,   operador: 'Maria J.',    nf: '',        fornecedor: '' },
  { data: '12/09 · 17:22', dateISO: '2026-09-12', produto: "Jack Daniel's 1L",     tipo: 'Saída (venda)', qty: 1,   operador: 'Roberto A.', nf: '',        fornecedor: '' },
  { data: '12/09 · 11:05', dateISO: '2026-09-12', produto: 'Stella Artois 350ml',  tipo: 'Ajuste',        qty: -4,  operador: 'Carlos S.',  nf: '',        fornecedor: '' },
  { data: '11/09 · 18:40', dateISO: '2026-09-11', produto: 'Gin Amazônico',        tipo: 'Entrada',       qty: 10,  operador: 'Maria J.',    nf: '000.388', fornecedor: 'Meraki Imports' },
  { data: '10/09 · 09:15', dateISO: '2026-09-10', produto: 'Red Bull 250ml',       tipo: 'Entrada',       qty: 48,  operador: 'Carlos S.',  nf: '000.375', fornecedor: 'Distribuidora Norte' },
  { data: '10/09 · 08:30', dateISO: '2026-09-10', produto: 'Espumante Brut',       tipo: 'Saída (venda)', qty: 2,   operador: 'Roberto A.', nf: '',        fornecedor: '' },
]

/* ─── Listas genéricas ─── */
export const lists = {
  orcamento: {
    heads: ['Nº', 'Cliente', 'Emitido', 'Validade', 'Valor', 'Status'],
    rows: [
      ['ORC-1042', 'Restaurante Nórdico', '13/09', '15 dias', 'R$ 2.840', 'Pendente'],
      ['ORC-1041', 'Bar do Zé',           '12/09', '10 dias', 'R$ 680',   'Aprovado'],
      ['ORC-1039', 'Hotel Vista Mar',     '09/09', '7 dias',  'R$ 4.250', 'Expirado'],
    ],
  },
  notafiscal: {
    heads: ['Nº NF-e', 'Cliente', 'Emissão', 'Chave', 'Valor', 'Status'],
    rows: [
      ['000.128', 'Restaurante Nórdico', '13/09', '3526…9831', 'R$ 2.840', 'Emitida'],
      ['000.127', 'Bar do Zé',           '12/09', '3526…7410', 'R$ 680',   'Emitida'],
      ['000.126', 'Hotel Vista Mar',     '09/09', '3526…3109', 'R$ 4.250', 'Cancelada'],
    ],
  },
}

/* ─── Dados de gráficos ─── */
export const monthData = [
  { m: 'Abr', entradas: 142, saidas: 88 },
  { m: 'Mai', entradas: 198, saidas: 121 },
  { m: 'Jun', entradas: 164, saidas: 109 },
  { m: 'Jul', entradas: 227, saidas: 143 },
  { m: 'Ago', entradas: 183, saidas: 116 },
  { m: 'Set', entradas: 251, saidas: 162 },
]

export const cashFlowData = [
  { m: 'Abr', receitas: 28400, despesas: 17200 },
  { m: 'Mai', receitas: 34900, despesas: 19800 },
  { m: 'Jun', receitas: 31200, despesas: 18400 },
  { m: 'Jul', receitas: 38700, despesas: 21300 },
  { m: 'Ago', receitas: 35100, despesas: 20100 },
  { m: 'Set', receitas: 41750, despesas: 23600 },
]

export const salesByCategory = [
  { cat: 'Cerveja',    valor: 18400 },
  { cat: 'Vinho',      valor: 9200 },
  { cat: 'Destilados', valor: 7100 },
  { cat: 'Gin',        valor: 4600 },
  { cat: 'Outros',     valor: 2450 },
]

/* ─── Financeiro ─── */

export const TODAY = new Date('2026-09-14')

export const vencimentosData = [
  { nome: 'Distribuidora Norte', valor: 2140, tipo: 'pagar',   vence: '2026-09-18', centro: 'Compras'      },
  { nome: 'Spirits Brasil',      valor: 1320, tipo: 'pagar',   vence: '2026-09-20', centro: 'Compras'      },
  { nome: 'Aluguel · Adega',     valor: 3800, tipo: 'pagar',   vence: '2026-09-25', centro: 'Operacional'  },
  { nome: 'Restaurante Nórdico', valor: 2840, tipo: 'receber', vence: '2026-09-17', centro: 'Vendas'       },
]

/* cores por centro de custo — tokens de tema (App.module.css) */
export const centroColors = {
  Compras:        'var(--c-compras)',
  Operacional:    'var(--c-operacional)',
  Vendas:         'var(--c-vendas)',
  Administrativo: 'var(--c-administrativo)',
}

export const dreData = {
  receitaBruta:      41750,
  devolucoes:          380,
  cmv:               23600,
  despesasFixas:      8450,
  despesasVariaveis:  2180,
}
