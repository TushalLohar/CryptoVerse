import { createContext, useContext, useState, useEffect } from 'react'

const ThemeContext = createContext()

export function ThemeProvider({ children }) {
  const [theme, setTheme] = useState(
    () => localStorage.getItem('ct-theme') || 'dark'
  )

  useEffect(() => {
    // This one line updates every CSS variable instantly
    // No component re-renders needed
    document.documentElement.setAttribute('data-theme', theme)
    localStorage.setItem('ct-theme', theme)
  }, [theme])

  const toggleTheme = () => setTheme(t => t === 'dark' ? 'light' : 'dark')

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  )
}
// eslint-disable-next-line react-refresh/only-export-components
export const useTheme = () => useContext(ThemeContext)