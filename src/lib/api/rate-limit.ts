const WINDOW_MS = 60_000
const READ_LIMIT = 300
const WRITE_LIMIT = 100
const MAX_BUCKETS = 10_000

interface Bucket {
  count: number
  resetAt: number
}

const buckets = new Map<string, Bucket>()

function sweepExpired(now: number) {
  for (const [key, bucket] of buckets) {
    if (bucket.resetAt <= now) buckets.delete(key)
  }
}

export interface RateLimitResult {
  ok: boolean
  retryAfter: number
}

export function checkRateLimit(userId: string, method: string): RateLimitResult {
  const isRead = method === 'GET' || method === 'HEAD'
  const limit = isRead ? READ_LIMIT : WRITE_LIMIT
  const key = `${userId}:${isRead ? 'r' : 'w'}`

  const now = Date.now()
  if (buckets.size > MAX_BUCKETS) sweepExpired(now)

  const bucket = buckets.get(key)
  if (!bucket || bucket.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + WINDOW_MS })
    return { ok: true, retryAfter: 0 }
  }

  bucket.count += 1
  if (bucket.count > limit) {
    return { ok: false, retryAfter: Math.ceil((bucket.resetAt - now) / 1000) }
  }
  return { ok: true, retryAfter: 0 }
}
