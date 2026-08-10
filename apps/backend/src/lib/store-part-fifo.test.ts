import { describe, expect, it } from 'vitest'
import { Prisma } from '../../generated/prisma/client.js'
import {
  consumptionCost,
  stockByWarehouse,
  stockValue,
  type StockLayer,
  type StockMovement,
} from './store-part-fifo.js'

type LedgerEntry =
  | { kind: 'purchase'; quantity: number; unitCost: number | null }
  | { kind: 'consume'; quantity: number }

function purchase(quantity: number, unitCost: number | null): LedgerEntry {
  return { kind: 'purchase', quantity, unitCost }
}

function consume(quantity: number): LedgerEntry {
  return { kind: 'consume', quantity }
}

// Replays a part's ledger the way storePartService does: purchases become the
// FIFO queue, and everything taken out so far is a single running total.
function ledger(...entries: LedgerEntry[]): {
  layers: StockLayer[]
  onHand: number
  consumed: number
} {
  const layers: StockLayer[] = []
  let purchased = 0
  let consumed = 0

  for (const entry of entries) {
    if (entry.kind === 'purchase') {
      layers.push({
        quantity: entry.quantity,
        unit_cost: entry.unitCost === null ? null : new Prisma.Decimal(entry.unitCost),
      })
      purchased += entry.quantity
    } else {
      consumed += entry.quantity
    }
  }

  return { layers, onHand: purchased - consumed, consumed }
}

describe('stockValue', () => {
  it('values what remains against the newest purchase', () => {
    const { layers, onHand } = ledger(
      purchase(10, 10), //
      consume(10),
      purchase(5, 20),
    )
    expect(onHand).toBe(5)
    expect(stockValue(layers, onHand).toString()).toBe('100')
  })

  it('drops the oldest purchase first', () => {
    const { layers, onHand } = ledger(
      purchase(10, 10), //
      purchase(10, 20),
      consume(15),
    )
    expect(onHand).toBe(5)
    expect(stockValue(layers, onHand).toString()).toBe('100')
  })

  it('straddles two purchases when the newest does not cover what remains', () => {
    const { layers, onHand } = ledger(
      purchase(10, 10), //
      purchase(10, 20),
      consume(5),
    )
    expect(onHand).toBe(15)
    expect(stockValue(layers, onHand).toString()).toBe('250')
  })

  it('values every purchase when nothing has been consumed', () => {
    const { layers, onHand } = ledger(
      purchase(10, 10), //
      purchase(10, 20),
    )
    expect(stockValue(layers, onHand).toString()).toBe('300')
  })

  it('keeps an uncosted purchase in the queue at zero', () => {
    // The 8 uncosted units still occupy the newest slots, so only 2 of the
    // 10 on hand are valued at $10.
    const { layers, onHand } = ledger(
      purchase(10, 10), //
      purchase(8, null),
      consume(8),
    )
    expect(onHand).toBe(10)
    expect(stockValue(layers, onHand).toString()).toBe('20')
  })

  it('values nothing when the part has never been purchased', () => {
    const { layers } = ledger()
    expect(stockValue(layers, 5).toString()).toBe('0')
  })

  it('values nothing when the shelf is empty', () => {
    const { layers, onHand } = ledger(
      purchase(10, 10), //
      consume(10),
    )
    expect(onHand).toBe(0)
    expect(stockValue(layers, onHand).toString()).toBe('0')
  })

  it('values nothing when more was consumed than purchased', () => {
    const { layers, onHand } = ledger(
      purchase(10, 10), //
      consume(13),
    )
    expect(onHand).toBe(-3)
    expect(stockValue(layers, onHand).toString()).toBe('0')
  })

  it('keeps fractional cents exact', () => {
    const { layers, onHand } = ledger(purchase(3, 0.01))
    expect(stockValue(layers, onHand).toString()).toBe('0.03')
  })
})

const TORONTO = 1
const MONTREAL = 2

function at(day: number): Date {
  return new Date(Date.UTC(2026, 0, day))
}

function received(
  id: number,
  warehouseId: number,
  day: number,
  quantity: number,
  unitCost: number | null,
): StockMovement {
  return {
    id,
    warehouse_id: warehouseId,
    created_at: at(day),
    is_inbound: true,
    quantity,
    unit_cost: unitCost === null ? null : new Prisma.Decimal(unitCost),
  }
}

function issued(id: number, warehouseId: number, day: number, quantity: number): StockMovement {
  return {
    id,
    warehouse_id: warehouseId,
    created_at: at(day),
    is_inbound: false,
    quantity,
    unit_cost: null,
  }
}

function stockAt(stock: ReturnType<typeof stockByWarehouse>, warehouseId: number) {
  const entry = stock.find((row) => row.warehouse_id === warehouseId)
  if (!entry) throw new Error(`No stock reported for warehouse ${warehouseId}`)
  return { onHand: entry.on_hand, value: entry.stock_value.toString() }
}

