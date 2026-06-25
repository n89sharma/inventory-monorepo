import { Button } from '@/components/shadcn/button'
import { PencilSimpleIcon } from '@phosphor-icons/react'

export function SectionEditButton({ onClick }: { onClick: () => void }) {
  return (
    <Button variant="outline" size="xs" type="button" onClick={onClick}>
      <PencilSimpleIcon aria-hidden="true" />
      Edit
    </Button>
  )
}
