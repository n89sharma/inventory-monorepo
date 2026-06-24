import { toast } from 'sonner'
import { EntityLink } from '@/components/custom/entity-link'

export type LinkableEntity = 'hold' | 'invoice' | 'transfer' | 'departure' | 'arrival'

export const ENTITY_CONFIG = {
  hold: { label: 'Hold', path: 'holds' },
  invoice: { label: 'Invoice', path: 'invoices' },
  transfer: { label: 'Transfer', path: 'transfers' },
  departure: { label: 'Departure', path: 'departures' },
  arrival: { label: 'Arrival', path: 'arrivals' },
} as const satisfies Record<LinkableEntity, { label: string; path: string }>

export type SuccessToastPayload = {
  entity: LinkableEntity
  id: string
}

export function showEntityCreatedToast({ entity, id }: SuccessToastPayload): void {
  toast.success(
    <>
      {ENTITY_CONFIG[entity].label} <EntityLink entity={entity} id={id} /> created!
    </>,
    { position: 'top-center' },
  )
}
