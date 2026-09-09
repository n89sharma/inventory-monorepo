import { HOLD_SEARCH_TYPES, useGlobalSearch } from '@/hooks/use-global-search'
import { useHoldMutations } from '@/hooks/use-hold-mutations'
import { useMemo, useState } from 'react'
import type { AssetIdentity, GlobalSearchResult, HoldSuggestion } from 'shared-types'
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
  selected: HoldSuggestion | null
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
        title={`Hold ${selected.hold_number}`}
        fields={[
          { label: 'Created for', value: selected.created_for },
          { label: 'Customer', value: selected.customer },
        ]}
        onClear={onClearSelection}
      />
    )
  }
  return (
    <CollectionSearchSelect
      label="Destination hold"
      query={query}
      onQueryChange={onQueryChange}
      isLoading={isLoading}
      results={results}
      eligibleTypes={HOLD_SEARCH_TYPES}
      onSelect={onSelect}
    />
  )
}

interface MoveToHoldModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  sourceHoldNumber: string
  selectedAssets: AssetIdentity[]
  onConfirmSuccess: () => void
}

export function MoveToHoldModal({
  open,
  onOpenChange,
  sourceHoldNumber,
  selectedAssets,
  onConfirmSuccess,
}: MoveToHoldModalProps) {
  const [query, setQuery] = useState('')
  const [selected, setSelected] = useState<HoldSuggestion | null>(null)
  const [isConfirming, setIsConfirming] = useState(false)

  const holdMutations = useHoldMutations()
  const assetCount = selectedAssets.length
  const assetNoun = `asset${assetCount !== 1 ? 's' : ''}`

  const { results: searchResults, isLoading } = useGlobalSearch(query, HOLD_SEARCH_TYPES)
  // An asset cannot be moved to the hold it is already on.
  const results = useMemo(
    () => ({
      ...searchResults,
      holds: searchResults.holds.filter((h) => h.hold_number !== sourceHoldNumber),
    }),
    [searchResults, sourceHoldNumber],
  )

  function handleSelect(collection: SelectedCollection) {
    if (collection.kind !== 'hold') return
    setSelected(collection.data)
  }

  async function handleConfirm() {
    if (!selected) return
    setIsConfirming(true)
    try {
      await holdMutations.moveAssets(sourceHoldNumber, selected.hold_number, selectedAssets)
      toast.success(`Moved ${assetCount} ${assetNoun} to Hold ${selected.hold_number}.`, {
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
          <DialogTitle>Move to hold</DialogTitle>
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
