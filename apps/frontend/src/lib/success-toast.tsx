import { EntityLink } from '@/components/shared/entity-link'
import { ENTITY_CONFIG, type LinkableEntity } from '@/lib/entity-config'
import { toast } from 'sonner'

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
