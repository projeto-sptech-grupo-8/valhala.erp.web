/* Dados mockados do painel (NF-e, gráficos e financeiro) — o back ainda não tem esses módulos. Catálogo e estoque vêm da API. */

/* ─── Listas genéricas ─── */
export const lists = {
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
