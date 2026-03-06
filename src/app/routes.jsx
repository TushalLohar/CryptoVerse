import { createBrowserRouter } from 'react-router-dom'
import AppLayout       from '../layout/AppLayout'
import MarketPage      from '../features/MarketPage'
import CoinDetailPage  from '../features/CoinDetailPage'
import WatchlistPage   from '../pages/WatchlistPage'
import TrendingPage    from '../pages/TrendingPage'

export const router = createBrowserRouter([
  {
    path:    '/',
    element: <AppLayout />,
    children: [
      { index: true,       element: <MarketPage />    },
      { path: 'coin/:id',  element: <CoinDetailPage /> },
      { path: 'watchlist', element: <WatchlistPage />  },
      { path: 'trending',  element: <TrendingPage />   },
    ],
  },
])