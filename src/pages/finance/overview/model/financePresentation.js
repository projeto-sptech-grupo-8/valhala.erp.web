export const TIPOS_CONTA = { PAGAR: 'A pagar', RECEBER: 'A receber' }
export const STATUS_CONTA = { ABERTA: 'Em aberto', PAGA: 'Baixada', CANCELADA: 'Cancelada' }
export const CENTROS_CUSTO = { COMPRAS: 'Compras', OPERACIONAL: 'Operacional', VENDAS: 'Vendas', ADMINISTRATIVO: 'Administrativo' }
export const CATEGORIAS_CONTA = { MERCADORIA: 'Mercadoria', DESPESA_FIXA: 'Despesa fixa', DESPESA_VARIAVEL: 'Despesa variável' }

const mesCurto = new Intl.DateTimeFormat('pt-BR', { month: 'short', timeZone: 'UTC' })
const isoDia = data => data.toISOString().slice(0, 10)

export function acrescentarDias(dia, quantidade) {
  const data = new Date(dia + 'T00:00:00Z')
  data.setUTCDate(data.getUTCDate() + quantidade)
  return isoDia(data)
}

export function diaBR(iso) {
  return iso ? iso.split('-').reverse().join('/') : '—'
}

export function rotuloMes(mes) {
  const nome = mesCurto.format(new Date(mes.slice(0, 7) + '-01T00:00:00Z')).replace('.', '')
  return nome[0].toUpperCase() + nome.slice(1)
}

export function periodosFinanceiro(referencia) {
  if (!referencia) return []
  const [ano, mes] = referencia.split('-').map(Number)
  const inicioMes = deslocamento => isoDia(new Date(Date.UTC(ano, mes - 1 + deslocamento, 1)))
  const periodos = [0, -1, -2].map(deslocamento => {
    const inicio = inicioMes(deslocamento)
    const fim = deslocamento === 0 ? referencia : acrescentarDias(inicioMes(deslocamento + 1), -1)
    return { id: String(deslocamento), inicio, fim, label: `${rotuloMes(inicio)} ${inicio.slice(0, 4)}` }
  })
  periodos.push({ id: 'trimestre', inicio: inicioMes(-((mes - 1) % 3)), fim: referencia, label: 'Trimestre atual' })
  return periodos
}
