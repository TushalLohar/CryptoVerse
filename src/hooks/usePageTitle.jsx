import { useEffect } from 'react'

export function usePageTitle(title) {
  useEffect(() => {
    document.title = title
      ? `${title} — CryptoTracker`
      : 'CryptoTracker'
    // Reset on unmount
    return () => { document.title = 'CryptoTracker' }
  }, [title])
}