/* EAN-13: dígito verificador, validação e padrão de barras (para etiquetas) */

export function ean13CheckDigit(first12) {
  const d = String(first12).replace(/\D/g, '')
  if (d.length !== 12) throw new Error('EAN-13 precisa de 12 dígitos antes do verificador')
  const sum = [...d].reduce((acc, ch, i) => acc + Number(ch) * (i % 2 === 0 ? 1 : 3), 0)
  return String((10 - (sum % 10)) % 10)
}

export function isValidEan13(code) {
  const d = String(code || '').replace(/\D/g, '')
  return d.length === 13 && ean13CheckDigit(d.slice(0, 12)) === d[12]
}

const L = ['0001101', '0011001', '0010011', '0111101', '0100011', '0110001', '0101111', '0111011', '0110111', '0001011']
const G = ['0100111', '0110011', '0011011', '0100001', '0011101', '0111001', '0000101', '0010001', '0001001', '0010111']
const R = ['1110010', '1100110', '1101100', '1000010', '1011100', '1001110', '1010000', '1000100', '1001000', '1110100']
const PARITY = ['LLLLLL', 'LLGLGG', 'LLGGLG', 'LLGGGL', 'LGLLGG', 'LGGLLG', 'LGGGLL', 'LGLGLG', 'LGLGGL', 'LGGLGL']

/* sequência de 95 módulos (1 = barra) — guardas inclusas */
export function ean13Modules(code) {
  if (!isValidEan13(code)) return null
  const d = String(code).replace(/\D/g, '')
  const parity = PARITY[Number(d[0])]
  let bits = '101'
  for (let i = 1; i <= 6; i++) bits += (parity[i - 1] === 'L' ? L : G)[Number(d[i])]
  bits += '01010'
  for (let i = 7; i <= 12; i++) bits += R[Number(d[i])]
  bits += '101'
  return bits
}
