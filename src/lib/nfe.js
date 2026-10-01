/*
 * Leitura do XML da NF-e (modelo 55) do fornecedor.
 * Lê só o necessário para a entrada de mercadoria: cabeçalho, emitente, itens e rastro (lote/validade).
 * Independe de namespace (funciona com ou sem xmlns do portal fiscal).
 */
const onlyDigits = (v = '') => String(v).replace(/\D/g, '')

function first(el, name) {
  return el?.getElementsByTagNameNS('*', name)[0] || null
}
function text(el, name) {
  const n = first(el, name)
  return n ? n.textContent.trim() : ''
}
const num = (v) => (v === '' ? 0 : Number(String(v).replace(',', '.')))

export class NFeError extends Error {}

export function parseNFe(xml) {
  if (!xml || !xml.trim()) throw new NFeError('Arquivo vazio.')
  const doc = new DOMParser().parseFromString(xml, 'application/xml')
  if (doc.getElementsByTagName('parsererror').length) throw new NFeError('O arquivo não é um XML válido.')
  const inf = first(doc, 'infNFe')
  if (!inf) throw new NFeError('O XML não é uma NF-e (não tem o grupo infNFe).')

  const ide = first(inf, 'ide')
  const emit = first(inf, 'emit')
  const mod = text(ide, 'mod')
  if (mod && mod !== '55') throw new NFeError(`Modelo ${mod} não suportado. A entrada de mercadoria usa NF-e modelo 55.`)

  const chave = onlyDigits(inf.getAttribute('Id') || text(doc, 'chNFe'))
  const dets = [...inf.getElementsByTagNameNS('*', 'det')]
  if (!dets.length) throw new NFeError('A NF-e não tem itens.')

  const itens = dets.map((det, i) => {
    const prod = first(det, 'prod')
    const rastro = first(prod, 'rastro')
    const ean = text(prod, 'cEAN')
    return {
      nItem: Number(det.getAttribute('nItem')) || i + 1,
      cProd: text(prod, 'cProd'),
      cEAN: /^\d{8,14}$/.test(ean) ? ean : '',
      xProd: text(prod, 'xProd'),
      NCM: text(prod, 'NCM'),
      CFOP: text(prod, 'CFOP'),
      uCom: text(prod, 'uCom').toUpperCase(),
      qCom: num(text(prod, 'qCom')),
      vUnCom: num(text(prod, 'vUnCom')),
      vProd: num(text(prod, 'vProd')),
      lote: rastro ? text(rastro, 'nLote') : '',
      validade: rastro ? text(rastro, 'dVal').slice(0, 10) : '',
    }
  })

  const dh = text(ide, 'dhEmi') || text(ide, 'dEmi')
  return {
    nf: {
      chave,
      numero: text(ide, 'nNF'),
      serie: text(ide, 'serie'),
      emissao: dh,
      fornecedor: text(emit, 'xFant') || text(emit, 'xNome'),
      razao: text(emit, 'xNome'),
      cnpj: onlyDigits(text(emit, 'CNPJ') || text(emit, 'CPF')),
      valor: num(text(first(inf, 'ICMSTot'), 'vNF')),
    },
    itens,
  }
}

/* fator de conversão sugerido pela unidade comercial: CX12, FD6, DZ, PCT24… */
export function fatorPelaUnidade(uCom = '', xProd = '') {
  const u = uCom.toUpperCase().replace(/\s/g, '')
  if (u === 'UN' || u === 'UND' || u === 'UNID' || u === 'GF' || u === 'GFA') return 1
  if (u === 'DZ') return 12
  const m = u.match(/^(?:CX|FD|PC|PCT|PK|BD|ENG)(\d{1,3})$/)
  if (m) return Number(m[1])
  const x = xProd.toUpperCase().match(/(?:C\/|CX\s?|FD\s?|PACK\s?)(\d{1,3})\b/)
  if (x) return Number(x[1])
  return null // desconhecido: usuário confirma
}

export const fmtCNPJ = (c = '') => {
  const d = onlyDigits(c)
  return d.length === 14 ? d.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, '$1.$2.$3/$4-$5') : c
}
export const fmtChave = (c = '') => onlyDigits(c).replace(/(\d{4})(?=\d)/g, '$1 ')

/* ─── XML de exemplo (demonstração) ─── */
function dvChave(c43) {
  let peso = 2, soma = 0
  for (let i = c43.length - 1; i >= 0; i--) { soma += Number(c43[i]) * peso; peso = peso === 9 ? 2 : peso + 1 }
  const r = soma % 11
  return String(r < 2 ? 0 : 11 - r)
}

