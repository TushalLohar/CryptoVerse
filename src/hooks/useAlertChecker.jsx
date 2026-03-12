import { useEffect, useRef } from "react"
import { useAlerts } from "../store/alertsStore"
import { useToast } from "../components/ui/Toast"

export function useAlertChecker(livePrices) {

  const { alerts, triggerAlert } = useAlerts()
  const toast = useToast()

  const alertsRef = useRef(alerts)

  useEffect(() => {
    alertsRef.current = alerts
  }, [alerts])

  useEffect(() => {

    if (!livePrices || Object.keys(livePrices).length === 0) return

    alertsRef.current.forEach((alert) => {

      if (alert.triggered) return

      const currentPrice = livePrices[alert.coinId]
      if (currentPrice == null) return

      const shouldFire =
        (alert.direction === "above" && currentPrice >= alert.targetPrice) ||
        (alert.direction === "below" && currentPrice <= alert.targetPrice)

      if (!shouldFire) return

      triggerAlert(alert.id)

      if (Notification.permission === "granted") {
        new Notification(`🔔 Price Alert: ${alert.coinName}`, {
          body: `${alert.coinName} is now $${currentPrice.toLocaleString()}`,
          icon: alert.coinImage,
        })
      }

      toast(
        `${alert.coinName} reached $${currentPrice.toLocaleString()} (${alert.direction} $${alert.targetPrice.toLocaleString()})`,
        "alert"
      )

    })

  }, [livePrices, triggerAlert, toast])

}