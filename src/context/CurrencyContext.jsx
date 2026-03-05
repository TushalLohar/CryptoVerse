import { createContext, useContext, useState } from 'react'

const CurrencyContext = createContext()

// All supported currencies
export const CURRENCIES = [
  { code: 'usd', symbol: '$',  label: 'USD' },
  { code: 'inr', symbol: '₹',  label: 'INR' },
  { code: 'eur', symbol: '€',  label: 'EUR' },
  { code: 'btc', symbol: '₿',  label: 'BTC' },
  { code: 'eth', symbol: 'Ξ',  label: 'ETH' },
]

export function CurrencyProvider({ children }) {
  const [currency, setCurrencyState] = useState(
    // read from localStorage so it persists on refresh
    () => localStorage.getItem('ct-currency') || 'usd'
  )

  const setCurrency = (code) => {
    localStorage.setItem('ct-currency', code)
    setCurrencyState(code)
  }

  return (
    <CurrencyContext.Provider value={{ currency, setCurrency }}>
      {children}
    </CurrencyContext.Provider>
  )
}

// Custom hook — any component calls useCurrency() to get currency + setCurrency
export const useCurrency = () => useContext(CurrencyContext)