import { createBrowserRouter } from 'react-router-dom'
import AppLayout            from '../layout/AppLayout'
import MarketPage           from '../features/MarketPage'
import CoinDetailPage       from '../features/CoinDetailPage'
import WatchlistPage        from '../pages/WatchlistPage'
import TrendingPage         from '../pages/TrendingPage'
import GainersLosersPage    from '../pages/GainersLosersPage'
import PortfolioPage        from '../pages/PortfolioPage'
import AiChatPage           from '../pages/AiChatPage'
import AlertsPage           from '../pages/AlertsPage'
import ComparePage          from '../pages/ComparePage'
import ScreenerPage         from '../pages/ScreenerPage'
import HeatmapPage          from '../pages/HeatmapPage'
import WhaleAlertsPage      from '../pages/WhaleAlertsPage'
import GasTrackerPage       from '../pages/GasTrackerPage'
import OnChainPage          from '../pages/OnChainPage'
import DefiPage             from '../pages/DefiPage'
import OrderBookPage        from '../pages/OrderBookPage'
import ArbitrageScanner     from '../pages/ArbitrageScanner'
import PricePredictionGame  from '../pages/PricePredictionGame'
import BacktesterPage       from '../pages/BacktesterPage'
import NotFoundPage         from '../pages/NotFoundPage'

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