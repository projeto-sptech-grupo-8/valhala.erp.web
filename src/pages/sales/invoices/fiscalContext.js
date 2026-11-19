import { createContext, useContext } from 'react'
export const FiscalContext = createContext(null)
export const useFiscalCheckout = () => useContext(FiscalContext)
