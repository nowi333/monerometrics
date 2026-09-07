import test from 'node:test'
import assert from 'node:assert/strict'
import { curves, reach, curveAt } from './bookDepth.js'

const book = {
  bids: [
    { premium_pct: -4.96, cumulative: 1.5, offers: 1 },
    { premium_pct: -9.10, cumulative: 4.2, offers: 3 },
    { premium_pct: -18.84, cumulative: 24.2527, offers: 4 },
    { premium_pct: -25.97, cumulative: 26.0527, offers: 1 },
  ],
  asks: [
    { premium_pct: -4.96, cumulative: 2.0, offers: 1 },
    { premium_pct: 6.40, cumulative: 30.0, offers: 12 },
    { premium_pct: 17.69, cumulative: 92.4723, offers: 13 },
    { premium_pct: 30.65, cumulative: 99.3247, offers: 4 },
  ],
}

// L'invariant qui a lache : le survol rapportait de la profondeur la ou la
// courbe ne dessinait plus rien, hors des bornes du carnet.
test('la courbe couvre exactement ce que le survol rapporte', () => {
  const { xMin, xMax, bids, asks } = curves(book.bids, book.asks)
  for (let i = 0; i <= 4000; i++) {
    const x = xMin + (xMax - xMin) * i / 4000
    for (const [pts, levels, dir] of [[bids, book.bids, 'down'], [asks, book.asks, 'up']]) {
      const drawn = curveAt(pts, x)
      const read = reach(levels, dir, x)
      assert.equal(drawn === null, read === null, `presence a ${x.toFixed(3)}%`)
      if (drawn !== null) {
        assert.ok(Math.abs(drawn - read.cumulative) < 0.01, `valeur a ${x.toFixed(3)}%`)
      }
    }
  }
})

test('sous le meilleur achat, toute la profondeur reste offerte', () => {
  const { xMin } = curves(book.bids, book.asks)
  const r = reach(book.bids, 'down', xMin)
  assert.equal(r.cumulative, 26.0527)
  assert.equal(r.offers, 9)
})

test('au-dela de la meilleure vente, toute la profondeur reste offerte', () => {
  const { xMax } = curves(book.bids, book.asks)
  const r = reach(book.asks, 'up', xMax)
  assert.equal(r.cumulative, 99.3247)
  assert.equal(r.offers, 30)
})

test('aucun achat au-dessus du meilleur achat, aucune vente sous la meilleure', () => {
  assert.equal(reach(book.bids, 'down', 0), null)
  assert.equal(reach(book.asks, 'up', -30), null)
})

// Les bornes servent d'etiquettes d'axe : une valeur flottante bruitee comme
// -28.446800000000003 s'affichait telle quelle sous le graphique.
test('les bornes de l\'axe sont des entiers', () => {
  const { xMin, xMax } = curves(book.bids, book.asks)
  assert.equal(xMin, Math.trunc(xMin))
  assert.equal(xMax, Math.trunc(xMax))
  assert.ok(xMin < -25.97 && xMax > 30.65)
})

test('un carnet vide ne casse rien', () => {
  const c = curves([], [])
  assert.deepEqual(c.bids, [])
  assert.deepEqual(c.asks, [])
  assert.ok(c.xMin < c.xMax)
})

test('les paliers sans prime sont ignores', () => {
  const r = reach([{ premium_pct: null, cumulative: 999, offers: 9 }], 'down', -50)
  assert.equal(r, null)
})
