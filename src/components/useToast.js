import { createContext, useContext } from 'react'

export const ToastCtx = createContext(() => {})

export function useToast() {
  return useContext(ToastCtx)
}

/* Aviso padrão para ações que dependem do backend */
export const PENDING_BACKEND = 'Disponível após a integração com o backend.'
