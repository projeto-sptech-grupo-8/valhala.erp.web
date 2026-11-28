import { authenticatedRequest } from '@/shared/api/api.js'

async function financeiro(path, { params, signal, method, body } = {}) {
  const query = new URLSearchParams(Object.entries(params ?? {}).filter(([, value]) => value !== '' && value != null))
  const data = await authenticatedRequest(`/financeiro/${path}${query.size ? '?' + query : ''}`, {
    signal, method, body: body === undefined ? undefined : JSON.stringify(body),
  })
  if (!data) throw new Error('O servidor não confirmou a resposta do Financeiro.')
  return data
}

export const financeApi = {
  resumo: signal => financeiro('resumo', { signal }),
  resultado: (inicio, fim, signal) => financeiro('resultado', { params: { inicio, fim }, signal }),
  contas: (params, signal) => financeiro('contas', { params, signal }),
  conta: (id, signal) => financeiro(`contas/${encodeURIComponent(id)}`, { signal }),
  criar: body => financeiro('contas', { method: 'POST', body }),
  atualizar: (id, body) => financeiro(`contas/${encodeURIComponent(id)}`, { method: 'PUT', body }),
  baixar: (id, body) => financeiro(`contas/${encodeURIComponent(id)}/baixa`, { method: 'POST', body }),
  cancelar: id => financeiro(`contas/${encodeURIComponent(id)}/inativacao`, { method: 'PATCH' }),
}
