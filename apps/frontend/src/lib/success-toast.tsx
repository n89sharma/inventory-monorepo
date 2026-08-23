import { EntityLink } from '@/components/shared/entity-link'
import { ENTITY_CONFIG, type LinkableEntity } from '@/lib/entity-config'
import { toast } from 'sonner'

type SuccessToastPayload = {
  entity: LinkableEntity
  id: string
  label?: string
}

export function showEntityCreatedToast({ entity, id, label }: SuccessToastPayload): void {
  toast.success(
    <>
      {ENTITY_CONFIG[entity].label} <EntityLink entity={entity} id={id} label={label} /> created!
    </>,
    { position: 'top-center' },
  )
}
