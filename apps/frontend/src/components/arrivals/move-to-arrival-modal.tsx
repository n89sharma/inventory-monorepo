import { useArrivalMutations } from '@/hooks/use-arrival-mutations'
import { ARRIVAL_SEARCH_TYPES, useGlobalSearch } from '@/hooks/use-global-search'
import { useMemo, useState } from 'react'
import type { ArrivalSuggestion, AssetIdentity, GlobalSearchResult } from 'shared-types'
import { toast } from 'sonner'
import { DetailGrid } from '../collections/collection-search'
import { CollectionSearchSelect } from '../collections/collection-search-select'
import type { SelectedCollection } from '../collections/collection-search-types'
import { Button } from '../shadcn/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../shadcn/dialog'

interface DestinationStepProps {
  selected: ArrivalSuggestion | null
  query: string
  isLoading: boolean
  results: GlobalSearchResult
  onQueryChange: (value: string) => void
  onSelect: (collection: SelectedCollection) => void
  onClearSelection: () => void
}

function DestinationStep({
  selected,
  query,
  isLoading,
  results,
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
    <CollectionSearchSelect
      label="Destination arrival"
      query={query}
      onQueryChange={onQueryChange}
      isLoading={isLoading}
      results={results}
      eligibleTypes={ARRIVAL_SEARCH_TYPES}
      onSelect={onSelect}
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

  const { results: searchResults, isLoading } = useGlobalSearch(query, ARRIVAL_SEARCH_TYPES)
  // An asset cannot be moved to the arrival it is already on.
  const results = useMemo(
    () => ({
      ...searchResults,
      arrivals: searchResults.arrivals.filter((a) => a.arrival_number !== sourceArrivalNumber),
    }),
    [searchResults, sourceArrivalNumber],
  )

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
          <DialogDescription>
            {assetCount} {assetNoun} selected
          </DialogDescription>
        </DialogHeader>

        <DestinationStep
          selected={selected}
          query={query}
          isLoading={isLoading}
          results={results}
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
