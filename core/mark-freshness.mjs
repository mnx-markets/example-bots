export function isFreshMark(timestamp, now = Date.now()) {
  if (typeof timestamp !== 'string' || !timestamp.trim()) return false
  const time = Date.parse(timestamp)
  return Number.isFinite(time) && time <= now && now - time <= 5 * 60_000
}

