import test from 'node:test'
import assert from 'node:assert/strict'
import { validatePasswordChange } from '../src/features/account/change-password/model/passwordRules.js'

test('senha segue o contrato de comprimento sem impor maiúsculas ou números',()=>{
 assert.deepEqual(validatePasswordChange('abcdefgh','abcdefgh'),{})
 assert.ok(validatePasswordChange('1234567','1234567').password)
 assert.ok(validatePasswordChange(' '.repeat(8),' '.repeat(8)).password)
 assert.ok(validatePasswordChange('x'.repeat(73),'x'.repeat(73)).password)
 assert.deepEqual(validatePasswordChange('x'.repeat(72),'x'.repeat(72)),{})
})
test('confirmação deve corresponder exatamente e espaços da senha não são removidos',()=>{
 assert.ok(validatePasswordChange('abcdefgh','abcdefgi').confirmation)
 assert.ok(validatePasswordChange('abcdefgh','').confirmation)
 assert.deepEqual(validatePasswordChange(' abcdefgh ',' abcdefgh '),{})
 assert.ok(validatePasswordChange(' abcdefgh ','abcdefgh').confirmation)
})
test('senhas unicode respeitam o limite em bytes do BCrypt',()=>{
 assert.deepEqual(validatePasswordChange('á'.repeat(36),'á'.repeat(36)),{})
 assert.ok(validatePasswordChange('á'.repeat(37),'á'.repeat(37)).password)
 assert.ok(validatePasswordChange('😀'.repeat(19),'😀'.repeat(19)).password)
})
