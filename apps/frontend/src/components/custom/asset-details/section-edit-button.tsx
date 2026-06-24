import { Button } from '@/components/shadcn/button'
import { PencilSimpleIcon } from '@phosphor-icons/react'

export function SectionEditButton({ onClick }: { onClick: () => void }) {
  return (
    <Button
      variant="ghost"
      size="xs"
      type="button"
      onClick={onClick}
      className="text-muted-foreground -mr-1"
    >
      <PencilSimpleIcon aria-hidden="true" />
      Edit
    </Button>
  )
}
