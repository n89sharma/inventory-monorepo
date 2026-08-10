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

// One row of a part's ledger, either direction, in any warehouse.
export interface StockMovement {
  id: number
  warehouse_id: number
  created_at: Date
  is_inbound: boolean
  quantity: number
  unit_cost: Prisma.Decimal | null
}

export interface WarehouseStock {
  warehouse_id: number
  on_hand: number
  stock_value: Prisma.Decimal
}

// Ties on created_at are normal — a paired write stamps both of its rows with the
// same instant — so id breaks them, matching the order getStorePartStockLayers uses.
function compareArrival(a: StockMovement, b: StockMovement): number {
  const byCreatedAt = a.created_at.getTime() - b.created_at.getTime()
  if (byCreatedAt !== 0) return byCreatedAt
  return a.id - b.id
}

// Folds a whole ledger into one entry per warehouse it touches. Stock is valued per
// warehouse, so each one gets its own FIFO queue built from its inbound rows alone.
export function stockByWarehouse(movements: StockMovement[]): WarehouseStock[] {
  const layersByWarehouse = new Map<number, StockLayer[]>()
  const onHandByWarehouse = new Map<number, number>()

  for (const movement of [...movements].sort(compareArrival)) {
    const onHand = onHandByWarehouse.get(movement.warehouse_id) ?? 0
    const signedQuantity = movement.is_inbound ? movement.quantity : -movement.quantity
    onHandByWarehouse.set(movement.warehouse_id, onHand + signedQuantity)

    if (!movement.is_inbound) continue
    const layer: StockLayer = { quantity: movement.quantity, unit_cost: movement.unit_cost }
    const layers = layersByWarehouse.get(movement.warehouse_id)
    if (layers) layers.push(layer)
    else layersByWarehouse.set(movement.warehouse_id, [layer])
  }

  return [...onHandByWarehouse].map(([warehouseId, onHand]) => ({
    warehouse_id: warehouseId,
    on_hand: onHand,
    stock_value: stockValue(layersByWarehouse.get(warehouseId) ?? [], onHand),
  }))
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
