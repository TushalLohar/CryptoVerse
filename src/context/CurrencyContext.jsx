import { createContext, useContext, useState } from "react";

const CurrencyContext = createContext();
// eslint-disable-next-line react-refresh/only-export-components
export const CURRENCIES = [
  { code: "usd", symbol: "$", label: "USD" },
  { code: "inr", symbol: "₹", label: "INR" },
  { code: "eur", symbol: "€", label: "EUR" },
  { code: "btc", symbol: "₿", label: "BTC" },
  { code: "eth", symbol: "Ξ", label: "ETH" },
];

export function CurrencyProvider({ children }) {
  const [currency, setCurrencyState] = useState(
    localStorage.getItem("ct-currency") || "usd",
  );

  function setCurrency(code) {
    localStorage.setItem("ct-currency", code);
    setCurrencyState(code);
  }

  return (
    <CurrencyContext.Provider value={{ currency, setCurrency }}>
      {children}
    </CurrencyContext.Provider>
  );
}
// eslint-disable-next-line react-refresh/only-export-components
export function useCurrency() {
  const ctx = useContext(CurrencyContext);

  if (!ctx) {
    throw new Error("useCurrency must be used inside CurrencyProvider");
  }

  return ctx;
}
