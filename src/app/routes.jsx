import { lazy } from 'react'
import { createBrowserRouter } from 'react-router-dom'
import AppLayout            from '../layout/AppLayout'

const MarketPage          = lazy(() => import('../features/MarketPage'))
const CoinDetailPage      = lazy(() => import('../features/CoinDetailPage'))
const WatchlistPage       = lazy(() => import('../pages/WatchlistPage'))
const TrendingPage        = lazy(() => import('../pages/TrendingPage'))
const GainersLosersPage   = lazy(() => import('../pages/GainersLosersPage'))
const PortfolioPage       = lazy(() => import('../pages/PortfolioPage'))
const AiChatPage          = lazy(() => import('../pages/AiChatPage'))
const AlertsPage          = lazy(() => import('../pages/AlertsPage'))
const ComparePage         = lazy(() => import('../pages/ComparePage'))
const ScreenerPage        = lazy(() => import('../pages/ScreenerPage'))
const HeatmapPage         = lazy(() => import('../pages/HeatmapPage'))
const WhaleAlertsPage     = lazy(() => import('../pages/WhaleAlertsPage'))
const GasTrackerPage      = lazy(() => import('../pages/GasTrackerPage'))
const OnChainPage         = lazy(() => import('../pages/OnChainPage'))
const DefiPage            = lazy(() => import('../pages/DefiPage'))
const OrderBookPage       = lazy(() => import('../pages/OrderBookPage'))
const ArbitrageScanner    = lazy(() => import('../pages/ArbitrageScanner'))
const PricePredictionGame = lazy(() => import('../pages/PricePredictionGame'))
const BacktesterPage      = lazy(() => import('../pages/BacktesterPage'))
const NotFoundPage        = lazy(() => import('../pages/NotFoundPage'))

export const router = createBrowserRouter([
  {
    path:    '/',
    element: <AppLayout />,
    children: [
      { index: true,            element: <MarketPage />          },
      { path: 'coin/:id',       element: <CoinDetailPage />      },
      { path: 'watchlist',      element: <WatchlistPage />       },
      { path: 'trending',       element: <TrendingPage />        },
      { path: 'gainers',        element: <GainersLosersPage />   },
      { path: 'portfolio',      element: <PortfolioPage />       },
      { path: 'ai',             element: <AiChatPage />          },
      { path: 'alerts',         element: <AlertsPage />          },
      { path: 'compare',        element: <ComparePage />         },
      { path: 'screener',       element: <ScreenerPage />        },
      { path: 'heatmap',        element: <HeatmapPage />         },
      { path: 'whale-alerts',   element: <WhaleAlertsPage />     },
      { path: 'gas',            element: <GasTrackerPage />      },
      { path: 'onchain',        element: <OnChainPage />         },
      { path: 'defi',           element: <DefiPage />            },
      { path: 'order-book',     element: <OrderBookPage />       },
      { path: 'arbitrage',      element: <ArbitrageScanner />    },
      { path: 'game',           element: <PricePredictionGame /> },
      { path: 'backtest',       element: <BacktesterPage />      },
      { path: '*',              element: <NotFoundPage />        },
    ],
  },
])