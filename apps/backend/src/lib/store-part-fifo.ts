import { Prisma } from '../../generated/prisma/client.js'

const ZERO = new Prisma.Decimal(0)

// One purchase of a store part into one warehouse. Callers pass layers in arrival
// order (oldest first); a layer with no recorded cost still occupies quantity in
// the queue but contributes nothing to value.
export interface StockLayer {
  quantity: number
  unit_cost: Prisma.Decimal | null
}

function layerCost(layer: StockLayer, units: number): Prisma.Decimal {
  return (layer.unit_cost ?? ZERO).mul(units)
}

// FIFO: stock is consumed in arrival order, so the units still on hand are the
// ones at the newest end of the queue. Walk backwards taking whole layers until
// the on-hand quantity is covered, prorating the layer that straddles the edge.
export function stockValue(layers: StockLayer[], onHand: number): Prisma.Decimal {
  if (onHand <= 0) return ZERO

  let remaining = onHand
  let value = ZERO
  for (let index = layers.length - 1; index >= 0 && remaining > 0; index--) {
    const layer = layers[index]
    const units = Math.min(layer.quantity, remaining)
    value = value.add(layerCost(layer, units))
    remaining -= units
  }
  return value
}

// The same queue read from the oldest end: skip the units already consumed, then
// take the next `quantity` units. A single withdrawal can straddle layers bought
// at different prices, so this is a total cost, not a unit price.
export function consumptionCost(
  layers: StockLayer[],
  consumedQuantity: number,
  quantity: number,
): Prisma.Decimal {
  if (quantity <= 0) return ZERO

  const windowStart = Math.max(consumedQuantity, 0)
  const windowEnd = windowStart + quantity

  let cost = ZERO
  let layerStart = 0
  for (const layer of layers) {
    const layerEnd = layerStart + layer.quantity
    const units = Math.min(layerEnd, windowEnd) - Math.max(layerStart, windowStart)
    if (units > 0) cost = cost.add(layerCost(layer, units))
    if (layerEnd >= windowEnd) break
    layerStart = layerEnd
  }
  return cost
}
