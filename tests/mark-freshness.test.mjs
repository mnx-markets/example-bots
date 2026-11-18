import { test } from 'node:test'
import assert from 'node:assert/strict'
import { isFreshMark } from '../core/mark-freshness.mjs'
const now = Date.parse('2026-11-18T12:00:00Z')
test('accepts recent marks including the five minute boundary', () => {
  assert.equal(isFreshMark('2026-11-18T11:59:59Z', now), true)
  assert.equal(isFreshMark('2026-11-18T11:55:00Z', now), true)
})
test('rejects old, future, missing, and invalid marks', () => {
  for (const timestamp of ['2026-11-18T11:54:59Z', '2026-11-18T12:00:01Z', '', 'invalid', undefined, null]) {
    assert.equal(isFreshMark(timestamp, now), false)
  }
})

