import test from 'node:test'
import assert from 'node:assert/strict'
import { validatePasswordChange } from '../src/features/account/change-password/model/passwordRules.js'

test('senha atual é obrigatória e nova senha segue o contrato de comprimento',()=>{
 assert.ok(validatePasswordChange('','abcdefgh','abcdefgh').currentPassword)
 assert.ok(validatePasswordChange('   ','abcdefgh','abcdefgh').currentPassword)
 assert.deepEqual(validatePasswordChange('SenhaAtual1','abcdefgh','abcdefgh'),{})
 assert.ok(validatePasswordChange('SenhaAtual1','1234567','1234567').password)
 assert.ok(validatePasswordChange('SenhaAtual1',' '.repeat(8),' '.repeat(8)).password)
 assert.ok(validatePasswordChange('SenhaAtual1','x'.repeat(73),'x'.repeat(73)).password)
 assert.deepEqual(validatePasswordChange('SenhaAtual1','x'.repeat(72),'x'.repeat(72)),{})
})
test('confirmação deve corresponder exatamente e espaços da senha não são removidos',()=>{
 assert.ok(validatePasswordChange('SenhaAtual1','abcdefgh','abcdefgi').confirmation)
 assert.ok(validatePasswordChange('SenhaAtual1','abcdefgh','').confirmation)
 assert.deepEqual(validatePasswordChange(' SenhaAtual1 ',' abcdefgh ',' abcdefgh '),{})
 assert.ok(validatePasswordChange('SenhaAtual1',' abcdefgh ','abcdefgh').confirmation)
})
test('senhas unicode respeitam o limite em bytes do BCrypt',()=>{
 assert.deepEqual(validatePasswordChange('SenhaAtual1','á'.repeat(36),'á'.repeat(36)),{})
 assert.ok(validatePasswordChange('SenhaAtual1','á'.repeat(37),'á'.repeat(37)).password)
 assert.ok(validatePasswordChange('SenhaAtual1','😀'.repeat(19),'😀'.repeat(19)).password)
})
