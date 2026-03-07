import { useEffect, useRef } from 'react'
import { useAlerts }         from '../store/alertsStore'

// This hook runs in the background and checks live prices against alerts
// It should be mounted once at the app level (AppLayout)
export function useAlertChecker(livePrices) {
  const { alerts, triggerAlert } = useAlerts()

  // We use a ref so the effect always sees latest alerts
  // without needing to re-subscribe
  const alertsRef = useRef(alerts)
  alertsRef.current = alerts

  useEffect(() => {
    if (!livePrices || Object.keys(livePrices).length === 0) return

    alertsRef.current.forEach((alert) => {
      if (alert.triggered) return

      const currentPrice = livePrices[alert.coinId]
      if (currentPrice == null) return

      const shouldFire =
        (alert.direction === 'above' && currentPrice >= alert.targetPrice) ||
        (alert.direction === 'below' && currentPrice <= alert.targetPrice)

      if (shouldFire) {
        // Mark as triggered so it doesn't fire again
        triggerAlert(alert.id)

        // Show browser notification if permission granted
        if (Notification.permission === 'granted') {
          new Notification(`🔔 Price Alert: ${alert.coinName}`, {
            body: `${alert.coinName} is now $${currentPrice.toLocaleString()} (target: $${alert.targetPrice.toLocaleString()})`,
            icon: alert.coinImage,
          })
        }

        // Also show in-app toast
        showToast(alert, currentPrice)
      }
    })
  }, [livePrices, triggerAlert])
}

// Simple in-app toast — creates a DOM element directly
// We do this outside React so it works without a context/state
function showToast(alert, currentPrice) {
  const toast = document.createElement('div')

  toast.style.cssText = `
    position:      fixed;
    bottom:        80px;
    right:         20px;
    background:    var(--bg-elevated);
    border:        1px solid var(--border-md);
    border-left:   3px solid var(--blue);
    border-radius: 12px;
    padding:       14px 18px;
    box-shadow:    var(--shadow-lg);
    z-index:       999;
    display:       flex;
    align-items:   center;
    gap:           12px;
    animation:     slideIn 0.3s ease-out both;
    max-width:     300px;
    font-family:   'Inter', sans-serif;
  `

  toast.innerHTML = `
    <img src="${alert.coinImage}" style="width:32px;height:32px;border-radius:50%;" />
    <div>
      <div style="color:var(--text1);font-weight:700;font-size:13px;">
        🔔 ${alert.coinName} Alert
      </div>
      <div style="color:var(--text2);font-size:12px;margin-top:3px;">
        Price is $${currentPrice.toLocaleString()} 
        (${alert.direction} $${alert.targetPrice.toLocaleString()})
      </div>
    </div>
  `

  document.body.appendChild(toast)

  // Auto remove after 5 seconds
  setTimeout(() => {
    toast.style.animation = 'fadeUp 0.3s ease-out reverse both'
    setTimeout(() => toast.remove(), 300)
  }, 5000)
}