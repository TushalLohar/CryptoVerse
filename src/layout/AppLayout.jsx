import { Suspense } from "react";
import { Outlet, Link, useLocation } from "react-router-dom";

import Header from "./Header";
import TickerBar from "./TickerBar";

import { useAlertChecker } from "../hooks/useAlertChecker";
import { useLivePrices } from "../hooks/useLivePrices";
import { useMarketData } from "../hooks/useMarketData";

import { TrendingUp, Flame, ArrowUpDown, Star, Wallet, Loader2 } from "lucide-react";

function RouteLoader() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[50vh] gap-3">
      <Loader2 className="w-8 h-8 text-crypto-blue animate-spin" />
      <span className="text-text-3 text-xs font-mono uppercase tracking-wider animate-pulse">
        Loading...
      </span>
    </div>
  );
}

const BOTTOM_NAV = [
  { to: "/", icon: TrendingUp, label: "Markets" },
  { to: "/trending", icon: Flame, label: "Trending" },
  { to: "/gainers", icon: ArrowUpDown, label: "Movers" },
  { to: "/watchlist", icon: Star, label: "Watch" },
  { to: "/portfolio", icon: Wallet, label: "Portfolio" },
];

// Runs alert checking in background
function AlertWatcher() {
  const { coins } = useMarketData({ page: 1, perPage: 25, currency: "usd" });
  const livePrices = useLivePrices(coins);

  useAlertChecker(livePrices);

  return null;
}

export default function AppLayout() {
  const location = useLocation();

  return (
    <div className="min-h-screen bg-bg-base">
      <Header />
      <TickerBar />
      <AlertWatcher />

      <main className="max-w-350 mx-auto px-5 pt-25 pb-20">
        <Suspense fallback={<RouteLoader />}>
          <Outlet />
        </Suspense>
      </main>

      <BottomNav location={location} />
    </div>
  );
}

function BottomNav({ location }) {
  return (
    <nav
      className="
      fixed bottom-0 left-0 right-0
      h-14.5
      flex items-center justify-around
      bg-bg-elevated border-t border-border
      backdrop-blur-md
      z-100
      md:hidden
    "
    >
      {BOTTOM_NAV.map((item) => {
        const { to, icon: Icon, label } = item;
        const isActive = location.pathname === to;

        return (
          <Link
            key={to}
            to={to}
            className={
              "flex flex-col items-center gap-1 px-4 py-1 text-[9px] font-semibold uppercase tracking-wide transition-colors " +
              (isActive ? "text-crypto-blue" : "text-text-3")
            }
          >
            <Icon size={20} strokeWidth={isActive ? 2.5 : 1.8} />
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
