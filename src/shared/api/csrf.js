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
  timeoutMs = null,
} = {}) {
  let csrfToken = null
  let pendingRefresh = null

  function clear() {
    csrfToken = null
    pendingRefresh = null
  }

  async function refresh() {
    if (!pendingRefresh) {
      const fetchOptions = timeoutMs > 0 && typeof AbortSignal?.timeout === 'function'
        ? { credentials: 'include', signal: AbortSignal.timeout(timeoutMs) }
        : { credentials: 'include' }
      pendingRefresh = fetchImpl(baseUrl + '/auth/csrf', fetchOptions)
        .then(res => (res?.ok ? res.json().catch(() => null) : null), () => null)
        .then(body => {
          csrfToken = body?.token ?? body?.tokenCsrf ?? null
          return csrfToken
        })
        .finally(() => { pendingRefresh = null })
    }
    return pendingRefresh
  }

  async function header({ cookieOnly = false, allowFetch = true, overrideToken = null } = {}) {
    if (overrideToken) return { 'X-XSRF-TOKEN': overrideToken }
    const fromCookie = readCookie()
    if (fromCookie) return { 'X-XSRF-TOKEN': fromCookie }
    if (cookieOnly) return {}
    if (!csrfToken && allowFetch) await refresh()
    return csrfToken ? { 'X-XSRF-TOKEN': csrfToken } : {}
  }

  return { clear, refresh, header }
}
