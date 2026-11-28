import test from 'node:test'
import assert from 'node:assert/strict'
import {
  normalizeProfileKey,
  isManagerProfile,
  validarNomePerfil,
} from '../src/entities/access/lib/format.js'

test('isManagerProfile reconhece variações normalizadas de Gerente', () => {
  assert.equal(normalizeProfileKey('  Gérênte! '), 'GERENTE')
  assert.equal(isManagerProfile('Gerente'), true)
  assert.equal(isManagerProfile('gérênte'), true)
  assert.equal(isManagerProfile('Gerente!'), true)
  assert.equal(isManagerProfile('  GERENTE  '), true)
  assert.equal(isManagerProfile('Caixa'), false)
})

test('validarNomePerfil bloqueia nome reservado Gerente e colisões normalizadas', () => {
  const existing = [
    { id: '1', nome: 'Gerente' },
    { id: '2', nome: 'Caixa' },
  ]

  assert.equal(validarNomePerfil('Gérênte!', existing), 'Gerente é um nome reservado.')
  assert.equal(validarNomePerfil('Gerente', existing, '2'), 'Gerente é um nome reservado.')
  assert.equal(validarNomePerfil('Gerente', existing, '1', { allowManager: true }), null)
  assert.equal(validarNomePerfil('Câixa!', existing), 'Já existe um perfil com este nome.')
  assert.equal(validarNomePerfil('Câixa', existing, '2'), null)
  assert.equal(validarNomePerfil('Operador Noturno', existing), null)
})
