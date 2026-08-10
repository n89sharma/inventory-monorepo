import { useArrivalMutations } from '@/hooks/use-arrival-mutations'
import { ARRIVAL_SEARCH_TYPES, useGlobalSearch } from '@/hooks/use-global-search'
import { useState } from 'react'
import type { ArrivalSuggestion, AssetIdentity } from 'shared-types'
import { toast } from 'sonner'
import { DetailGrid, SearchView } from '../collections/collection-search'
import { emptyResults, type SelectedCollection } from '../collections/collection-search-types'
import { Button } from '../shadcn/button'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '../shadcn/dialog'

interface DestinationStepProps {
  selected: ArrivalSuggestion | null
  query: string
  isLoading: boolean
  arrivals: ArrivalSuggestion[]
  onQueryChange: (value: string) => void
  onSelect: (collection: SelectedCollection) => void
  onClearSelection: () => void
}

function DestinationStep({
  selected,
  query,
  isLoading,
  arrivals,
  onQueryChange,
  onSelect,
  onClearSelection,
}: DestinationStepProps) {
  if (selected !== null) {
    return (
      <DetailGrid
        title={`Arrival ${selected.arrival_number}`}
        fields={[
          { label: 'Vendor', value: selected.vendor },
          { label: 'Warehouse', value: selected.warehouse_code },
        ]}
        onClear={onClearSelection}
      />
    )
  }
  return (
    <SearchView
      query={query}
      onQueryChange={onQueryChange}
      isLoading={isLoading}
      results={{ ...emptyResults, arrivals }}
      onSelect={onSelect}
      label="Destination arrival"
    />
  )
}

interface MoveToArrivalModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  sourceArrivalNumber: string
  selectedAssets: AssetIdentity[]
  onConfirmSuccess: () => void
}

export function MoveToArrivalModal({
  open,
  onOpenChange,
  sourceArrivalNumber,
  selectedAssets,
  onConfirmSuccess,
}: MoveToArrivalModalProps) {
  const [query, setQuery] = useState('')
  const [selected, setSelected] = useState<ArrivalSuggestion | null>(null)
  const [isConfirming, setIsConfirming] = useState(false)

  const arrivalMutations = useArrivalMutations()
  const assetCount = selectedAssets.length
  const assetNoun = `asset${assetCount !== 1 ? 's' : ''}`

  const { results, isLoading } = useGlobalSearch(query, ARRIVAL_SEARCH_TYPES)
  // An asset cannot be moved to the arrival it is already on.
  const arrivals = results.arrivals.filter((a) => a.arrival_number !== sourceArrivalNumber)

  function handleSelect(collection: SelectedCollection) {
    if (collection.kind !== 'arrival') return
    setSelected(collection.data)
  }

  async function handleConfirm() {
    if (!selected) return
    setIsConfirming(true)
    try {
      await arrivalMutations.moveAssets(
        sourceArrivalNumber,
        selected.arrival_number,
        selectedAssets,
      )
      toast.success(`Moved ${assetCount} ${assetNoun} to Arrival ${selected.arrival_number}.`, {
        position: 'top-center',
      })
      onConfirmSuccess()
      handleOpenChange(false)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to move assets', {
        position: 'top-center',
      })
      setIsConfirming(false)
    }
  }

  function handleOpenChange(nextOpen: boolean) {
    if (!nextOpen) {
      setQuery('')
      setSelected(null)
      setIsConfirming(false)
    }
    onOpenChange(nextOpen)
  }

  function handleClearSelection() {
    setSelected(null)
    setQuery('')
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Move to arrival</DialogTitle>
        </DialogHeader>

        <div className="flex flex-col gap-1 rounded-md border px-3 py-2">
          <p>
            Move {assetCount} {assetNoun} from Arrival {sourceArrivalNumber}
          </p>
        </div>

        <DestinationStep
          selected={selected}
          query={query}
          isLoading={isLoading}
          arrivals={arrivals}
          onQueryChange={setQuery}
          onSelect={handleSelect}
          onClearSelection={handleClearSelection}
        />

        <DialogFooter>
          <Button variant="outline" onClick={() => handleOpenChange(false)}>
            Cancel
          </Button>
          <Button disabled={selected === null || isConfirming} onClick={handleConfirm}>
            {isConfirming ? 'Moving…' : 'Confirm'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