export function sampleNFe({ numero = '000413', dias = { cerveja: 120, energetico: 150 } } = {}) {
  const hoje = new Date()
  const iso = (d) => d.toISOString().slice(0, 10)
  const mais = (n) => { const d = new Date(hoje); d.setDate(d.getDate() + n); return iso(d) }
  const cnpj = '12345678000190'
  const c43 = `35${String(hoje.getFullYear()).slice(2)}${String(hoje.getMonth() + 1).padStart(2, '0')}${cnpj}55001${numero.padStart(9, '0')}1${'87654321'}`
  const chave = c43 + dvChave(c43)
  const itens = [
    { cProd: 'HNK600', cEAN: '7891000000014', xProd: 'CERVEJA HEINEKEN 600ML CX C/12', uCom: 'CX12', qCom: 4, vUnCom: 112.8, lote: 'HK2610X', val: mais(dias.cerveja) },
    { cProd: 'STL350', cEAN: '7891000000021', xProd: 'CERVEJA STELLA ARTOIS LT 350ML CX24', uCom: 'CX24', qCom: 2, vUnCom: 148.8, lote: 'ST1020', val: mais(dias.cerveja - 20) },
    { cProd: 'BUD350', cEAN: 'SEM GTIN', xProd: 'CERV BUDWEISER LATA 350ML', uCom: 'UN', qCom: 24, vUnCom: 5.95, lote: 'BD1015', val: mais(dias.cerveja - 10) },
    { cProd: 'RBL250', cEAN: '7891000000120', xProd: 'ENERGETICO RED BULL 250ML FD6', uCom: 'FD6', qCom: 8, vUnCom: 49.2, lote: 'RB1101', val: mais(dias.energetico) },
    { cProd: 'EIS355', cEAN: '7896045504862', xProd: 'CERVEJA EISENBAHN PILSEN 355ML', uCom: 'UN', qCom: 12, vUnCom: 6.4, lote: 'EB0930', val: mais(90) },
  ]
  const det = itens.map((it, i) => {
    const vProd = (it.qCom * it.vUnCom).toFixed(2)
    return `
    <det nItem="${i + 1}">
      <prod>
        <cProd>${it.cProd}</cProd><cEAN>${it.cEAN}</cEAN><xProd>${it.xProd}</xProd>
        <NCM>22030000</NCM><CEST>0302100</CEST><CFOP>5405</CFOP>
        <uCom>${it.uCom}</uCom><qCom>${it.qCom.toFixed(4)}</qCom><vUnCom>${it.vUnCom.toFixed(10)}</vUnCom><vProd>${vProd}</vProd>
        <cEANTrib>${it.cEAN}</cEANTrib><uTrib>${it.uCom}</uTrib><qTrib>${it.qCom.toFixed(4)}</qTrib><vUnTrib>${it.vUnCom.toFixed(10)}</vUnTrib>
        <indTot>1</indTot>
        <rastro><nLote>${it.lote}</nLote><qLote>${it.qCom.toFixed(3)}</qLote><dFab>${iso(hoje)}</dFab><dVal>${it.val}</dVal></rastro>
      </prod>
      <imposto><ICMS><ICMS60><orig>0</orig><CST>60</CST></ICMS60></ICMS></imposto>
    </det>`
  }).join('')
  const vNF = itens.reduce((a, it) => a + it.qCom * it.vUnCom, 0).toFixed(2)
  return `<?xml version="1.0" encoding="UTF-8"?>
<nfeProc xmlns="http://www.portalfiscal.inf.br/nfe" versao="4.00">
  <NFe>
    <infNFe Id="NFe${chave}" versao="4.00">
      <ide><cUF>35</cUF><natOp>VENDA DE MERCADORIA</natOp><mod>55</mod><serie>1</serie><nNF>${Number(numero)}</nNF><dhEmi>${hoje.toISOString().slice(0, 19)}-03:00</dhEmi><tpNF>1</tpNF></ide>
      <emit><CNPJ>${cnpj}</CNPJ><xNome>DISTRIBUIDORA NORTE DE BEBIDAS LTDA</xNome><xFant>Distribuidora Norte</xFant><IE>123456789110</IE></emit>
      <dest><CNPJ>00000000000100</CNPJ><xNome>ADEGA MERAKI LTDA</xNome></dest>${det}
      <total><ICMSTot><vProd>${vNF}</vProd><vNF>${vNF}</vNF></ICMSTot></total>
    </infNFe>
  </NFe>
</nfeProc>`
}
