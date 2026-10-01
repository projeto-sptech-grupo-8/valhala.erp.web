/*
 * Catálogo de módulos para agrupar funcionalidades na interface.
 * A API devolve os códigos; quando não informa o módulo, ele é deduzido pelo código.
 */
export const MODULOS = [
  { id: 'ESTOQUE',    nome: 'Estoque' },
  { id: 'VENDAS',     nome: 'Vendas e caixa' },
  { id: 'FINANCEIRO', nome: 'Financeiro' },
  { id: 'USUARIOS',   nome: 'Usuários' },
  { id: 'ACESSO',     nome: 'Perfis e permissões' },
  { id: 'OUTROS',     nome: 'Outros' },
]

const REGRAS = [
  [/ESTOQUE|PRODUTO|INVENTARIO|CATEGORIA/, 'ESTOQUE'],
  [/CAIXA|PEDIDO|VENDA|NOTA|ORCAMENTO/, 'VENDAS'],
  [/FINANCEIRO|RELATORIO|CONTA/, 'FINANCEIRO'],
  [/^USUARIO/, 'USUARIOS'],
  [/PERFI|PERMISS/, 'ACESSO'],
]

export function moduloDoCodigo(codigo = '') {
  return REGRAS.find(([re]) => re.test(codigo))?.[1] || 'OUTROS'
}

export function rotuloDoCodigo(codigo = '') {
  const txt = codigo.toLowerCase().replace(/_/g, ' ')
  return txt.charAt(0).toUpperCase() + txt.slice(1)
}

/* [{ id, nome, itens: [funcionalidade] }] na ordem de MODULOS, só módulos com itens */
export function agruparPorModulo(funcionalidades) {
  return MODULOS
    .map(m => ({ ...m, itens: funcionalidades.filter(f => (f.modulo || moduloDoCodigo(f.codigo)) === m.id) }))
    .filter(m => m.itens.length)
}

/* Diferença entre dois conjuntos de códigos */
export function diffCodigos(antes = [], depois = []) {
  const a = new Set(antes), d = new Set(depois)
  return {
    ganha: [...d].filter(c => !a.has(c)),
    perde: [...a].filter(c => !d.has(c)),
  }
}