describe('stockByWarehouse', () => {
  it('gives each warehouse its own queue', () => {
    const stock = stockByWarehouse([
      received(1, TORONTO, 1, 10, 10),
      received(2, MONTREAL, 2, 4, 25),
      issued(3, TORONTO, 3, 6),
    ])
    expect(stock).toHaveLength(2)
    expect(stockAt(stock, TORONTO)).toEqual({ onHand: 4, value: '40' })
    expect(stockAt(stock, MONTREAL)).toEqual({ onHand: 4, value: '100' })
  })

  it('nets outbound rows against inbound without valuing them', () => {
    const stock = stockByWarehouse([
      received(1, TORONTO, 1, 10, 10),
      issued(2, TORONTO, 2, 10),
      received(3, TORONTO, 3, 5, 20),
    ])
    expect(stockAt(stock, TORONTO)).toEqual({ onHand: 5, value: '100' })
  })

  it('orders by created_at rather than the order it was handed', () => {
    // getStorePartLedger returns newest first, so the fold has to sort.
    const stock = stockByWarehouse([
      received(2, TORONTO, 9, 10, 20),
      received(1, TORONTO, 1, 10, 10),
      issued(3, TORONTO, 9, 15),
    ])
    expect(stockAt(stock, TORONTO)).toEqual({ onHand: 5, value: '100' })
  })

  it('breaks a created_at tie with id', () => {
    // Both purchases land in the same instant; the higher id is the newer layer.
    const stock = stockByWarehouse([
      received(3, TORONTO, 1, 5, 20),
      received(2, TORONTO, 1, 5, 10),
      issued(4, TORONTO, 2, 5),
    ])
    expect(stockAt(stock, TORONTO)).toEqual({ onHand: 5, value: '100' })
  })

  it('reports a warehouse whose stock has all left', () => {
    const stock = stockByWarehouse([
      received(1, TORONTO, 1, 10, 10), //
      issued(2, TORONTO, 2, 10),
    ])
    expect(stockAt(stock, TORONTO)).toEqual({ onHand: 0, value: '0' })
  })

  it('values stock bought without a recorded cost at nothing', () => {
    const stock = stockByWarehouse([received(1, TORONTO, 1, 10, null)])
    expect(stockAt(stock, TORONTO)).toEqual({ onHand: 10, value: '0' })
  })

  it('reports nothing for a part that has never moved', () => {
    expect(stockByWarehouse([])).toEqual([])
  })
})

describe('consumptionCost', () => {
  it('costs a withdrawal that spans two purchases', () => {
    const { layers, consumed } = ledger(
      purchase(10, 10), //
      purchase(10, 20),
    )
    expect(consumptionCost(layers, consumed, 15).toString()).toBe('200')
  })

  it('resumes where the previous withdrawal stopped', () => {
    const { layers, consumed } = ledger(
      purchase(10, 10), //
      purchase(10, 20),
      consume(15),
    )
    expect(consumptionCost(layers, consumed, 3).toString()).toBe('60')
  })

  it('costs a withdrawal contained in the oldest purchase', () => {
    const { layers, consumed } = ledger(
      purchase(10, 10), //
      purchase(10, 20),
    )
    expect(consumptionCost(layers, consumed, 4).toString()).toBe('40')
  })

  it('skips purchases already fully consumed', () => {
    const { layers, consumed } = ledger(
      purchase(10, 10), //
      purchase(10, 20),
      consume(10),
    )
    expect(consumptionCost(layers, consumed, 10).toString()).toBe('200')
  })

  it('charges nothing for units drawn from an uncosted purchase', () => {
    const { layers, consumed } = ledger(
      purchase(5, null), //
      purchase(5, 20),
    )
    expect(consumptionCost(layers, consumed, 5).toString()).toBe('0')
  })

  it('straddles an uncosted purchase and a priced one', () => {
    const { layers, consumed } = ledger(
      purchase(5, null), //
      purchase(5, 20),
      consume(3),
    )
    expect(consumptionCost(layers, consumed, 4).toString()).toBe('40')
  })

  it('costs nothing for a zero-unit withdrawal', () => {
    const { layers, consumed } = ledger(purchase(10, 10))
    expect(consumptionCost(layers, consumed, 0).toString()).toBe('0')
  })

  it('costs nothing when the part has never been purchased', () => {
    const { layers, consumed } = ledger()
    expect(consumptionCost(layers, consumed, 5).toString()).toBe('0')
  })

  it('costs only what was purchased when the withdrawal exceeds the queue', () => {
    const { layers, consumed } = ledger(purchase(4, 10))
    expect(consumptionCost(layers, consumed, 10).toString()).toBe('40')
  })

  it('splits the total purchase cost between what left and what remains', () => {
    const { layers, consumed, onHand } = ledger(
      purchase(10, 10), //
      purchase(10, 20),
      consume(15),
    )
    const alreadyConsumed = consumptionCost(layers, 0, consumed)
    expect(alreadyConsumed.add(stockValue(layers, onHand)).toString()).toBe('300')
  })
})
