// src/app/routes.jsx
import { createBrowserRouter } from 'react-router-dom'

// Layout — the shell that wraps every page
import AppLayout from '../layout/AppLayout'

// Feature pages (complex enough to live in features/)
import MarketPage       from '../features/MarketPage'
import CoinDetailsPage  from '../features/components/CoinDetailsPage'
import PortfolioPage    from '../features/components/PortfolioPage'

// Regular pages
import TrendingPage          from '../pages/TrendingPage'
import GainersLosersPage     from '../pages/GainersLosersPage'
import WatchlistPage         from '../pages/WatchlistPage'
import ComparePage           from '../pages/ComparePage'
import HeatmapPage           from '../pages/HeatmapPage'
import AlertsPage            from '../pages/AlertsPage'
import TransactionsPage      from '../pages/TransactionsPage'
import OnChainPage           from '../pages/OnChainPage'
import DefiPage              from '../pages/DefiPage'
import DerivativesPage       from '../pages/DerivativesPage'
import CorrelationPage       from '../pages/CorrelationPage'
import ScreenerPage          from '../pages/ScreenerPage'
import WhaleAlertsPage       from '../pages/WhaleAlertsPage'
import GasTrackerPage        from '../pages/GasTrackerPage'
import ArbitrageScanner      from '../pages/ArbitrageScanner'
import PortfolioWhatIfPage   from '../pages/PortfolioWhatIfPage'
import PricePredictionGame   from '../pages/PricePredictionGame'
import GalaxyPage            from '../pages/GalaxyPage'
import AIMarketNarratorPage  from '../pages/AIMarketNarratorPage'
import OrderBookPage         from '../pages/OrderBookPage'
import MacroCorrelationPage  from '../pages/MacroCorrelationPage'
import BacktesterPage        from '../pages/BacktesterPage'

// createBrowserRouter takes an array of route objects
// Each route has a path and the element to render
export const router = createBrowserRouter([
  {
    // The root route renders AppLayout
    // ALL child routes render inside AppLayout's <Outlet />
    path: '/',
    element: <AppLayout />,
    children: [
      // index: true means this renders when path is exactly "/"
      { index: true,              element: <MarketPage /> },
      { path: 'coin/:id',         element: <CoinDetailsPage /> },  // :id = dynamic param
      { path: 'portfolio',        element: <PortfolioPage /> },
      { path: 'transactions',     element: <TransactionsPage /> },
      { path: 'onchain',          element: <OnChainPage /> },
      { path: 'defi',             element: <DefiPage /> },
      { path: 'derivatives',      element: <DerivativesPage /> },
      { path: 'correlation',      element: <CorrelationPage /> },
      { path: 'screener',         element: <ScreenerPage /> },
      { path: 'trending',         element: <TrendingPage /> },
      { path: 'gainers',          element: <GainersLosersPage /> },
      { path: 'watchlist',        element: <WatchlistPage /> },
      { path: 'compare',          element: <ComparePage /> },
      { path: 'heatmap',          element: <HeatmapPage /> },
      { path: 'alerts',           element: <AlertsPage /> },
      { path: 'whale-alerts',     element: <WhaleAlertsPage /> },
      { path: 'gas',              element: <GasTrackerPage /> },
      { path: 'arbitrage',        element: <ArbitrageScanner /> },
      { path: 'whatif',           element: <PortfolioWhatIfPage /> },
      { path: 'predict',          element: <PricePredictionGame /> },
      { path: 'galaxy',           element: <GalaxyPage /> },
      { path: 'ai-narrator',      element: <AIMarketNarratorPage /> },
      { path: 'orderbook',        element: <OrderBookPage /> },
      { path: 'macro',            element: <MacroCorrelationPage /> },
      { path: 'backtest',         element: <BacktesterPage /> },
    ],
  },
])