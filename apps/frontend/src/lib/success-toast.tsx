import { toast } from 'sonner'
import { EntityLink } from '@/components/custom/entity-link'
import { ENTITY_CONFIG, type LinkableEntity } from '@/lib/entity-config'

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
