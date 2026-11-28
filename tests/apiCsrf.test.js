import test from 'node:test'
import assert from 'node:assert/strict'
import {
  requiresCsrf,
  isCsrfRejection,
  readCsrfCookie,
  createCsrfManager,
} from '../src/shared/api/csrf.js'

test('requiresCsrf exige token apenas para mutações fora dos endpoints públicos de auth', () => {
  assert.equal(requiresCsrf('GET', '/caixa/pedidos'), false)
  assert.equal(requiresCsrf('POST', '/auth/login'), false)
  assert.equal(requiresCsrf('POST', '/auth/recuperar-senha'), false)
  assert.equal(requiresCsrf('POST', '/auth/redefinir-senha'), false)
  assert.equal(requiresCsrf('POST', '/auth/logout'), true)
  assert.equal(requiresCsrf('post', '/auth/refresh'), true)
  assert.equal(requiresCsrf('PATCH', '/usuario/123'), true)
  assert.equal(requiresCsrf('DELETE', '/caixa/pedidos/1/desconto'), true)
})

test('isCsrfRejection distingue rejeição de CSRF de outros 403 de autorização', () => {
  assert.equal(isCsrfRejection(403, { message: 'Token CSRF ausente ou inválido' }), true)
  assert.equal(isCsrfRejection(403, { message: 'CSRF inválido' }), true)
  assert.equal(isCsrfRejection(403, { message: 'Acesso negado' }), false)
  assert.equal(isCsrfRejection(403, { message: 'Credenciais de autorização inválidas ou sem permissão para esta operação' }), false)
  assert.equal(isCsrfRejection(401, { message: 'Token CSRF ausente ou inválido' }), false)
})

test('readCsrfCookie extrai e decodifica o cookie XSRF-TOKEN', () => {
  assert.equal(readCsrfCookie('foo=1; XSRF-TOKEN=abc%2B123%3D; bar=2'), 'abc+123=')
  assert.equal(readCsrfCookie('foo=1; bar=2'), null)
  assert.equal(readCsrfCookie(''), null)
})

test('createCsrfManager lê cookie, consulta /auth/csrf sob demanda, prioriza override no retry e limpa cache', async () => {
  let cookieValue = ''
  const fetched = []
  let issued = 'token-1'
  const manager = createCsrfManager({
    baseUrl: 'http://localhost:8080',
    readCookie: () => readCsrfCookie(cookieValue),
    fetchImpl: async (url, init) => {
      fetched.push({ url, init })
      return {
        ok: true,
        json: async () => ({ token: issued }),
      }
    },
  })

  // Sem cookie: busca /auth/csrf uma vez e mantém em cache
  assert.deepEqual(await manager.header(), { 'X-XSRF-TOKEN': 'token-1' })
  assert.deepEqual(await manager.header(), { 'X-XSRF-TOKEN': 'token-1' })
  assert.equal(fetched.length, 1)
  assert.equal(fetched[0].url, 'http://localhost:8080/auth/csrf')
  assert.deepEqual(fetched[0].init, { credentials: 'include' })

  // clear + cookie presente: usa cookie em vez de /auth/csrf
  manager.clear()
  cookieValue = 'XSRF-TOKEN=cookie-token'
  assert.deepEqual(await manager.header(), { 'X-XSRF-TOKEN': 'cookie-token' })
  assert.equal(fetched.length, 1)

  // Override no retry após 403 CSRF prevalece sobre cookie antigo
  issued = 'token-2'
  const refreshed = await manager.refresh()
  assert.equal(refreshed, 'token-2')
  assert.deepEqual(await manager.header({ overrideToken: refreshed }), { 'X-XSRF-TOKEN': 'token-2' })

  // cookieOnly sem cookie não dispara /auth/csrf
  cookieValue = ''
  assert.deepEqual(await manager.header({ cookieOnly: true }), {})
  assert.equal(fetched.length, 2)
})

test('createCsrfManager deduplica chamadas concorrentes de refresh e reaproveita token em memória quando allowFetch é false', async () => {
  let fetches = 0
  let resolveFetch
  const manager = createCsrfManager({
    baseUrl: 'http://localhost:8080',
    readCookie: () => null,
    fetchImpl: () => {
      fetches++
      return new Promise(resolve => {
        resolveFetch = resolve
      })
    },
  })

  // Sem cookie nem cache: allowFetch=false não chama /auth/csrf
  assert.deepEqual(await manager.header({ allowFetch: false }), {})
  assert.equal(fetches, 0)

  // Duas chamadas concorrentes de header()/refresh() compartilham um único GET /auth/csrf
  const p1 = manager.header()
  const p2 = manager.refresh()
  assert.equal(fetches, 1)

  resolveFetch({ ok: true, json: async () => ({ token: 'shared-csrf' }) })
  const [h1, t2] = await Promise.all([p1, p2])
  assert.deepEqual(h1, { 'X-XSRF-TOKEN': 'shared-csrf' })
  assert.equal(t2, 'shared-csrf')

  // allowFetch=false usa o token em memória quando cookie não está acessível (deploy cross-host)
  assert.deepEqual(await manager.header({ allowFetch: false }), { 'X-XSRF-TOKEN': 'shared-csrf' })
  assert.equal(fetches, 1)
})
