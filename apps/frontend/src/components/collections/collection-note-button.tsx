import { Button } from '@/components/shadcn/button'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/shadcn/popover'
import { NotepadIcon } from '@phosphor-icons/react'

const NOTE_LABEL = 'Note'
const EMPTY_NOTE_LABEL = 'No note'

function EmptyNoteButton(): React.JSX.Element {
  return (
    <Button variant="outline" size="icon" aria-label={EMPTY_NOTE_LABEL} disabled>
      <NotepadIcon />
    </Button>
  )
}

export function CollectionNoteButton({
  note,
}: {
  note: string | null | undefined
}): React.JSX.Element {
  if (!note) return <EmptyNoteButton />
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline" size="icon" aria-label={NOTE_LABEL}>
          <NotepadIcon />
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 text-sm">
        <div className="flex flex-col gap-2">
          <span className="font-medium">{NOTE_LABEL}</span>
          <span className="whitespace-pre-wrap break-words">{note}</span>
        </div>
      </PopoverContent>
    </Popover>
  )
}
