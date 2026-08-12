import { OUTGOING_STATUS_LABELS, OutgoingStatusSchema, type OutgoingStatus } from 'shared-types'
import { CaretDownIcon } from '@phosphor-icons/react'
import { useCan } from '@/hooks/use-can'
import { Button } from '../shadcn/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '../shadcn/dropdown-menu'

const OUTGOING_STATUS_OPTIONS = OutgoingStatusSchema.options

type DepartureOutgoingStatusMenuProps = {
  onApply: (status: OutgoingStatus) => void
}

export function DepartureOutgoingStatusMenu({
  onApply,
}: DepartureOutgoingStatusMenuProps): React.ReactNode {
  const canEdit = useCan('create_update_departure')
  if (!canEdit) return null

  return (
    <DropdownMenu>
      <Button asChild variant="secondary">
        <DropdownMenuTrigger>
          Outgoing Status
          <CaretDownIcon />
        </DropdownMenuTrigger>
      </Button>
      <DropdownMenuContent className="w-max" side="top" align="end">
        {OUTGOING_STATUS_OPTIONS.map((option) => (
          <DropdownMenuItem key={option} onSelect={() => onApply(option)}>
            {OUTGOING_STATUS_LABELS[option]}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
