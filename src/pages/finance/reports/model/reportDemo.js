import { CANAIS, MOTIVOS_PERDA } from '@/entities/reports'

const products = [
  { id: 'ipa', name: 'Cerveja IPA 600 ml', cat: 'Cervejas', price: 23, cost: 12, qty: 8, min: 24 },
  { id: 'malbec', name: 'Malbec Reserva', cat: 'Vinhos', price: 89, cost: 58, qty: 18, min: 12 },
  { id: 'gin', name: 'Gin Tônica da Casa', cat: 'Drinks', price: 32, cost: 12, qty: 24, min: 10 },
  { id: 'pilsen', name: 'Cerveja Pilsen 600 ml', cat: 'Cervejas', price: 16, cost: 10, qty: 36, min: 30 },
  { id: 'whisky', name: 'Whisky 12 anos', cat: 'Destilados', price: 178, cost: 121, qty: 6, min: 4 },
  { id: 'espumante', name: 'Espumante Brut', cat: 'Vinhos', price: 68, cost: 43, qty: 4, min: 8 },
  { id: 'spritz', name: 'Spritz de Laranja', cat: 'Drinks', price: 29, cost: 9, qty: 17, min: 10 },
  { id: 'tonica', name: 'Água Tônica 350 ml', cat: 'Sem álcool', price: 7, cost: 4, qty: 7, min: 12 },
  { id: 'suco', name: 'Suco de Uva 300 ml', cat: 'Sem álcool', price: 9, cost: 5, qty: 12, min: 8 },
  { id: 'ambar', name: 'Cerveja Amber Ale', cat: 'Cervejas', price: 20, cost: 11, qty: 14, min: 8 },
  { id: 'agua', name: 'Água com Gás 500 ml', cat: 'Sem álcool', price: 5, cost: 2, qty: 21, min: 10 },
]
const byId = new Map(products.map(product => [product.id, product]))

// Cada entrada representa um pedido típico, com canal, horário e quantidades.
const pedidos = [
  [0, 12, [['pilsen', 2], ['tonica', 1]]],
  [0, 16, [['ipa', 4], ['ambar', 2]]],
  [1, 18, [['gin', 2], ['spritz', 2]]],
  [2, 19, [['malbec', 2], ['suco', 1]]],
  [1, 20, [['ipa', 4], ['gin', 1], ['agua', 2]]],
  [2, 20, [['whisky', 1], ['tonica', 2]]],
  [0, 17, [['espumante', 1], ['pilsen', 3]]],
  [1, 21, [['gin', 3], ['ipa', 3]]],
  [2, 22, [['malbec', 1], ['ipa', 6]]],
  [1, 19, [['spritz', 2], ['gin', 2], ['agua', 1]]],
  [0, 14, [['suco', 2], ['tonica', 1]]],
]

const diasSemEstoque = [
  ['ipa', [[2, 5], [3, 4], [12, 2], [13, 4], [14, 3], [35, 7]]],
  ['espumante', [[4, 2], [9, 1], [10, 2], [31, 4], [62, 3]]],
  ['tonica', [[1, 7], [5, 5], [16, 4], [17, 5], [47, 8]]],
  ['pilsen', [[6, 5], [28, 6], [29, 4], [52, 10]]],
]
const perdasExemplo = [
  [1, 'pilsen', 0, 3], [3, 'malbec', 0, 1], [4, 'suco', 1, 5],
  [6, 'tonica', 2, 4], [9, 'ipa', 0, 2], [12, 'espumante', 1, 1],
  [18, 'pilsen', 2, 4], [25, 'suco', 1, 8], [27, 'ambar', 0, 2],
  [33, 'ipa', 0, 4], [42, 'whisky', 0, 1], [51, 'suco', 1, 7],
  [64, 'gin', 2, 3], [76, 'tonica', 1, 12],
]

export function getReportDemo(now = new Date()) {
  const dia = (atraso, hora = 12) => new Date(now.getFullYear(), now.getMonth(), now.getDate() - atraso, hora)
  const dataLocal = atraso => {
    const date = dia(atraso)
    const mes = String(date.getMonth() + 1).padStart(2, '0')
    const diaDoMes = String(date.getDate()).padStart(2, '0')
    return date.getFullYear() + '-' + mes + '-' + diaDoMes
  }

  const sales = Array.from({ length: 84 }, (_, index) => index + 1).flatMap(atraso => {
    const diaDaSemana = dia(atraso).getDay()
    const pico = diaDaSemana === 5 || diaDaSemana === 6
    const quantidade = 3 + atraso % 4 + (pico ? 4 : 0)
    return Array.from({ length: quantidade }, (_, index) => {
      const [canal, hora, cesta] = pedidos[(atraso * 7 + index) % pedidos.length]
      const itens = cesta.map(([id, qty]) => ({ ...byId.get(id), qty }))
      return {
        em: dia(atraso, pico && index >= quantidade - 3 ? 20 : hora).toISOString(),
        canal: CANAIS[canal],
        itens,
        total: itens.reduce((acc, item) => acc + item.price * item.qty, 0),
      }
    })
  })

  return {
    products,
    sales,
    rupturaDiaria: diasSemEstoque.flatMap(([produtoId, dias]) =>
      dias.map(([atraso, perdidas]) => ({ produtoId, dia: dataLocal(atraso), perdidas }))),
    perdas: perdasExemplo.map(([atraso, id, motivo, qty]) => ({
      em: dia(atraso).toISOString(),
      produto: byId.get(id).name,
      custo: byId.get(id).cost,
      motivo: MOTIVOS_PERDA[motivo],
      qty,
    })),
  }
}
