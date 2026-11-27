export const MUTATING_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE'])

export const PUBLIC_AUTH_MUTATIONS = new Set([
  '/auth/login',
  '/auth/recuperar-senha',
  '/auth/redefinir-senha',
])

export function requiresCsrf(method, path) {
  return MUTATING_METHODS.has(String(method || 'GET').toUpperCase()) && !PUBLIC_AUTH_MUTATIONS.has(path)
}

export function isCsrfRejection(status, body) {
  return status === 403 && /csrf/i.test(String(body?.message || ''))
}

export function readCsrfCookie(cookieSource) {
  const source = cookieSource ?? (typeof document !== 'undefined' ? document.cookie : '')
  const raw = String(source || '').match(/(?:^|;\s*)XSRF-TOKEN=([^;]+)/)?.[1]
  if (!raw) return null
  try {
    return decodeURIComponent(raw)
  } catch {
    return raw
  }
}

export function createCsrfManager({
  baseUrl = '',
  fetchImpl = (...args) => globalThis.fetch(...args),
  readCookie = () => readCsrfCookie(),
} = {}) {
  let csrfToken = null

  function clear() {
    csrfToken = null
  }

  async function refresh() {
    const res = await fetchImpl(baseUrl + '/auth/csrf', { credentials: 'include' }).catch(() => null)
    const body = res?.ok ? await res.json().catch(() => null) : null
    csrfToken = body?.token ?? body?.tokenCsrf ?? null
    return csrfToken
  }

  async function header({ cookieOnly = false, overrideToken = null } = {}) {
    if (overrideToken) return { 'X-XSRF-TOKEN': overrideToken }
    const fromCookie = readCookie()
    if (fromCookie) return { 'X-XSRF-TOKEN': fromCookie }
    if (cookieOnly) return {}
    if (!csrfToken) await refresh()
    return csrfToken ? { 'X-XSRF-TOKEN': csrfToken } : {}
  }

  return { clear, refresh, header }
}
