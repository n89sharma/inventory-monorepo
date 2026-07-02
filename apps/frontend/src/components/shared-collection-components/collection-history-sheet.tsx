import { Button } from '@/components/shadcn/button'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/shadcn/sheet'
import { CollectionHistoryList } from '@/components/shared-collection-components/collection-history-list'
import { useCollectionHistory } from '@/hooks/use-collection-history'
import { ClockCounterClockwiseIcon } from '@phosphor-icons/react'
import { useState } from 'react'
import type { CollectionHistory } from 'shared-types'

type CollectionHistorySheetProps = {
  cacheKey: string
  fetcher: () => Promise<CollectionHistory>
}

export function CollectionHistorySheet({
  cacheKey,
  fetcher,
}: CollectionHistorySheetProps): React.JSX.Element {
  const [open, setOpen] = useState(false)

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="outline" size="icon" aria-label="View history">
          <ClockCounterClockwiseIcon />
        </Button>
      </SheetTrigger>
      <SheetContent className="flex flex-col">
        <SheetHeader>
          <SheetTitle>History</SheetTitle>
        </SheetHeader>
        <div className="flex-1 overflow-y-auto px-4 pb-4">
          {open && <HistoryBody cacheKey={cacheKey} fetcher={fetcher} />}
        </div>
      </SheetContent>
    </Sheet>
  )
}

function HistoryBody({ cacheKey, fetcher }: CollectionHistorySheetProps): React.JSX.Element {
  const { data, isLoading } = useCollectionHistory(cacheKey, fetcher)
  if (isLoading) return <p className="text-sm text-muted-foreground">Loading…</p>
  return <CollectionHistoryList history={data ?? []} />
}
