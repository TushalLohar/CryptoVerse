import { useState, useEffect } from "react";
import { Bell, Plus, Trash2, X, CheckCircle } from "lucide-react";

import { useAlerts } from "../store/alertsStore";
import { fetchSearch } from "../utils/marketAPI";

export default function AlertsPage() {
  const { alerts, removeAlert } = useAlerts();

  const [showModal, setShowModal] = useState(false);

  useEffect(() => {
    if (Notification.permission === "default") {
      Notification.requestPermission();
    }
  }, []);

  const active = alerts.filter((a) => !a.triggered);
  const triggered = alerts.filter((a) => a.triggered);

  return (
    <div className="animate-fade-up">
      {/* Header */}

      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-crypto-blue/10 flex items-center justify-center">
            <Bell size={18} className="text-crypto-blue" />
          </div>

          <div>
            <h1 className="text-xl font-bold text-text-1">Price Alerts</h1>

            <p className="text-sm text-text-3">
              Get notified when a coin hits your target
            </p>
          </div>
        </div>

        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-crypto-blue text-white text-sm font-semibold hover:opacity-90"
        >
          <Plus size={14} />
          New Alert
        </button>
      </div>

      {/* Empty */}

      {alerts.length === 0 && (
        <div className="bg-bg-elevated border border-border rounded-xl p-12 flex flex-col items-center gap-3">
          <Bell size={26} className="text-text-4" />

          <p className="text-text-2 font-semibold">No alerts set</p>

          <p className="text-text-3 text-sm">
            Create an alert and get notified
          </p>

          <button
            onClick={() => setShowModal(true)}
            className="flex items-center gap-2 mt-3 px-4 py-2 rounded-lg bg-crypto-blue text-white text-sm font-semibold"
          >
            <Plus size={14} />
            Create Alert
          </button>
        </div>
      )}

      {/* Active */}

      {active.length > 0 && (
        <div className="mb-6">
          <SectionLabel text="Active" />

          <div className="flex flex-col gap-2 mt-3">
            {active.map((alert) => (
              <AlertRow
                key={alert.id}
                alert={alert}
                onRemove={() => removeAlert(alert.id)}
              />
            ))}
          </div>
        </div>
      )}

      {/* Triggered */}

      {triggered.length > 0 && (
        <div>
          <SectionLabel text="Triggered" />

          <div className="flex flex-col gap-2 mt-3">
            {triggered.map((alert) => (
              <AlertRow
                key={alert.id}
                alert={alert}
                onRemove={() => removeAlert(alert.id)}
                dimmed
              />
            ))}
          </div>
        </div>
      )}

      {showModal && <AddAlertModal onClose={() => setShowModal(false)} />}
    </div>
  );
}

function SectionLabel({ text }) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-xs font-bold text-text-3 uppercase tracking-wider">
        {text}
      </span>

      <div className="flex-1 h-px bg-border" />
    </div>
  );
}

function AlertRow({ alert, onRemove, dimmed }) {
  return (
    <div
      className={`flex items-center gap-4 p-3 rounded-xl border border-border bg-bg-elevated hover:bg-bg-hover ${dimmed ? "opacity-60" : ""}`}
    >
      <img src={alert.coinImage} className="w-8 h-8 rounded-full" />

      <div className="flex-1">
        <div className="text-sm font-semibold text-text-1">
          {alert.coinName}
        </div>

        <div className="text-xs text-text-3">
          Alert when price goes
          <span
            className={`font-semibold ml-1 ${alert.direction === "above" ? "text-crypto-green" : "text-crypto-red"}`}
          >
            {alert.direction}
          </span>
          {" $" + alert.targetPrice.toLocaleString()}
        </div>
      </div>

      <div className="font-mono font-bold text-text-1">
        ${alert.targetPrice.toLocaleString()}
      </div>

      {alert.triggered && (
        <CheckCircle size={16} className="text-crypto-green" />
      )}

      <button onClick={onRemove} className="text-text-4 hover:text-red-500">
        <Trash2 size={14} />
      </button>
    </div>
  );
}

function AddAlertModal({ onClose }) {
  const { addAlert } = useAlerts();

  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [selected, setSelected] = useState(null);

  const [targetPrice, setTarget] = useState("");
  const [direction, setDirection] = useState("above");

  useEffect(() => {
    if (query.length < 2) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setResults([]);
      return;
    }

    const timer = setTimeout(async () => {
      const { data } = await fetchSearch(query);

      setResults((data?.coins || []).slice(0, 6));
    }, 350);

    return () => clearTimeout(timer);
  }, [query]);

  function handleAdd() {
    if (!selected || !targetPrice) return;

    addAlert({
      coinId: selected.id,
      coinName: selected.name,
      coinSymbol: selected.symbol,
      coinImage: selected.thumb,
      targetPrice: parseFloat(targetPrice),
      direction,
    });

    onClose();
  }

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 bg-black/60 backdrop-blur flex items-center justify-center z-50"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="bg-bg-elevated border border-border-md rounded-xl p-6 w-100"
      >
        <div className="flex justify-between items-center mb-5">
          <h2 className="font-bold text-text-1">Create Alert</h2>

          <button onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        {!selected && (
          <>
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search coin..."
              className="w-full px-3 py-2 rounded-lg border border-border-md bg-bg-base text-text-1 outline-none"
            />

            <div className="mt-3 flex flex-col gap-2">
              {results.map((coin) => (
                <SearchRow
                  key={coin.id}
                  coin={coin}
                  onSelect={() => setSelected(coin)}
                />
              ))}
            </div>
          </>
        )}

        {selected && (
          <>
            <div className="flex items-center gap-2 mb-4">
              <img src={selected.thumb} className="w-7 h-7 rounded-full" />

              <span className="font-semibold text-text-1">{selected.name}</span>

              <button
                onClick={() => setSelected(null)}
                className="ml-auto text-xs text-text-3"
              >
                change
              </button>
            </div>

            <div className="flex gap-2 mb-4">
              <button
                onClick={() => setDirection("above")}
                className={`flex-1 py-2 rounded-lg border text-sm font-semibold ${direction === "above" ? "border-crypto-green text-crypto-green bg-crypto-green/10" : "border-border text-text-3"}`}
              >
                ↑ Above
              </button>

              <button
                onClick={() => setDirection("below")}
                className={`flex-1 py-2 rounded-lg border text-sm font-semibold ${direction === "below" ? "border-crypto-red text-crypto-red bg-crypto-red/10" : "border-border text-text-3"}`}
              >
                ↓ Below
              </button>
            </div>

            <input
              type="number"
              value={targetPrice}
              onChange={(e) => setTarget(e.target.value)}
              placeholder="Target price"
              className="w-full px-3 py-2 rounded-lg border border-border-md bg-bg-base text-text-1 outline-none mb-4"
            />

            <button
              onClick={handleAdd}
              disabled={!targetPrice}
              className="w-full py-2 rounded-lg bg-crypto-blue text-white font-semibold disabled:opacity-40"
            >
              Create Alert
            </button>
          </>
        )}
      </div>
    </div>
  );
}

function SearchRow({ coin, onSelect }) {
  return (
    <div
      onClick={onSelect}
      className="flex items-center gap-2 p-2 rounded-lg hover:bg-bg-hover cursor-pointer"
    >
      <img src={coin.thumb} className="w-6 h-6 rounded-full" />

      <div className="flex-1">
        <div className="text-sm text-text-1 font-semibold">{coin.name}</div>

        <div className="text-[10px] text-text-3 uppercase font-mono">
          {coin.symbol}
        </div>
      </div>
    </div>
  );
}
