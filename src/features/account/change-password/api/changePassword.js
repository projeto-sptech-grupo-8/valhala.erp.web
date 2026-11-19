import { authenticatedRequest } from '@/shared/api/api.js'

export function changeOwnPassword(userId,password) {
 if(!userId)throw new Error('Não foi possível identificar sua conta. Entre novamente.')
 return authenticatedRequest('/usuario/'+encodeURIComponent(userId),{method:'PATCH',body:JSON.stringify({senha:password})})
}
