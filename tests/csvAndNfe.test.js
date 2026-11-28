import test from 'node:test'
import assert from 'node:assert/strict'
import { cell } from '../src/shared/lib/csv.js'
import { parseNFe, NFeError, sampleNFe } from '../src/entities/invoices/lib/nfe.js'

function createXmlStub({ chave = '35261112345678000190550010000004131876543210', mod = '55', detsCount = 1, qCom = '2', vUnCom = '10.00', vProd = '20.00', vNF = '20.00' } = {}) {
  const makeNode = (tag, textContent = '', attrs = {}) => ({
    tagName: tag,
    textContent,
    getAttribute: (k) => attrs[k] ?? null,
    getElementsByTagName: (name) => (name === 'parsererror' ? [] : []),
    getElementsByTagNameNS: (_ns, name) => map[name] ?? [],
  })

  const detNodes = Array.from({ length: detsCount }, (_, idx) => {
    const prodMap = {
      cProd: [makeNode('cProd', 'SKU1')],
      cEAN: [makeNode('cEAN', '7891000000014')],
      xProd: [makeNode('xProd', 'Produto Teste')],
      NCM: [makeNode('NCM', '22030000')],
      CFOP: [makeNode('CFOP', '5405')],
      uCom: [makeNode('uCom', 'UN')],
      qCom: [makeNode('qCom', qCom)],
      vUnCom: [makeNode('vUnCom', vUnCom)],
      vProd: [makeNode('vProd', vProd)],
      rastro: [],
    }
    const prod = {
      getElementsByTagNameNS: (_ns, name) => prodMap[name] ?? [],
    }
    return {
      getAttribute: (k) => (k === 'nItem' ? String(idx + 1) : null),
      getElementsByTagNameNS: (_ns, name) => (name === 'prod' ? [prod] : []),
    }
  })

  const ideMap = {
    mod: [makeNode('mod', mod)],
    nNF: [makeNode('nNF', '413')],
    serie: [makeNode('serie', '1')],
    dhEmi: [makeNode('dhEmi', '2026-11-20T10:00:00-03:00')],
  }
  const emitMap = {
    xFant: [makeNode('xFant', 'Distribuidora')],
    xNome: [makeNode('xNome', 'Distribuidora Ltda')],
    CNPJ: [makeNode('CNPJ', '12345678000190')],
  }
  const totalMap = { vNF: [makeNode('vNF', vNF)] }
  const infMap = {
    ide: [{ getElementsByTagNameNS: (_ns, name) => ideMap[name] ?? [] }],
    emit: [{ getElementsByTagNameNS: (_ns, name) => emitMap[name] ?? [] }],
    ICMSTot: [{ getElementsByTagNameNS: (_ns, name) => totalMap[name] ?? [] }],
    det: detNodes,
  }
  const inf = {
    getAttribute: (k) => (k === 'Id' ? (chave ? `NFe${chave}` : '') : null),
    getElementsByTagNameNS: (_ns, name) => infMap[name] ?? [],
  }
  const map = { infNFe: [inf], chNFe: [] }
  return class StubDOMParser {
    parseFromString() {
      return makeNode('#document')
    }
  }
}

test('csv.cell neutraliza injeção de fórmulas e coloca aspas em quebra de linha CR', () => {
  assert.equal(cell('=SUM(A1:A2)'), "'=SUM(A1:A2)")
  assert.equal(cell('+cmd|calc'), "'+cmd|calc")
  assert.equal(cell('-10+20'), "'-10+20")
  assert.equal(cell('@SUM(1,2)'), "'@SUM(1,2)")
  assert.equal(cell('\t=1'), "'\t=1")
  assert.equal(cell('=1;2\r\n3'), '"\'=1;2\r\n3"')
  assert.equal(cell('linha1\rlinha2'), '"linha1\rlinha2"')
  assert.equal(cell(-12.5), '-12,5')
  assert.equal(cell(null), '')
})

test('parseNFe rejeita DTD/ENTITY, chave inválida, excesso de itens e números inválidos', () => {
  assert.throws(() => parseNFe('<!DOCTYPE foo><nfeProc/>', createXmlStub()), NFeError)
  assert.throws(() => parseNFe('<?xml version="1.0"?><!ENTITY x "1"><nfeProc/>', createXmlStub()), NFeError)
  assert.throws(() => parseNFe('<nfeProc/>', createXmlStub({ chave: '123' })), NFeError)
  assert.throws(() => parseNFe('<nfeProc/>', createXmlStub({ detsCount: 991 })), NFeError)
  assert.throws(() => parseNFe('<nfeProc/>', createXmlStub({ qCom: 'abc' })), NFeError)
  assert.throws(() => parseNFe('<nfeProc/>', createXmlStub({ vUnCom: '-5' })), NFeError)

  const parsed = parseNFe('<nfeProc/>', createXmlStub())
  assert.equal(parsed.nf.numero, '413')
  assert.equal(parsed.nf.valor, 20)
  assert.equal(parsed.itens.length, 1)
  assert.equal(parsed.itens[0].qCom, 2)
})

test('sampleNFe gera chave válida de 44 dígitos', () => {
  const xml = sampleNFe()
  const match = xml.match(/Id="NFe(\d{44})"/)
  assert.ok(match)
})
