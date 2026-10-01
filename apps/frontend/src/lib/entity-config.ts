export type LinkableEntity = 'hold' | 'invoice' | 'transfer' | 'departure' | 'arrival' | 'bid'

export const ENTITY_CONFIG = {
  hold: { label: 'Hold', path: 'holds' },
  invoice: { label: 'Invoice', path: 'invoices' },
  transfer: { label: 'Transfer', path: 'transfers' },
  departure: { label: 'Departure', path: 'departures' },
  arrival: { label: 'Arrival', path: 'arrivals' },
  bid: { label: 'Bid', path: 'bids' },
} as const satisfies Record<LinkableEntity, { label: string; path: string }>
