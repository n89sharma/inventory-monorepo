// What a unit of the stock on hand is currently carried at. A part has no single unit
// cost — its stock sits in FIFO layers bought at different prices — so this is the
// weighted average of the layers still on the shelf. Null means there is nothing to
// average: either the cost is withheld from this user, or no stock is held.
export function effectiveUnitCost(stockValue: number | null, onHand: number): number | null {
  if (stockValue === null || onHand <= 0) return null
  return stockValue / onHand
}
