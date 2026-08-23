import { Link } from 'react-router-dom'
import { ENTITY_CONFIG, type LinkableEntity } from '@/lib/entity-config'

const LINK_CLASS = 'underline font-medium'

export function EntityLink({
  entity,
  id,
  label,
}: {
  entity: LinkableEntity
  id: string
  label?: string
}): React.JSX.Element {
  return (
    <Link to={`/${ENTITY_CONFIG[entity].path}/${id}`} className={LINK_CLASS}>
      {label ?? id}
    </Link>
  )
}
