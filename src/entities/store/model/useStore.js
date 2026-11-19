import { createContext, useContext } from 'react'

export const StoreCtx = createContext(null)

export function useStore() {
  const ctx = useContext(StoreCtx)
  if (!ctx) throw new Error('useStore precisa estar dentro de <StoreProvider>')
  return ctx
}
