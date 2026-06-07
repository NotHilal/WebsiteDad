const store = new Map()

function get(key) {
  const entry = store.get(key)
  if (!entry) return null
  if (Date.now() > entry.expiresAt) { store.delete(key); return null }
  return entry.data
}

function set(key, data, ttlMs = 60_000) {
  store.set(key, { data, expiresAt: Date.now() + ttlMs })
}

export async function getOrFetch(key, fetchFn, ttlMs = 60_000) {
  const cached = get(key)
  if (cached !== null) return cached
  const data = await fetchFn()
  set(key, data, ttlMs)
  return data
}

export function invalidate(key) {
  store.delete(key)
}
