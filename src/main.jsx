import { createRoot }     from 'react-dom/client'
import { RouterProvider } from 'react-router-dom'
import './index.css'
import { router }           from './app/routes'
import { ThemeProvider }    from './context/ThemeContext'
import { CurrencyProvider } from './context/CurrencyContext'
import ErrorBoundary        from './components/ErrorBoundary'

createRoot(document.getElementById('root')).render(
  <ErrorBoundary>
    <ThemeProvider>
      <CurrencyProvider>
        <RouterProvider router={router} />
      </CurrencyProvider>
    </ThemeProvider>
  </ErrorBoundary>
)