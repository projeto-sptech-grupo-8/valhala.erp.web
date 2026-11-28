export function validatePasswordChange(currentPassword,password,confirmation) {
 const errors={}
 if(!String(currentPassword??'').trim())errors.currentPassword='Informe sua senha atual.'
 if(!String(password??'').trim())errors.password='Informe a nova senha.'
 else if(password.length<8||password.length>72)errors.password='A senha deve ter entre 8 e 72 caracteres.'
 else if(new TextEncoder().encode(password).length>72)errors.password='Esta senha é muito longa para o servidor. Reduza a quantidade de caracteres.'
 if(!confirmation)errors.confirmation='Confirme a nova senha.'
 else if(password!==confirmation)errors.confirmation='As senhas não coincidem.'
 return errors
}
