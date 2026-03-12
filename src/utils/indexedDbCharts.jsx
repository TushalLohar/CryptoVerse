const DB_NAME = 'ct_charts_v1'
const STORE_NAME = 'charts'
let dbPromise = null

const getDB = () => {
  if (dbPromise) return dbPromise

  dbPromise = new Promise((resolve) => {
    const request = indexedDB.open(DB_NAME, 1)

    request.onupgradeneeded = () => {
      const db = request.result
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'key' })
      }
    }

    request.onsuccess = () => resolve(request.result)
  })

  return dbPromise
}

export const getCachedChart = async (key, maxAgeMs = 300_000) => {
  try {
    const db = await getDB()
    const request = db
      .transaction(STORE_NAME, 'readonly')
      .objectStore(STORE_NAME)
      .get(key)

    return new Promise((resolve) => {
      request.onsuccess = () => {
        const res = request.result
        const isFresh = res && Date.now() - res.ts < maxAgeMs
        resolve(isFresh ? res.data : null)
      }

      request.onerror = () => resolve(null)
    })

  } catch {
    return null
  }
}

export const setCachedChart = async (key, data) => {
  try {
    const db = await getDB()

    db.transaction(STORE_NAME, 'readwrite')
      .objectStore(STORE_NAME)
      .put({
        key,
        data,
        ts: Date.now()
      })

  } catch {
    // Silently fail if cache write fails
  }
}