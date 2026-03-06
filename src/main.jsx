import { createRoot }     from 'react-dom/client'
import { RouterProvider } from 'react-router-dom'
import './index.css'
import { router }           from './app/routes'
import { CurrencyProvider } from './context/CurrencyContext'
import { ThemeProvider }    from './context/ThemeContext'

createRoot(document.getElementById('root')).render(
  <ThemeProvider>
    <CurrencyProvider>
      <RouterProvider router={router} />
    </CurrencyProvider>
  </ThemeProvider>
)