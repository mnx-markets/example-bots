import { isFreshMark } from '../core/mark-freshness.mjs'
import { cancelAll, clampToBand, connect, ensureFunded, market, placeLimit, roundToTick } from '../core/mnx.mjs'

const symbol = process.env.SYMBOL ?? 'NVDA'
const spread = Number(process.env.SPREAD_BPS ?? 30) / 1e4
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms))
const ctx = await connect()
await ensureFunded(ctx)
let current, marketId
let stopping = false
process.on('SIGINT', async () => {
  stopping = true
  if (marketId) console.log(`cancelled ${(await cancelAll(ctx, marketId)).cancelled_count} orders`)
  process.exit()
})

// Perps fund hourly. us_equity markets freeze funding and their oracle goes stale outside that session.
while (!stopping) {
  current = await market(symbol)
  if (!current) { if (marketId) await cancelAll(ctx, marketId); console.log(`${symbol} is absent: terminal market, exiting`); break }
  marketId = current.market_id
  if (!isFreshMark(current.mark_price_timestamp)) {
    await cancelAll(ctx, current.market_id); console.log('stale mark; cancelled and waiting'); await sleep(5000); continue
  }
  await cancelAll(ctx, current.market_id)
  const size = Number(process.env.SIZE ?? current.min_order_size)
  const mark = Number(current.mark_price)
  const q = (p) => roundToTick(current, clampToBand(current, p))
  const [bidP, askP] = [q(mark * (1 - spread)), q(mark * (1 + spread))]
  // The tradable band around the oracle can squeeze both quotes to one price; never self-cross.
  if (bidP >= askP) { console.log('band collapsed quotes; skipping'); await sleep(5000); continue }
  const bid = await placeLimit(ctx, current, 'LONG', bidP, size, { postOnly: true })
  const ask = await placeLimit(ctx, current, 'SHORT', askP, size, { postOnly: true })
  console.log(`bid ${bidP} (${bid.order.order_id} ${bid.order.status}); ask ${askP} (${ask.order.order_id} ${ask.order.status})`)
  await sleep(5000)
}

