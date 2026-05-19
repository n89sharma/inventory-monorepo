import { Link } from 'react-router-dom'
import { toast } from 'sonner'

export type LinkableEntity = 'hold' | 'invoice' | 'transfer' | 'departure' | 'arrival'

const ENTITY_CONFIG = {
  hold: { label: 'Hold', path: 'holds' },
  invoice: { label: 'Invoice', path: 'invoices' },
  transfer: { label: 'Transfer', path: 'transfers' },
  departure: { label: 'Departure', path: 'departures' },
  arrival: { label: 'Arrival', path: 'arrivals' },
} as const satisfies Record<LinkableEntity, { label: string; path: string }>

const LINK_CLASS = 'underline font-medium'

export function EntityLink({
  entity,
  id,
}: {
  entity: LinkableEntity
  id: string
}): React.JSX.Element {
  return (
    <Link to={`/${ENTITY_CONFIG[entity].path}/${id}`} className={LINK_CLASS}>
      {id}
    </Link>
  )
}

export function entityLabel(entity: LinkableEntity): string {
  return ENTITY_CONFIG[entity].label
}

export type SuccessToastPayload = {
  entity: LinkableEntity
  id: string
}

export function showEntityCreatedToast({ entity, id }: SuccessToastPayload): void {
  toast.success(
    <>
      {entityLabel(entity)} <EntityLink entity={entity} id={id} /> created!
    </>,
    { position: 'top-center' },
  )
}
