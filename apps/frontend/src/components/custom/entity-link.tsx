import { Link } from 'react-router-dom'
import { ENTITY_CONFIG, type LinkableEntity } from '@/lib/success-toast'

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
