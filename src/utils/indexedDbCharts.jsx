// src/utils/indexedDbCharts.js

const DB_NAME    = 'ct_charts_v1'
const STORE_NAME = 'charts'

let dbPromise = null

const openDb = () => {
  if (dbPromise) return dbPromise

  dbPromise = new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1)

    request.onupgradeneeded = () => {
      const db = request.result
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        // keyPath: 'key' means the 'key' field is the unique ID
        db.createObjectStore(STORE_NAME, { keyPath: 'key' })
      }
    }

    request.onsuccess = () => resolve(request.result)
    request.onerror   = () => reject(request.error)
  })

  return dbPromise
}

// Get cached chart data if it's within maxAgeMs
export const getCachedChart = async (key, maxAgeMs = 300_000) => {
  try {
    const db = await openDb()
    return new Promise((resolve, reject) => {
      const request = db
        .transaction(STORE_NAME, 'readonly')
        .objectStore(STORE_NAME)
        .get(key)

      request.onsuccess = () => {
        const result = request.result
        if (!result) return resolve(null)
        // Check if the cached data is still fresh enough
        if (Date.now() - result.ts > maxAgeMs) return resolve(null)
        resolve(result.data)
      }
      request.onerror = () => reject(request.error)
    })
  } catch {
    return null
  }
}

// Store chart data with current timestamp
export const setCachedChart = async (key, data) => {
  try {
    const db = await openDb()
    await new Promise((resolve, reject) => {
      const request = db
        .transaction(STORE_NAME, 'readwrite')
        .objectStore(STORE_NAME)
        .put({ key, data, ts: Date.now() })

      request.onsuccess = () => resolve()
      request.onerror   = () => reject(request.error)
    })
  } catch {
    // Silent failure
  }
}