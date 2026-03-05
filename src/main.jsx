import { createRoot }     from 'react-dom/client'
import { RouterProvider } from 'react-router-dom'
import './index.css'
import { router }           from './app/routes'
import { CurrencyProvider } from './context/CurrencyContext'

createRoot(document.getElementById('root')).render(
  <CurrencyProvider>
    <RouterProvider router={router} />
  </CurrencyProvider>
)